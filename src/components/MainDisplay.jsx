"use client"
import { use, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import useWebSocket from "react-use-websocket"

import styles from "styles/components/MainDisplay.module.css"
import Sidebar from "src/components/Sidebar"

function MainDisplay({children, username, userInfoInitial}){
  const [roomID, setRoomID] = useState("")
  const [messages, setMessages] = useState([])
  const savedCanvasInfoRef = useRef({
    "snapshot": null,
    "operations": [],
    "latestOp": -1
  })
  const deviceInfo = useRef({
    "device": null,
    "routerRtpCapabilities": null,
    "producerParams": [],
    "sendTransport":{
      "ref": null,
      "connectCallback": null,
      "produceCallback": null
    },
    "recvTransport": {
      "ref": null,
      "connectCallback": null
    }
  })

  const externalChatRef = useRef((param1)=>{})
  const externalWhiteboardRef = useRef((param1)=>{})
  const externalVideochatRef = useRef((param1)=>{})

  const [userInfo, setUserInfo] = useState(userInfoInitial)
  const [userStates, setUserStates] = useState({})

  //Bug note when we go back to chat: if user not on chat page history not updated
  const {sendJsonMessage} = useWebSocket("ws://localhost:8000",{
    queryParams:{
      "username": username,
      "roomID": roomID
    },
    onMessage:(event)=>{
      if (event.data instanceof Blob){
        reconstructCanvas(event.data)
        return
      }

      const data = JSON.parse(event.data)
      switch (data.origin){
        case "user":
          updateUserStates(data)
          break
        case "chat":
          externalChatRef.current(data)
          break
        case "whiteboard":
          externalWhiteboardRef.current(data)
          break
        case "videochat":
          if (data.type === "setup"){
            const {routerRtpCapabilities} = data.data
            deviceInfo.current["routerRtpCapabilities"] = routerRtpCapabilities
            break
          }
          externalVideochatRef.current(data)
          break
      }
    }
  },roomID !== "")

  const shared = {
    username,userInfo, setUserInfo, userStates, setUserStates,
    sendJsonMessage, savedCanvasInfoRef, deviceInfo,
    externalWhiteboardRef,externalChatRef, externalVideochatRef,
    roomID, setRoomID,
    messages, setMessages
  }

  async function reconstructCanvas(data){
    const canvasBuffer = await data.arrayBuffer()

    const view = new DataView(canvasBuffer)
    const opsLen = view.getUint32(0, false)

    savedCanvasInfoRef.current["latestOp"] = view.getInt8(4)
    savedCanvasInfoRef.current["operations"] = JSON.parse(new TextDecoder().decode(canvasBuffer.slice(5,5+opsLen)))

    const img = await createImageBitmap(new Blob([canvasBuffer.slice(5+opsLen)], {"type": "image/png"}))
    
    const tempCanvas = Object.assign(document.createElement("canvas"), {"width":1000, "height":1000})
    const tempCxt = tempCanvas.getContext("2d")
    tempCxt.drawImage(img, 0, 0)
    savedCanvasInfoRef.current["snapshot"] = tempCxt.getImageData(0,0,1000,1000)
    img.close()

    externalWhiteboardRef.current("restoreCanvas")
  }

  function updateUserStates(data){
    switch (data["type"]){
      case "newUser":
        setUserStates(prev => {
          return ({
            ...prev, 
            [data["username"]]: {
                "imageURL": data["imageURL"],
                "status": "idle",
                "location": "chat"
            }})
        })
        break
      case "userInfo":
        setUserStates(prev => {
          return ({
            ...prev, 
            [data["username"]]: {
                ...prev[data["username"]],
                ...data["data"]
            }})
        })
        break
      case "getUsers":
        const users = {}
        data["data"].forEach(user => {
           users[user["username"]] = {
            "imageURL": user["imageURL"],
            "status": "idle",
            "location": "chat"          
          }
        })
        console.log(users)
        setUserStates(users)
        break
    }
  }
  return(
    <ThemeContext.Provider value={shared}>
      <div className="siteWrapper">
        <Sidebar/>
        <div className={`pageContainer ${!roomID ? styles.dimScreen: ""}`}>
          {children}
        </div>
      </div>
        
    </ThemeContext.Provider>
  ) 
}

export default MainDisplay