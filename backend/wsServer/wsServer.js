const http = require("http")
const { WebSocketServer } = require("ws")
const mediasoup = require("mediasoup")
const url = require("url")
const uuidv4 = require("uuid").v4

const {createCanvas, loadImage} = require("canvas")
const path = require('path');
const Queue = require("./Queue.js")

const { storeMessageReq, getMessagesReq,getRoomUsersReq, updateCanvasReq, updateInstructionsReq, getCanvasReq, getInstructionsReq } = require("../requests.js")
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require("wrtc")

const httpServer = http.createServer()
const wsServer = new WebSocketServer({server: httpServer})

const connections = {}
const users = {}
const rooms = {}
const servers = {
  iceServers: [{
    urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]
  }],
  iceCandidatePoolSize: 10,
}

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

wsServer.on("connection", (connection, request)=>{
  console.log("made connection")
  const username = url.parse(request.url, true).query.username
  const roomID = url.parse(request.url, true).query.roomID
  const uuid = uuidv4()

  connections[uuid] = connection
  sendServerInfo(connection, roomID)
  
  users[uuid] = {
    username: username,
    roomID: roomID,
    RTClink: null,
    haveClientTracks: false
  }

  
  connection.on("message",(data)=>handleMessage(data, uuid))
  connection.on("close",()=>handleClose(uuid))
})

// Handle new messages / close
function handleClose(uuid){
  const roomID = users[uuid].roomID
  rooms[roomID]["connections"] = rooms[roomID]["connections"].filter(item => item !== connections[uuid])
  if (rooms[roomID]["connections"] == 0){
    rooms[roomID]["canvas"].getContext("2d").putImageData(rooms[roomID]["snapshot"],0,0)
    const savedCanvasBuffer = rooms[roomID]["canvas"].toBuffer("image/png")
    updateCanvasReq(savedCanvasBuffer, roomID)
    updateInstructionsReq(rooms[roomID]["operations"], roomID)
    delete rooms[roomID]
  }
  delete connections[uuid]
}
function handleMessage(data, uuid){
  const parsedData = JSON.parse(data.toString())

  switch (parsedData.origin){
    case "chat":
      broadcastMessage(parsedData, uuid)
      break
    case "whiteboard":
      broadcastWhiteboard(parsedData, uuid)
      break
    case"videochat":
      broadcastVideochat(parsedData, uuid)
      break
    case "user":
      broadcastUser(parsedData, uuid)
      break
  }
}

//broadcast functions
async function broadcastMessage(data, uuid){
  // store message in database before broadcasting 
  const {origin, type, ...msgToStore} = data
  await storeMessageReq({...msgToStore, "roomID": users[uuid]["roomID"]})

  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    conn.send(JSON.stringify(data))
  })
}
function broadcastWhiteboard(data, uuid){
  const roomID = users[uuid].roomID  
  rooms[roomID]["connections"].forEach(conn=>{ 
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify(data))
     }
  })
  handleCanvasAction(data, roomID)
}

async function broadcastVideochat(data, uuid){
  // Let's say this is where we'll later handle peer to peer
  // const roomID = users[uuid].roomID  
  // rooms[roomID]["connections"].forEach(conn => {
  //   if (conn !== connections[uuid]){
  //     conn.send(JSON.stringify(data))
  //    }
  // })

  const roomID = users[uuid]["roomID"]
  const peers = rooms[roomID]["groupCallConnections"]
  // handling group calls
  let pc;
  switch(data.type){
    case "clientOffer":
      pc = new RTCPeerConnection(servers)

      pc.ontrack = event => {
        if (users[uuid]["haveClientTracks"]){
          console.log("exited ontrack")
          for (let i = 0; i < peers.length; i++){
            if (peers[i] === uuid){
              continue
            }
            users[peers[i]]["RTClink"].getReceivers().forEach(r => {
              if (r.track){
                pc.addTrack(r.track)
                console.log("fed a track")
              }
            })
          }
          return
        }
        console.log("received tracks")
        users[uuid]["haveClientTracks"] = true

        event.streams[0].getTracks().forEach(track => {
          console.log(track)
          for (let i = 0; i < peers.length; i++){
            if (peers[i] === uuid){
              continue
            }
            users[peers[i]]["RTClink"].addTrack(track)
            console.log("gave a track")
          }
        })
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data.data))
      
      pc.onicecandidate = event=>{
        if (!event.candidate){
          return
        }
        connections[uuid].send(JSON.stringify({
          "origin": "videochat",
          "type": "serverCandidate",
          "data": event.candidate
        }))
      }


      const serverAnswerDescription = await pc.createAnswer()
      await pc.setLocalDescription(serverAnswerDescription)


      const serverAnswer = {
        sdp: serverAnswerDescription.sdp,
        type: serverAnswerDescription.type
      }
      connections[uuid].send(JSON.stringify({
        "origin": "videochat",
        "type": "serverAnswer",
        "data": serverAnswer
      }))
      

      users[uuid]["RTClink"] = pc
      peers.push(uuid)
      console.log("added users to memory")

      break
    case "clientCandidate":
      pc = users[uuid]["RTClink"]
      if (pc && pc.currentRemoteDescription){
        console.log("added a candidate")
        users[uuid]["RTClink"].addIceCandidate(new RTCIceCandidate(data.data))
      }
      break
  } 
}

