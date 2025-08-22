"use client"
import { useRef, useEffect, useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getCanvas, getInstructions, addUndoReq, addRedoReq, getUndoReq, getRedoReq } from "backend/requests"
import Queue from "src/assets/Queue"
import styles from "styles/platform/Whiteboard.module.css"

function Whiteboard(){
  const {sendJsonMessage, roomID, externalDrawRef, username } = useContext(ThemeContext)

  const canvasInfo = useRef({
    "type": "draw",
    "color": "black",
    "lineWidth": 10,
    "scale": 1.0,
    "translateX": 0,
    "translateY": 0,
    "compositionType": "source-over"
  })
  const strokes = useRef({
    "fullStroke": [],
    "batchStroke": []
  })
  const startStrokePoint = useRef(null)
  const canvasRef = useRef(null)
  const cxtRef = useRef(null)
  const hiddenCanvasRef = useRef(null)
  const hiddenCxt = useRef(null)

  const colors = [
    "black","white","gray","red","green","orange","blue", "cyan",
    "yellow", "purple", "brown", "pink"
  ]

  useEffect(()=>{  
    // externalDrawRef.current = externalDraw 

  return ()=>{
    externalDrawRef.current = (param1) => {}
  }
  },[])

  useEffect(()=>{
    if (roomID){
      cxtRef.current = canvasRef.current.getContext("2d")
      hiddenCanvasRef.current = document.createElement("canvas")
      hiddenCxt.current = hiddenCanvasRef.current.getContext("2d")
      // reconstructCanvas(roomID)
    }
  },[roomID])

  // //matbe in future we can 
  // async function reconstructCanvas(roomID) {
  //   const response = await getCanvas(roomID)
  //   if (response){
  //     const img = await createImageBitmap(response)
  //     const whiteboard = canvasRef.current.getContext("2d")
  //     whiteboard.drawImage(img,0,0)
  //   }
  // }

  // function sendBatchStrokes(){
  //   batchedStrokes.current.batchStroke.unshift(startStrokePoint.current)
  //   startStrokePoint.current = batchedStrokes.current.batchStroke[batchedStrokes.current.batchStroke.length-1]
  //   sendJsonMessage({
  //     "origin": "whiteboard",
  //     "type": currentType.current,
  //     "username": username,
  //     "data": batchedStrokes.current.batchStroke,
  //     "metadata": {
  //       "status": "isDrawing",
  //       "color": currentColor.current,
  //       "size": strokeSizeRef.current.value,
  //     }

  //   })
  //   batchedStrokes.current.batchStroke = []
  // }

  // function sendStroke(){
  //   sendJsonMessage({
  //     "origin": "whiteboard",
  //     "type": currentType.current,
  //     "username": username,
  //     "data": batchedStrokes.current.fullStroke,
  //     "metadata": {
  //       "status": "doneDrawing",
  //       "color": currentColor.current,
  //       "size": strokeSizeRef.current.value,
  //     }
  //   })
  //   batchedStrokes.current.fullStroke = []
  //   canvasRef.current.toBlob(blob => addUndoReq(blob, roomID))
  // }

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
    const cxt = cxtRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    startStrokePoint.current = [Math.round(event.clientX - rect.left), Math.round(event.clientY - rect.top)]
    // const sendBatchStrokesThrottled = throttle(sendBatchStrokes)

    cxt.strokeStyle = canvasInfo.current["color"]
    cxt.lineWidth = canvasInfo.current["lineWidth"]

    function onMoveStroke(e){
      const pos = [Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top)]
      cxt.lineTo(...pos)
      cxt.stroke()
      strokes.current.batchStroke.push(pos)
      strokes.current.fullStroke.push(pos)
      // sendBatchStrokesThrottled()      
    }
     function onReleaseStroke(e){
      // sendStroke()
      canvasRef.current.removeEventListener("mousemove", onMoveStroke)
      document.removeEventListener("mouseup", onReleaseStroke) 
      cxt.globalCompositeOperation = "source-over"
    }

    switch (canvasInfo.current["type"]){
      case "draw":
        cxt.beginPath()
        cxt.moveTo(...startStrokePoint.current)
        canvasRef.current.addEventListener("mousemove", onMoveStroke)
        document.addEventListener("mouseup", onReleaseStroke)
        break
      case "erase":
        cxt.globalCompositeOperation = "destination-out"
        cxt.beginPath()
        cxt.moveTo(...startStrokePoint.current)
        canvasRef.current.addEventListener("mousemove", onMoveStroke)
        document.addEventListener("mouseup", onReleaseStroke)
        break
      case "fill":
        canvasFill(...startStrokePoint.current)
        break
    }
  }

  //Just ignore server side for now
  function externalDraw(data){
    const cxt = hiddenCxt.current
    cxt.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)

    switch (data.type){
      case "draw":
        whiteboard.lineWidth = data.metadata.size
        whiteboard.strokeStyle = data.metadata.color
        whiteboard.moveTo(...commands[0])
        if (data.metadata.status === "isDrawing"){
          for (let i = 1; i < commands.length; i++){
            whiteboard.lineTo(...commands[i])
          }
          whiteboard.stroke()
        }else if (data.metadata.status === "doneDrawing"){
          for (let i = 1; i < commands.length; i++){
            whiteboard.lineTo(...commands[i])
            whiteboard.stroke()
          }
        }
        break
      case "erase":
        whiteboard.lineWidth = data.metadata.size
        whiteboard.strokeStyle = "white"
        for (let i = 1; i < commands.length; i++){
          whiteboard.lineTo(...commands[i])
          whiteboard.stroke()
        }
        break
      case "fill":
        canvasFill(data.data[0], data.data[1], data.metadata.color)
        break
      case "clear":
        const mainCanvas =  canvasRef.current.getContext("2d")
        mainCanvas.fillStyle = "white"
        mainCanvas.fillRect(0,0,canvasRef.current.width, canvasRef.current.height)
        break
    }
    canvasRef.current.getContext("2d").drawImage(hiddenCanvasRef.current,0,0)
  }

  function clearCanvas(){
    const cxt = cxtRef.current
    cxt.clearRect(0,0,canvasRef.current.width, canvasRef.current.height)
    // sendJsonMessage({
    //   "origin": "whiteboard",
    //   "type": "clear",
    //   "username": username
    // })
  }

  async function canvasFill(startX, startY){
    const cxt = cxtRef.current
    const startImage = cxt.getImageData(startX, startY,1,1)
    const startColor = startImage.data

    cxt.fillStyle = canvasInfo.current["color"]
    cxt.fillRect(startX,startY,1,1)
    const fillColor = cxt.getImageData(startX,startY,1,1).data
    cxt.putImageData(startImage,startX,startY)

    const canvasImage = cxt.getImageData(0,0,canvasRef.current.width,canvasRef.current.height)
    const canvasData = canvasImage.data

    const visited = new Uint8Array(canvasRef.current.width * canvasRef.current.height)
    const pixelQueue = new Queue()
    pixelQueue.enqueue([startX,startY])
    const tolerance = 70
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
      const val = 4*(x + y * canvasRef.current.width)
      const currentColor = [
        canvasData[val],
        canvasData[val + 1],
        canvasData[val + 2],
        canvasData[val + 3]
      ]

      const RGBdistance = 
        (currentColor[0] - startColor[0])**2 +
        (currentColor[1] - startColor[1])**2 +
        (currentColor[2] - startColor[2])**2 +
        (currentColor[3] - startColor[3])**2
      
      const matchesColor = RGBdistance < tolerance**2
      if (!matchesColor){
        continue
      }
      canvasData[val] = fillColor[0]
      canvasData[val + 1] = fillColor[1]
      canvasData[val + 2] = fillColor[2]
      canvasData[val + 3] = fillColor[3]

      const neighbors = [
        [x,y-1],[x,y+1],
        [x-1,y],[x+1,y],
      ]
      neighbors.forEach(item=>{
        pixelQueue.enqueue(item)
      })
    }
    cxt.putImageData(canvasImage,0,0)
  }

  // function startNavigatingCanvas(e){
  //   if (currentType.current !== "navigate"){
  //     return
  //   }
  //   const whiteboardContainerRect = e.currentTarget.getBoundingClientRect()
  //   let whiteboardRect = canvasRef.current.getBoundingClientRect()
  //   const startMousePos = [Math.round(e.clientX), Math.round(e.clientY)]
  //   const shiftX = canvasStylesRef.current["translateX"]
  //   const shiftY = canvasStylesRef.current["translateY"]

  //   function onMoveNavigate(e){
  //     whiteboardRect = canvasRef.current.getBoundingClientRect()
  //     const mousePos = [Math.round(e.clientX), Math.round(e.clientY)]
  //     const offset = [mousePos[0] - startMousePos[0], mousePos[1] - startMousePos[1]]

  //     let newShiftX = canvasStylesRef.current["translateX"]
  //     let newShiftY = canvasStylesRef.current["translateY"]

  //     const withinHorizontalBounds = whiteboardRect.right + offset[0] >= whiteboardContainerRect.left + 10 && whiteboardRect.left + offset[0] <= whiteboardContainerRect.right - 10
  //     const withinVerticalBounds = whiteboardRect.top + offset[1] <= whiteboardContainerRect.bottom - 10 && whiteboardRect.bottom + offset[1] >= whiteboardContainerRect.top + 10

  //     if (withinHorizontalBounds){
  //       newShiftX = shiftX + offset[0]
  //     }
  //     if (withinVerticalBounds){
  //       newShiftY = shiftY + offset[1]
  //     }
  //     // console.log(whiteboardRect.top + offset[1] >= whiteboardContainerRect.top - 400, whiteboardRect.bottom + offset[1] <= whiteboardContainerRect.bottom + 40)
  //     console.log(whiteboardRect.bottom, offset[1],
  //       whiteboardContainerRect.bottom + 100
  //     )
  //     canvasRef.current.style.transform = `translate(${newShiftX}px, ${newShiftY}px) scale(${canvasStylesRef.current["scale"]})`;
  //     canvasStylesRef.current["translateX"] = newShiftX
  //     canvasStylesRef.current["translateY"] = newShiftY
  //   }

  //   function onReleaseNavigate(e){
  //     document.body.style.userSelect = "";
  //     document.removeEventListener("mousemove", onMoveNavigate)
  //     document.removeEventListener("mouseup", onReleaseNavigate)
  //   }

  //   document.body.style.userSelect = "none";
  //   document.addEventListener("mousemove", onMoveNavigate)
  //   document.addEventListener("mouseup", onReleaseNavigate)
  // }


  return (
    <div className={styles.whiteboardPage}>
      <h1 className={styles.title}>
        Whiteboard
      </h1>
      {roomID &&
      <div className={styles.mainContent}>
        <div className={styles.whiteboardContainer}>
          <div className={styles.whiteboardScrollable}>
            <section className={styles.canvasArea}>
              <canvas ref={canvasRef} width={1000} height={1000} onMouseDown={startDrawing} style={{backgroundColor:"white"}}/>
            </section>
          </div>
          <button className={styles.clearButton} onClick={clearCanvas}>clear</button>
          <span className={styles.reverseButtons}>
            {/* <button className={styles.undoButton} onClick={undoCanvas}>undo</button>
            <button className={styles.redoButton} onClick={redoCanvas}>redo</button> */}
          </span>
        </div>
        <div className={styles.tools}>
          <h3>Draw</h3>
          <section className={styles.modesContainer}>
            <button onClick={()=>{canvasInfo.current["type"] = "draw"}}>Draw</button>
            <button onClick={()=>{canvasInfo.current["type"] = "erase"}}>Erase</button>
            <button onClick={()=>{canvasInfo.current["type"] = "fill"}}>Fill</button>
            <button onClick={()=>{canvasInfo.current["type"] = "navigate"}}>Navigate</button>
            {/* <button onClick={zoomIn}>Zoom In</button>
            <button onClick={zoomOut}>Zoom Out</button> */}

            <input onChange={(e)=>{canvasInfo.current["lineWidth"] = e.target.value}} type="range" min="1" max="30"/>
          </section>
          <h3>Colors</h3>
          <section className={styles.colorsContainer}>
            <section className={styles.colors}>
              {
                colors.map(item=>{
                  return (
                    <span key={item} className={styles.color} style={{backgroundColor:`${item}`}} onClick={() => {canvasInfo.current["color"] = item}}>
                    </span>
                  )
                })
              }
            </section>
          </section>
        </div>
      </div>
      }
    </div>
  )
}
export default Whiteboard