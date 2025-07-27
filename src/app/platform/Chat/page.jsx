"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef ,sendJsonMessage, roomID, messages, setMessages, username, userInfo} = useContext(ThemeContext)
  const [newMessage, setNewMessage] = useState("")

  const chatPageRef = useRef(null)
  const [darkMode, setDarkMode] = useState(false)

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
  function toggleAppearance(e){
    setDarkMode(e.target.checked)
    const toggleElem = document.querySelector(`.${styles.toggleAppearance}`)
    if (e.target.checked){
      toggleElem.classList.add(`${styles.enableDarkMode}`)
    }else{
      toggleElem.classList.remove(`${styles.enableDarkMode}`)
    }
  }
  return(
    <div className={styles.chatPage}
    style={{"color":darkMode ? "white" : "black","backgroundColor": darkMode ? "rgb(35, 34, 37)" : "white"}}>
      <h1 className={styles.title}>
        Chat
        <label className={styles.toggleAppearance}>
          <input 
          type="checkbox"
          onClick={toggleAppearance}
          />
          <span></span>
        </label>
      </h1>
      <section className={styles.chatDisplay}> 
        {
          messages.map((item,i)=>{
            const currTime = new Date(item["timestamp"]).toLocaleTimeString("en-us",{hour:"numeric",minute:"2-digit"})
            return (
              <div key={i} className={styles.messageContainer}>
                <section className={styles.messageLeft}>
                  <span className={styles.timestamp}>
                    {currTime}
                  </span>
                  <span className="profilePic">
                    <img src={userInfo["profilePicURL"]} alt="nth" />
                  </span>
                </section>
                <section className={styles.messageRight}>
                  <div className={styles.username}>
                    {username}
                  </div>
                  <div className={styles.textContainer}>
                    <div className={styles.message}>
                      {item["message"]}
                    </div>
                  </div>

                </section>
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