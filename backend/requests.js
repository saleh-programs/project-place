const baseurl = "http://10.0.0.110:5000/"

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


function getUniqueMessageID(){
  const options = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const messageID = []
  for (let i=0;i< 35;i++){
    messageID.push(options[Math.floor(Math.random() * 36)])
  }
  return messageID.join("")
}
export {getUniqueMessageID,
  createRoomReq, validateRoomReq, storeMessageReq, getMessagesReq, addInstruction, getInstructions}