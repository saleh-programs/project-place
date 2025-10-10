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


async function createRoomReq(roomName, username) {
  const response = await fetch(baseurl + "createRoom",{
    "method": "POST",
    "headers" : {"Content-Type": "application/json"},
    "body": JSON.stringify({"roomName": roomName, "username": username})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data.data
}

async function validateRoomReq(roomID) {
  const response = await fetch(baseurl + "validateRoom",{
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"roomID":roomID})
  })
  const data = await response.json()
  if (!data.success){
    throw new error(data.message || "req failed")
  }
  return data.data
}

async function storeMessageReq(messageInfo) {
  const response = await fetch(baseurl + "storeMessage",{
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify(messageInfo)
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}

async function getMessagesReq(roomID) {
  const response = await fetch(baseurl + "getMessages",{
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"roomID":roomID})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data.data
}


async function getSessionUserInfoReq(sessionToken=null) {
  let options;
  if (sessionToken){
    options = {
      "method": "GET",
      "headers": {"Cookie": `session=${sessionToken}`}
    }
  }else{
    options = {
      "method": "GET",
      "credentials": "include"
    }
  }
  const response = await fetch(baseurl + "getSessionUserInfo", options)
  const data = await response.json()
  if (!data.success){ 
    throw new Error(data.message ||"req failed")
  }
  return data.data
}

async function getUserInfoReq(email) {
  const response = await fetch(baseurl +"getUserInfo", {
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"email":email})
  })
  const data = await response.json()
  if (!data.success){ 
    throw new Error(data.message ||"req failed")
  }
  return data.data
}
async function modifyUserInfoReq(changedFieldsObj) {
  const response = await fetch(baseurl + "modifyUserInfo", {
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify(changedFieldsObj)
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}

async function uploadNewImageReq(imageFile, username) {
  const rawImageData = new Uint8Array(await imageFile.arrayBuffer())
  const response = await fetch(baseurl + "uploadNewImage" + `?owner=${username}` , {
    "method": "POST",
    "headers": {"Content-Type": "application/octet-stream"},
    "body": rawImageData
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data.data
}
async function updateUsernameReq(email, username){
  const response = await fetch(baseurl + "updateUsername",{
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"email": email,"username": username})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}

async function updateCanvasReq(canvasBuffer,roomID){
  const response = await fetch(baseurl + "updateCanvas" + `?roomID=${roomID}`, {
    "method": "POST",
    "headers": {"Content-Type": "application/octet-stream"},
    "body": canvasBuffer
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}

async function updateInstructionsReq(instructions, roomID) {
  const response = await fetch(baseurl + "updateInstructions" + `?roomID=${roomID}`, {
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify(instructions)
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}
async function getCanvasReq(roomID){
  const response = await fetch(baseurl + "getCanvas" + `?roomID=${roomID}`, {
    "method": "GET",
  })
  if (response.status !== 200){
    throw new Error(data.message || "req failed")
  }
  const webBuffer = await response.arrayBuffer() 
  return Buffer.from(webBuffer)
}
async function getInstructionsReq(roomID){
  const response = await fetch(baseurl + "getInstructions" + `?roomID=${roomID}`, {
    "method": "GET",
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data.data
}

async function getRoomUsersReq(roomID) {
  const response = await fetch(baseurl + "getRoomUsers",{
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"roomID": roomID})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data.data
}

async function addRoomUserReq(username, roomID) {
  const response = await fetch(baseurl + "addRoomUser",{
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": JSON.stringify({"username": username,"roomID": roomID})
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}

createRoomReq = handleError(createRoomReq)
validateRoomReq = handleError(validateRoomReq)
storeMessageReq = handleError(storeMessageReq)
getMessagesReq = handleError(getMessagesReq)
getSessionUserInfoReq = handleError(getSessionUserInfoReq)
getUserInfoReq = handleError(getUserInfoReq)
modifyUserInfoReq = handleError(modifyUserInfoReq)
uploadNewImageReq = handleError(uploadNewImageReq)
updateUsernameReq = handleError(updateUsernameReq)
updateCanvasReq = handleError(updateCanvasReq)
updateInstructionsReq = handleError(updateInstructionsReq)
getCanvasReq = handleError(getCanvasReq)
getInstructionsReq = handleError(getInstructionsReq)
getRoomUsersReq = handleError(getRoomUsersReq)
addRoomUserReq = handleError(addRoomUserReq)


function getUniqueMessageID(){
  const options = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const messageID = []
  for (let i=0;i< 35;i++){
    messageID.push(options[Math.floor(Math.random() * 36)])
  }
  return messageID.join("")
}

export {getUniqueMessageID,getRoomUsersReq, addRoomUserReq, updateInstructionsReq, getInstructionsReq,
  createRoomReq, validateRoomReq, storeMessageReq, getMessagesReq, getSessionUserInfoReq, getUserInfoReq, modifyUserInfoReq, 
  uploadNewImageReq,
  updateUsernameReq, getCanvasReq, updateCanvasReq}