"use client"
import { useEffect, useRef, useState } from "react"
import useWebSocket from "react-use-websocket"

import { getUniqueMessageID,createRoomReq, validateRoomReq, getInstructions, getUserInfoReq, getUsernameReq } from "../../../backend/requests"
import { useContext } from "react"
import ThemeContext from "../../assets/ThemeContext"

import styles from "../../../styles/pages/Platform.module.css"

function Platform(){
  const {username, setUsername} = useContext(ThemeContext)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomID, setJoinRoomID]= useState("")
  const [roomID, setRoomID] = useState("")

  const usernameInput = useRef(null)

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
      {/* <input ref={usernameInput} type="text" />
      <button onClick={()=>{setUsername(usernameInput.current.value)}}>set username</button>
      BIG LOADING SCREEN (conditionally rendered against username prompt) */}
      ignore this
    </div>
  )
}

export default Platform