function broadcastUser(data, uuid){
  // sends everyone data
  rooms[users[uuid].roomID]["connections"].forEach(conn=>{
    conn.send(JSON.stringify(data))
})}



//utility functions
async function sendServerInfo(connection, roomID) {
  const roomHistories = [getRoomUsersReq(roomID), getMessagesReq(roomID)]
  let initializing = false

  if (roomID in rooms){
    rooms[roomID]["connections"].push(connection)
    roomHistories.push(rooms[roomID]["canvas"])
    roomHistories.push(rooms[roomID]["operations"])
  }else{
    initializing = true
    const canvas = createCanvas(1000,1000)
    roomHistories.push(
      getCanvasReq(roomID)
      .then(buffer => loadImage(buffer))
      .then(img => {
        canvas.getContext("2d").drawImage(img,0,0);
        return canvas
      }))
    roomHistories.push(getInstructionsReq(roomID))
  }
  const [roomUsers, chatHistory, canvas, instructions] = await Promise.all(roomHistories)

  if (initializing){
    rooms[roomID] = {
      "connections": [connection],
      "snapshot": canvas.getContext("2d").getImageData(0,0,canvas.width, canvas.height),
      "canvas": canvas,
      "operations": instructions,
      "latestOp": instructions.length - 1,
      "groupCallConnections": []
    }
  }

  const opsBuffer = Buffer.from(JSON.stringify(instructions))
  const canvasBuffer = canvas.toBuffer("image/png")
  const canvasInfo = Buffer.concat([Buffer.alloc(5), opsBuffer, canvasBuffer])
  canvasInfo.writeUInt32BE(opsBuffer.length, 0)
  canvasInfo.writeInt8(rooms[roomID]["latestOp"], 4)

  connection.send(JSON.stringify({
    "origin": "user",
    "type": "getUsers",
    "data": roomUsers
  }))
  connection.send(JSON.stringify({
    "origin": "chat",
    "type": "chatHistory",
    "data": chatHistory
  }))
  connection.send(canvasInfo)
  initializing && redrawCanvas(roomID)
}

// Canvas/Drawing
function handleCanvasAction(data, roomID){
  const exclude = ["isDrawing", "isErasing"]
  if (exclude.includes(data.type)){
    return
  }
  const room = rooms[roomID]

  switch (data.type){
    case "undo":
      room["latestOp"] -= 1
      room["canvas"].getContext("2d").putImageData(room["snapshot"], 0, 0)
      redrawCanvas(roomID)
      break
    case "redo":
      room["latestOp"] += 1
      updateServerCanvas(room["operations"][room["latestOp"]], roomID)
      break
    default:
      room["latestOp"] += 1
      room["operations"] = room["operations"].slice(0, room["latestOp"])
      room["operations"].push(data)

      if (room["operations"].length > 10){
        room["canvas"].getContext("2d").putImageData(room["snapshot"], 0, 0)
        for (let i = 0; i <= room["latestOp"]; i++){
          updateServerCanvas(room["operations"][i], roomID)
          if (i == 4){
            room["snapshot"] = room["canvas"].getContext("2d").getImageData(0,0,room["canvas"].width, room["canvas"].height)
          }
        }
        room["operations"] = room["operations"].slice(5)
        room["latestOp"] = 5
      }else{
          updateServerCanvas(data, roomID)
      }
  }
}

function redrawCanvas(roomID){
  rooms[roomID]["canvas"].getContext("2d").putImageData(rooms[roomID]["snapshot"],0,0)
  for (let i = 0; i <= rooms[roomID]["latestOp"]; i++){
    updateServerCanvas(rooms[roomID]["operations"][i], roomID)
  }
}


function updateServerCanvas(data, roomID){
  const mainCanvas = rooms[roomID]["canvas"]
    
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


  const canvasImage = cxt.getImageData(0,0,canvas.width,canvas.height)
  const canvasData = canvasImage.data

  //bfs fill
  const visited = new Uint8Array(canvas.width * canvas.height)
  const pixelQueue = new Queue()
  pixelQueue.enqueue([X,Y])
  const tolerance = 70

  while (!pixelQueue.isEmpty()){
    const [x, y] = pixelQueue.dequeue()
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
      const isInCanvas = (item[0] >= 0 && item[0] < canvas.width) && (item[1] >=0 && item[1] < canvas.height);
      if (!visited[item[0] + item[1] * canvas.width] && isInCanvas){
        pixelQueue.enqueue(item);
        visited[item[0] + item[1] * canvas.width] = 1
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