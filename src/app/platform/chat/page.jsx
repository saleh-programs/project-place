"use client"
import { useState, useContext, useEffect, useRef, useLayoutEffect } from "react"
import ThemeContext from "src/assets/ThemeContext.js"
import Animation from "src/components/Animation"
import FileViewer from "src/components/FileViewer"
import { Fragment } from "react"

import { getUniqueMessageID, uploadFilesReq, getOlderMessagesReq } from "backend/requests.js"
import styles from "styles/platform/Chat.module.css"

function Chat(){
  const {externalChatRef, sendJsonMessage, roomID, roomIDRef, messagesRef, username, userInfo, userStates, setUserStates, siteHistoryRef, darkMode} = useContext(ThemeContext)

  const mainScrollableRef = useRef(null)
  const numMsgsAvailable = 30 // actual number of messages available - 1
  const lazyLoading = useRef({
    "allLoaded": false,
    "loading": false,
    "oldestID": null,
    "displayListRangeRef": [0, numMsgsAvailable],
    "numGroups": 0,
    "stickToBottom": true
  })

  const [displayListRange, setDisplayListRange] = useState([0, numMsgsAvailable])

  const justTypedTimer = useRef(null)
  const canSendRef = useRef(true)
  const [newMessage, setNewMessage] = useState("")
  const [selectedID, setSelectedID] = useState(null)
  const [editMessage, setEditMessage] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const editRefs = useRef({
    "isEditing": false,
    "selectedID": null
  })
  const filesRef = useRef(null)
  const [filePreviews, setFilePreviews] = useState([])
  const [showOverUploadMsg, setShowOverUploadMsg] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  const [groupedMessages, setGroupedMessages] = useState([])
  const [mappedMessages, setMappedMessages] = useState({})

  const [peersTyping, setPeersTyping] = useState([])
 
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
      "status": string,
      "dimensions": []
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
    if (!mainScrollableRef.current) return
    const mainScrollableElem = mainScrollableRef.current
    externalChatRef.current = externalChat

    if (siteHistoryRef.current["chatHistoryReceived"]){
      const newGroups = getGroupedMessages(messagesRef.current)

      const newRange = newGroups.length < numMsgsAvailable 
      ? [0, numMsgsAvailable] 
      : [(newGroups.length + Math.floor(numMsgsAvailable/2)) - numMsgsAvailable, newGroups.length + Math.floor(numMsgsAvailable/2)]
        
      setGroupedMessages(newGroups)
      setDisplayListRange([...newRange])
      lazyLoading.current["displayListRangeRef"] = [...newRange]

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
    }

    const textInputElem = document.querySelector("textarea")
    textInputElem && textInputElem.focus()

    let called = false
    let stickTimer
    function onScroll(){
      if (called){
        return
      }
      called = true
      requestAnimationFrame(()=>{
        called = false
        const maxScrollTop = mainScrollableRef.current.scrollHeight - mainScrollableRef.current.clientHeight
        if (maxScrollTop === 0){
          return
        }
        const position = (mainScrollableRef.current.scrollTop / maxScrollTop) * 100 //0-100
        const {allLoaded, displayListRangeRef, numGroups} = lazyLoading.current

        clearTimeout(stickTimer)
        stickTimer = setTimeout(()=>{lazyLoading.current["stickToBottom"] = (maxScrollTop - mainScrollableRef.current.scrollTop) < 50},20)
        
        if (mainScrollableRef.current.scrollTop < 1){
          mainScrollableRef.current.scrollTop = 1
        }
        if (lazyLoading.current["loading"]){
          return
        }
        
        if (!allLoaded && displayListRangeRef[0] === 0 && position < 2 ){
          loadMoreHistory()
          return 
        }
        //we don't worry about display window unless we have enough groups
        if (numGroups < numMsgsAvailable){
          return
        }

        // debug()
        //load earlier ranges into display window/platform/chat
        if (position < 5 && displayListRangeRef[0] > 0){
          renderEarlierValues()
        }
        //load later ranges into display window
        if (position > 95 && displayListRangeRef[1] < numGroups + Math.floor(numMsgsAvailable/2)){
          renderLaterValues()
        }

      })
    }

    let lastHeight = mainScrollableElem.scrollHeight
    const watchHeight = () => {
      if (lastHeight !== mainScrollableElem.scrollHeight && lazyLoading.current["stickToBottom"]){
        mainScrollableElem.scrollTop = mainScrollableElem.scrollHeight - mainScrollableElem.clientHeight
      }
      lastHeight = mainScrollableElem.scrollHeight
      requestAnimationFrame(watchHeight)
    }
    requestAnimationFrame(watchHeight)


    const unselectMessages = (e) => {
      const elem = document.getElementById(editRefs.current["selectedID"])
      if (elem && !elem.contains(e.target)){
        setSelectedID(null)
        setIsEditing(false)
        editRefs.current = {
          "selectedID": null,
          "isEditing": false
        }
      }
    }
    document.addEventListener("mousedown", unselectMessages)
    mainScrollableElem.addEventListener("scroll", onScroll)
    return ()=>{
      externalChatRef.current = (param1) => {}
      document.removeEventListener("mousedown", unselectMessages)
      mainScrollableElem.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(watchHeight)
    }
  },[roomID])
  
  useEffect(()=> {
    lazyLoading.current["loading"] = false
  }, [displayListRange])

  useLayoutEffect(()=>{
    lazyLoading.current["numGroups"] = groupedMessages.length
    if (lazyLoading.current["stickToBottom"]){
      if (groupedMessages.length >= displayListRange[1]){
        renderLaterValues()
      }
    }
  },[groupedMessages])
  function renderEarlierValues(){
    const rangeRef = lazyLoading.current["displayListRangeRef"]

    const decrement = Math.min(rangeRef[0], Math.floor(numMsgsAvailable / 2)) 
    const newRange = [rangeRef[0]-decrement, rangeRef[1]-decrement]
    lazyLoading.current["displayListRangeRef"] = [...newRange]

    setDisplayListRange([...newRange])
    mainScrollableRef.current.scrollTop += 10
    lazyLoading.current["loading"] = true
  }
  function renderLaterValues(){
    const rangeRef = lazyLoading.current["displayListRangeRef"]

    const increment = Math.min((lazyLoading.current["numGroups"] + Math.floor(numMsgsAvailable/2)) - rangeRef[1], Math.floor(numMsgsAvailable/2)) 
    const newRange = [rangeRef[0]+increment, rangeRef[1]+increment]
    lazyLoading.current["displayListRangeRef"] = [...newRange]
    setDisplayListRange([...newRange])
    mainScrollableRef.current.scrollTop -= 10
    lazyLoading.current["loading"] = true
  }
  async function loadMoreHistory(){
    lazyLoading.current["loading"] = true
    const olderMessages = lazyLoading.current["oldestID"] ? await getOlderMessagesReq(lazyLoading.current["oldestID"], roomIDRef.current) : null
    if (!olderMessages){
      lazyLoading.current["loading"] = false
      return
    }

    if (olderMessages.length === 0){
      lazyLoading.current["allLoaded"] = true
      lazyLoading.current["loading"] = false
    }else{
      lazyLoading.current["oldestID"] = olderMessages[0]["metadata"]["messageID"]
      
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
        const newGroups = prependGroupedMessages(prev, olderMessages)
        const numGroupsAdded = newGroups.length-prev.length
        if (numGroupsAdded !== 0){
          lazyLoading.current["displayListRangeRef"] = [numGroupsAdded, numGroupsAdded + numMsgsAvailable]
          renderEarlierValues()
        }
        return newGroups
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
    
    return groups
  }
  function appendGroupedMessages(groups, messageList){
    const interval = 30000
    const newGroups = getGroupedMessages(messageList)
    const leftGroup = groups.at(-1)
    const rightGroup = newGroups[0]

    if (!leftGroup || leftGroup["username"] !== rightGroup["username"] || rightGroup["timestamp"] - leftGroup["timestamp"] > interval){
      return [...groups, ...newGroups]
    }

    for (let i = 0; i < rightGroup["messages"].length; i++){
      leftGroup["messages"].push(rightGroup["messages"][i])
    }
    return [...groups, ...newGroups.slice(1)]
  }
  function prependGroupedMessages(groups, messageList){
    const interval = 30000
    const newGroups = getGroupedMessages(messageList)

    const leftGroup = newGroups.at(-1)
    const rightGroup = groups[0]

    if (!leftGroup || leftGroup["username"] !== rightGroup["username"] || rightGroup["timestamp"] - leftGroup["timestamp"] > interval){
      return [...newGroups, ...groups]
    }

    for (let i = 0; i < rightGroup["messages"].length; i++){
      leftGroup["messages"].push(rightGroup["messages"][i])
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
    },300)
    setIsClicked(true)
    setTimeout(()=>setIsClicked(false), 50)

    filePreviews.length > 0 && await handleFileMessage()
    if (newMessage === "") return

    const currTime = Date.now()
    const messageID = getUniqueMessageID()
    const msg = {
      "username": username,
      "text": newMessage,
      "files": [],
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID,
        "edited": false,
        "dimensions": []
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
    const filePaths = await uploadFilesReq(filePreviews)
    if (!filePaths){
      return
    }
    const messageID = getUniqueMessageID()
    const msg = {
      "username": username,
      "text": "",
      "files": filePaths["paths"],
      "metadata":{
        "timestamp": currTime,
        "messageID": messageID,
        "edited": false,
        "dimensions": filePaths["dimensions"]
      }
    }
    sendJsonMessage({
      "origin": "chat",
      "type": "newMessage",
      "username": username,
      "data": msg
    })
    filesRef.current.value = ""
    setFilePreviews([])
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
      "data": {"messageID": selectedID, "text": editMessage}
    })
    setSelectedID(null)
    setIsEditing(false)
    editRefs.current = {
      "isEditing": false,
      "selectedID": null
    }
  }
  // newMessage: update if pending image, else update grouped & raw messages
  // chatHistory: add all existing chats to grouped & raw messages
  function externalChat(data){
    switch (data.type){
      case "chatHistory":
        const newGroups = getGroupedMessages(messagesRef.current)

        const newRange = newGroups.length < numMsgsAvailable 
        ? [0, numMsgsAvailable] 
        : [(newGroups.length + Math.floor(numMsgsAvailable/2)) - numMsgsAvailable, newGroups.length + Math.floor(numMsgsAvailable/2)]
        
        setGroupedMessages(newGroups)
        setDisplayListRange([...newRange])
        lazyLoading.current["displayListRangeRef"] = [...newRange]

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
        break 
      case "newMessage":
        const msg = data.data
        const messageID = msg["metadata"]["messageID"]

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
        if (msg["username"] !== username){
          setGroupedMessages(prev => appendGroupedMessages(prev, [msg]))
          setPeersTyping(prev => prev.filter(p => {
            if (p["username"] === msg["username"]){
              clearTimeout(p["timer"])
              return false
            }
            return true
          }))
         }

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
              if (group["messages"].length === 1 ){
                return [...newGroups.slice(0,i),...newGroups.slice(i+1)]
              }
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
      case "isTyping":
        setPeersTyping(prev => {
          const newPeers = [...prev]

          for (let i = 0; i < newPeers.length; i++){
            if (newPeers[i]["username"] === data["username"]){
              clearTimeout(newPeers[i]["timer"])
              newPeers[i]["timer"] = setTimeout(()=>{
                setPeersTyping(prev2 => prev2.filter(p => p["username"] !== data["username"]))
              }, 100000) 
              return newPeers
            }
          }
          newPeers.push({
            "username": data["username"],
            "timer":  setTimeout(()=>{
              setPeersTyping(prev2 => prev2.filter(p => p["username"] !== data["username"]))
            }, 100000) 
          })
          return newPeers
        })
        break
    }
  }

  function getPeersTyping(){
    if (peersTyping.length === 0) return null
    if (peersTyping.length === 1) return <span className={styles.isTyping}>{`${peersTyping[0]["username"]} is typing...`}</span>
    if (peersTyping.length === 2) return <span className={styles.isTyping}>{`${peersTyping[0]["username"]} and ${peersTyping[1]["username"]} are typing...`}</span>
    if (peersTyping.length === 3) return <span className={styles.isTyping}>{`${peersTyping[0]["username"]}, ${peersTyping[1]["username"]} and ${peersTyping[2]["username"]} are typing...`}</span>
    return <span className={styles.isTyping}>{`${peersTyping[0]["username"]}, ${peersTyping[1]["username"]}, ${peersTyping[2]["username"]} and ${peersTyping.length - 3} more are typing...`}</span>
  }

  function handleKeyPress(e){
    e.key === "Enter" && e.preventDefault()
    if (!justTypedTimer.current){
      sendJsonMessage({
        "origin": "chat",
        "type": "isTyping",
        "username": username,
      })
      justTypedTimer.current = setTimeout(()=>{
        justTypedTimer.current = null
      },100)
    }
  }
  let lastSeenDay = null
  function getMessageElem(msgID){
    const msg = mappedMessages[msgID]

    if (msg["username"] !== username){
      return (
        <div key={msgID} id={msgID} className={styles.message}>
          {msg["files"].map((filePath, i) => {
            return <FileViewer key={filePath} url={filePath} dimensions={msg["metadata"]["dimensions"][i]}/>
          })}
          {msg["text"]}
          {msg["metadata"]["edited"] && <span style={{fontSize:"small"}}> *edited*</span>}
        </div>
      )
    }
    return (
      <div key={msgID} id={msgID} className={`${styles.message} ${selectedID === msgID ? styles.show : ""}`} style={{opacity: msg["metadata"]["status"] !== "delivered" ? ".7": "1"}}>
        {msg["files"].map((filePath, i) => {
          return <FileViewer key={filePath} url={filePath} dimensions={msg["metadata"]["dimensions"][i]}/>
        })}
        {selectedID === msgID && isEditing
          ?
          <>
            <input type="text" value={editMessage} onChange={(e)=>setEditMessage(e.target.value)}/>
            <button onClick={changeMessage}>Edit</button>
          </>
          :
          msg["text"]
        }
        {msg["metadata"]["edited"] && <span style={{fontSize:"small"}}> *edited*</span>}
        {msg["status"] === "failed" && <span style={{color:"red"}}> FAIL</span> }
        <div className={styles.toggleOptions}>
          <img
            className={selectedID === msgID ? styles.show : ""}
            src={darkMode ? "/dark_options.png" : "/light_options.png"} alt="options"
            onClick={()=>{
              if (isEditing){
                return
              }
              editRefs.current["selectedID"] = editRefs.current["selectedID"] === msgID ? null : msgID
              setSelectedID(editRefs.current["selectedID"])
            }}
          />
          {
            selectedID === msgID && !isEditing &&
            <ul className={styles.options}>
                {msg["files"].length === 0 &&
                <li onClick={()=>{
                  setIsEditing(true)
                  editRefs.current["isEditing"] = true
                  setEditMessage(msg["text"])
                }
                }>Edit
                </li>}
                <li onClick={()=>{
                  setSelectedID(null)
                  editRefs.current["selectedID"] = null
                  deleteMessage(msgID)
                }}>Delete</li>
            </ul>
          }
        </div>
      </div>
    )
  }
  function getGroupMessageElem(group){
    const timestamp = new Date(group["timestamp"]).toLocaleTimeString("en-us",{hour:"numeric",minute:"2-digit"})

    const day = new Date(group["timestamp"]).toDateString()
    const isNewDay = day !== lastSeenDay
    if (isNewDay){
      lastSeenDay = day
    }
    return (
      <Fragment key={group["messages"][0]}>
            {isNewDay && 
            <div className={styles.dateHeader}>
              <span></span>
              {day === new Date().toDateString() ? "Today" : day}
              <span></span>
            </div>
            }
            <div className={styles.groupContainer}>
              <section className={styles.groupLeft}>
                <span className={styles.timestamp}>
                  {timestamp}
                </span>
                <img src={userStates[group["username"]]["avatar"]} alt="nth" />
              </section>
              <section className={styles.groupRight}>
                <div className={styles.username}>
                  {group["username"]}
                </div>
                <div className={styles.messages}>
                  {group["messages"].map(msgID=>getMessageElem(msgID))}
                </div>
              </section>
            </div>
      </Fragment>
    )
  }

  return(
    <div className={`${styles.chatPage} ${darkMode ? styles.darkMode : ""}`} onKeyDown={(e)=>e.key === "Enter" && handleMessage()} tabIndex={0}>

      <h1 className={styles.title}>
        <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/chat?20" : "/light/chat?20"} type="once" speed={8}/> 
      </h1>
      {roomID &&
        <>
          <div ref={mainScrollableRef} className={styles.chatDisplay}> 
              {groupedMessages.length == 0 &&
                <div style={{fontSize: "1.5rem"}}>
                  Start the conversation...
                </div>
              }
              {groupedMessages.slice(displayListRange[0], displayListRange[1]+1).map(group=> getGroupMessageElem(group))}
          </div>
          <div className={styles.chatHub}>
            <span className={`${styles.overUploadMsg} ${showOverUploadMsg ? styles.show : ""}`}>Please select maximum of 10 files</span>
            <section className={styles.miniFileView}>
              {filePreviews.map(f => {
                const url = URL.createObjectURL(f);
                return <span className={styles.preview} key={url} ><FileViewer url={url} dimensions={[50,50]} manualMimeType={f.type}/> <button onClick={()=>setFilePreviews(filePreviews.filter(file=>f!==file))}>X</button></span>
              })}
            </section>
            <section className={styles.chatHubMain}>
                <label className={styles.fileInput}>
                  <img src={"/upload_icon.png"} alt="upload" />
                  <input ref={filesRef} type="file" multiple hidden
                accept='.png,.jpg,.jpeg,.webp,.docx,.doc,.txt,.csv,.pdf,.odt,.md,.gif,.mp3,.mp4,.html,.zip'
                onChange={(e)=>{
                  const addedFiles = Array.from(e.target.files)
                  let newFilePreviews =[...filePreviews]

                  addedFiles.forEach((f, i)=>{
                    const addedFileID = `${f["name"]} ${f["lastModified"]}`
                    let j;
                    for (j = 0; j < filePreviews.length; j++){
                      const containingFileID = `${filePreviews[j]["name"]} ${filePreviews[j]["lastModified"]}`
                      if (containingFileID === addedFileID){
                        break
                      }
                    }
                    if (j === filePreviews.length){
                      newFilePreviews.push(f);
                    }
                  })
                  if (newFilePreviews.length > 10){
                    setShowOverUploadMsg(true)
                    setTimeout(()=>setShowOverUploadMsg(false), 3000)
                    newFilePreviews = newFilePreviews.slice(0, 10)
                  }
                  setFilePreviews(newFilePreviews)
                  filesRef.current.value=""
                }}
                />
                </label>
                <textarea className={styles.chatInput} placeholder="Type new message..." value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} onKeyDown={handleKeyPress}/>
                <button onClick={handleMessage} className={`${isClicked ? styles.clicked : ""}`}>    
                  <img src={"/submit_icon.png"} />
                </button>
            </section>

            {
              getPeersTyping()
            } 
          </div>
        </>
      }
    </div>
  )
}

export default Chat 