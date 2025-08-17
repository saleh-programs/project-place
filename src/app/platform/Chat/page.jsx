"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef, sendJsonMessage, roomID, messages, setMessages, username, userInfo, userStates, setUserStates} = useContext(ThemeContext)
  const [newMessage, setNewMessage] = useState("")
  const rawMessages = useRef([])
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
      const {origin, type, ...msg} = messageList[i]
      const [user, timestamp] = [msg["username"], msg["metadata"]["timestamp"]]
      group = {
        "username": user,
        "timestamp": timestamp,
        "messages": [msg]
      }
      i += 1
      while (i < messageList.length){
        const {origin, type, ...nextMsg} = messageList[i]
        const [nextUser, nextTimestamp] = [nextMsg["username"], nextMsg["metadata"]["timestamp"]]
        if (user === nextUser && nextTimestamp - timestamp < delay){
          group["messages"].push(nextMsg)
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
        "messages": [message]
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
        "messages": [...lastGroup["messages"], message]
      }]
    }else{
      return [...groupedMessages, {
        "username": message["username"],
        "timestamp": message["metadata"]["timestamp"],
        "messages": [message]
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
    msgData["status"] = "pending"
    pendingMessages.current.add(currTime)

    sendJsonMessage(msg)
    setNewMessage("")
    rawMessages.current.push(msgData)
    setMessages(addGroupedMessage(messages, msgData))
    setTimeout(()=>{
      setMessages(prev => {
        for (let i = prev.length-1; i >= 0; i--){
          for (let j = prev[i]["messages"].length-1; j >= 0; j--){
            if (prev[i]["messages"][j]["metadata"]["timestamp"] < currTime){
              break
            }else if (prev[i]["messages"][j]["metadata"]["timestamp"] === currTime){
              const group = {
                ...prev[i], 
                "messages": prev[i]["messages"].map((mssg, index)=>{
                  if (index == j){
                    return {
                      ...mssg,
                      "status": pendingMessages.current.has(currTime) ? "failed" : "delivered"
                    }
                  }else{
                    return mssg
                  }
                })
              }
              return [...prev.slice(0,i), group,...prev.slice(i+1)]
            }
          }
        }
        return prev
      })
    },3000)
  }

  function handlePending(timestamp){
    setMessages(prev => {
      for (let i = prev.length - 1; i >= 0;i -= 1){
        if (prev[i]["timestamp"] <= timestamp){
          for (let j = 0; j < prev[i]["messages"].length; j++){
            if (prev[i]["messages"][j]["metadata"]["timestamp"] === timestamp){
              const newGroup = {
                "username" : prev[i]["username"],
                "timestamp": prev[i]["timestamp"],
                "messages": prev[i]["messages"].map((mssg, index)=>{
                  if (index === j){
                    return ({
                      ...mssg,
                      "status": "delivered"
                    })
                  }
                  return mssg
                })
              }
              return [...prev.slice(0, i), newGroup, ...prev.slice(i+1)]
            }
          }
        }
      }
      return prev
    })
  }
  function externalChat(data){
    switch (data.type){
      case "newMessage":
        const {type, origin, ...msg} = data
        rawMessages.current.push(msg)
        const timestamp = data["metadata"]["timestamp"]
        if (pendingMessages.current.has(timestamp)){
          pendingMessages.current.delete(timestamp)
          handlePending(timestamp)
          return
        }
        
        setMessages(prev => addGroupedMessage(prev, data))
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
                    <img src={userStates[item["username"]]["imageURL"]} alt="nth" />
                  </span>
                </section>
                <section className={styles.messageRight}>
                  <div className={styles.username}>
                    {item["username"]}
                  </div>
                  <div className={styles.textContainer}>
                    { 
                      item["messages"].map((mssg)=>{
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