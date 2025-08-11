"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef ,sendJsonMessage, roomID, messages, setMessages, username, userInfo} = useContext(ThemeContext)
  const [newMessage, setNewMessage] = useState("")
  const rawMessages = useRef([])
  const chatPageRef = useRef(null)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(()=>{
    externalChatRef.current = externalChat
    return ()=>{
      externalChatRef.current = (param1) => {}
    }
  },[])

// {
//       "origin": "chat",
//       "type": "newMessage",
//       "username": username,
//       "data": newMessage,
//       "metadata":{
//         "timestamp": currTime,
//         "messageID": messageID
//       }
//     }
  function getGroupedMessages(messageList){
    const delay = 30000
    const groupedMessages = []
    let group = null;
    let i = 0
    while (i < messageList.length){
      const msg = messageList[i]
      const [user, timestamp, data] = [msg["username"], msg["metadata"]["timestamp"], msg["data"]]
      group = {
        "username": user,
        "timestamp": timestamp,
        "messages": [data]
      }
      i += 1
      while (i < messageList.length){
        const nextMsg = messageList[i]
        const [nextUser, nextTimestamp, nextData] = [nextMsg["username"], nextMsg["metadata"]["timestamp"], nextMsg["data"]]
        if (user === nextUser && nextTimestamp - timestamp < delay){
          group["messages"].push(nextMsg["data"])
          i += 1
        }else{

          groupedMessages.push(group)
          group = null
          break
        }
      }
    }
    if (group){
      groupedMessages.push(group)
    }
    return groupedMessages
  }
  function addGroupedMessage(groupedMessages, message){
    if (groupedMessages.length === 0){
      return [...groupedMessages, {
        "username": message["username"],
        "timestamp": message["metadata"]["timestamp"],
        "messages": [message["data"]]
      }]
    }
    const delay = 30000
    const [user, timestamp] = [message["username"], message["metadata"]["timestamp"]]
    const [lastUser, lastTimestamp] = [groupedMessages[groupedMessages.length-1]["username"], groupedMessages[groupedMessages.length-1]["timestamp"]]
    if (user === lastUser && timestamp - lastTimestamp < delay){
      groupedMessages[groupedMessages.length-1]["messages"].push(message["data"])
      return [...groupedMessages]
    }else{
      return [...groupedMessages, {
        "username": message["username"],
        "timestamp": message["metadata"]["timestamp"],
        "messages": [message["data"]]
      }]
    }
  }




  function handleMessage(e) {
    const currTime = Date.now()
    if (rawMessages.current.length > 0){
      const lastMsg = rawMessages.current[rawMessages.current.length - 1]
      if (username === lastMsg["username"] && currTime - lastMsg["metadata"]["timestamp"] < 100){
        return
      }
    }
    const messageID = getUniqueMessageID()
    const msg = {
      "origin": "chat",
      "type": "newMessage",
      "username": username,
      "data": newMessage,
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID
      }
    }
    const {origin, type, ...msgData} = msg
    sendJsonMessage(msg)
    setNewMessage("")
    rawMessages.current.push(msgData)
    setMessages(addGroupedMessage(messages, msg))
  }

  function externalChat(data){
    switch (data.type){
      case "newMessage":
        setMessages(prev => addGroupedMessage(prev, data))
        const {type, origin, ...msg} = data
        rawMessages.current.push(msg)
        break
      case "chatHistory":
        if (data.data){
          rawMessages.current = [...data.data, ...rawMessages.current]
          setMessages(getGroupedMessages(data.data))
        }
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
    style={{"color":darkMode ? "white" : "black","backgroundColor": darkMode ? "rgba(44, 45, 50,.97)" : "white"}}>
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
                    {item["username"]}
                  </div>
                  <div className={styles.textContainer}>
                    { 
                      item["messages"].map((mssg,i)=>{
                      return (
                        <div key={i} className={styles.message}>
                          {mssg}
                        </div>
                      )})
                    }
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