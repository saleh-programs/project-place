"use client"
import { useEffect, useRef, useState } from "react"
import useWebSocket from "react-use-websocket"

import { getUniqueMessageID,createRoomReq, validateRoomReq } from "../../../backend/requests"
import styles from "../../../styles/pages/Platform.module.css"

function Platform(){
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomID, setJoinRoomID]= useState("")
  const [roomID, setRoomID] = useState("")

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const lazyUsername = useRef(Math.floor(Math.random()*500))

  const {sendJsonMessage} = useWebSocket("ws://10.0.0.110:8000",{
    queryParams:{
      "username": lazyUsername.current,
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
      }
    }
  })

  async function handleRoomCreation(){
    const res = await createRoomReq(newRoomName)
    if (res){
      setNewRoomName("")
      setMessages([])
      setRoomID(res)
      setIsCreatingRoom(false)
    }
  }
  async function handleRoomLoad(){
    const res = await validateRoomReq(joinRoomID)
    if(res){
      setMessages([])
      setRoomID(joinRoomID);
      setIsLoadingRoom(false)

    }
  }

  function handleMessage(e) {
    sendJsonMessage({
      "type": "chat",
      "data": newMessage,
      "timestamp": Date.now(),
      "messageID": getUniqueMessageID()
    })
    setNewMessage("")
    setMessages(prev=>[...prev, newMessage])
  }

  return(
    <div className={styles.platformpage}>
      <div className={styles.sidePanel}>
        <section className={styles.features}>
          <button>Chat</button>
          <button>Documents</button>
          <button>Whiteboard</button>
          <button>Video Chat</button>
        </section>
        <section className={styles.accountHub}>
          {roomID}<br/>
          <div>Account is: </div>
          <section>
            Would you like to create a room or join a room?
            <button onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>Create</button>
            {isCreatingRoom &&
              <span>
                <input 
                type="text" 
                placeholder="New Room Name"
                onChange={(e)=>setNewRoomName(e.target.value)} />
                <button onClick={handleRoomCreation}>Submit</button>
              </span>
            }
            <br />
            <button onClick={()=>{setIsCreatingRoom(false);setIsLoadingRoom(true)}}>Join</button>
            {isLoadingRoom &&
              <span>
                <input type="text" placeholder="Room ID" value={joinRoomID} onChange={(e)=>setJoinRoomID(e.target.value)} />
                <button onClick={handleRoomLoad}>Submit</button>
              </span>
              }
          </section>

        </section>
      </div>
      <div className={styles.mainContent}>
        <section>
          Chat
        </section>
        <section className={styles.chat}>
          {
            messages.map((item,i)=>{
              return (
                <div key={i}>{item}</div>
              )
            })
          }
        </section>
        {roomID &&
        <section className={styles.newChat}>
          Send Message <input type="text" placeholder="New Message" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)}/>
          <button onClick={handleMessage}>Send</button>
        </section>
          }
      </div>
    </div>
  )
}

export default Platform