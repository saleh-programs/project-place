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
    const currTime = Date.now()
    const messageID = getUniqueMessageID()
    sendJsonMessage({
      "origin": "chat",
      "type": "chat",
      "username": username,
      "data": newMessage,
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID
      }
    })
    setNewMessage("")
    setMessages(prev=>[...prev, {
      "username": username,
      "message": newMessage,
      "timestamp": currTime,
      "messageID": messageID
    }])
  }

  function externalChat(data){
    switch (data.type){
      case "newMessage":
        setMessages(prev=>[...prev, {
          "username": data.username,
          "message": data.data,
          "timestamp": data.metadata.timestamp,
          "messageID": data.metadata.messageID
        }])
        break
      case "chatHistory":
        //fix later
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
              <div key={i} className={styles.message}>
                <div>{JSON.stringify(item,null,3)}</div>
              </div>
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