"use client"
import { useEffect, useRef, useState } from "react"
import useWebSocket from "react-use-websocket"

import { getUniqueMessageID,createRoomReq, validateRoomReq, getInstructions, getUserInfoReq, getUsernameReq } from "../../../backend/requests"
import styles from "../../../styles/pages/Platform.module.css"

function Platform(){
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomID, setJoinRoomID]= useState("")
  const [roomID, setRoomID] = useState("")

  useEffect(()=>{
    getUsername()
  },[])

  async function getUsername() {
    const infoRes = await getUserInfoReq()
    if (!infoRes){
      return
    }
    console.log(infoRes)
    const usernameRes = await getUsernameReq(infoRes["email"])
    if (!usernameRes){
      return
    }
    const username = usernameRes["username"]
    console.log(username)
  }

  async function handleRoomCreation(){
    const res = await createRoomReq(newRoomName)
    if (res){
      setNewRoomName("")
      setMessages([])
      setRoomID(res)
      setIsCreatingRoom(false)
    }
  }
  async function handleRoomLoad(){
    const res = await validateRoomReq(joinRoomID)
    if(res){
      setMessages([])
      setRoomID(joinRoomID);
      setIsLoadingRoom(false)

    }
  }

  return(
    <div className={styles.platformpage}>
      BIG LOADING SCREEN (conditionally rendered against username prompt)
    </div>
  )
}

export default Platform