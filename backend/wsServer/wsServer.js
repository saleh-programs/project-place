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
  }
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

function handleClose(uuid){
  rooms[users[uuid].roomID]["connections"] = rooms[users[uuid].roomID]["connections"].filter(item => item !== connections[uuid])
  delete connections[uuid]
}

//broadcast functions
async function broadcastMessage(data, uuid){
  // store room's last message sent (for specific case where user enters room with lots of messages coming in)
  roomsLatest[users[uuid].roomID] = data.metadata.messageID

  // store message in database before broadcasting 
  await storeMessageReq({
    "username": data.username,
    "roomID": users[uuid].roomID,
    "message": data.data,
    "messageID": data.metadata.messageID,
    "timestamp": parsedData.metadata.timestamp,
  })

  // sends everyone the data
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify(data))
     }
  })
}
function broadcastWhiteboard(data, uuid){
  // Updates the server's canvas
  setImmediate(()=>{
    updateServerCanvas(data, users[uuid].roomID)
    addInstruction(data, users[uuid].roomID)
    updateCanvas(rooms[users[uuid].roomID]["canvas"].toBuffer("image/png"),users[uuid].roomID)
  })

  // sends everyone data
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify(data))
     }
  })
}



//utility functions
function updateServerCanvas(data, roomID){
    const mainCanvas = rooms[roomID]["canvas"]
    const whiteboard = mainCanvas.getContext("2d")
    const commands = data?.data
    
    whiteboard.beginPath()
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
        canvasFill(data.data[0], data.data[1], data.metadata.color, roomID)
        break
      case "clear":
        whiteboard.fillStyle = "white"
        whiteboard.fillRect(0,0,mainCanvas.width, mainCanvas.height)
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
    "origin": "chat",
    "type": "chatHistory",
    "data": await getMessagesReq(roomID,roomsLatest[roomID])
  }))
    
}


httpServer.listen(8000,()=>{
  console.log("started main server")
})