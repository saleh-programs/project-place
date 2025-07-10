"use client"
import { useRef, useEffect, useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getInstructions } from "backend/requests"
import styles from "styles/platform/Whiteboard.module.css"

function Whiteboard(){
  const {sendJsonMessage, roomID, externalDrawRef } = useContext(ThemeContext)
  externalDrawRef.current = externalDraw

  const currentType = useRef("draw")
  const currentColor = useRef("black")
  
//drawCommands, chats, 
  const batchedStrokes = useRef({
    "fullStroke": [],
    "batchStroke": []
  })
  const startStrokePoint = useRef(null)
  const canvasRef = useRef(null)
  const hiddenCanvasRef = useRef(null)

  const colors = [
    "black","white","gray","red","green","orange","blue", "cyan",
    "yellow", "purple", "brown", "pink"
  ]
  
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

    whiteboard.strokeStyle = currentColor.current
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

  return (
    <div>
      whiteboard
      {roomID &&
      <div>
        <canvas ref={canvasRef} width={200} height={200} onMouseDown={startDrawing} onTouchStart={startDrawingMobile} style={{backgroundColor:'white'}}/>
        <div className={styles.whiteboardHub}>
          <section className={styles.types}>
            <button onClick={()=>{currentType.current = "draw"}}>Draw</button>
            <button onClick={()=>{currentType.current = "erase"}}>Erase</button>
            <button onClick={()=>{currentType.current = "fill"}}>Fill</button>
          </section>
          <section className={styles.colors}>
            {
              colors.map(item=>{
                return (
                  <span key={item} className={styles.color} style={{backgroundColor:`${item}`}} onClick={() => {currentColor.current = item}}>
                  </span>
                )
              })
            }
          </section>
        </div>
      </div>
      }
    </div>
  )
}
export default Whiteboard