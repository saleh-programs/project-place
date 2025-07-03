const http = require("http")
const { WebSocketServer } = require("ws")
const url = require("url")
const { json } = require("stream/consumers")
const uuidv4 = require("uuid").v4

const { storeMessageReq, getMessagesReq } = require("../requests.js")

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
    case "isDrawing":
      broadcastWhiteboard(parsedData, uuid)
      break
    case "doneDrawing":
      broadcastWhiteboard(parsedData, uuid)
      break
  }
}
function handleClose(uuid){
  rooms[users[uuid].roomID] = rooms[users[uuid].roomID].filter(item => item !== connections[uuid])
  delete connections[uuid]
}


wsServer.on("connection", (connection, request)=>{
  const username = url.parse(request.url, true).query.username
  const roomID = url.parse(request.url, true).query.roomID
  const uuid = uuidv4()
  
  if (roomID in rooms){
    rooms[roomID].push(connection)
  }else{
    rooms[roomID] = [connection]
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
  rooms[users[uuid].roomID].forEach(conn=>{
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
  rooms[users[uuid].roomID].forEach(conn=>{
    if (conn !== connections[uuid]){
      conn.send(JSON.stringify({
        "type": data.type,
        "user": data.username,
        "data": data.data,
      }))
     }
  })
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