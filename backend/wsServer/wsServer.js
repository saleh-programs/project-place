const http = require("http")
const { WebSocketServer } = require("ws")
const url = require("url")
const uuidv4 = require("uuid").v4

const {createCanvas} = require("canvas")
const fs = require('fs');
const path = require('path');
const Queue = require("./Queue.js")

const { storeMessageReq, getMessagesReq, addInstruction, updateCanvas } = require("../requests.js")

const httpServer = http.createServer()
const wsServer = new WebSocketServer({server: httpServer})

const connections = {}
const users = {}
const rooms = {}
const roomsLatest = {}

async function handleMessage(data, uuid){
  const parsedData = JSON.parse(data.toString())
  switch (parsedData.type){
    case "chat":
      await storeMessageReq({
        "username": users[uuid].username,
        "roomID": users[uuid].roomID,
        "message": parsedData.data,
        "messageID": parsedData.messageID,
        "timestamp": parsedData.timestamp,
      })
      roomsLatest[users[uuid].roomID] = parsedData.messageID
      broadcastMessage(parsedData, uuid)
      break
    case "draw":
      if (parsedData.status === "isDrawing"){
        broadcastWhiteboard(parsedData, uuid)
      }else if (parsedData.status === "doneDrawing"){
        broadcastWhiteboard(parsedData, uuid)
      }
      break
    case "erase":
      if (parsedData.status === "isDrawing"){
        broadcastWhiteboard(parsedData, uuid)
      }else if (parsedData.status === "doneDrawing"){
        broadcastWhiteboard(parsedData, uuid)
      }
      break
    case "fill":
      broadcastWhiteboard(parsedData, uuid)
      break
    case "clear":
      broadcastWhiteboard(parsedData, uuid)
      break
  }
}
function handleClose(uuid){
  rooms[users[uuid].roomID]["connections"] = rooms[users[uuid].roomID]["connections"].filter(item => item !== connections[uuid])
  delete connections[uuid]
}


wsServer.on("connection", (connection, request)=>{
  console.log("made connection")
  const username = url.parse(request.url, true).query.username
  const roomID = url.parse(request.url, true).query.roomID
  const uuid = uuidv4()
  
  if (roomID in rooms){
    rooms[roomID]["connections"].push(connection)
  }else{
    const newCanvas = createCanvas(1000,1000)
    newCanvas.getContext("2d").fillStyle = "white"
    newCanvas.getContext("2d").fillRect(0,0,1000,1000)
    rooms[roomID] = {
      "connections": [connection],
      "canvas": newCanvas
    }
    roomsLatest[roomID] = null
  }
  getMessages(connection, roomID)
  connections[uuid] = connection
  users[uuid] = {
    username: username,
    roomID: roomID
  }

  
  connection.on("message",(data)=>handleMessage(data, uuid))
  connection.on("close",()=>handleClose(uuid))
})

