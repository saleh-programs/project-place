"use client"
import { useState, useContext } from "react"
import ThemeContext from "../../../assets/ThemeContext"

import { getUniqueMessageID } from "../../../../backend/requests"
import styles from "../../../../styles/platform/Chat.module.css"

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
    <div>
      <section className={styles.chat}>
        {
          messages.map((item,i)=>{
            return (
              <div key={i}>{item}</div>
            )
          })
        }
        {roomID &&
        <section className={styles.newChat}>
          Send Message <input type="text" placeholder="New Message" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)}/>
          <button onClick={handleMessage}>Send</button>
        </section>
        }
      </section>
      in chat
    </div>
  )
}

export default Chat