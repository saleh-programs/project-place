"use client"
import { useRef, useEffect, useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getCanvas, getInstructions, addUndoReq, addRedoReq, getUndoReq, getRedoReq } from "backend/requests"
import Queue from "src/assets/Queue"
import styles from "styles/platform/Whiteboard.module.css"
import { resolve } from "styled-jsx/css"

function Whiteboard(){
  const {sendJsonMessage, roomID, externalDrawRef, username } = useContext(ThemeContext)

  const canvasInfo = useRef({
    "type": "idle",
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

  const undoStates = useRef([])
  const redoStates = useRef([])

  const colors = [
    "black","white","gray","red","green","orange","blue", "cyan",
    "yellow", "purple", "brown", "pink"
  ]

  useEffect(()=>{  
    externalDrawRef.current = externalDraw 

  return ()=>{
    externalDrawRef.current = (param1) => {}
  }
  },[])

  useEffect(()=>{
    if (roomID){
      cxtRef.current = canvasRef.current.getContext("2d", {willReadFrequently: true})
      hiddenCanvasRef.current = document.createElement("canvas")
      hiddenCanvasRef.current.width = canvasRef.current.width
      hiddenCanvasRef.current.height = canvasRef.current.height
      hiddenCxt.current = hiddenCanvasRef.current.getContext("2d")

      handleCanvasAction(cxtRef.current.getImageData(0,0,canvasRef.current.width, canvasRef.current.height))
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

  function sendBatchStrokes(){
    strokes.current["batchStroke"].unshift(startStrokePoint.current)
    startStrokePoint.current = strokes.current["batchStroke"].at(-1) 
    const {type, color, lineWidth} = canvasInfo.current
    sendJsonMessage({
      "origin": "whiteboard",
      "type": type === "draw" ? "isDrawing" : "isErasing",
      "username": username,
      "data": strokes.current["batchStroke"],
      "metadata": {
        "color": color,
        "lineWidth": lineWidth,
      }

    })
    strokes.current["batchStroke"] = []
  }

  function sendStroke(){
    const {type, color, lineWidth} = canvasInfo.current

    sendJsonMessage({
      "origin": "whiteboard",
      "type": type === "draw" ? "doneDrawing" : "doneErasing",
      "username": username,
      "data": strokes.current["fullStroke"],
      "metadata": {
        "color": color,
        "lineWidth": lineWidth
      }
    })
    strokes.current["fullStroke"] = []
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
  function handleCanvasAction(state){
      undoStates.current.push(state)
      undoStates.current.length > 10 && undoStates.current.shift()
      redoStates.current = []
  }

  function startStroke(event){
    if (canvasInfo.current["type"] === "navigate"){
      return
    }
    const cxt = cxtRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    startStrokePoint.current = [Math.round((event.clientX - rect.left) /canvasInfo.current["scale"]),Math.round((event.clientY - rect.top)/canvasInfo.current["scale"])]
    strokes.current["batchStroke"] = []
    strokes.current["fullStroke"] = [startStrokePoint.current]

    const sendBatchStrokesThrottled = throttle(sendBatchStrokes)

    const isErasing = canvasInfo.current["type"] == "erase"
    draw([startStrokePoint.current], cxt, isErasing)

    let done = false
    function onMoveStroke(e){
      if(!done){
        done = true
        requestAnimationFrame(()=>{
          const scaledPos = [Math.round((e.clientX - rect.left) /canvasInfo.current["scale"]),Math.round((e.clientY - rect.top) /canvasInfo.current["scale"])]
          draw([scaledPos], cxt, isErasing, {persistent: true})
          strokes.current["batchStroke"].push(scaledPos)
          strokes.current["fullStroke"].push(scaledPos)
          sendBatchStrokesThrottled()   
          done = false
        })  
      } 
    }

    function onReleaseStroke(e){
      sendStroke()
      handleCanvasAction(cxt.getImageData(0,0,canvasRef.current.width, canvasRef.current.height))

      canvasRef.current.removeEventListener("mousemove", onMoveStroke)
      document.removeEventListener("mouseup", onReleaseStroke) 
    } 

    canvasRef.current.addEventListener("mousemove", onMoveStroke)
    document.addEventListener("mouseup", onReleaseStroke)
  }

  function draw(commands, context, erase, options = {}){
      const {
        lineWidth=canvasInfo.current["lineWidth"], 
        color=canvasInfo.current["color"], 
        persistent=false} = options

      if (persistent){
        for (let i = 0; i < commands.length; i++){
          context.lineTo(...commands[i])
          context.stroke()
        }
        return
      }

      context.lineWidth = lineWidth
      context.strokeStyle = color
      context.globalCompositeOperation = erase ? "destination-out" : "source-over"

      context.beginPath()
      context.moveTo(...commands[0])
      for (let i = 1; i < commands.length; i++){
        context.lineTo(...commands[i])
        context.stroke()
      }

  }

  function fill([X,Y], options={}){
    const {color=canvasInfo.current["color"]} = options

    const cxt = cxtRef.current

    // store starting color
    const startImage = cxt.getImageData(X, Y,1,1)
    const startColor = startImage.data

    // get computed fill color 
    cxt.fillStyle = color
    cxt.fillRect(X,Y,1,1)
    const fillColor = cxt.getImageData(X,Y,1,1).data
    cxt.putImageData(startImage,X,Y)


    const canvasImage = cxt.getImageData(0,0,canvasRef.current.width,canvasRef.current.height)
    const canvasData = canvasImage.data

    //bfs fill
    const visited = new Uint8Array(canvasRef.current.width * canvasRef.current.height)
    const pixelQueue = new Queue()
    pixelQueue.enqueue([X,Y])
    const tolerance = 70

    while (!pixelQueue.isEmpty()){
      const [x, y] = pixelQueue.dequeue()
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
      neighbors.forEach((item)=>{
        const isInCanvas = (item[0] >= 0 && item[0] < canvasRef.current.width) && (item[1] >=0 && item[1] < canvasRef.current.height);
        if (!visited[item[0] + item[1] * canvasRef.current.width] && isInCanvas){
          pixelQueue.enqueue(item);
          visited[item[0] + item[1] * canvasRef.current.width] = 1
        }
      })
    }
    cxt.putImageData(canvasImage,0,0)

    if (Object.keys(options).length == 0){
      handleCanvasAction(canvasImage)
      sendJsonMessage({
        "origin": "whiteboard",
        "type": "fill",
        "username": username,
        "data": [X,Y],
        "metadata":{
          "color": canvasInfo.current["color"]
        }
      })
    }
  }

  function clear(context, options={}){
    const {clientClear = true} = options
    console.log(context)
    context.clearRect(0,0,canvasRef.current.width, canvasRef.current.height)

    if (clientClear){
      handleCanvasAction(context.getImageData(0,0,canvasRef.current.width, canvasRef.current.height))
      sendJsonMessage({
        "origin": "whiteboard",
        "type": "clear",
        "username": username
      })
    }
  }

  function navigate(e){
    if (canvasInfo.current["type"] !== "navigate"){
      return
    }
    const containerRect = e.currentTarget.getBoundingClientRect()
    let canvasRect = canvasRef.current.getBoundingClientRect()
    const startMousePos = [Math.round(e.clientX), Math.round(e.clientY)]
    const shiftX = canvasInfo.current["translateX"]
    const shiftY = canvasInfo.current["translateY"]

    function onMoveNavigate(e){
      const pos = [Math.round(e.clientX), Math.round(e.clientY)]
      const offset = [pos[0] - startMousePos[0], pos[1] - startMousePos[1]]

      let newShiftX = canvasInfo.current["translateX"]
      let newShiftY = canvasInfo.current["translateY"]

      const withinHorizontalBounds = canvasRect.right + offset[0] >= containerRect.left + 10 && canvasRect.left + offset[0] <= containerRect.right - 10
      const withinVerticalBounds = canvasRect.top + offset[1] <= containerRect.bottom - 10 && canvasRect.bottom + offset[1] >= containerRect.top + 10

      if (withinHorizontalBounds){
        newShiftX = shiftX + offset[0]
      }
      if (withinVerticalBounds){
        newShiftY = shiftY + offset[1]
      }
      canvasRef.current.style.transform = `translate(${newShiftX}px, ${newShiftY}px) scale(${canvasInfo.current["scale"]})`;
      canvasInfo.current["translateX"] = newShiftX
      canvasInfo.current["translateY"] = newShiftY
    }

    function onReleaseNavigate(e){
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMoveNavigate)
      document.removeEventListener("mouseup", onReleaseNavigate)
    }

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMoveNavigate)
    document.addEventListener("mouseup", onReleaseNavigate)
  }
  function zoom(type){
    const increment = type === "in" ? 0.2 :  -0.2
    canvasInfo.current["scale"] = Math.max(0.5, Math.min(canvasInfo.current["scale"] + increment,1.5))
    canvasRef.current.style.transform = `translate(${canvasInfo.current["translateX"]}px, ${canvasInfo.current["translateY"]}px) scale(${canvasInfo.current["scale"]})`;
  }
  function undo(){
    const cxt = cxtRef.current
    if (undoStates.current.length > 1){
      redoStates.current.push(undoStates.current.pop())
      cxt.putImageData(undoStates.current.at(-1), 0, 0)
    }
  }
  function redo(){
    const cxt = cxtRef.current
    if (redoStates.current.length > 0){
      undoStates.current.push(redoStates.current.pop())
      cxt.putImageData(undoStates.current.at(-1), 0, 0)
    }
  }


  function externalDraw(data){
    const cxt = hiddenCxt.current

    if (data.type === "isErasing" || data.type === "doneErasing"){
      data.type = "erase"
    }else if (data.type === "isDrawing" || data.type === "doneDrawing"){
      data.type = "draw"
    }

    switch (data.type){
      case "draw":
        draw(data["data"], cxt, false, data["metadata"])
        cxtRef.current.drawImage(hiddenCanvasRef.current,0,0)
        break
      case "erase":
        draw(data["data"], cxt, false, data["metadata"])

        const storeOp = cxtRef.current.globalCompositeOperation 
        cxtRef.current.globalCompositeOperation = "destination-out"
        cxtRef.current.drawImage(hiddenCanvasRef.current,0,0)
        cxtRef.current.globalCompositeOperation = storeOp
        break
      case "fill":
        fill(data["data"], data["metadata"])
        break
      case "clear":
        clear(cxtRef.current, {clientClear: false})
        break
    }
    clear(cxt, {clientClear: false})
  }


  return (
    <div className={styles.whiteboardPage}>
      <h1 className={styles.title}>
        Whiteboard
      </h1>
      {roomID &&
      <div className={styles.mainContent}>
        <div className={styles.whiteboardContainer}>
          <div className={styles.whiteboardScrollable}>
            <section className={styles.canvasArea} onMouseDown={navigate}>
              <canvas ref={canvasRef} width={1000} height={1000} onMouseDown={startStroke}
              onClick={e=>{
                const rect = canvasRef.current.getBoundingClientRect()
                canvasInfo.current["type"] === "fill" && fill([Math.round((e.clientX - rect.left) / canvasInfo.current["scale"]), Math.round((e.clientY - rect.top) / canvasInfo.current["scale"])])
                }}/>
            </section>
          </div>
          <button className={styles.clearButton} onClick={()=>clear(cxtRef.current)}>clear</button>
          <span className={styles.reverseButtons}>
            <button className={styles.undoButton} onClick={undo}>undo</button>
            <button className={styles.redoButton} onClick={redo}>redo</button>
          </span>
        </div>
        <div className={styles.tools}>
          <h3>Draw</h3>
          <section className={styles.modesContainer}>
            <button onClick={()=>{canvasInfo.current["type"] = "draw"}}>Draw</button>
            <button onClick={()=>{canvasInfo.current["type"] = "erase"}}>Erase</button>
            <button onClick={()=>{canvasInfo.current["type"] = "fill"}}>Fill</button>
            <button onClick={()=>{canvasInfo.current["type"] = "navigate"}}>Navigate</button>
            <button onClick={()=>zoom("in")}>Zoom In</button>
            <button onClick={()=>zoom("out")}>Zoom Out</button>

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