"use client"
import { useRef, useEffect, useContext, useState, useLayoutEffect } from "react"
import ThemeContext from "src/assets/ThemeContext"
import Animation from "src/components/Animation"
import styles from "styles/platform/Whiteboard.module.css"

import { draw, fill,optimizedfill, timeFunction, clear } from "utils/canvasArt.js"
import { throttle } from "utils/miscellaneous.js"
import { HexColorPicker } from "react-colorful"
function Whiteboard(){
  const {sendJsonMessage, roomID, roomName, externalWhiteboardRef, username, savedCanvasInfoRef, darkMode} = useContext(ThemeContext)

  const canvasRef = useRef(null)
  const cxtRef = useRef(null)
  const hiddenCanvasRef = useRef(null)
  const hiddenCxt = useRef(null) 

  const undoRedoTimer = useRef(null)

  const canvasInfo = useRef({
    "type": "draw",
    "color": "black",
    "selectingColor": "black",
    "lineWidth": 3,
    "scale": 1.0,
    "translateX": -500,
    "translateY": -500,
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
  const toolsRef = useRef(null)
  const [queuedColors, setQueuedColors] = useState([])
  const [selectedTool, setSelectedTool] = useState("draw")
  const [selectedColor, setSelectedColor] = useState("black")
  const [isSelecting, setIsSelecting] = useState(false)
  const pixelInputsRef = useRef(null)
  const colorSelectorRef = useRef(null)
  const [previewURL, setPreviewURL] = useState(null)

  const fillToggle = useRef(false)

  useEffect(()=>{  
    externalWhiteboardRef.current = externalWhiteboard

    const exitPicker = (e) => {
      if (colorSelectorRef.current && !colorSelectorRef.current.contains(e.target)){
        setIsSelecting(false)
        setSelectedColor(canvasInfo.current["selectingColor"])
        changeColor(canvasInfo.current["selectingColor"])
        return
      }
    }
    document.addEventListener("mousedown", exitPicker)
  return ()=>{
    externalWhiteboardRef.current = (param1) => {}
    document.removeEventListener("mousedown", exitPicker)

  }
  },[])

  useEffect(()=>{
    if (!roomID) return

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
    
  },[roomID])

  useLayoutEffect(()=>{
    canvasRef.current && zoom("out")
  },[roomID])  

  function externalWhiteboard(data){
    /* when data.type differentiates canvas actions
    from other things we want to do on the whiteboard 
    page, this function will be much more meaningful*/
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
        // state["operations"].push(data)

        if (state["operations"].length > 10){
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

        cxtRef.current.globalCompositeOperation = "destfillination-out"
        cxtRef.current.drawImage(hiddenCanvasRef.current,0,0)
        cxtRef.current.globalCompositeOperation = storeOp
        break
      case "fill":
        if (fillToggle.current){
          const dt = timeFunction(()=>{
            fill(data["data"], canvasRef.current, data["metadata"]["color"])
          })
          console.log("normal fill took", dt)
        }else{
          const dt = timeFunction(()=>{
            optimizedfill(data["data"], canvasRef.current, data["metadata"]["color"])
          })
          console.log("optimized fill took", dt)

        }
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
    if (!["draw", "erase"].includes(canvasInfo.current["type"]) || event.button === 1){
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
  function clickCanvas(e){
    if (!["fill", "colorpick"].includes(canvasInfo.current?.["type"]) || !canvasRef.current) {
      return
    }
    const rect = canvasRef.current.getBoundingClientRect()
    const pos = [Math.round((e.clientX - rect.left) / canvasInfo.current["scale"]), Math.round((e.clientY - rect.top) / canvasInfo.current["scale"])]

    if (canvasInfo.current["type"] === "colorpick"){
        const color = cxtRef.current.getImageData(pos[0], pos[1],1,1).data
        const formattedColor = `rgba(${color[0]},${color[1]},${color[2]},${255})`
        changeColor(formattedColor)
        return
    }
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

  }

  function handleKeyPress(e){
    if (e.repeat) return
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z"){
      redo()
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === "z"){
      undo()
      return
    }
  }

  function navigate(e){
    if (canvasInfo.current["type"] !== "navigate" && e.button !== 1){
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
    if (undoRedoTimer.current || savedCanvasInfoRef.current["latestOp"] < 0){
      return
    }
    undoRedoTimer.current = setTimeout(()=>{
      undoRedoTimer.current = null
    }, 50)

    const update = {
      "origin": "whiteboard",
      "type": "undo",
      "username": username,
    }
    sendJsonMessage(update)
    handleCanvasAction(update)
  }
  function redo(){
    if (undoRedoTimer.current || savedCanvasInfoRef.current["latestOp"] >= savedCanvasInfoRef.current["operations"].length-1){
      return
    }
    undoRedoTimer.current = setTimeout(()=>{
      undoRedoTimer.current = null
    }, 50)
    const update = {
      "origin": "whiteboard",
      "type": "redo",
      "username": username,
    }  
    sendJsonMessage(update)
    handleCanvasAction(update)
  } 
  async function capturePNG(){
    if (!canvasRef.current) return

    const blob = await new Promise(resolve=>{
      canvasRef.current.toBlob(b=>resolve(b), "image/png")
    })
    const url = URL.createObjectURL(blob)

    const tempLink = document.createElement("a")
    tempLink.href = url
    const formattedDate = new Date().toISOString().split(":")
    tempLink.download = `${roomName} ${formattedDate[0]}:${formattedDate[1]}.png`
    document.body.appendChild(tempLink)
    tempLink.click()
    document.body.removeChild(tempLink)

    setPreviewURL(url)
    setTimeout(()=>{
      URL.revokeObjectURL(url)
      setPreviewURL(null)
    },5000)
    
  }

  function changeLineWidth(e){
    if (e.target.value < 1 || e.target.value > 30){
      e.target.value = canvasInfo.current["lineWidth"]
      return
    }
    canvasInfo.current["lineWidth"] = e.target.value
    const elems = pixelInputsRef.current.querySelectorAll("*")
    if ([...elems].some((elem)=>!elem)){
      return
    }
    elems[0].value = e.target.value
    elems[1].value = e.target.value
    elems[2].style.width = `${e.target.value}px`
    elems[2].style.height = `${e.target.value}px`
  }
  function changeColor(color){
    if (canvasInfo.current["color"] === color){
      return
    }
    canvasInfo.current["color"] = color;
    setQueuedColors(prev=>[color,...prev].slice(0,8))
    setSelectedColor(color)
  }
  return (
    <div className={`${styles.whiteboardPage} ${darkMode ? styles.darkMode : ""}`} onKeyDown={handleKeyPress} tabIndex={0}>
      <h1 className={styles.title}>
        <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/whiteboard?34" : "/light/whiteboard?34"} type="once" speed={10}/> 
      </h1>
      {roomID &&
      <div className={styles.mainContent}>
        <div className={styles.whiteboardContainer}>
          <div className={styles.whiteboardScrollable} onMouseDown={navigate}>
              <canvas 
                ref={canvasRef} 
                width={1000} 
                height={1000}
                onMouseDown={startStroke}
                onClick={clickCanvas}
                />
                <span style={{backgroundColor: selectedColor}} className={styles.selectedColor} onClick={(e)=>{
                  setIsSelecting(true)
                }}>
                  {isSelecting &&
                  <span ref={colorSelectorRef}>
                    <HexColorPicker color={"#000000"} onChange={(c)=>{
                      canvasInfo.current["selectingColor"] = c;
                      }}/>
                  </span>
                  }
                </span>
          </div>
          <section className={styles.quickToolbar}>
            <span className={styles.reverseButtons}>
              <button className={styles.undoButton} onClick={undo}><img src="/tool_icons/undo.png" alt="undo" /></button>
              <button className={styles.redoButton} onClick={redo}><img src="/tool_icons/redo.png" alt="redo" /></button>
              <button onClick={()=>zoom("in")}><img src="/tool_icons/zoomin.png" alt="zoom in" /></button>
              <button onClick={()=>zoom("out")}><img src="/tool_icons/zoomout.png" alt="zoom out" /></button>
              <button onClick={()=>{fillToggle.current=!fillToggle.current}}>{fillToggle.current ? "normal fill active" : "optimized fill is active"}</button>
            </span>
            <button className={styles.clearButton} onClick={()=>{
              const update = {
                "origin": "whiteboard",
                "type": "clear",
                "username": username,
              }
              sendJsonMessage(update)
              handleCanvasAction(update)
            }}>CLEAR
            </button>
            
          </section>
        </div>
        <div ref={toolsRef} className={styles.tools}>
          <span 
          onMouseEnter={(e)=>{
            const imgElem = e.currentTarget.querySelectorAll("*")?.[0]
            if (imgElem) imgElem.src = "/wb_handle/1.png"
          }}
          onMouseLeave={(e)=>{
            const imgElem = e.currentTarget.querySelectorAll("*")?.[0]
            if (imgElem) imgElem.src = "/wb_handle/0.png"
          }}
          onMouseDown={(e)=>{
            const imgElem = e.currentTarget.querySelectorAll("*")?.[0]
            if (!imgElem) return
            toolsRef.current.style.transform = toolsRef.current.style.transform === "translate(285px, -50%)" ? "translate(0, -50%)" : "translate(285px, -50%)"
          }}
          > 
            <img src="/wb_handle/0.png" alt="handle" />
          </span>
          <section className={`${styles.modesContainer} ${styles.specialTools}`}>
            <button onClick={()=>{capturePNG()}}><img src="/tool_icons/camera.png" alt="snapshot" /></button>
          </section>
          <span className={styles.separator}></span>
          <section className={styles.modesContainer}>
            <button className={selectedTool === "draw" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "draw";setSelectedTool("draw")}}><img src="/tool_icons/pencil.png" alt="draw" /></button>
            <button className={selectedTool === "erase" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "erase";setSelectedTool("erase")}}><img src="/tool_icons/eraser.png" alt="erase" /></button>
            <button className={selectedTool === "fill" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "fill";setSelectedTool("fill")}}><img src="/tool_icons/fill.png" alt="fill" /></button>
            <button className={selectedTool === "colorpick" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "colorpick";setSelectedTool("colorpick")}}><img src="/tool_icons/colorpicker.png" alt="color picker" /></button>
            <button className={selectedTool === "navigate" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "navigate";setSelectedTool("navigate")}}><img src="/tool_icons/navigate.png" alt="draw" /></button>
          </section>
          <section ref={pixelInputsRef} className={styles.pixelInput}>
            <input type="range" min={1} max={30} defaultValue={canvasInfo.current["lineWidth"]} onChange={changeLineWidth} />
            <input type="number" min={1} max={30} defaultValue={canvasInfo.current["lineWidth"]} onChange={changeLineWidth} />
            <span className={styles.pixelSize} style={{backgroundColor: selectedColor}}></span>
          </section>
          <span className={styles.separator}></span>
          <section className={styles.colorsContainer}>
              { 
                colors.map(item=>{
                  return (
                    <span 
                    key={item} 
                    className={styles.color} 
                    style={{backgroundColor:`${item}`}} 
                    onClick={()=>changeColor(item)}>
                    </span>
                  )
                })
              }
          </section>
          <span className={styles.separator}></span>
          <section className={styles.colorQueue}>
              {
                queuedColors.map((item,i)=>{
                  return (
                    <span 
                    key={`${item}${i}`} 
                    className={styles.color} 
                    style={{backgroundColor:`${item}`}} 
                    onClick={()=>changeColor(item)}>
                    </span>
                  )
                })
              }
          </section>
        </div>
      </div>
      }
      {previewURL && <span className={styles.screenshotPreview} ><img src={previewURL} alt="preview"/></span>}
    </div>
  )
}
export default Whiteboard