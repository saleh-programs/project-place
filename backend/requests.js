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
  const fileInfo = new FormData()
  fileInfo.append("img", imageFile)
  const response = await fetch(baseurl + "users/images", {
    "method": "POST",
    "credentials": "include",
    "body": fileInfo
  })
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data["data"]["path"]
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
    "method": "GET",
    "credentials": "include"
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
async function getRoomUsersReq(roomID, token=null) {
  let options;
  if (token){
    options = {
      "method": "GET",
      "headers": {"authorization": `Bearer ${token}`}
    }
  }else{
    options = {
      "method": "GET",
      "credentials": "include"
    }
  }

  const response = await fetch(baseurl + `rooms/${roomID}/users`, options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data["data"]["users"]
}

async function storeMessageReq(message, roomID, token=null) {
  let options;
  if (token){
    options = {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "authorization": `Bearer ${token}`
      },
      "body": JSON.stringify({"message": message})
    }
  }else{
    options = {
      "method": "POST",
      "credentials": "include",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"message": message})
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/messages`,options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}
async function editMessageReq({messageID, content}, roomID, token=null) {
  let options;
  if (token){
    options = {
      "method": "PATCH",
      "headers": {
        "Content-Type": "application/json",
        "authorization": `Bearer ${token}`
      },
      "body": JSON.stringify({"messageID": messageID, "content": content})
    }
  }else{
    options = {
      "method": "PATCH",
      "credentials": "include",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"messageID": messageID, "content": content})
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/messages`,options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}
async function deleteMessageReq({messageID}, roomID, token=null) {
  let options;
  if (token){
    options = {
      "method": "DELETE",
      "headers": {
        "Content-Type": "application/json",
        "authorization": `Bearer ${token}`
      },
      "body": JSON.stringify({"messageID": messageID})
    }
  }else{
    options = {
      "method": "DELETE",
      "credentials": "include",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"messageID": messageID})
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/messages`,options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data
}
async function getMessagesReq(roomID, token=null) {
  let options;
  if (token){
    options = {
      "method": "GET",
      "headers": {"authorization": `Bearer ${token}`}
    }
  }else{
    options = {
      "method": "GET",
      "credentials": "include",
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/messages`, options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message ||"req failed")
  }
  return data["data"]["messages"]
}


async function updateCanvasSnapshotReq(canvasBuffer,roomID, token=null){
  let options;
  if (token){
    options = {
    "method": "PUT",
    "headers": {
      "Content-Type": "application/octet-stream",
      "authorization": `Bearer ${token}`
    },
    "body": canvasBuffer
  }
  }else{
    options = {
    "method": "PUT",
    "credentials": "include",
    "headers": {"Content-Type": "application/octet-stream"},
    "body": canvasBuffer
    } 
  }
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/snapshot`, options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}
async function getCanvasSnapshotReq(roomID, token=null){
  let options;
  if (token){
    options = {
      "method": "GET",
      "headers": {"authorization": `Bearer ${token}`}
    }
  }else{
    options = {
      "method": "GET",
      "credentials": "include",
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/snapshot`, options)
  if (response.status !== 200){
    throw new Error("req failed")
  }
  const webBuffer = await response.arrayBuffer() 
  return Buffer.from(webBuffer)
}

async function updateCanvasInstructionsReq(instructions, roomID, token=null) {
  let options;
  if (token){
    options = {
      "method": "PUT",
      "headers": {
        "Content-Type": "application/json",
        "authorization": `Bearer ${token}`
      },
      "body": JSON.stringify({"instructions": instructions})
    }
  }else{
    options = {
      "method": "PUT",
      "credentials": "include",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({"instructions": instructions})
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/instructions`, options)
  const data = await response.json()
  if (!data.success){
    throw new Error(data.message || "req failed")
  }
  return data
}
async function getCanvasInstructionsReq(roomID, token=null){
  let options;
  if (token){
    options = {
      "method": "GET",
      "headers": {"authorization": `Bearer ${token}`}
    }
  }else{
    options = {
      "method": "GET",
      "credentials": "include",
    }
  }
  const response = await fetch(baseurl + `rooms/${roomID}/canvas/instructions`, options)
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
editMessageReq = handleError(editMessageReq)
deleteMessageReq = handleError(deleteMessageReq)
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
  createRoomReq, checkRoomExistsReq, storeMessageReq, editMessageReq, deleteMessageReq,getMessagesReq, getUserInfoReq, updateUserInfoReq, 
  uploadNewImageReq, getCanvasSnapshotReq, updateCanvasSnapshotReq}