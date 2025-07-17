"use client"
import { useState, useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {sendJsonMessage, roomID, messages, setMessages} = useContext(ThemeContext)
  const [newMessage, setNewMessage] = useState("")

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