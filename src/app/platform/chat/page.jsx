"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"

import { getUniqueMessageID } from "backend/requests"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef, sendJsonMessage, roomID, messagesRef, username, userInfo, userStates, setUserStates} = useContext(ThemeContext)

  const canSendRef = useRef(true)
  const [newMessage, setNewMessage] = useState("")

  const [groupedMessages, setGroupedMessages] = useState([])
  const [mappedMessages, setMappedMessages] = useState({})

  const pendingMessages = useRef(new Set())

  const [darkMode, setDarkMode] = useState(false)  

  /*

  Message Structure:
  {
    "username": string,
    "status": string,
    "content": string,
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
    if (messagesRef.current.length > 0){
      setGroupedMessages(prev => [...getGroupedMessages(messagesRef.current), ...prev])

      const newMappedMessages = {}
      messagesRef.current.forEach(mssg => {
        newMappedMessages[mssg["metadata"]["messageID"]] = {
          "status": "delivered",
          ...mssg
        }
      })
      setMappedMessages(prev => {return {...newMappedMessages, ...prev}})
    }
    return ()=>{
      externalChatRef.current = (param1) => {}
    }
  },[])


  // Groups all messages from chat history 
  // (messages in a group are sent in a 30 second interval from same user)
  function getGroupedMessages(messageList){
    const interval = 30000
    const groups = []
    let group = null;
    let i = 0
    
    while (i < messageList.length){
      const [user, timestamp, messageID] = [messageList[i]["username"], messageList[i]["metadata"]["timestamp"], messageList[i]["metadata"]["messageID"]]

      if (!group || group["username"] !== user || timestamp - group["timestamp"] > interval){
        group && groups.push(group)
        group = {
          "username": user,
          "timestamp": timestamp,
          "messages": [messageID]
        }
        i += 1
        continue
      }

      i += 1
      group["messages"].push(messageID)
    }
    if (group){
      groups.push(group)
    }
    
    return groups
  }

  // Groups incoming messages
  function addGroupedMessage(groups, message){
    const interval = 30000
    const [user, timestamp, messageID] = [message["username"], message["metadata"]["timestamp"], message["metadata"]["messageID"]]
    const lastGroup = groups.at(-1)
    
    if (groups.length === 0 || user !== lastGroup["username"] || timestamp - lastGroup["timestamp"] > interval){
      return [...groups,{
        "username": user,
        "timestamp": timestamp,
        "messages": [messageID]
      }]
    }
    return [...groups.slice(0, -1),{
      ...lastGroup,
      "messages": [...lastGroup["messages"], messageID]
    }]
  }

  function handleMessage() {
    if (!canSendRef.current){
      return
    }
    canSendRef.current = false
    setTimeout(()=>{
      canSendRef.current = true
    },100)

    const currTime = Date.now()
    const messageID = getUniqueMessageID()
    const msg = {
      "username": username,
      "content": newMessage,
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID
      }
    }
    sendJsonMessage({
      "origin": "chat",
      "type": "newMessage",
      "data": msg
    })
    setNewMessage("")

    msg["status"] = "pending"

    setMappedMessages(prev => {return {...prev, [messageID]: msg }})
    setGroupedMessages(prev => addGroupedMessage(prev, msg))

    setTimeout(()=>{
      setMappedMessages(prev => {
        if (prev[messageID]["status"] === "pending"){
          return {
            ...prev, 
            [messageID]: {
              ...prev[messageID],
              "status": "failed"
            }
          }
        }
        return prev
    })   
    },3000)

  }

  // newMessage: update if pending image, else update grouped & raw messages
  // chatHistory: add all existing chats to grouped & raw messages
  function externalChat(data){
    switch (data.type){
      case "newMessage":
        const msg = data.data

        const messageID = msg["metadata"]["messageID"]

        if (msg["username"] === username){
          setMappedMessages(prev => {
            return {
              ...prev, 
              [messageID]: {
                ...prev[messageID],
                "status": "delivered"
              }
            }
          })
          return
        }
        setMappedMessages(prev => {
          return {
            ...prev, 
            [messageID]: {
              ...prev[messageID],
              "status": "delivered"
            }
          }
        })
        setGroupedMessages(prev => addGroupedMessage(prev, msg))
        break
      case "chatHistory":
        setGroupedMessages(prev => [...getGroupedMessages(messagesRef.current), ...prev])

        const newMappedMessages = {}
        messagesRef.current.forEach(mssg => {
          newMappedMessages[mssg["metadata"]["messageID"]] = {
            "status": "delivered",
            ...mssg
          }
        })
        setMappedMessages(prev => {return {...newMappedMessages, ...prev}})
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
          groupedMessages.map((group)=>{
            const timestamp = new Date(group["timestamp"]).toLocaleTimeString("en-us",{hour:"numeric",minute:"2-digit"})
            return (
              <div key={group["timestamp"]} className={styles.messageContainer}>
                <section className={styles.messageLeft}>
                  <span className={styles.timestamp}>
                    {timestamp}
                  </span>
                  <span className="profilePic">
                    <img src={userStates[group["username"]]["avatar"]} alt="nth" />
                  </span>
                </section>
                <section className={styles.messageRight}>
                  <div className={styles.username}>
                    {group["username"]}
                  </div>
                  <div className={styles.textContainer}>
                    { 
                      group["messages"].map((msgID)=>{
                        const msg = mappedMessages[msgID]
                        return (
                          <div key={msgID} className={`${styles.message}`} style={{opacity: msg["status"] !== "delivered" ? ".7": "1"}}>
                            {msg["content"]}
                            {msg["metadata"]["timestamp"]}
                            {msg["status"] === "failed" && <span style={{color:"red"}}> FAIL</span>}
                          </div>
                        )
                      })
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