function broadcastMessage(data, uuid){
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify({
        "type": "chat",
        "user": data.username,
        "data": data.data,
        "timestamp": data.timestamp
      }))
     }
  })
}
function broadcastWhiteboard(data, uuid){
  const whiteboardBroadcast = {
        "type": data.type,
        "status": data?.status,
        "color": data?.color,
        "size": data?.size,
        "user": data?.username,
        "data": data?.data,
        "fillStart": data?.fillStart
  }
  setImmediate(()=>{
    updateServerCanvas(whiteboardBroadcast, users[uuid].roomID)
    addInstruction(data, users[uuid].roomID)
    updateCanvas(rooms[users[uuid].roomID]["canvas"].toBuffer("image/png"),users[uuid].roomID)
  })
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify(whiteboardBroadcast))
     }
  })
}
function updateServerCanvas(data, roomID){
    const whiteboard = rooms[roomID]["canvas"].getContext("2d")
    const commands = data.data
    whiteboard.lineWidth = data.size
    
    whiteboard.beginPath()
    switch (data.type){
      case "draw":
        whiteboard.strokeStyle = data.color
        whiteboard.moveTo(...commands[0])
        if (data.status === "isDrawing"){
          for (let i = 1; i < commands.length; i++){
            whiteboard.lineTo(...commands[i])
          }
          whiteboard.stroke()
        }else if (data.status === "doneDrawing"){
          for (let i = 1; i < commands.length; i++){
            whiteboard.lineTo(...commands[i])
            whiteboard.stroke()
          }
        }
        break
      case "erase":
        whiteboard.strokeStyle = "white"
        for (let i = 1; i < commands.length; i++){
          whiteboard.lineTo(...commands[i])
          whiteboard.stroke()
        }
        break
      case "fill":
        canvasFill(data.fillStart[0], data.fillStart[1], data.color, roomID)
        break
      case "clear":
        whiteboard.fillStyle = "white"
        whiteboard.fillRect(0,0,canvasRef.current.width, canvasRef.current.height)
        break
    }
}
async function canvasFill(x, y, color, roomID){
    const canvas = rooms[roomID]["canvas"]
    const whiteboard = canvas.getContext("2d", { willReadFrequently: true })
    const mousePos = [x, y]
    const startColor = whiteboard.getImageData(mousePos[0],mousePos[1],1,1).data

    whiteboard.fillStyle = color
    whiteboard.fillRect(mousePos[0],mousePos[1],1,1)
    const fillColor = whiteboard.getImageData(mousePos[0],mousePos[1],1,1).data

    const newPixel = whiteboard.createImageData(1,1)
    newPixel.data.set(startColor,0)
    whiteboard.putImageData(newPixel,mousePos[0],mousePos[1])
    newPixel.data.set(fillColor,0)
    
    const visited = new Uint8Array(canvas.width * canvas.height)
    const canvasImage = whiteboard.getImageData(0,0,canvas.width,canvas.height)
    const canvasData = canvasImage.data

    const pixelQueue = new Queue()
    pixelQueue.enqueue([mousePos[0],mousePos[1]])
    const tolerance = 70
    let totalPixels = 0
    while (!pixelQueue.isEmpty()){
      const [x, y] = pixelQueue.dequeue()
      const isInCanvas = (
        (x >= 0 && x < canvas.width) 
        && 
        (y >=0 && y < canvas.height))

      if (!isInCanvas || visited[x + y * canvas.width]){
        continue
      }
      visited[x + y * canvas.width] = 1
      const val = 4*(x + y * canvas.width)
      const currentColor = [
        canvasData[val],
        canvasData[val + 1],
        canvasData[val + 2],
        canvasData[val + 3]
      ]

      const RGBdistance = 
        (currentColor[0] - startColor[0])**2 +
        (currentColor[1] - startColor[1])**2 +
        (currentColor[2] - startColor[2])**2
      
      const matchesColor = RGBdistance < tolerance**2

      if (!matchesColor){
        continue
      }

      canvasData[val] = fillColor[0]
      canvasData[val + 1] = fillColor[1]
      canvasData[val + 2] = fillColor[2]

      totalPixels += 1
      // if (totalPixels % Math.floor(200) === 0){
      //   await new Promise(requestAnimationFrame)
      // }
      const neighbors = [
        [x,y-1],[x,y+1],
        [x-1,y],[x+1,y],
      ]
      // const neighbors = [
      //   [x-1, y-1], [x,y-1], [x+1,y-1],
      //   [x-1,y], [x+1,y],
      //   [x-1,y+1],[x,y+1],[x+1,y+1]
      // ]
      neighbors.forEach(item=>{
        pixelQueue.enqueue(item)
      })
    }
    whiteboard.putImageData(canvasImage,0,0)
}
async function getMessages(connection, roomID) {
  connection.send(JSON.stringify({
    "type": "chatHistory",
    "data": await getMessagesReq(roomID,roomsLatest[roomID])
  }))
    
}


httpServer.listen(8000,()=>{
  console.log("started main server")
})