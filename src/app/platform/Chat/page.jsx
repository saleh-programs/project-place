"use client"
import { useState, useContext, useEffect } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef ,sendJsonMessage, roomID, messages, setMessages, username} = useContext(ThemeContext)
  const [newMessage, setNewMessage] = useState("")

  useEffect(()=>{
    externalChatRef.current = externalChat
    return ()=>{
      externalChatRef.current = (param1) => {}
    }
  },[])

  function handleMessage(e) {
    sendJsonMessage({
      "origin": "chat",
      "type": "chat",
      "username": username,
      "data": newMessage,
      "metadata":{
        "timestamp": Date.now(),
        "messageID": getUniqueMessageID()
      }
    })
    setNewMessage("")
    setMessages(prev=>[...prev, newMessage])
  }

  function externalChat(data){
    switch (data.type){
      case "newMessage":
        setMessages(prev=>[...prev, data.data])
        break
      case "chatHistory":
        const newMessages = data.data.map(item => item[2])
        setMessages(prev=>[...newMessages, ...prev])
        break 
    }
  }
  return(
    <div className={styles.chatPage}>
      <h1 className={styles.title}>
        Chat
      </h1>
      <section className={styles.chatDisplay}>
        {
          messages.map((item,i)=>{
            return (
              <div key={i} className={styles.message}>{item}</div>
            )
          })
        }
      </section>
      <section className={styles.chatHub}>
        {roomID &&
          <section className={styles.newChat}>
            Send Message <input type="text" placeholder="New Message" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)}/>
            <button onClick={handleMessage}>Send</button>
          </section>
        }
      </section>
    </div>
  )
}

export default Chat