import http from "http"
import {WebSocketServer} from "ws"
import mediasoup from "mediasoup"
import url from "url"
import {v4 as uuidv4} from "uuid"

import {createCanvas, loadImage} from "canvas"
import { storeMessageReq, getMessagesReq,getRoomUsersReq, updateCanvasReq, updateInstructionsReq, getCanvasReq, getInstructionsReq } from "../requests.js"
import { draw, fill, clear } from "utils/canvasArt.js"

const httpServer = http.createServer()
const wsServer = new WebSocketServer({server: httpServer})

const connections = {}
const users = {}
const rooms = {}

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
]

let worker;
mediasoup.createWorker()
.then(res => {
  worker = res
})



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
  users[uuid] = {
    "username": username,
    "roomID": roomID,
    "groupcall": {
      "sendTransport": null,
      "recvTransport": null,
      "producers": [],
      "rtpCapabilities": null
    }
  }

  sendServerInfo(uuid)
  
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
      broadcastChat(parsedData, uuid)
      break
    case "whiteboard":
      broadcastWhiteboard(parsedData, uuid)
      break
    case "groupcall":
      broadcastGroupcall(parsedData, uuid)
      break
    case "peercall":
      broadcastPeercall(parsedData, uuid)
      break
    case "user":
      broadcastUser(parsedData, uuid)
      break
  }
}

//broadcast functions
async function broadcastChat(data, uuid){
  // store message in database before broadcasting 
  const {origin, type, ...msgToStore} = data
  await storeMessageReq({...msgToStore, "roomID": users[uuid]["roomID"]})

  sendAll(uuid, toSender=true)
}

function broadcastWhiteboard(data, uuid){
  sendAll(uuid, toSender=false)
  handleCanvasAction(data, users[uuid].roomID )
}

