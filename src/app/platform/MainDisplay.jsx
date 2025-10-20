"use client"
import * as mediasoupClient from "mediasoup-client"
import { useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import useWebSocket from "react-use-websocket"

import styles from "styles/components/MainDisplay.module.css"
import Sidebar from "src/components/Sidebar"
import { useRouter, usePathname } from "next/navigation"

function MainDisplay({children, username, initialUserInfo}){
  const router = useRouter()
  
  const [userInfo, setUserInfo] = useState(initialUserInfo)
  const [roomID, setRoomID] = useState("")
  const [userStates, setUserStates] = useState({})

  const [messages, setMessages] = useState([])
  const savedCanvasInfoRef = useRef({
    "snapshot": null,
    "operations": [],
    "latestOp": -1
  })
  const device = useRef(null)
  const [callOffers, setCallOffers] = useState({})
  const callOffersRef = useRef(callOffers)
  const stunCandidates = useRef({})
  
  const externalChatRef = useRef((param1)=>{})
  const externalWhiteboardRef = useRef((param1)=>{})
  const externalGroupcallRef = useRef((param1)=>{})
  const externalPeercallRef = useRef((param1)=>{})


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
        case "groupcall":
          if (data.type === "setup"){
            const {routerRtpCapabilities} = data.data
            device.current = new mediasoupClient.Device()
            device.current.load({routerRtpCapabilities})
            break
          }
          externalGroupcallRef.current(data)
          break
        case "peercall":
          if (data.type === "callRequest"){
            callOffersRef.current[data["username"]] = data.data["offer"]
            setCallOffers({...callOffersRef.current})
          }
          if (data.type === "disconnect" && callOffersRef.current.hasOwnProperty(data["username"])){
            delete callOffersRef.current[data["username"]]
            setCallOffers({...callOffersRef.current})

            if (stunCandidates.current.hasOwnProperty(data["username"])){
              delete stunCandidates.current[data["username"]]
            }
          }

          if (data.type === "stunCandidate"){
              if (!stunCandidates.current.hasOwnProperty(data["username"])){
                stunCandidates.current[data["username"]] = [data.data["candidate"]]
              }else{
                stunCandidates.current[data["username"]].push(data.data["candidate"])
              }
          }
          externalPeercallRef.current(data)
          break
      }
    }
  },roomID !== "")

  const shared = {
    username,userInfo, setUserInfo, userStates, setUserStates,
    sendJsonMessage, savedCanvasInfoRef, device, callOffers, setCallOffers, callOffersRef, stunCandidates,
    externalWhiteboardRef,externalChatRef, externalGroupcallRef, externalPeercallRef,
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
        console.log(data)
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

  function rejectCall(peerName) {
      sendJsonMessage({
      "username": username, 
      "origin": "peercall",
      "type": "callResponse",
      "data": {"status": "rejected", "peer": peerName}
      })
      delete callOffersRef.current[peerName]
      setCallOffers({...callOffersRef.current})
  }
  return(
    <ThemeContext.Provider value={shared}>
      <div className="siteWrapper">
        <Sidebar/>
        <div className={`pageContainer ${!roomID ? styles.dimScreen: ""}`}>
          {children}
          hey
          {Object.keys(callOffers).map((name) => {
            return (
            <div key={name} className={styles.callNotification}>
              New call offer from <strong>{name}</strong>!
              <button onClick={()=>router.push(`/platform/videochat/peercall?peer=${encodeURI(name)}`)}>Accept</button>
              <button onClick={()=>rejectCall(name)}>Reject</button>
            </div>
            )
          })}
        </div>
      </div>
        
    </ThemeContext.Provider>
  ) 
}

export default MainDisplay