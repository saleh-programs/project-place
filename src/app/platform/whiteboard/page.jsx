"use client"
import { useRef, useEffect, useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"
import Animation from "src/components/Animation"
import styles from "styles/platform/Whiteboard.module.css"

import { draw, fill, clear } from "utils/canvasArt.js"
import { throttle } from "utils/miscellaneous.js"

function Whiteboard(){
  const {sendJsonMessage, roomID, externalWhiteboardRef, username, savedCanvasInfoRe, darkMode} = useContext(ThemeContext)

  const canvasRef = useRef(null)
  const cxtRef = useRef(null)
  const hiddenCanvasRef = useRef(null)
  const hiddenCxt = useRef(null)

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
    "batchStroke": [],
    "startPoint": null
  })
  const colors = [
    "black","white","gray","red","green","orange","blue", "cyan",
    "yellow", "purple", "brown", "pink"
  ]

  useEffect(()=>{  
    externalWhiteboardRef.current = externalWhiteboard
  return ()=>{
    externalWhiteboardRef.current = (param1) => {}
  }
  },[])

  useEffect(()=>{
    if (roomID){
      sendJsonMessage({
        "username": username,
        "origin": "whiteboard",
        "type": "getCanvas"
      })
      cxtRef.current = canvasRef.current.getContext("2d", {willReadFrequently: true})
      hiddenCanvasRef.current = Object.assign(document.createElement("canvas"), {
        "width":canvasRef.current.width, 
        "height": canvasRef.current.width
      })
      hiddenCxt.current = hiddenCanvasRef.current.getContext("2d", {willReadFrequently: true})

      const customizations = {
        "lineCap": "round",
        "lineJoin": "round"
      }
      Object.assign(cxtRef.current, customizations)
      Object.assign(hiddenCxt.current, customizations)
      savedCanvasInfoRef.current["snapshot"] && redrawCanvas()
    }
  },[roomID])

  function externalWhiteboard(data){
    /* when data.type differentiates canvas actions
    from other things we want to do on the whiteboard 
    page, this function will be  alot more meaningful*/
    if (data === "canvasReceived"){
      savedCanvasInfoRef.current["snapshot"] && redrawCanvas()
      return
    }
    handleCanvasAction(data)
  }

  function redrawCanvas(){
    if (!savedCanvasInfoRef.current["snapshot"]){
      return
    }
    cxtRef.current.putImageData(savedCanvasInfoRef.current["snapshot"],0,0)
    for (let i = 0; i <= savedCanvasInfoRef.current["latestOp"]; i++){
      updateCanvas(savedCanvasInfoRef.current["operations"][i])
    }
  }

  function handleCanvasAction(data, client = false){
    const state = savedCanvasInfoRef.current
    switch (data.type){ 
      case "undo":
        state["latestOp"] -= 1
        redrawCanvas()
        break
      case "redo":
        state["latestOp"] += 1
        updateCanvas(state["operations"][state["latestOp"]])
        break
      case "isDrawing":
        updateCanvas(data)
        break
      case "isErasing":
        updateCanvas(data)
        break
      default:
        state["latestOp"] += 1
        state["operations"] = state["operations"].slice(0, state["latestOp"])
        state["operations"].push(data)

        if (state["operations"].length > 10){
          console.log("new snapshot", state["operations"])
          cxtRef.current.putImageData(state["snapshot"], 0, 0)
          for (let i = 0; i <= state["latestOp"]; i++){
            updateCanvas(state["operations"][i])
            if (i == 4){
              state["snapshot"] = cxtRef.current.getImageData(0,0,canvasRef.current.width, canvasRef.current.height)
            }
          }
          state["operations"] = state["operations"].slice(5)
          state["latestOp"] = 5
          return
        }
        !client && updateCanvas(data)
        
    }
  }
  function seeSnapshot(){
    cxtRef.current.putImageData(savedCanvasInfoRef.current["snapshot"],0,0)
  }

  function updateCanvas(data){
    const mapActions = {
      "isErasing": "erase",
      "doneErasing": "erase",
      "isDrawing": "draw",
      "doneDrawing": "draw"
    }

    const action = data.type in mapActions ? mapActions[data.type] : data.type
    const storeOp = cxtRef.current.globalCompositeOperation 
    switch (action){
      case "draw":
        draw(data["data"], hiddenCanvasRef.current, data["metadata"])

        cxtRef.current.globalCompositeOperation = "source-over"
        cxtRef.current.drawImage(hiddenCanvasRef.current,0,0)
        cxtRef.current.globalCompositeOperation = storeOp
        break
      case "erase":
        draw(data["data"], hiddenCanvasRef.current, data["metadata"])

        cxtRef.current.globalCompositeOperation = "destination-out"
        cxtRef.current.drawImage(hiddenCanvasRef.current,0,0)
        cxtRef.current.globalCompositeOperation = storeOp
        break
      case "fill":
        fill(data["data"], canvasRef.current, data["metadata"]["color"])
        break
      case "clear":
        clear(canvasRef.current)
        break
    }
    clear(hiddenCanvasRef.current)
  }

  function sendBatchStrokes(){
    if (strokes.current["batchStroke"].length === 0){
      return
    }

    strokes.current["batchStroke"].unshift(strokes.current["startPoint"])
    strokes.current["startPoint"] = strokes.current["batchStroke"].at(-1) 
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
    if (strokes.current["fullStroke"].length === 0){
      return
    }

    const {type, color, lineWidth} = canvasInfo.current
    const update = {
      "origin": "whiteboard",
      "type": type === "draw" ? "doneDrawing" : "doneErasing",
      "username": username,
      "data": strokes.current["fullStroke"],
      "metadata": {
        "color": color,
        "lineWidth": lineWidth
      }
    }
    sendJsonMessage(update)
    handleCanvasAction(update, true)
    strokes.current["fullStroke"] = []
  }

  function startStroke(event){
    if (canvasInfo.current["type"] !== "draw" && canvasInfo.current["type"] !== "erase"){
      return
    }
    const rect = canvasRef.current.getBoundingClientRect()
    const startPoint = [Math.round((event.clientX - rect.left) / canvasInfo.current["scale"]),Math.round((event.clientY - rect.top)/ canvasInfo.current["scale"])]
    strokes.current = {
      "fullStroke": [startPoint],
      "batchStroke": [],
      "startPoint": startPoint
    }
    const [sendBatchStrokesThrottled, cancelBatchSend] = throttle(sendBatchStrokes)

    draw([strokes.current["startPoint"]], canvasRef.current, {
      "lineWidth": canvasInfo.current["lineWidth"],
      "color": canvasInfo.current["color"],
      "erasing": canvasInfo.current["type"] === "erase"
    })

    let done = false
    let pos = startPoint
    let last = pos;
    function onMoveStroke(e){
      pos = [Math.round((e.clientX - rect.left) / canvasInfo.current["scale"]),Math.round((e.clientY - rect.top) / canvasInfo.current["scale"])]
      if(done){
        return
      }
      done = true
      requestAnimationFrame(()=>{
        draw([pos], canvasRef.current, {persistent: true, prev: last})
        strokes.current["batchStroke"].push(pos)
        strokes.current["fullStroke"].push(pos)
        sendBatchStrokesThrottled()   
        last = pos
        done = false
      })  
    }     

    function onReleaseStroke(e){
      requestAnimationFrame(()=>{
        cancelBatchSend()
        cxtRef.current.lineTo(...last)
        cxtRef.current.stroke()
        sendStroke()
      })

      canvasRef.current.removeEventListener("mousemove", onMoveStroke)
      document.removeEventListener("mouseup", onReleaseStroke) 
    } 
    canvasRef.current.addEventListener("mousemove", onMoveStroke)
    document.addEventListener("mouseup", onReleaseStroke)
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
    if (savedCanvasInfoRef.current["latestOp"] < 0){
      return
    }
    const update = {
      "origin": "whiteboard",
      "type": "undo",
      "username": username,
    }
    sendJsonMessage(update)
    handleCanvasAction(update)
  }
  function redo(){
    if (savedCanvasInfoRef.current["latestOp"] >= savedCanvasInfoRef.current["operations"].length-1){
      return
    }
    const update = {
      "origin": "whiteboard",
      "type": "redo",
      "username": username,
    }  
    sendJsonMessage(update)
    handleCanvasAction(update)
  }

  return (
    <div className={styles.whiteboardPage}>
      <h1 className={styles.title}>
        <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/whiteboard?34" : "/light/whiteboard?34"} type="once" speed={10}/> 
      </h1>
      {roomID &&
      <div className={styles.mainContent}>
        <div className={styles.whiteboardContainer}>
          <div className={styles.whiteboardScrollable}>
            <section className={styles.canvasArea} onMouseDown={navigate}>
              <canvas 
                ref={canvasRef} 
                width={1000} 
                height={1000}
                onMouseDown={startStroke}
                onClick={e=>{
                  if (canvasInfo.current["type"] !== "fill") {
                    return
                  }
                  const rect = canvasRef.current.getBoundingClientRect()
                  const pos = [Math.round((e.clientX - rect.left) / canvasInfo.current["scale"]), Math.round((e.clientY - rect.top) / canvasInfo.current["scale"])]
                  const update = {
                    "origin": "whiteboard",
                    "type": "fill",
                    "username": username,
                    "data": pos,
                    "metadata":{
                      "color": canvasInfo.current["color"]
                    }
                  }
                  sendJsonMessage(update)
                  handleCanvasAction(update)
                }}
                />
            </section>
          </div>
          <button className={styles.clearButton} onClick={()=>{
            const update = {
              "origin": "whiteboard",
              "type": "clear",
              "username": username,
            }
            sendJsonMessage(update)
            handleCanvasAction(update)
          }}>clear</button>
          <span className={styles.reverseButtons}>
            <button className={styles.undoButton} onClick={undo}>undo</button>
            <button className={styles.redoButton} onClick={redo}>redo</button>
          </span>
        </div>
        <div className={styles.tools}>
          <h3>Draw</h3>
          <button onClick={seeSnapshot}>see snapshot</button>
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