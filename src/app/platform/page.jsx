"use client"
import { useEffect, useRef, useState } from "react"
import useWebSocket from "react-use-websocket"

import { getUniqueMessageID,createRoomReq, validateRoomReq, getInstructions } from "../../../backend/requests"
import styles from "../../../styles/pages/Platform.module.css"

function Platform(){
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomID, setJoinRoomID]= useState("")
  const [roomID, setRoomID] = useState("")

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const lazyUsername = useRef(Math.floor(Math.random()*500))

  const batchedStrokes = useRef({
    "fullStroke": [],
    "batchStroke": []
  })
  const startStrokePoint = useRef(null)
  const canvasRef = useRef(null)
  const hiddenCanvasRef = useRef(null)

  const {sendJsonMessage} = useWebSocket("ws://10.0.0.110:8000",{
    queryParams:{
      "username": lazyUsername.current,
      "roomID": roomID
    },
    onMessage:(event)=>{
      const data = JSON.parse(event.data)
      switch (data.type){
        case "chat":
          setMessages(prev=>[...prev, data.data])
          break
        case "chatHistory":
          const newMessages = data.data.map(item => item[2])
          setMessages(prev=>[...newMessages, ...prev])
          break
        case "isDrawing":
          externalDraw(data.data, data.type)
          break
        case "doneDrawing":
          externalDraw(data.data, data.type)
          break
      }
    }
  })

  useEffect(()=>{
    hiddenCanvasRef.current = document.createElement("canvas")
    hiddenCanvasRef.current.width = 200
    hiddenCanvasRef.current.height = 200
  },[])

  useEffect(()=>{
    if (roomID){
      reconstructCanvas(roomID)
    }
  },[roomID])
  async function reconstructCanvas(roomID) {
    const response = await getInstructions(roomID)
    if (response){
      const whiteboard = hiddenCanvasRef.current.getContext("2d")
      const mainCanvas = canvasRef.current.getContext("2d")
      response.forEach(instruction => {
        whiteboard.clearRect(0,0,200,200)
        whiteboard.beginPath()
        whiteboard.moveTo(...instruction[0])
        for (let i = 0; i < instruction.length; i++){
          whiteboard.lineTo(...instruction[i])
          whiteboard.stroke()
        }
        mainCanvas.drawImage(hiddenCanvasRef.current,0,0)
      })
    }
  }

  async function handleRoomCreation(){
    const res = await createRoomReq(newRoomName)
    if (res){
      setNewRoomName("")
      setMessages([])
      setRoomID(res)
      setIsCreatingRoom(false)
    }
  }
  async function handleRoomLoad(){
    const res = await validateRoomReq(joinRoomID)
    if(res){
      setMessages([])
      setRoomID(joinRoomID);
      setIsLoadingRoom(false)

    }
  }

  function handleMessage(e) {
    sendJsonMessage({
      "type": "chat",
      "data": newMessage,
      "timestamp": Date.now(),
      "messageID": getUniqueMessageID()
    })
    setNewMessage("")
    setMessages(prev=>[...prev, newMessage])
  }

  function sendBatchStrokes(){
    batchedStrokes.current.batchStroke.unshift(startStrokePoint.current)
    startStrokePoint.current = batchedStrokes.current.batchStroke[batchedStrokes.current.batchStroke.length-1]
    sendJsonMessage({
      "type": "isDrawing",
      "data": batchedStrokes.current.batchStroke
    })
    batchedStrokes.current.batchStroke = []
  }

  function sendStroke(){
    sendJsonMessage({
      "type": "doneDrawing",
      "data": batchedStrokes.current.fullStroke
    })
    batchedStrokes.current.fullStroke = []
  }

  function throttle(func){
    let timerID = null
    let lastFunc = null

    function restartTimer(){
      timerID = setTimeout(()=>{
        timerID = null
        if (lastFunc){
          func(...lastFunc)
          lastFunc = null
          restartTimer()
        }
      },50)
    }

    return (...args) => {
      lastFunc = args
      if (timerID === null){
        restartTimer()
        func(...args)
        lastFunc = null
      }
    }
  }

  function startDrawing(event){
    const whiteboard = canvasRef.current.getContext("2d")
    const whiteboardRect = canvasRef.current.getBoundingClientRect()
    startStrokePoint.current = [Math.round(event.clientX - whiteboardRect.left), Math.round(event.clientY - whiteboardRect.top)]

    whiteboard.fillStyle = "black"
    whiteboard.beginPath()
    whiteboard.moveTo(...startStrokePoint.current)

    batchedStrokes.current.fullStroke.push(startStrokePoint.current)
    const sendBatchStrokesThrottled = throttle(sendBatchStrokes)

    const onMove = (e) => {
      const whiteboardPos = [Math.round(e.clientX - whiteboardRect.left), Math.round(e.clientY - whiteboardRect.top)]
      whiteboard.lineTo(...whiteboardPos)
      whiteboard.stroke()
      batchedStrokes.current.batchStroke.push(whiteboardPos)
      batchedStrokes.current.fullStroke.push(whiteboardPos)
      sendBatchStrokesThrottled()
    }

    const onRelease = (e) => {
      sendStroke()
      canvasRef.current.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onRelease) 
    }
    canvasRef.current.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onRelease)
  }
  function startDrawingMobile(event){
    event.preventDefault()
    const whiteboard = canvasRef.current.getContext("2d")
    const whiteboardRect = canvasRef.current.getBoundingClientRect()
    startStrokePoint.current = [Math.round(event.touches[0].clientX - whiteboardRect.left), Math.round(event.touches[0].clientY - whiteboardRect.top)]

    whiteboard.fillStyle = "black"
    whiteboard.beginPath()
    whiteboard.moveTo(...startStrokePoint.current)

    batchedStrokes.current.fullStroke.push(startStrokePoint.current)
    const sendBatchStrokesThrottled = throttle(sendBatchStrokes)

    const onMove = (e) => {
      e.preventDefault()
      const whiteboardPos = [Math.round(e.touches[0].clientX - whiteboardRect.left), Math.round(e.touches[0].clientY - whiteboardRect.top)]
      whiteboard.lineTo(...whiteboardPos)
      whiteboard.stroke()
      batchedStrokes.current.batchStroke.push(whiteboardPos)
      batchedStrokes.current.fullStroke.push(whiteboardPos)
      sendBatchStrokesThrottled()
    }

    const onRelease = (e) => {
      sendStroke()
      canvasRef.current.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onRelease) 
    }
    canvasRef.current.addEventListener("touchmove", onMove)
    document.addEventListener("touchend", onRelease)
  }

  function externalDraw(commands, type){
    const whiteboard = hiddenCanvasRef.current.getContext("2d")
    whiteboard.clearRect(0,0,200,200)
    whiteboard.fillStyle = "black"
    whiteboard.beginPath()
    whiteboard.moveTo(...commands[0])

    switch (type){
      case "isDrawing":
        for (let i = 1; i < commands.length; i++){
          whiteboard.lineTo(...commands[i])
        }
        whiteboard.stroke()
        break
      case "doneDrawing":
        for (let i = 1; i < commands.length; i++){
          whiteboard.lineTo(...commands[i])
          whiteboard.stroke()
        }
        break
    }
    canvasRef.current.getContext("2d").drawImage(hiddenCanvasRef.current,0,0)
  }
    

  return(
    <div className={styles.platformpage}>
      <div className={styles.sidePanel}>
        <section className={styles.features}>
          <button>Chat</button>
          <button>Documents</button>
          <button>Whiteboard</button>
          <button>Video Chat</button>
        </section>
        <section className={styles.accountHub}>
          {roomID}<br/>
          <div>Account is: </div>
          <section>
            Would you like to create a room or join a room?
            <button onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>Create</button>
            {isCreatingRoom &&
              <span>
                <input 
                type="text" 
                placeholder="New Room Name"
                onChange={(e)=>setNewRoomName(e.target.value)} />
                <button onClick={handleRoomCreation}>Submit</button>
              </span>
            }
            <br />
            <button onClick={()=>{setIsCreatingRoom(false);setIsLoadingRoom(true)}}>Join</button>
            {isLoadingRoom &&
              <span>
                <input type="text" placeholder="Room ID" value={joinRoomID} onChange={(e)=>setJoinRoomID(e.target.value)} />
                <button onClick={handleRoomLoad}>Submit</button>
              </span>
              }
          </section>

        </section>
      </div>
      <div className={styles.mainContent}>
        <section>
          Chat
        </section>
        <section className={styles.chat}>
          {
            messages.map((item,i)=>{
              return (
                <div key={i}>{item}</div>
              )
            })
          }
          {roomID &&
          <div>
            <canvas ref={canvasRef} width={200} height={200} onMouseDown={startDrawing} onTouchStart={startDrawingMobile} style={{backgroundColor:'white'}}/>
          </div>
          }
        </section>
        {roomID &&
        <section className={styles.newChat}>
          Send Message <input type="text" placeholder="New Message" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)}/>
          <button onClick={handleMessage}>Send</button>
        </section>
        }
      </div>
    </div>
  )
}

export default Platform