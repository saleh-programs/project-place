"use client"
import { memo, useRef, useEffect, useContext, useState, useLayoutEffect, use } from "react"
import { HexColorPicker } from "react-colorful"

import { UserContext, AppearanceContext, RoomContext, WhiteboardContext, WebSocketContext } from "src/providers/contexts"
import Animation from "src/components/Animation"
import { draw, linefill as fill, clear, importImage, moveArea } from "utils/canvasArt.js"
import { throttle } from "utils/miscellaneous.js"

import styles from "styles/platform/Whiteboard.module.css"


function Whiteboard(){
  const {username} = useContext(UserContext)
  const {darkMode} = useContext(AppearanceContext)
  const {roomID, roomName, externalWhiteboardRef} = useContext(RoomContext)
  const {savedCanvasInfoRef} = useContext(WhiteboardContext)
  const {sendJsonMessage} = useContext(WebSocketContext)

  const canvasRef = useRef(null)
  const hiddenCanvasRef = useRef(null)
  const transformedCanvasViewRef = useRef(null)

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
  const [isSelectingColor, setIsSelectingColor] = useState(false)
  const pixelInputsRef = useRef(null)
  const colorSelectorRef = useRef(null)
  const [previewURL, setPreviewURL] = useState(null)

  const [selectingState, setSelectingState] = useState("off")
  const selectAreaRef = useRef(null)
  const selectedRegion = useRef(null)
  const mouseDownTimeRef = useRef(null)
  const completeSelectionButtonsRef = useRef(null)
  const [completeSelectionPos, setCompleteSelectionPos] = useState(null)

  const [isImporting, setIsImporting] = useState(false)
  const storeImportRef = useRef(null)
  const importInputRef = useRef(null)
  const [selectedAnchor, setSelectedAnchor] = useState(null)
  const [importErrorMsg, setImportErrorMsg] = useState("")

  useEffect(()=>{  
    externalWhiteboardRef.current = externalWhiteboard

    const exitPicker = (e) => {
      if (colorSelectorRef.current && !colorSelectorRef.current.contains(e.target)){
        setIsSelectingColor(false)
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

    hiddenCanvasRef.current = Object.assign(document.createElement("canvas"), {
      "width":canvasRef.current.width, 
      "height": canvasRef.current.width
    })

    const customizations = {
      "lineCap": "round",
      "lineJoin": "round"
    }
    Object.assign(canvasRef.current.getContext("2d"), customizations)
    Object.assign(hiddenCanvasRef.current.getContext("2d"), customizations)

    return () => {
      savedCanvasInfoRef.current["snapshot"] = null
    }
    
  },[roomID])

  useLayoutEffect(()=>{
    canvasRef.current && zoom("out")
  },[roomID])  

  useEffect(()=>{
    if (selectedTool !== "select" && selectingState !== "off"){
      clear(selectAreaRef.current)
      setSelectingState("off")
    }
  },[selectedTool])

  function externalWhiteboard(data){
    /* when data.type differentiates canvas actions
    from other things we want to do on the whiteboard 
    page, this function will be much more meaningful*/
    if (data === "canvasReceived"){
      savedCanvasInfoRef.current["snapshot"] && rebuildCanvas()
      return
    }
    handleCanvasAction(data)
  }

  async function rebuildCanvas(updateSnapshot = false) {
    if (!savedCanvasInfoRef.current["snapshot"]){
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = 1000
    canvas.height = 1000

    canvas.getContext("2d").drawImage(savedCanvasInfoRef.current["snapshot"], 0, 0)
    for (let i = 0; i <= savedCanvasInfoRef.current["latestOp"]; i++){
      await updateCanvas(savedCanvasInfoRef.current["operations"][i], canvas)

      //used when operations list is full in handleCanvasAction
      if (updateSnapshot && i == 4){
        clear(savedCanvasInfoRef.current["snapshot"])
        savedCanvasInfoRef.current["snapshot"].getContext("2d").drawImage(canvas, 0, 0)
      }
    }
    
    const cxt = canvasRef.current.getContext("2d")
    cxt.globalCompositeOperation = "source-over"
    clear(canvasRef.current)
    canvasRef.current.getContext("2d").drawImage(canvas, 0, 0)
  }

  async function handleCanvasAction(data, client = false){
    const state = savedCanvasInfoRef.current
    switch (data.type){ 
      case "undo":
        state["latestOp"] -= 1
        await rebuildCanvas()
        break
      case "redo":
        state["latestOp"] += 1
        await updateCanvas(state["operations"][state["latestOp"]])
        break
      case "isDrawing":
        await updateCanvas(data)
        break
      case "isErasing":
        await updateCanvas(data)
        break
      default:
        state["latestOp"] += 1
        state["operations"] = state["operations"].slice(0, state["latestOp"])
        state["operations"].push(data)

        if (state["operations"].length > 10){
          console.log("fired")
          await rebuildCanvas(true)

          state["operations"] = state["operations"].slice(5)
          state["latestOp"] = 5
          return
        }

        !client && await updateCanvas(data)
    }
  }
  async function updateCanvas(data, falseCanvas=null){
    let canvas = canvasRef.current
    let cxt = canvasRef.current.getContext("2d")
    if (falseCanvas){
      canvas = falseCanvas
      cxt = falseCanvas.getContext("2d")
    }
    const mapActions = {
      "isErasing": "erase",
      "doneErasing": "erase",
      "isDrawing": "draw",
      "doneDrawing": "draw"
    }

    const action = data.type in mapActions ? mapActions[data.type] : data.type
    const storeOp = cxt.globalCompositeOperation 
    switch (action){
      case "draw":
        draw(data["data"], hiddenCanvasRef.current, data["metadata"])

        cxt.globalCompositeOperation = "source-over"
        cxt.drawImage(hiddenCanvasRef.current,0,0)
        cxt.globalCompositeOperation = storeOp
        break
      case "erase":
        draw(data["data"], hiddenCanvasRef.current, data["metadata"])

        cxt.globalCompositeOperation = "destination-out"
        cxt.drawImage(hiddenCanvasRef.current,0,0)
        cxt.globalCompositeOperation = storeOp
        break
      case "fill":
        fill(data["data"], canvas, data["metadata"]["color"])
        break
      case "clear":
        clear(canvas)
        break
      case "import": 
        const img = new Image()
        await new Promise(resolve => {
          img.onload = resolve
          img.src = data["data"]
        })
        importImage(img, canvas, data["metadata"]["anchor"])
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

  async function sendStroke(){
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
    await handleCanvasAction(update, true)
    strokes.current["fullStroke"] = []
  }

  function handleCanvasMouseDown(e){
    if (["draw", "erase"].includes(canvasInfo.current["type"]) && e.button !== 1){
      startStroke(e)
      return
    }
  }
  
  function startSelect(event){
    if (!canvasRef.current || selectAreaRef.current?.matches(":hover") || selectingState === "full"){
      return
    }
    if (selectedRegion.current){
      if (selectAreaRef.current){
        selectAreaRef.current.style.width = "0"
        selectAreaRef.current.style.height = "0"
        clear(selectAreaRef.current)
      }
      
      clearInterval(selectedRegion.current["regionUpdateInterval"])
      selectedRegion.current = null
    }

    const container = event.currentTarget
    const rect = canvasRef.current.getBoundingClientRect()
    const startPoint = [Math.round((event.clientX - rect.left) / canvasInfo.current["scale"]),Math.round((event.clientY - rect.top)/ canvasInfo.current["scale"])]
    setSelectingState("on")

    let done = false
    function onMoveSelect(e){
      if (done) return
      done = true
      requestAnimationFrame(()=>{
        if (!selectAreaRef.current) return

        const pos = [Math.round((e.clientX - rect.left) / canvasInfo.current["scale"]),Math.round((e.clientY - rect.top) / canvasInfo.current["scale"])]
        const width = Math.abs(startPoint[0] - pos[0])
        const height = Math.abs(startPoint[1] - pos[1])
        let left = startPoint[0] < pos[0] ? startPoint[0] : pos[0]
        let top = startPoint[1] < pos[1] ? startPoint[1] : pos[1]
        selectAreaRef.current.style.width = `${width}px`
        selectAreaRef.current.style.height = `${height}px`
        selectAreaRef.current.style.top = `${top}px`
        selectAreaRef.current.style.left = `${left}px`
        done = false
      })
    }

    function onReleaseSelect(){
      setSelectingState("empty")
      container.removeEventListener("mousemove", onMoveSelect)
      document.removeEventListener("mouseup", onReleaseSelect) 
    } 

    container.addEventListener("mousemove", onMoveSelect)
    document.addEventListener("mouseup", onReleaseSelect)
  }

  function moveSelectedArea(event){
    if (!canvasRef.current) return

    setSelectingState("empty")
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const selectRect = selectAreaRef.current.getBoundingClientRect()
    const startPoint = [Math.round((event.clientX - canvasRect.left) / canvasInfo.current["scale"]), Math.round((event.clientY - canvasRect.top) / canvasInfo.current["scale"])]
    
    const currentTop = Math.round((selectRect.top - canvasRect.top) / canvasInfo.current["scale"])
    const currentLeft = Math.round((selectRect.left - canvasRect.left) / canvasInfo.current["scale"])
    const currentWidth = Math.round(selectRect.width / canvasInfo.current["scale"])
    const currentHeight = Math.round(selectRect.height / canvasInfo.current["scale"])

    if (selectingState !== "full"){
      selectAreaRef.current.width = currentWidth
      selectAreaRef.current.height = currentHeight
      const cxt = selectAreaRef.current.getContext("2d")
      cxt.drawImage(
        canvasRef.current, currentLeft, currentTop, currentWidth, currentHeight,
        0, 0, currentWidth,currentHeight
      )
      selectedRegion.current = {
        "region": [currentLeft, currentTop, currentWidth, currentHeight],
        "regionUpdateInterval": null
      }
      const id = setInterval(() => {
        if (!selectAreaRef.current || !canvasRef.current){
          clearInterval(id)
          return
        }
        clear(selectAreaRef.current)
        cxt.drawImage(
          canvasRef.current, currentLeft, currentTop, currentWidth, currentHeight,
          0, 0, currentWidth,currentHeight
        )
      }, 1000)
      selectedRegion.current["regionUpdateInterval"] = id
    }

    
    let done = false
    function onMoveDrag(e){
      if (done) return
      done = true
      requestAnimationFrame(()=>{
        const pos = [Math.round((e.clientX - canvasRect.left) / canvasInfo.current["scale"]), Math.round((e.clientY - canvasRect.top) / canvasInfo.current["scale"])]
        const hortizontalOffset = startPoint[0] - pos[0]
        const verticalOffset = startPoint[1] - pos[1]

        selectAreaRef.current.style.top = `${currentTop - verticalOffset}px`
        selectAreaRef.current.style.left = `${currentLeft - hortizontalOffset}px`
        done = false
      })
    }

    function onReleaseDrag(){
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const selectRect = selectAreaRef.current.getBoundingClientRect()
      
      const currentTop = Math.round((selectRect.top - canvasRect.top) / canvasInfo.current["scale"])
      const currentLeft = Math.round((selectRect.left - canvasRect.left) / canvasInfo.current["scale"])
      const currentWidth = Math.round(selectRect.width / canvasInfo.current["scale"])
      const currentHeight = Math.round(selectRect.height / canvasInfo.current["scale"])
      setCompleteSelectionPos([`${currentLeft + Math.round(currentWidth/2)}px`,`${currentTop + currentHeight}px`])
      setSelectingState("full")

      document.removeEventListener("mousemove", onMoveDrag)
      document.removeEventListener("mouseup", onReleaseDrag) 
    } 
    document.addEventListener("mousemove", onMoveDrag)
    document.addEventListener("mouseup", onReleaseDrag)
  }

  function moveToSelectedArea(){
    if (!selectedRegion.current) return
    clearInterval(selectedRegion.current["regionUpdateInterval"])
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const selectRect = selectAreaRef.current.getBoundingClientRect()
    
    const currentTop = Math.round((selectRect.top - canvasRect.top) / canvasInfo.current["scale"])
    const currentLeft = Math.round((selectRect.left - canvasRect.left) / canvasInfo.current["scale"])
    const currentWidth = Math.round(selectRect.width / canvasInfo.current["scale"])
    const currentHeight = Math.round(selectRect.height / canvasInfo.current["scale"])

    const storedRegion = Object.assign(document.createElement("canvas"), {width: currentWidth, height: currentHeight})
    canvasRef.current.getContext("2d").globalCompositeOperation = "source-over"
    storedRegion.getContext("2d").drawImage(canvasRef.current, ...selectedRegion.current["region"], 0, 0, currentWidth, currentHeight)

    moveArea(canvasRef.current, storedRegion, selectedRegion.current["region"], [currentLeft, currentTop, currentWidth, currentHeight])
    setSelectingState("off")
  }


  function startStroke(event){
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
      // if(done){
      //   return
      // }
      done = true
      // requestAnimationFrame(()=>{
        draw([pos], canvasRef.current, {persistent: true, prev: last})
        strokes.current["batchStroke"].push(pos)
        strokes.current["fullStroke"].push(pos)
        sendBatchStrokesThrottled()   
        last = pos
        done = false
      // })  
    }     

    function onReleaseStroke(e){
      requestAnimationFrame(()=>{
        cancelBatchSend()
        const cxt = canvasRef.current.getContext("2d")
        cxt.lineTo(...last)
        cxt.stroke()
        sendStroke()
      })

      canvasRef.current.removeEventListener("mousemove", onMoveStroke)
      document.removeEventListener("mouseup", onReleaseStroke) 
    } 
    canvasRef.current.addEventListener("mousemove", onMoveStroke)
    document.addEventListener("mouseup", onReleaseStroke)
  }

  async function handleCanvasClick(e){
    if (!canvasRef.current) {
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const pos = [Math.round((e.clientX - rect.left) / canvasInfo.current["scale"]), Math.round((e.clientY - rect.top) / canvasInfo.current["scale"])]
    if (canvasInfo.current?.["type"] === "fill"){
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
      await handleCanvasAction(update)
      return
    }
    if (canvasInfo.current?.["type"] === "colorpick"){
      const color = canvasRef.current.getContext("2d").getImageData(pos[0], pos[1],1,1).data
      const formattedColor = `rgba(${color[0]},${color[1]},${color[2]},${255})`
      changeColor(formattedColor)
      return
    }
  }

  async function handleContainerClick(e) {
    if (!canvasInfo.current || !mouseDownTimeRef.current) return
    if (mouseDownTimeRef.current[0] !== e.clientX || mouseDownTimeRef.current[1] !== e.clientY) return
    
    if (canvasInfo.current["type"] === "select"){
      setSelectingState("off")
      if (selectingState === "full"){
        moveToSelectedArea()
      }
      return
    }
  }

  function processImport(e){
    if (e.target.files[0] >  1024 * 1024){
      setImportErrorMsg("The imported image was too large (> 2 MB)")
      setTimeout(()=>setImportErrorMsg(""),3000)
      cancelImport()
      return
    }
    setIsImporting(true)

    const newCanvas = document.createElement("canvas")
    const url = URL.createObjectURL(e.target.files[0])
    const img = new Image()
    storeImportRef.current = new Promise(resolve=>{
      img.onload = () => {

        newCanvas.width = img.width
        newCanvas.height = img.height
        newCanvas.getContext("2d").drawImage(img, 0, 0)

        URL.revokeObjectURL(url)
        resolve(newCanvas.toDataURL("image/png"))
      }
      img.src = url
    })
  }
  async function completeImport() {
    const canvasBase64 = await storeImportRef.current
    if (!canvasBase64) return
    
    const update = {
      "origin": "whiteboard",
      "username": username,
      "type": "import",
      "data": canvasBase64,
      "metadata": {"anchor": selectedAnchor}
    }
    sendJsonMessage(update)
    await handleCanvasAction(update)
    cancelImport()
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

  function handleContainerMouseDown(e){
    if (!canvasInfo.current) return
    mouseDownTimeRef.current = [e.clientX, e.clientY]

    if (canvasInfo.current["type"] === "navigate"){
      navigate(e)
      return
    }
    if (canvasInfo.current["type"] === "select"){
      startSelect(e)
      return
    }

  }
  function navigate(e){
    if (e.button !== 1){
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
      transformedCanvasViewRef.current.style.transform = `translate(${newShiftX}px, ${newShiftY}px) scale(${canvasInfo.current["scale"]})`;
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
    transformedCanvasViewRef.current.style.transform = `translate(${canvasInfo.current["translateX"]}px, ${canvasInfo.current["translateY"]}px) scale(${canvasInfo.current["scale"]})`;
  }
  async function undo(){
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
    await handleCanvasAction(update)
  }
  async function redo(){
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
    await handleCanvasAction(update)
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

  function cancelImport(){
    setIsImporting(false)
    setSelectedAnchor(null)
    storeImportRef.current = null
    importInputRef.current.value = ""
  }
  return (
    <div className={`${styles.whiteboardPage} ${darkMode ? styles.darkMode : ""}`} onKeyDown={handleKeyPress} tabIndex={0}>
      <h1 className={styles.title}>
        <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/whiteboard?34" : "/light/whiteboard?34"} type="once" speed={10}/> 
      </h1>
      {roomID &&
      <div className={styles.mainContent}>
        <div className={styles.whiteboardContainer}>
          <div className={styles.whiteboardScrollable} 
          onMouseDown={handleContainerMouseDown}
          onClick={handleContainerClick}>
            <span ref={transformedCanvasViewRef} className={styles.transformedCanvasView}>
                <canvas 
                ref={canvasRef} 
                width={1000} 
                height={1000}
                onMouseDown={handleCanvasMouseDown}
                onClick={handleCanvasClick}
                />
                {selectingState !== "off" && 
                <span>
                  <canvas 
                  ref={selectAreaRef}
                  className={`${styles.selectArea} ${selectingState !== "on" ? styles.fixed : ""}`} 
                  onMouseDown={moveSelectedArea}/>
                  {selectingState === "full" &&
                  <span 
                  className={styles.completeSelection} 
                  ref={completeSelectionButtonsRef}
                  style={{left: completeSelectionPos[0], top: completeSelectionPos[1]}}>
                    <button>Move</button>
                    <button>Cancel</button>
                  </span>
                  }
                </span>
                }
            </span>
            <span style={{backgroundColor: selectedColor}} className={styles.selectedColor} onClick={(e)=>{
              setIsSelectingColor(true)
            }}>
              {isSelectingColor &&
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
            <button onClick={()=>{}}>
                <label className={styles.fileInput}>
                  <img src="/tool_icons/import.png" alt="import" />
                  <input ref={importInputRef} type="file" multiple hidden accept='.png,.jpg,.jpeg,.webp' onChange={processImport}/>
                </label>
            </button>
          </section>
          <span className={styles.separator}></span>
          <section className={styles.modesContainer}>
            <button className={selectedTool === "draw" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "draw";setSelectedTool("draw")}}><img src="/tool_icons/pencil.png" alt="draw" /></button>
            <button className={selectedTool === "erase" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "erase";setSelectedTool("erase")}}><img src="/tool_icons/eraser.png" alt="erase" /></button>
            <button className={selectedTool === "fill" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "fill";setSelectedTool("fill")}}><img src="/tool_icons/fill.png" alt="fill" /></button>
            <button className={selectedTool === "colorpick" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "colorpick";setSelectedTool("colorpick")}}><img src="/tool_icons/colorpicker.png" alt="color picker" /></button>
            <button className={selectedTool === "navigate" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "navigate";setSelectedTool("navigate")}}><img src="/tool_icons/navigate.png" alt="draw" /></button>
            <button className={selectedTool === "select" ? styles.selected : ""} onClick={()=>{canvasInfo.current["type"] = "select";setSelectedTool("select")}}>select</button>

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
        {isImporting &&
        <section className={styles.isImporting}>
          <h2>Select Anchor Point</h2>
          <span>This is where to place the image</span>
          <section>
            {Array.from({length:9}).map((_,i) => 
            <span key={i}
            className={selectedAnchor === i+1 ? styles.anchor : ""}
            onClick={() => setSelectedAnchor(i+1)}
            >{i+1}</span>)}
          </section>
          <button onClick={()=>{
            setSelectedAnchor(null)
            storeImportRef.current = null
            setIsImporting(false)
          }}>X</button>
          {selectedAnchor && 
          <button onClick={completeImport}>Import</button>
          }
        </section>
        }
        {importErrorMsg && <span className={styles.importErrorMsg}>{importErrorMsg}</span>}
        {previewURL && <span className={styles.screenshotPreview} ><img src={previewURL} alt="preview"/></span>}
      </div>
      }
    </div>
  )
}
export default memo(Whiteboard)