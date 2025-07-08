"use client"
import { useState } from "react"
import ThemeContext from "../assets/ThemeContext"
import useWebSocket from "react-use-websocket"

import Sidebar from "../components/Sidebar"

function MainDisplay({children, username}){
  const [roomID, setRoomID] = useState("")
  const [messages, setMessages] = useState([])

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
        // case "isDrawing":
        //   externalDraw(data.data, data.type)
        //   break
        // case "doneDrawing":
        //   externalDraw(data.data, data.type)
        //   break
      }
    }
  },roomID !== "")

  const shared = {
    sendJsonMessage,
    roomID, setRoomID,
    messages, setMessages
  }

  return(
    <ThemeContext.Provider value={shared}>
        <Sidebar/>
        {children}
    </ThemeContext.Provider>
  )
}

export default MainDisplay