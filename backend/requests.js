const baseurl = "http://localhost:5000/"


function handleError(fn){
  return async (...args) => {
    try{
      return await fn(...args)
    }catch(err){
      console.error(err)
      return null
    }
  }
}


async function getUserInfoReq(session) {
  const response = await fetch(baseurl + "users",{
      "method": "GET",
      "headers": {
        "cookie": `session=${session}`
      }
  })
  const data = await response.json()
  if (!data.success){ 
    throw new Error(data.message ||"req failed")
  }
  return data["data"]["userInfo"]
}
async function updateUserInfoReq(modifiedFields) {
  console.log(modifiedFields)
  const response = await fetch(baseurl + "users", {
    "method": "PUT",
    "credentials": "include",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"fields": modifiedFields})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }

  return data
}
async function uploadNewImageReq(imageFile) {
  const rawImageData = new Uint8Array(await imageFile.arrayBuffer())
  const response = await fetch(baseurl + "users/images", {
    "method": "POST",
    "credentials": "include",
    "headers": {"Content-Type": "application/octet-stream"},
    "body": rawImageData
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data["data"]["imageID"]
}



async function createRoomReq(roomName) {
  const response = await fetch(baseurl + "rooms",{
    "method": "POST",
    "credentials": "include",
    "headers" : {"Content-Type": "application/json"},
    "body": JSON.stringify({"roomName": roomName})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data.data["roomID"]
}
async function checkRoomExistsReq(roomID) {
  const response = await fetch(baseurl + `rooms/${roomID}/exists`,{
    "method": "POST",
    "credentials": "include",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"roomID":roomID})
  })
  const data = await response.json()
  if (!data.success){
    throw new error(data.message || "req failed")
  }
  return data.data["exists"]
}
async function addRoomUserReq(roomID) {
  const response = await fetch(baseurl + `rooms/${roomID}/users`,{
    "method": "PUT",
    "credentials": "include",
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}
async function getRoomUsersReq(roomID) {
  const response = await fetch(baseurl + `rooms/${roomID}/users`,{
    "method": "GET",
    "credentials": "include"
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data.data["users"]
}

async function storeMessageReq(message) {
  const response = await fetch(baseurl + `rooms/${roomID}/messages`,{
    "method": "POST",
    "credentials": "include",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"message": message})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}
async function getMessagesReq(roomID) {
  const response = await fetch(baseurl + `rooms/${roomID}/messages`,{
    "method": "GET",
    "credentials": "include",
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data["data"]["messages"]
}


async function updateCanvasSnapshotReq(canvasBuffer,roomID){
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/snapshot`, {
    "method": "PUT",
    "credentials": "include",
    "headers": {"Content-Type": "application/octet-stream"},
    "body": canvasBuffer
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}
async function getCanvasSnapshotReq(roomID){
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/snapshot`, {
    "method": "GET",
    "credentials": "include"
  })
  if (response.status !== 200){
    throw new Error("req failed")
  }
  const webBuffer = await response.arrayBuffer() 
  return Buffer.from(webBuffer)
}

async function updateCanvasInstructionsReq(instructions, roomID) {
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/instructions`, {
    "method": "PUT",
    "credentials": "include",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"instructions": instructions})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}
async function getCanvasInstructionsReq(roomID){
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/instructions`, {
    "method": "GET",
    "credentials": "include"
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data["data"]["instructions"]
}

getUserInfoReq = handleError(getUserInfoReq)
updateUserInfoReq = handleError(updateUserInfoReq)
uploadNewImageReq = handleError(uploadNewImageReq)
createRoomReq = handleError(createRoomReq)
checkRoomExistsReq = handleError(checkRoomExistsReq)
getRoomUsersReq = handleError(getRoomUsersReq)
addRoomUserReq = handleError(addRoomUserReq)
storeMessageReq = handleError(storeMessageReq)
getMessagesReq = handleError(getMessagesReq)
updateCanvasSnapshotReq = handleError(updateCanvasSnapshotReq)
getCanvasSnapshotReq = handleError(getCanvasSnapshotReq)
updateCanvasInstructionsReq = handleError(updateCanvasInstructionsReq)
getCanvasInstructionsReq = handleError(getCanvasInstructionsReq)



function getUniqueMessageID(){
  const options = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const messageID = []
  for (let i=0;i< 35;i++){
    messageID.push(options[Math.floor(Math.random() * 36)])
  }
  return messageID.join("")
}

export {getUniqueMessageID,getRoomUsersReq, addRoomUserReq, updateCanvasInstructionsReq, getCanvasInstructionsReq,
  createRoomReq, checkRoomExistsReq, storeMessageReq, getMessagesReq, getUserInfoReq, updateUserInfoReq, 
  uploadNewImageReq, getCanvasSnapshotReq, updateCanvasSnapshotReq}