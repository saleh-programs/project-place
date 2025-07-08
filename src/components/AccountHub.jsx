"use client"
import { useEffect, useRef, useState, useContext } from "react"

import ThemeContext from "../assets/ThemeContext"
import { createRoomReq, validateRoomReq } from "../../backend/requests"

import styles from "../../styles/components/Sidebar.module.css"


function Platform(){
  const {roomID, setRoomID} = useContext(ThemeContext)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [joinRoomID, setJoinRoomID]= useState("")


  async function handleRoomCreation(){
    const res = await createRoomReq(newRoomName)
    if (res){
      setNewRoomName("")
      // setMessages([])
      setRoomID(res)
      setIsCreatingRoom(false)
    }
  }
  async function handleRoomLoad(){
    const res = await validateRoomReq(joinRoomID)
    if(res){
      // setMessages([])
      setRoomID(joinRoomID);
      setIsLoadingRoom(false)

    }
  }

  return(
    <div className={styles.platformpage}>
      {roomID}
      <button onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>Create Room</button>
      {isCreatingRoom && 
      <>
        <input type="text" value={newRoomName} onChange={(e)=>setNewRoomName(e.target.value)}/>
        <button onClick={handleRoomCreation}>Submit</button>
      </>
      }
      <button onClick={()=>{setIsLoadingRoom(true); setIsCreatingRoom(false)}}>Join Room</button>
      {isLoadingRoom && 
      <>
        <input type="text" value={joinRoomID} onChange={(e)=>setJoinRoomID(e.target.value)}/>
        <button onClick={handleRoomLoad}>Submit</button>
      </>
      }
    </div>
  )
}

export default Platform