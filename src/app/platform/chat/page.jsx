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
  const lazyLoading = useRef({
    "allLoaded": false,
    "loading": false,
    "oldestID": null,
    "displayListRangeRef": [0, 20],
    "numGroups": 0,
    "stickToBottom": true
  })
  const [displayListRange, setDisplayListRange] = useState([0, 20])

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

  const [groupedMessages, setGroupedMessages] = useState([])
  const [mappedMessages, setMappedMessages] = useState({})

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
    const mainScrollableElem = mainScrollableRef.current
    externalChatRef.current = externalChat

    if (siteHistoryRef.current["chatHistoryReceived"]){
      const newGroups = getGroupedMessages(messagesRef.current)

      const newRange = newGroups.length < 20 ? [0,20] : [(newGroups.length + 10) - 20, newGroups.length + 10]
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
        if (numGroups < 20){
          return
        }

        // debug()
        //load earlier ranges into display window/platform/chat
        if (position < 10 && displayListRangeRef[0] > 0){
          renderEarlierValues()
        }
        //load later ranges into display window
        if (position > 90 && displayListRangeRef[1] < numGroups + 10){
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
      elem && console.log(!elem.contains(e.target))
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
  },[])
  function renderEarlierValues(){
    const rangeRef = lazyLoading.current["displayListRangeRef"]

    const decrement = Math.min(rangeRef[0], 10) 
    const newRange = [rangeRef[0]-decrement, rangeRef[1]-decrement]
    lazyLoading.current["displayListRangeRef"] = [...newRange]

    setDisplayListRange([...newRange])
    mainScrollableRef.current.scrollTop += 10
    lazyLoading.current["loading"] = true
  }
  function renderLaterValues(){
    const rangeRef = lazyLoading.current["displayListRangeRef"]

    const increment = Math.min((lazyLoading.current["numGroups"] + 10) - rangeRef[1], 10) 
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
          lazyLoading.current["displayListRangeRef"] = [numGroupsAdded, numGroupsAdded + 20]
          renderEarlierValues()
        }
        return newGroups
      })
    }
  }
  useEffect(()=> {
    lazyLoading.current["loading"] = false
    console.log(displayListRange)
  }, [displayListRange])

  useLayoutEffect(()=>{
    lazyLoading.current["numGroups"] = groupedMessages.length
    if (lazyLoading.current["stickToBottom"]){
      if (groupedMessages.length >= displayListRange[1]){
        renderLaterValues()
      }
    }
  },[groupedMessages])


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
    const filePaths = await uploadFilesReq(filesRef.current.files)
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

        const newRange = newGroups.length < 20 ? [0,20] : [(newGroups.length + 10) - 20, newGroups.length + 10]
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

        // temp awful solution for dev, when working on different tabs with same username
        //would prefer at end of func. note. 
        setMappedMessages(prev=>{
            if (!(messageID in prev)){
              setGroupedMessages(groups => appendGroupedMessages(groups, [msg]))
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
    }
  }
  
  let lastSeenDay = null
  const today = new Date().toDateString()
  return(
    <div className={`${styles.chatPage} ${darkMode ? styles.darkMode : ""}`}>
      <h1 className={styles.title}>
        <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/chat?20" : "/light/chat?20"} type="once" speed={8}/> 
      </h1>
      <div ref={mainScrollableRef} className={styles.chatDisplay}> 
          {
            groupedMessages.slice(displayListRange[0], displayListRange[1]+1).map((group)=>{
              const timestamp = new Date(group["timestamp"]).toLocaleTimeString("en-us",{hour:"numeric",minute:"2-digit"})
          
              const day = new Date(group["timestamp"]).toDateString()
              const newDay = day !== lastSeenDay
              if (newDay){
                lastSeenDay = day
              }
              return (
                  <Fragment key={group["messages"][0]}>
                    {newDay && 
                    <div className={styles.dateHeader}>
                      <span></span>
                      {day === today ? "Today" : day}
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
                          {
                            group["messages"].map((msgID)=>{
                              const msg = mappedMessages[msgID]
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
                            })
                          }
                        </div>
                      </section>
                    </div>
                </Fragment>
              )
            })
          }
      </div>
      {roomID &&
        <div className={styles.chatHub}>
            <Animation path={"/submit?4"} type="button" speed={5} onClick={handleMessage}/>

            <label className={styles.fileInput}>
              <img src={"de"} alt="upload" />
              <input ref={filesRef} type="file" multiple hidden
            accept='.png,.jpg,.jpeg,.webp,.docx,.doc,.txt,.csv,.pdf,.odt,.md,.gif,.mp3,.mp4,.html,.zip'/>
            </label>
 
            <textarea className={styles.chatInput} placeholder="Type new message..." value={newMessage} onChange={(e)=>setNewMessage(e.target.value)}/>
          </div>
        }
    </div>
  )
}

export default Chat 