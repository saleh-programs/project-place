"use client"
import { useState, useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext.js"

import { getUniqueMessageID, uploadFilesReq, getOlderMessagesReq } from "backend/requests.js"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef, sendJsonMessage, roomID, messagesRef, username, userInfo, userStates, setUserStates, siteHistoryRef} = useContext(ThemeContext)

  const mainScrollableRef = useRef(null)
  const lazyLoading = useRef({
    "allLoaded": false,
    "loading": false,
    "oldestID": null,
    "displayListRangeRef": [0, 150],
    "numGroups": 0
  })
  const [displayListRange, setDisplayListRange] = useState([0, 150])

  const canSendRef = useRef(true)
  const [newMessage, setNewMessage] = useState("")
  const [editID, setEditID] = useState(null)
  const [editMessage, setEditMessage] = useState("")
  const filesRef = useRef(null)

  const [groupedMessages, setGroupedMessages] = useState([])
  const [mappedMessages, setMappedMessages] = useState({})

  const [darkMode, setDarkMode] = useState(false)  

  /*

  Message Structure:
  {
    "username": string,
    "text": string,
    "files": []
    "metadata": {
      "timestamp": number,
      "messageID": string,
      "edited": boolean,
      "status": string
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
    if (siteHistoryRef.current["chatHistoryReceived"]){
      setGroupedMessages(getGroupedMessages(messagesRef.current))

      const newMappedMessages = {}
      messagesRef.current.forEach(msg => {
        newMappedMessages[msg["metadata"]["messageID"]] = {
          ...msg,
          "metadata": {
            ...msg["metadata"],
            "status": "delivered"
          }
        }
      })
      setMappedMessages(newMappedMessages)
      lazyLoading.current["allLoaded"] = messagesRef.current.length === 0 
      lazyLoading.current["oldestID"] = messagesRef.current.length === 0 ?  null : messagesRef.current[0]["metadata"]["messageID"]
      if (lazyLoading.current["numGroups"] > lazyLoading.current["displayListRangeRef"][1]){
        setDisplayListRange([(lazyLoading.current["numGroups"] + 30) - 150, lazyLoading.current["numGroups"] + 30])
        lazyLoading.current["displayListRangeRef"] = [(lazyLoading.current["numGroups"] + 30) - 150, lazyLoading.current["numGroups"] + 30]
      }
      requestAnimationFrame(()=>{
        mainScrollableRef.current.scrollTop = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
      })
    }
    function onScroll(){
      const position = mainScrollableRef.current.scrollTop / (mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight)
      const {allLoaded, loading, shownRange, numGroups} = lazyLoading.current

      if (!allLoaded && !loading && position === 0 && shownRange[0] === 0){
        loadMoreHistory()
        return 
      }

      //We don't need to start worrying about display window until these sizes are big enough....
      if (numGroups < 150){
        return
      }

      //load earlier ranges into display window
      if (position < .15 && shownRange[0] > 0){
        const decrement = Math.min(shownRange[0], 30) 
        shownRange[0] -= decrement
        shownRange[1] -= decrement
        setDisplayListRange([...shownRange])
        lazyLoading.current["displayListRangeRef"] = [...shownRange]

        setGroupedMessages(groups => {
          let groupElemRect = document.getElementById(groups[shownRange[0] + decrement]["timestamp"]).getBoundingClientRect()
          const oldGroupPos = groupElemRect.top
          requestAnimationFrame(()=>{
            groupElemRect = document.getElementById(groups[shownRange[0] + decrement]["timestamp"]).getBoundingClientRect()
            mainScrollableRef.current.scrollTop += groupElemRect.top - oldGroupPos
          })
          return groups
        })
      }
      //load later ranges into display window
      if (position > .85 && shownRange[1] < (numGroups-1)+30){
        const increment = Math.min(((numGroups-1)+30) - shownRange[1], 30) 
        shownRange[0] += increment
        shownRange[1] += increment
        setDisplayListRange([...shownRange])
        lazyLoading.current["displayListRangeRef"] = [...shownRange]


        setGroupedMessages(groups => {
          let groupElemRect = document.getElementById(groups[shownRange[0]]["timestamp"]).getBoundingClientRect()
          const oldGroupPos = groupElemRect.top
          requestAnimationFrame(()=>{
            groupElemRect = document.getElementById(groups[shownRange[0]]["timestamp"]).getBoundingClientRect()
            mainScrollableRef.current.scrollTop += groupElemRect.top - oldGroupPos
          })
          return groups
        })
      }

      
    }
    mainScrollableRef.current.addEventListener("scroll", onScroll)
    return ()=>{
      externalChatRef.current = (param1) => {}
      mainScrollableRef.current.removeEventListener("scroll", onScroll)
    }
  },[])

  async function loadMoreHistory(){
    lazyLoading.current["loading"] = true
    const olderMessages = lazyLoading.current["oldestID"] ? await getOlderMessagesReq(lazyLoading.current["oldestID"], roomID) : null
    if (!olderMessages){
      lazyLoading.current["loading"] = false
      return
    }

    if (olderMessages.length === 0){
      lazyLoading.current["allLoaded"] = true
      lazyLoading.current["loading"] = false
    }else{
      lazyLoading.current["oldestID"] = olderMessages[0]["metadata"]["messageID"]
      
      oldScrollHeight = mainScrollableRef.current.scrollHeight
      const newMappedMessages = {}
      olderMessages.forEach(msg => {
        newMappedMessages[msg["metadata"]["messageID"]] = {
          ...msg,
          "metadata": {
            ...msg["metadata"],
            "status": "delivered"
          }
        }
      })
      setMappedMessages(prev => {
        return {...newMappedMessages, ...prev}
      })
      setGroupedMessages(prev => {
        prependGroupedMessages(prev, olderMessages)
      })
      requestAnimationFrame(()=>{
        mainScrollableRef.current.scrollTop += mainScrollableRef.current.scrollHeight - oldScrollHeight
        lazyLoading.current["loading"] = false
      })
    }
  }

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
    group && groups.push(group)
    
    lazyLoading.current["numGroups"] = groups.length
    return groups
  }
  function appendGroupedMessages(groups, messageList){
    const newGroups = getGroupedMessages(messageList)
    const leftGroup = groups.at(-1)
    const rightGroup = newGroups[0]

    let combinedGroups = []

    if (!leftGroup || leftGroup["username"] !== rightGroup["username"] || rightGroup["timestamp"] - leftGroup["timestamp"] > interval){
      combinedGroups = [...groups, ...newGroups]
    }else{
      for (let i = 0; i < rightGroup["messages"].length; i++){
        leftGroup["messages"].push(id)
      }
      combinedGroups = [...groups, ...newGroups.slice(1)]
    }
    lazyLoading.current["numGroups"] = combinedGroups.length
    return combinedGroups
  }
  function prependGroupedMessages(groups, messageList){
    const newGroups = getGroupedMessages(messageList)

    const leftGroup = newGroups.at(-1)
    const rightGroup = groups[0]

    if (!leftGroup || leftGroup["username"] !== rightGroup["username"] || rightGroup["timestamp"] - leftGroup["timestamp"] > interval){
      return [...newGroups, ...groups]
    }
    for (let i = 0; i < rightGroup["messages"].length; i++){
      leftGroup["messages"].push(id)
    }
    return [...newGroups, ...groups.slice(1)]
  }

  async function handleMessage() {
    if (!canSendRef.current){
      return
    }
    canSendRef.current = false
    setTimeout(()=>{
      canSendRef.current = true
    },100)

    filesRef.current.files.length > 0 && await handleFileMessage()

    const currTime = Date.now()
    const messageID = getUniqueMessageID()
    const msg = {
      "username": username,
      "text": newMessage,
      "files": [],
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID,
        "edited": false
      }
    }
    sendJsonMessage({
      "origin": "chat",
      "type": "newMessage",
      "username": username,
      "data": msg
    })
    setNewMessage("")
    msg["metadata"]["status"] = "pending"

    setMappedMessages(prev => {return {...prev, [messageID]: msg }})
    setGroupedMessages(prev => appendGroupedMessages(prev, [msg]))
    const oldScrollBottom = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
    requestAnimationFrame(()=>{
      if (mainScrollableRef.current.scrollTop === oldScrollBottom){
        mainScrollableRef.current.scrollTop = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
      }
    })
    setTimeout(()=>{
      setMappedMessages(prev => {
        if (messageID in prev && prev[messageID]["metadata"]["status"] === "pending"){
          return {
            ...prev, 
            [messageID]: {
              ...prev[messageID],
              "metadata": {
                ...prev[messageID]["metadata"],
                "status": "failed"
              }
            }
          }
        }
        return prev
    })   
    },3000)

  }
  async function handleFileMessage() {
    const currTime = Date.now()
    const filePaths = await uploadFilesReq(filesRef.current.files)
    if (!filePaths){
      return
    }
    const messageID = getUniqueMessageID()
    const msg = {
      "username": username,
      "text": "",
      "files": filePaths,
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID,
        "edited": false
      }
    }
    sendJsonMessage({
      "origin": "chat",
      "type": "newMessage",
      "username": username,
      "data": msg
    })
    filesRef.current.value = ""
    msg["metadata"]["status"] = "pending"
    setMappedMessages(prev => {return {...prev, [messageID]: msg }})
    setGroupedMessages(prev => appendGroupedMessages(prev, [msg]))

    setTimeout(()=>{
      setMappedMessages(prev => {
        if (messageID in prev && prev[messageID]["metadata"]["status"] === "pending"){
          return {
            ...prev, 
            [messageID]: {
              ...prev[messageID],
              "metadata": {
                ...prev[messageID]["metadata"],
                "status": "failed"
              }
            }
          }
        }
        return prev
    })   
    },3000)
  }

  function deleteMessage(messageID){
    sendJsonMessage({
      "origin": "chat",
      "type": "delete",
      "username": username,
      "data": {"messageID": messageID}
    })
  }
  function changeMessage(){
    sendJsonMessage({
      "origin": "chat",
      "type": "edit",
      "username": username,
      "data": {"messageID": editID, "text": editMessage}
    })
    setEditID(null)
    setEditMessage("")
  }
  function toggleEdit(messageID, text){
    if (editID === messageID){
      setEditID(null)
      setEditMessage("")
    }else{
      setEditID(messageID)
      setEditMessage(text)
    }
  }
  // newMessage: update if pending image, else update grouped & raw messages
  // chatHistory: add all existing chats to grouped & raw messages
  function externalChat(data){
    switch (data.type){
      case "chatHistory":
        setGroupedMessages(getGroupedMessages(messagesRef.current))

        const newMappedMessages = {}
        messagesRef.current.forEach(msg => {
          newMappedMessages[msg["metadata"]["messageID"]] = {
            ...msg,
            "metadata": {
              ...msg["metadata"],
              "status": "delivered"
            }
          }
        })
        setMappedMessages(newMappedMessages)
        lazyLoading.current["allLoaded"] = messagesRef.current.length === 0 
        lazyLoading.current["oldestID"] = messagesRef.current.length === 0 ?  null : messagesRef.current[0]["metadata"]["messageID"]
        if (lazyLoading.current["numGroups"] > lazyLoading.current["displayListRangeRef"][1]){
          setDisplayListRange([(lazyLoading.current["numGroups"] + 30) - 150, lazyLoading.current["numGroups"] + 30])
          lazyLoading.current["displayListRangeRef"] = [(lazyLoading.current["numGroups"] + 30) - 150, lazyLoading.current["numGroups"] + 30]
        }
        requestAnimationFrame(()=>{
          mainScrollableRef.current.scrollTop = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
        })
        break 
      case "newMessage":
        const msg = data.data
        const messageID = msg["metadata"]["messageID"]

        // temp solution for dev, when working on different tabs with same username
        //would prefer at end of func. note. 
        setMappedMessages(prev=>{
            if (!(messageID in prev)){
              const oldScrollBottom = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
              setGroupedMessages(groups => appendGroupedMessages(groups, [msg]))
              requestAnimationFrame(()=>{
                if (mainScrollableRef.current.scrollTop === oldScrollBottom){
                  mainScrollableRef.current.scrollTop = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
                  if (lazyLoading.current["numGroups"] > lazyLoading.current["displayListRangeRef"][1]){
                    setDisplayListRange([(lazyLoading.current["numGroups"] + 30) - 150, lazyLoading.current["numGroups"] + 30])
                    lazyLoading.current["displayListRangeRef"] = [(lazyLoading.current["numGroups"] + 30) - 150, lazyLoading.current["numGroups"] + 30]
                  }
                }
              })
            }
            return prev
        })
        // msg["username"] !== username && setGroupedMessages(prev => appendGroupedMessages(prev, [msg]))

        setMappedMessages(prev => {
          return {
            ...prev, 
            [messageID]: {
              ...msg,
              "metadata": {
                ...msg["metadata"],
                "status": "delivered"
              }
            }
          }
        })
        break
      case "edit":
        setMappedMessages(prev => {
          const id = data.data["messageID"]
          if (!(id in prev)){
            return prev
          }
          return {
            ...prev,
            [id]: {
              ...prev[id],
              "text": data.data["text"],
              "metadata": {...prev[id]["metadata"], "edited": true}
            }
          }
        })
        break
      case "delete":
        setMappedMessages(prev => {
          if (!(data.data["messageID"] in prev)){
            return prev
          }
          const newMappedMessages = {...prev}
          delete newMappedMessages[data.data["messageID"]]
          return newMappedMessages
        })
        setGroupedMessages(prev => {
          const newGroups = [...prev]
          for (let i = newGroups.length-1; i >= 0; i--){
            const group = newGroups[i]
            if (group["messages"].includes(data.data["messageID"])){
              newGroups[i] = {
                ...group,
                "messages": group["messages"].filter(id => id !== data.data["messageID"])
              }
              return newGroups
            }
          }
          return prev
        })
        break
    }
  }

  // Toggle dark/light mode
  function toggleAppearance(e){
    setDarkMode(e.target.checked)
    const toggleElem = document.querySelector(`.${styles.toggleAppearance}`)
    if (e.target.checked){    sendJsonMessage({
      "origin": "chat",
      "type": "delete",
      "username": username,
      "data": {"messageID": messageID}
    })
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
      <section ref={mainScrollableRef} className={styles.chatDisplay}> 
        {
          groupedMessages.slice(displayListRange[0], displayListRange[1]).map((group)=>{
            const timestamp = new Date(group["timestamp"]).toLocaleTimeString("en-us",{hour:"numeric",minute:"2-digit"})
            return (
              <div id={`${group["timestamp"]}`} key={group["timestamp"]} className={styles.messageContainer}>
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
                          <div key={msgID} className={`${styles.message}`} style={{opacity: msg["metadata"]["status"] !== "delivered" ? ".7": "1"}}>
                            {msg["files"].map(filePath => {
                              return <img key={filePath} src={filePath} alt="No File Found" />
                            })}
                            {editID === msgID 
                              ?
                             <input type="text" value={editMessage} onChange={(e)=>setEditMessage(e.target.value)}/>
                              :
                              msg["text"]
                            }
                            {msg["metadata"]["edited"] && <span style={{fontSize:"small"}}> *edited*</span>}  
                            {msg["status"] === "failed" && <span style={{color:"red"}}> FAIL</span> }
                            {msg["username"] === username && msg["status"] !== "failed" &&
                              <>
                              <button onClick={()=>deleteMessage(msg["metadata"]["messageID"])}>Delete</button>
                              {msg["files"].length === 0 && <button onClick={()=>toggleEdit(msgID, msg["text"])}>{editID === msgID ? "Cancel": "Edit"}</button>}
                              {editID === msgID && <button onClick={changeMessage}>Submit</button>}
                              </>
                            }
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
            <input ref={filesRef} type="file" multiple 
            accept='.png,.jpg,.jpeg,.webp,.docx,.doc,.txt,.csv,.pdf,.odt,.md,.gif,.mp3,.mp4,.html,.zip'/>
            <input type="text" placeholder="New Message" value={newMessage} onChange={(e)=>setNewMessage(e.target.value)}/>
            <button onClick={handleMessage}>Send</button>
          </section>
        }
      </section>
    </div>
  )
}

export default Chat