async function broadcastGroupcall(data, uuid){
  const roomID = users[uuid]["roomID"]

  // handling group calls
  switch(data.type){
    case "userJoined":
      rooms[roomID]["callParticipants"].push(uuid)
      users[uuid]["rtpCapabilities"] = data.data["rtpCapabilities"]

      rooms[roomID]["connections"].forEach(conn=>{ 
        if (conn !== connections[uuid]){
          conn.send(JSON.stringify({
            ...data,
            "data": {uuid}
          }))
        }
      })
      connections[uuid].send(JSON.stringify({
        "origin": "groupcall",
        "type": "getParticipants",
        "data": rooms[roomID]["callParticipants"].filter(id => id !== uuid)
      }))

      break
    case "transportParams":
      const sendTransport = await makeTransport(roomID)
      const recvTransport = await makeTransport(roomID)
      users[uuid]["sendTransport"] = sendTransport
      users[uuid]["recvTransport"] = recvTransport

      connections[uuid].send(JSON.stringify({
        "origin": "groupcall",
        "type": "transportParams",
        "data": {
          "sendParams": {
            "id": sendTransport.id,
            "iceParameters": sendTransport.iceParameters,
            "iceCandidates": sendTransport.iceCandidates,
            "dtlsParameters": sendTransport.dtlsParameters
          },
          "recvParams": {
            "id": recvTransport.id,
            "iceParameters": recvTransport.iceParameters,
            "iceCandidates": recvTransport.iceCandidates,
            "dtlsParameters": recvTransport.dtlsParameters
          }
        }
      }))
      console.log("Transport Params sent over")
      break
    case "sendConnect":
      const {dtlsParameters} = data.data
      await users[uuid]["sendTransport"].connect({dtlsParameters})
      connections[uuid].send(JSON.stringify({
        "origin": "groupcall",
        "type": "sendConnect",
      }))
      console.log("ST connected")
      break
    case "sendProduce":
      //new producer
      const {kind, rtpParameters} = data.data
      const producer = await users[uuid]["sendTransport"].produce({kind, rtpParameters})
      users[uuid]["producers"].push(producer)
      connections[uuid].send(JSON.stringify({
        "origin": "groupcall",
        "type": "sendProduce",
        "data": producer.id
      }))
      console.log("Produced:", producer.id)
      break
    case "recvConnect":
      users[uuid]["recvTransport"].connect({dtlsParameters: data.data})
      connections[uuid].send(JSON.stringify({
        "origin": "groupcall",
        "type": "recvConnect",
      }))
      console.log("RT connected")
      break
    case "givePeers":
      console.log("ready producer", rooms[roomID]["callParticipants"], data)
      for (let userID of rooms[roomID]["callParticipants"]){
        if (userID == uuid) {
          continue
        }
        const options = {
          producerId: data.data,
          rtpCapabilities: users[userID]["rtpCapabilities"]
        }
        console.log("before canConsume", options)

        if (!rooms[roomID]["router"].canConsume(options)){
          continue
        }
        console.log("after canConsume")

        const consumer = await users[userID]["recvTransport"].consume({
          producerId: data.data,
          rtpCapabilities: users[userID]["rtpCapabilities"],
          paused: true
        })

        rooms[roomID]["consumers"][consumer.id] = consumer
        console.log(uuid)

        connections[userID].send(JSON.stringify({
          "origin": "groupcall",
          "type": "addConsumer",
          "data": {
            id: consumer.id,
            producerId: data.data,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            uuid: uuid
          }
        }))
        console.log(`Sent producer ${data.data} to ${users[userID]["username"]} or ID: ${userID}`)
      }
      break
    case "unpauseConsumer":
      rooms[roomID]["consumers"][data.data].resume()
      console.log(`consumer ${data.data} unpaused`)
      break
    case "receivePeers":
      for (let userID of rooms[roomID]["callParticipants"]){
        if (userID == uuid) {
          continue
        }
        console.log("before canConsume receiverPeers")
        for (let i = 0; i < users[userID]["producers"].length; i++){
          const options2 = {
            producerId: users[userID]["producers"][i].id,
            rtpCapabilities: users[uuid]["rtpCapabilities"]
          }
          console.log("options2:", options2)
          if (!rooms[roomID]["router"].canConsume(options2)){
            continue
          }
        console.log("after canConsume receiverPeers")


          const consumer = await users[uuid]["recvTransport"].consume({
            producerId: users[userID]["producers"][i].id,
            rtpCapabilities: users[uuid]["rtpCapabilities"],
            paused: true
          })

          rooms[roomID]["consumers"][consumer.id] = consumer
          connections[uuid].send(JSON.stringify({
            "origin": "groupcall",
            "type": "addConsumer",
            "data": {
              id: consumer.id,
              producerId: users[userID]["producers"][i].id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
              uuid: userID
            }
          }))
          console.log(`Peer ${users[uuid]["username"]} or ID: ${uuid} received producer: ${users[userID]["producers"][i].id}`)
        }
      }
      break
    case "disconnect": 
      rooms[roomID]["connections"].forEach(conn=>{ 
        if (conn !== connections[uuid]){
          conn.send(JSON.stringify({
            ...data,
             "data": {uuid}
          }))
        }
      })
      rooms[roomID]["callParticipants"].filter(userid => userid !== uuid)
      users[uuid]["sendTransport"].close()
      users[uuid]["recvTransport"].close()
      users[uuid] = {
        ...users[uuid],
        "sendTransport": null,
        "recvTransport": null,
        "producers": [],
        "rtpCapabilities": null
      }
      break
    } 
}
async function broadcastPeercall(data, uuid){
  // handling group calls
  switch(data.type){
    case "callRequest":
      for (let i = 0; i < userList.length; i++){
        if (users[userList[i]]["username"] === data.data["peer"]){
          console.log("found")
          connections[userList[i]].send(JSON.stringify(data))
          break
        }
      }
      break
    case "callResponse":
      for (let i = 0; i < userList.length; i++){
        if (users[userList[i]]["username"] === data.data["peer"]){
          connections[userList[i]].send(JSON.stringify(data))
          break
        }
      }
      break
    case "renegotiationRequest":
      for (let i = 0; i < userList.length; i++){
        if (users[userList[i]]["username"] === data.data["peer"]){
          console.log("sent renegotiation")
          connections[userList[i]].send(JSON.stringify(data))
          break
        }
      }
      break
    case "renegotiationResponse":
      for (let i = 0; i < userList.length; i++){
        if (users[userList[i]]["username"] === data.data["peer"]){
          connections[userList[i]].send(JSON.stringify(data))
          break
        }
      }
      break
    case "stunCandidate":
      for (let i = 0; i < userList.length; i++){
        if (users[userList[i]]["username"] === data.data["peer"]){
          connections[userList[i]].send(JSON.stringify(data))
          break
        }
      }
      break
    case "disconnect":
      for (let i = 0; i < userList.length; i++){
        if (users[userList[i]]["username"] === data.data["peer"]){
          connections[userList[i]].send(JSON.stringify(data))
          break
        }
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
async function sendServerInfo(uuid) {
  const roomID = users[uuid]["roomID"]
  const connection = connections[uuid]

  const roomHistories = [getRoomUsersReq(roomID), getMessagesReq(roomID)]
  let initializing = false

  if (roomID in rooms){
    rooms[roomID]["users"].push(uuid)
    roomHistories.push(rooms[roomID]["whiteboard"]["canvas"])
    roomHistories.push(rooms[roomID]["whiteboard"]["operations"])
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
      "users": [uuid],
      "whiteboard": {
        "snapshot": canvas.getContext("2d").getImageData(0,0,canvas.width, canvas.height),
        "canvas": canvas,
        "operations": instructions,
        "latestOp": instructions.length - 1
        },
      "groupcall": {
        "router": await worker.createRouter({mediaCodecs}),
        "callParticipants": [],
        "consumers": {}
      }
    }
  }

  const opsBuffer = Buffer.from(JSON.stringify(instructions))
  const canvasBuffer = canvas.toBuffer("image/png")
  const canvasInfo = Buffer.concat([Buffer.alloc(5), opsBuffer, canvasBuffer])
  canvasInfo.writeUInt32BE(opsBuffer.length, 0)
  canvasInfo.writeInt8(rooms[roomID]["whiteboard"]["latestOp"], 4)

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
  connection.send(JSON.stringify({
    "origin": "groupcall",
    "type": "setup",
    "data": {
      "routerRtpCapabilities": rooms[roomID]["groupcall"]["router"].rtpCapabilities,
    }
  }))

  connection.send(canvasInfo)
  initializing && redrawCanvas(roomID)
}

async function makeTransport(roomID) {
  const transport = await rooms[roomID]["groupcall"]["router"].createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0', 
        announcedIp: '127.0.0.1',
      }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  })
  return transport
}

function sendAll(uuid, toSender=false){
  rooms[users[uuid]["roomID"]]["users"].forEach(id =>{
    (id !== uuid || toSender) && connections[id].send(JSON.stringify(data))
  })
}

function sendPeer(uuid, peerUsername){
  const userList = rooms[users[uuid]["roomID"]]["users"]
  for (let i = 0; i < userList.length; i++){
    if (peerUsername === users[userList[i]]["username"]){
      conn.send(JSON.stringify(data))
      return
    }
  }

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



httpServer.listen(8000,()=>{
  console.log("started main server")
})