"use client"
import ThemeContext from "../../assets/ThemeContext"

import Sidebar from "../../components/Sidebar"
import useWebSocket from "react-use-websocket"

export default function Platform({ children }) {
  // const {sendJsonMessage} = useWebSocket("ws://localhost:8000",{
  //   queryParams:{
  //     "username": "123",
  //     "roomID": roomID
  //   },
  //   onMessage:(event)=>{
  //     const data = JSON.parse(event.data)
  //     switch (data.type){
  //       case "chat":
  //         setMessages(prev=>[...prev, data.data])
  //         break
  //       case "chatHistory":
  //         const newMessages = data.data.map(item => item[2])
  //         setMessages(prev=>[...newMessages, ...prev])
  //         break
  //       case "isDrawing":
  //         externalDraw(data.data, data.type)
  //         break
  //       case "doneDrawing":
  //         externalDraw(data.data, data.type)
  //         break
  //     }
  //   }
  // })
  return (
    <ThemeContext.Provider value={2}>
      <Sidebar/>
      {children}
    </ThemeContext.Provider>
  );
}
