const baseurl = "http://localhost:5000/"

async function createRoomReq(roomName) {
  try{
    const response = await fetch(baseurl + "createRoom",{
      "method": "POST",
      "headers" : {"Content-Type": "application/json"},
      "body": JSON.stringify({roomName: roomName})
    })
    const data = await response.json()
    if (!data.success){
      throw new Error(data.message || "req failed")
    }
    return data.data
  }catch(err){
    console.error(err)
    return null
  }
}

async function validateRoomReq(roomID) {
  try{
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
  }catch(err){
    console.error(err)
    return null
  }
}

async function storeMessageReq(messageInfo) {
  try{
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
  }catch(err){
    console.error(err)
    return null
  }
}

async function getMessagesReq(roomID, messageID=null) {
  try{
    const response = await fetch(baseurl + "getMessages",{
      "method": "POST",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"messageID":messageID, "roomID":roomID})
    })
    const data = await response.json()
    if (!data.success){
      throw new Error(data.message ||"req failed")
    }
    return data.data
  }catch(err){
    console.error(err)
    return null
  }
}

async function addInstruction(instruction, roomID) {
  try{
    const response = await fetch(baseurl + "addInstruction",{
      "method": "POST",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"instruction": instruction, "roomID": roomID})
    })
    const data = await response.json()
    if (!data.success){
      throw new Error(data.message ||"req failed")
    }
    return data
  }catch(err){
    console.error(err)
    return null
  }
}

async function getInstructions(roomID) {
  try{
    const response = await fetch(baseurl + "getInstructions",{
      "method": "POST",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"roomID": roomID})
    })
    const data = await response.json()
    if (!data.success){
      throw new Error(data.message ||"req failed")
    }
    return data.data
  }catch(err){
    console.error(err)
    return null
  }
}

async function getSessionUserInfoReq(sessionToken=null) {
  try{
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
  }catch(err){
    console.error(err)
    return null
  }
}

async function getUserInfoReq(email) {
  try{
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
  }catch(err){
    console.error(err)
    return null
  }
}
async function modifyUserInfoReq(changedFieldsObj) {
  try{
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
  }catch(err){
    console.error(err)
    return null
  }
}

async function uploadNewImageReq(imageFile) {
  try{
    const rawImageData = new Uint8Array(await imageFile.arrayBuffer())
    const response = await fetch(baseurl + "uploadNewImage", {
      "method": "POST",
      "headers": {"Content-Type": "application/octet-stream"},
      "body": rawImageData
    })
    const data = await response.json()
    if (!data.success){
      throw new Error(data.message || "req failed")
    }
    return data.data
  }catch(err){
    console.error(err)
    return null
  }
}
async function updateUsernameReq(email, username){
  try{
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
  }catch (err){
    console.error(err)
    return null
  }
}

async function updateCanvas(canvasBuffer,roomID){
  try{
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
  }catch (err){
    console.error(err)
    return null
  }
}

async function getCanvas(roomID){
  try{
    const response = await fetch(baseurl + "getCanvas" + `?roomID=${roomID}`, {
      "method": "GET",
    })
    if (response.status !== 200){
      //fix later
      return null
    }
    const canvasBlob = await response.blob() 
    return canvasBlob
  }catch(err){
    console.error(err)
    return null
  }
}

function getUniqueMessageID(){
  const options = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const messageID = []
  for (let i=0;i< 35;i++){
    messageID.push(options[Math.floor(Math.random() * 36)])
  }
  return messageID.join("")
}
export {getUniqueMessageID,
  createRoomReq, validateRoomReq, storeMessageReq, getMessagesReq, addInstruction, getInstructions, getSessionUserInfoReq, getUserInfoReq, modifyUserInfoReq, 
  uploadNewImageReq,
  updateUsernameReq, getCanvas, updateCanvas}