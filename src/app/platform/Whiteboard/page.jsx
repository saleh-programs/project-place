"use client"
import { useRef, useEffect, useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getInstructions } from "backend/requests"
import Queue from "src/assets/Queue"
import styles from "styles/platform/Whiteboard.module.css"

function Whiteboard(){
  const {sendJsonMessage, roomID, externalDrawRef } = useContext(ThemeContext)

  externalDrawRef.current = externalDraw

  const currentType = useRef("draw") //draw, erase, or fill
  const currentColor = useRef("black")
  const strokeSizeRef = useRef(null)
  
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
    hiddenCanvasRef.current.width = canvasRef.current.width
    hiddenCanvasRef.current.height = canvasRef.current.height
  },[])

  useEffect(()=>{
    if (roomID){
      reconstructCanvas(roomID)
    }
  },[roomID])

  //matbe in future we can 
  async function reconstructCanvas(roomID) {
    const response = await getInstructions(roomID)
    if (response){
      const whiteboard = hiddenCanvasRef.current.getContext("2d")
      const mainCanvas = canvasRef.current.getContext("2d")
      response.forEach(instruction => {
        whiteboard.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
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
      "type": currentType.current,
      "status": "isDrawing",
      "color": currentColor.current,
      "size": strokeSizeRef.current.value,
      "data": batchedStrokes.current.batchStroke
    })
    batchedStrokes.current.batchStroke = []
  }

  function sendStroke(){
    sendJsonMessage({
      "type": currentType.current,
      "status": "doneDrawing",
      "color": currentColor.current,
      "size": strokeSizeRef.current.value,
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
    whiteboard.lineWidth = strokeSizeRef.current.value
    whiteboard.beginPath()
    whiteboard.moveTo(...startStrokePoint.current)
    whiteboard.globalAlpha = 1.0

    batchedStrokes.current.fullStroke.push(startStrokePoint.current)
    const sendBatchStrokesThrottled = throttle(sendBatchStrokes)

    function onMoveDraw(e){
      const whiteboardPos = [Math.round(e.clientX - whiteboardRect.left), Math.round(e.clientY - whiteboardRect.top)]
      whiteboard.lineTo(...whiteboardPos)
      whiteboard.stroke()
      batchedStrokes.current.batchStroke.push(whiteboardPos)
      batchedStrokes.current.fullStroke.push(whiteboardPos)
      sendBatchStrokesThrottled()
    }
     function onReleaseDraw(e){
      sendStroke()
      canvasRef.current.removeEventListener("mousemove", onMoveDraw)
      document.removeEventListener("mouseup", onReleaseDraw) 
    }

    function onMoveErase(e){
      const whiteboardPos = [Math.round(e.clientX - whiteboardRect.left), Math.round(e.clientY - whiteboardRect.top)]
      whiteboard.lineTo(...whiteboardPos)
      whiteboard.stroke()
      batchedStrokes.current.batchStroke.push(whiteboardPos)
      batchedStrokes.current.fullStroke.push(whiteboardPos)
      sendBatchStrokesThrottled()
    }
    function onReleaseErase(e){
      sendStroke()
      canvasRef.current.removeEventListener("mousemove", onMoveErase)
      document.removeEventListener("mouseup", onReleaseErase)
    }

    switch (currentType.current){
      case "draw":
        canvasRef.current.addEventListener("mousemove", onMoveDraw)
        document.addEventListener("mouseup", onReleaseDraw)
        break
      case "erase":
        whiteboard.strokeStyle = "white"
        canvasRef.current.addEventListener("mousemove", onMoveErase)
        document.addEventListener("mouseup", onReleaseErase)
        break
      case "fill":
        console.log("hi")
        canvasFill(event)
    }
  }

  function clearCanvas(){
    const whiteboard = canvasRef.current.getContext("2d")
    // whiteboard.clearRect(0,0,canvasRef.current.width, canvasRef.current.height)
    whiteboard.fillStyle = "white"
    whiteboard.fillRect(0,0,canvasRef.current.width, canvasRef.current.height)
    sendJsonMessage({
      "type": "clear",
    })
  }

  //ignore for now
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

  async function canvasFill(e){
    const whiteboard = canvasRef.current.getContext("2d", { willReadFrequently: true })
    const whiteboardRect = canvasRef.current.getBoundingClientRect()
    const mousePos = [Math.round(e.clientX - whiteboardRect.left), Math.round(e.clientY - whiteboardRect.top)]

    const startColor = whiteboard.getImageData(mousePos[0],mousePos[1],1,1).data

    whiteboard.fillStyle = currentColor.current
    whiteboard.fillRect(mousePos[0],mousePos[1],1,1)
    const fillColor = whiteboard.getImageData(mousePos[0],mousePos[1],1,1).data

    const newPixel = whiteboard.createImageData(1,1)
    newPixel.data.set(startColor,0)
    whiteboard.putImageData(newPixel,mousePos[0],mousePos[1])
    newPixel.data.set(fillColor,0)
    
    const visited = new Uint8Array(canvasRef.current.width * canvasRef.current.height)

    const pixelQueue = new Queue()
    pixelQueue.enqueue([mousePos[0],mousePos[1]])

    const tolerance = 15
    let totalPixels = 0

    while (!pixelQueue.isEmpty()){
      const [x, y] = pixelQueue.dequeue()
      const isInCanvas = (
        (x >= 0 && x < canvasRef.current.width) 
        && 
        (y >=0 && y < canvasRef.current.height))

      if (!isInCanvas || visited[x + y * canvasRef.current.width]){
        continue
      }
      visited[x + y * canvasRef.current.width] = 1
      const currentColor = whiteboard.getImageData(x,y,1,1).data
      const matchesColor = (
        Math.abs(startColor[0] - currentColor[0]) <= tolerance
        &&
        Math.abs(startColor[1] - currentColor[1]) <= tolerance
        &&        
        Math.abs(startColor[2] - currentColor[2]) <= tolerance

      )
      if (!matchesColor){
        continue
      }


      whiteboard.putImageData(newPixel,x,y)
      totalPixels += 1
      if (totalPixels % Math.floor(100000) === 0){
        await new Promise(requestAnimationFrame)
      }
      const neighbors = [
        [x,y-1],[x,y+1],
        [x-1,y],[x+1,y],
      ]
      // for (let i = neighbors.length - 1; i > 0; i--) {
      //   const j = Math.floor(Math.random() * (i + 1));
      //   [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]]
      // }
      // const neighbors = [
      //   [x-1, y-1], [x,y-1], [x+1,y-1],
      //   [x-1,y], [x+1,y],
      //   [x-1,y+1],[x,y+1],[x+1,y+1]
      // ]
      neighbors.forEach(item=>{
        pixelQueue.enqueue(item)
      })
    }
  }
  function externalDraw(data){
    const whiteboard = hiddenCanvasRef.current.getContext("2d")
    whiteboard.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
    whiteboard.beginPath()
    const commands = data.data
    console.log(data.type)
    console.log(data)
    whiteboard.lineWidth = data.size
    switch (data.type){
      case "draw":
        whiteboard.strokeStyle = data.color
        console.log(data.color)
        whiteboard.moveTo(...commands[0])
        if (data.status === "isDrawing"){
          for (let i = 1; i < commands.length; i++){
            whiteboard.lineTo(...commands[i])
          }
          whiteboard.stroke()
          break
        }else if (data.status === "doneDrawing"){
          for (let i = 1; i < commands.length; i++){
            whiteboard.lineTo(...commands[i])
            whiteboard.stroke()
          }
          break
        }
      case "erase":
        whiteboard.strokeStyle = "white"
        console.log(commands)
        for (let i = 1; i < commands.length; i++){
          whiteboard.lineTo(...commands[i])
          whiteboard.stroke()
        }
        break
      case "clear":
        canvasRef.current.getContext("2d").clearRect(0,0,canvasRef.current.width, canvasRef.current.height)
    }
    canvasRef.current.getContext("2d").drawImage(hiddenCanvasRef.current,0,0)
  }

  return (
    <div>
      whiteboard
      {roomID &&
      <div>
        <canvas ref={canvasRef} width={1000} height={1000} onMouseDown={startDrawing} onTouchStart={startDrawingMobile}/>
        <div className={styles.whiteboardHub}>
          <section className={styles.types}>
            <button onClick={()=>{currentType.current = "draw"}}>Draw</button>
            <button onClick={()=>{currentType.current = "erase"}}>Erase</button>
            <button onClick={()=>{currentType.current = "fill"}}>Fill</button>
            <button onClick={clearCanvas}>Clear</button>
            <input ref={strokeSizeRef} onChange={(e)=>console.log(e.target.value)} type="range" min="1" max="30"/>
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