"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef, sendJsonMessage, roomID, messages, setMessages, username, userInfo, userStates, setUserStates} = useContext(ThemeContext)
  const [newMessage, setNewMessage] = useState("")
  const [rawMessages, setRawMessages] = useState({})
  const pendingMessages = useRef(new Set())
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
      const [user, timestamp] = [messageList[i]["username"], messageList[i]["metadata"]["timestamp"]]
      group = {
        "username": user,
        "timestamp": timestamp,
        "messages": [messageList[i]["metadata"]["messageID"]]
      }
      i += 1
      while (i < messageList.length){
        const [nextUser, nextTimestamp] = [messageList[i]["username"], messageList[i]["metadata"]["timestamp"]]
        if (user === nextUser && nextTimestamp - timestamp < delay){
          group["messages"].push(messageList[i]["messageID"])
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
        "messages": [message["metadata"]["messageID"]]
      }]
    }
    const delay = 30000
    const [user, timestamp] = [message["username"], message["metadata"]["timestamp"]]
    const [lastUser, lastTimestamp] = [groupedMessages[groupedMessages.length-1]["username"], groupedMessages[groupedMessages.length-1]["timestamp"]]
    if (user === lastUser && timestamp - lastTimestamp < delay){
      const lastGroup = groupedMessages[groupedMessages.length-1]
      const newGroups = groupedMessages.slice(0, -1)
      return [...newGroups,{
        "username": lastGroup["username"],
        "timestamp": lastGroup["timestamp"],
        "messages": [...lastGroup["messages"], message["metadata"]["messageID"]]
      }]
    }else{
      return [...groupedMessages, {
        "username": message["username"],
        "timestamp": message["metadata"]["timestamp"],
        "messages": [message["metadata"]["messageID"]]
      }]
    }
  }




  function handleMessage(e) {
    const currTime = Date.now()
    if (messages.length > 0){
      const lastMsg = rawMessages[messages.at(-1)["messages"].at(-1)]
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

    msgData["status"] = "pending"
    pendingMessages.current.add(messageID)
    setRawMessages({
      ...rawMessages,
      [messageID]: msgData
    })
    setMessages(addGroupedMessage(messages, msgData))

    setTimeout(()=>{
        if (pendingMessages.current.has(messageID)){
          setRawMessages(prev=>{
            return ({
              ...prev,
              [messageID]: {...prev[messageID], "status": "failed"}
            })
          })
        }      
    },3000)
    setNewMessage("")
  }

  function externalChat(data){
    switch (data.type){
      case "newMessage":
        const {origin, type, ...msg} = data
        const msgID = data["metadata"]["messageID"]
        if (pendingMessages.current.has(msgID)){
          pendingMessages.current.delete(msgID)
            setRawMessages(prev => {
              return ({
                ...prev, 
                [msgID]: {...prev[msgID], "status": "delivered"}
              })
            })
          return
        }
        setRawMessages(prev => {
          return ({...prev, [msgID]: {...msg, "status": "delivered"}})
        })
        setMessages(prev => addGroupedMessage(prev, data))
        break
      case "chatHistory":
        if (data.data){
          const newRawMessages = {}
          data.data.forEach(msg=>{
            newRawMessages[msg["metadata"]["messageID"]] = {
              ...msg,
              "status": "delivered"
            }
          })
          setRawMessages(prev => {
            return {...prev, ...newRawMessages}
          })
          setMessages(prev => [...getGroupedMessages(data.data), ...prev])
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
                    <img src={userStates[item["username"]]["imageURL"]} alt="nth" />
                  </span>
                </section>
                <section className={styles.messageRight}>
                  <div className={styles.username}>
                    {item["username"]}
                  </div>
                  <div className={styles.textContainer}>
                    { 
                      item["messages"].map((mssgID)=>{
                      const mssg = rawMessages[mssgID]
                      return (
                        <div key={mssg["metadata"]["messageID"]} className={`${styles.message}`} style={{opacity: mssg["status"] !== "delivered" ? ".7": "1"}}>
                          {mssg["data"]}
                          {mssg["status"] === "failed" && <span style={{color:"red"}}>FAIL</span>}
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