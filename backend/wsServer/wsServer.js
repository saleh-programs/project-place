const http = require("http")
const { WebSocketServer } = require("ws")
const url = require("url")
const uuidv4 = require("uuid").v4

const {createCanvas} = require("canvas")
const path = require('path');
const Queue = require("./Queue.js")

const { storeMessageReq, getMessagesReq, addInstructionReq, updateCanvasReq, getRoomUsersReq } = require("../requests.js")

const httpServer = http.createServer()
const wsServer = new WebSocketServer({server: httpServer})

const connections = {}
const users = {}
const rooms = {}

// any message layout:
/*
{
  "origin" : chat/whiteboard/documents, ---all have this---
  "type" :  erase/newMessage/fill (specific type)
  "user": username,  ---all have this---
  "data": draw commands/fill instructions/newest chat, ---all have this---
  "metadata": user's color/ stroke size/ draw status(isDraw/doneDraw)
}
 */
function handleMessage(data, uuid){
  const parsedData = JSON.parse(data.toString())

  switch (parsedData.origin){
    case "chat":
      broadcastMessage(parsedData, uuid)
      break
    case "whiteboard":
      broadcastWhiteboard(parsedData, uuid)
      break
    case "user":
      broadcastUser(parsedData, uuid)
      break
  }
}


wsServer.on("connection", (connection, request)=>{
  console.log("made connection")
  const username = url.parse(request.url, true).query.username
  const roomID = url.parse(request.url, true).query.roomID
  const uuid = uuidv4()

  connections[uuid] = connection

  if (roomID in rooms){
    rooms[roomID]["connections"].push(connection)
  }else{
    const newCanvas = createCanvas(1000,1000)
    newCanvas.getContext("2d").fillStyle = "white"
    newCanvas.getContext("2d").fillRect(0,0,1000,1000)
    rooms[roomID] = {
      "connections": [connection],
      "canvas": newCanvas,
      "operations": [],
      "currOp": -1

    }
  }

  sendServerInfo(connection, roomID)
  
  users[uuid] = {
    username: username,
    roomID: roomID
  }

  
  connection.on("message",(data)=>handleMessage(data, uuid))
  connection.on("close",()=>handleClose(uuid))
})

function handleClose(uuid){
  rooms[users[uuid].roomID]["connections"] = rooms[users[uuid].roomID]["connections"].filter(item => item !== connections[uuid])
  delete connections[uuid]
}

//broadcast functions
async function broadcastMessage(data, uuid){
  // store message in database before broadcasting 
  const {origin, type, ...msgToStore} = data
  await storeMessageReq({...msgToStore, "roomID": users[uuid]["roomID"]})

  // sends everyone the data
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    conn.send(JSON.stringify(data))
  })
}
function broadcastWhiteboard(data, uuid){

  // Updates the server's canvas
  setImmediate(()=>{
    const exclude = ["isDrawing", "isErasing"]
    if (exclude.includes(data.type)){
      return
    }
    const roomID = users[uuid].roomID
    const {currOp, operations} = rooms[roomID]
    console.log(currOp)
    console.log(operations)

    if (data.type === "undo"){
      rooms[roomID]["currOp"] -= 1
      for (let i = 0; i < currOp; i++){
        updateServerCanvas(operations[i], roomID)
      }
    }else if (data.type === "redo"){
      rooms[roomID]["currOp"] += 1
      updateServerCanvas(operations[currOp+1], roomID)
    }else{
      rooms[roomID]["operations"] = operations.slice(0,currOp+1)
      rooms[roomID]["operations"].push(data)
      rooms[roomID]["currOp"] += 1

      if (rooms[roomID]["operations"].length > 10){
        rooms[roomID]["operations"].shift()
        rooms[roomID]["currOp"] -= 1
      }
      updateServerCanvas(data, roomID)
    }

    const buffer = rooms[users[uuid].roomID]["canvas"].toBuffer("image/png")
    updateCanvasReq(buffer,users[uuid].roomID)
  })

  // sends everyone data
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{ 
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify(data))
     }
  })
}
function broadcastUser(data, uuid){
  // sends everyone data
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    conn.send(JSON.stringify(data))
  })}



//utility functions

async function getMessages(connection, roomID) {
  connection.send(JSON.stringify({
    "origin": "chat",
    "type": "chatHistory",
    "data": await getMessagesReq(roomID)
  })) 
}
async function sendServerInfo(connection, roomID) {
  connection.send(JSON.stringify({
    "origin": "user",
    "type": "getUsers",
    "data": await getRoomUsersReq(roomID)
  }))
  connection.send(JSON.stringify({
    "origin": "chat",
    "type": "chatHistory",
    "data": await getMessagesReq(roomID)
  }))
}

// Drawing
function updateServerCanvas(data, roomID){
  const mainCanvas = rooms[roomID]["canvas"]
  const cxt = mainCanvas.getContext("2d")
    
  switch (data.type){
    case "doneDrawing":
      draw(data["data"], mainCanvas, false, data["metadata"])
      break
    case "doneErasing":
      draw(data["data"], mainCanvas, true, data["metadata"])
      break
    case "fill":
      fill(data["data"], mainCanvas, data["metadata"])
      break
    case "clear":
      clear(mainCanvas)
      break
  }
}
  function draw(commands, canvas, erase, options){
      const context = canvas.getContext("2d")
      const {
        lineWidth, 
        color, 
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

  function fill([X,Y], canvas, options){
    const cxt = canvas.getContext('2d')
    const {color} = options

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
  }

  function clear(canvas){
    const context = canvas.getContext("2d")
    context.clearRect(0,0,canvas.width, canvas.height)
  }


httpServer.listen(8000,()=>{
  console.log("started main server")
})