"use client"
import { useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import useWebSocket from "react-use-websocket"

import Sidebar from "src/components/Sidebar"

function MainDisplay({children, username, userInfo}){
  const [roomID, setRoomID] = useState("")
  const [messages, setMessages] = useState([])
  const externalDrawRef = useRef((param1)=>{})
  const externalChatRef = useRef((param1)=>{})

  const {sendJsonMessage} = useWebSocket("ws://localhost:8000",{
    queryParams:{
      "username": username,
      "roomID": roomID
    },
    onMessage:(event)=>{
      const data = JSON.parse(event.data)
      switch (data.origin){
        case "chat":
          externalChatRef.current(data)
          break
        case "whiteboard":
          externalDrawRef.current(data)
          break
      }
    }
  },roomID !== "")

  const shared = {
    username,userInfo,
    sendJsonMessage,
    externalDrawRef,externalChatRef,
    roomID, setRoomID,
    messages, setMessages
  }

  return(
    <ThemeContext.Provider value={shared}>
      <div className="siteWrapper">
        <Sidebar/>
        <div className="pageContainer">
          {children}
        </div>
      </div>
        
    </ThemeContext.Provider>
  )
}

export default MainDisplay