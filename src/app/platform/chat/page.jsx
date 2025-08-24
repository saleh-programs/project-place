"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef, sendJsonMessage, roomID, messages, setMessages, username, userInfo, userStates, setUserStates} = useContext(ThemeContext)

  const [newMessage, setNewMessage] = useState("")
  const rawMessagesRef = useRef({})
  const [rawMessages, setRawMessages] = useState(rawMessagesRef.current)
  const pendingMessages = useRef(new Set())
  const [darkMode, setDarkMode] = useState(false)

  /*

  Message Structure:
  {
    "username": string,
    "status": string,
    "data": string,
    "metadata": {
      "timestamp": number,
      "messageID": string
      },
  }
  Grouped Message Structure:
  {
    "username": string,
    "timestamp": number,
    "messages": [messageID1, messageID2,...]
  }
  */

  useEffect(()=>{
    externalChatRef.current = externalChat
    return ()=>{
      externalChatRef.current = (param1) => {}
    }
  },[])


  // Groups all messages from chat history 
  // (messages in a group are sent in a 30 second interval from same user)
  function getGroupedMessages(messageList){
    const interval = 30000
    const groupedMessages = []
    let group = null;
    let i = 0
    while (i < messageList.length){
      const [user, timestamp, messageID] = [messageList[i]["username"], messageList[i]["metadata"]["timestamp"], messageList[i]["metadata"]["messageID"]]
      group = {
        "username": user,
        "timestamp": timestamp,
        "messages": [messageID]
      }
      i += 1
      while (i < messageList.length){
        const [nextUser, nextTimestamp, nextMessageID] = [messageList[i]["username"], messageList[i]["metadata"]["timestamp"], messageList[i]["metadata"]["messageID"]]
        if (user === nextUser && nextTimestamp - timestamp < interval){
          group["messages"].push(nextMessageID)
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
  // Groups incoming messages
  function addGroupedMessage(groupedMessages, message){
    const interval = 30000
    const [user, timestamp, messageID] = [message["username"], message["metadata"]["timestamp"], message["metadata"]["messageID"]]
    if (groupedMessages.length === 0){
      return [...groupedMessages, {
        "username": user,
        "timestamp": timestamp,
        "messages": [messageID]
      }]
    }
    const [lastUser, lastTimestamp] = [groupedMessages.at(-1)["username"], rawMessagesRef.current[groupedMessages.at(-1)["messages"].at(-1)]["metadata"]["timestamp"]]
    if (user === lastUser && timestamp - lastTimestamp < interval){
      const lastGroup = groupedMessages.at(-1)
      return [...groupedMessages.slice(0, -1),{
        ...lastGroup,
        "messages": [...lastGroup["messages"], message["metadata"]["messageID"]]
      }]
    }
    return [...groupedMessages, {
      "username": message["username"],
      "timestamp": message["metadata"]["timestamp"],
      "messages": [message["metadata"]["messageID"]]
    }]
  }

  function handleMessage(e) {
    const currTime = Date.now()
    if (messages.length > 0){
      const lastMsg = rawMessagesRef.current[messages.at(-1)["messages"].at(-1)]
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
    sendJsonMessage(msg)
    setNewMessage("")
    const {origin, type, ...msgData} = msg
    msgData["status"] = "pending"

    pendingMessages.current.add(messageID)
    rawMessagesRef.current = {
      ...rawMessagesRef.current,
      [messageID]: msgData
    }
    setRawMessages(rawMessagesRef.current)
    setMessages(addGroupedMessage(messages, msgData))

    setTimeout(()=>{
        if (pendingMessages.current.has(messageID)){
          rawMessagesRef.current = {
              ...prev,
            [messageID]: {...prev[messageID], "status": "failed"}
          }
          setRawMessages(rawMessagesRef.current)
        }      
    },3000)
  }


  // newMessage: update if pending image, else update grouped & raw messages
  // chatHistory: add all existing chats to grouped & raw messages
  function externalChat(data){
    switch (data.type){
      case "newMessage":
        const {origin, type, ...msg} = data
        const msgID = data["metadata"]["messageID"]
        if (pendingMessages.current.has(msgID)){
          pendingMessages.current.delete(msgID)
          rawMessagesRef.current = {
            ...rawMessagesRef.current, 
            [msgID]: {...rawMessagesRef.current[msgID], "status": "delivered"}
          }
          setRawMessages(rawMessagesRef.current)
          return
        }
        
        rawMessagesRef.current = {
          ...rawMessagesRef.current,
          [msgID]: {...msg, "status": "delivered"}
        }
        setRawMessages(rawMessagesRef.current)
        setMessages(prev => addGroupedMessage(prev, data))
        break
      case "chatHistory":
        if (data.data){
          data.data.forEach(msg=>{
            rawMessagesRef.current[msg["metadata"]["messageID"]] = {
              ...msg,
              "status": "delivered"
            }
          })
          setRawMessages(rawMessagesRef.current)
          setMessages(prev => [...getGroupedMessages(data.data), ...prev])
        }
        break 
    }
  }
  // Toggle dark/light mode
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
            const timestamp = new Date(item["timestamp"]).toLocaleTimeString("en-us",{hour:"numeric",minute:"2-digit"})
            return (
              <div key={item["timestamp"]} className={styles.messageContainer}>
                <section className={styles.messageLeft}>
                  <span className={styles.timestamp}>
                    {timestamp}
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
                          {mssg["metadata"]["timestamp"]}
                          {mssg["status"] === "failed" && <span style={{color:"red"}}> FAIL</span>}
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