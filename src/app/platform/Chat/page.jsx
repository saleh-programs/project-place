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
      "type": "newMessage",
      "username": username,
      "data": newMessage,
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID
      }
    })
    setNewMessage("")

    if (messages.length === 0 || messages[messages.length-1]["username"] !== username || currTime -  messages[messages.length-1]["timestamp"] >= 300000){
      setMessages(prev=>[...prev, {
        "username": username,
        "timestamp": currTime,
        "messages": [newMessage]
      }])
    }else{
      const newMessages = [...messages]
      newMessages[newMessages.length-1]["messages"].push(newMessage)
      setMessages(newMessages)
    }
  }

  function externalChat(data){
    switch (data.type){
      case "newMessage":
        setMessages(prev => {
          if (prev.length === 0 || prev[prev.length-1]["username"] !== data["username"] || data["metadata"]["timestamp"] - prev[prev.length-1]["timestamp"] >= 300000){
            return [...prev, {
              "username": data["username"],
              "timestamp": data["metadata"]["timestamp"],
              "messages": [data["data"]]
            }]
          }else{
            const newMessages = JSON.parse(JSON.stringify(prev))
            newMessages[newMessages.length-1]["messages"].push(data["data"])
            console.log(newMessage)
            return newMessages
          }
        })
        break
      case "chatHistory":
        if (data.data){
          setMessages(prev => {
            const allMessages = [...data.data, ...prev]
            const groupedMessages = []
            
            let ind = 0
            while (ind < allMessages.length){
              const currUsername = allMessages[ind]["username"]
              const timestamp = allMessages[ind]["timestamp"]
              const message = allMessages[ind]["message"]
              const groupedMessage = {
                "username": currUsername,
                "timestamp": timestamp,
                "messages": [message]
              }
              ind += 1
              while (ind < allMessages.length && allMessages[ind]["username"] == currUsername && allMessages[ind]["timestamp"] - timestamp < 300000){
                  groupedMessage["messages"].push(allMessages[ind]["message"])
                  ind += 1
              }
              groupedMessages.push(groupedMessage)
            }

            return groupedMessages
          })
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