"use client"
import { use, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import useWebSocket from "react-use-websocket"

import styles from "styles/components/MainDisplay.module.css"
import Sidebar from "src/components/Sidebar"

function MainDisplay({children, username, userInfoInitial}){
  const [roomID, setRoomID] = useState("")
  const [messages, setMessages] = useState([])
  const externalDrawRef = useRef((param1)=>{})
  const externalChatRef = useRef((param1)=>{})

  const [userInfo, setUserInfo] = useState(userInfoInitial)
  const [userStates, setUserStates] = useState({})

  const {sendJsonMessage} = useWebSocket("ws://localhost:8000",{
    queryParams:{
      "username": username,
      "roomID": roomID
    },
    onMessage:(event)=>{
      const data = JSON.parse(event.data)
      switch (data.origin){
        case "user":
          updateUserStates(data)
          break
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
    username,userInfo, setUserInfo, userStates, setUserStates,
    sendJsonMessage,
    externalDrawRef,externalChatRef,
    roomID, setRoomID,
    messages, setMessages
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