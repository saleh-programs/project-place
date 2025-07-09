"use client"
import { useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import useWebSocket from "react-use-websocket"

import Sidebar from "src/components/Sidebar"

function MainDisplay({children, username}){
  const [roomID, setRoomID] = useState("")
  const [messages, setMessages] = useState([])
  const externalDrawRef = useRef((param1, param2)=>{})

  const {sendJsonMessage} = useWebSocket("ws://localhost:8000",{
    queryParams:{
      "username": "123",
      "roomID": roomID
    },
    onMessage:(event)=>{
      const data = JSON.parse(event.data)
      switch (data.type){
        case "chat":
          setMessages(prev=>[...prev, data.data])
          break
        case "chatHistory":
          const newMessages = data.data.map(item => item[2])
          setMessages(prev=>[...newMessages, ...prev])
          break
        case "isDrawing":
          externalDrawRef.current(data.data, data.type)
          break
        case "doneDrawing":
          externalDrawRef.current(data.data, data.type)
          break
      }
    }
  },roomID !== "")

  const shared = {
    sendJsonMessage,
    externalDrawRef,
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