"use client"
import { useEffect, useRef, useState, useContext } from "react"

import ThemeContext from "src/assets/ThemeContext"
import { createRoomReq, validateRoomReq } from "backend/requests"

import styles from "styles/components/AccountHub.module.css"

import CreateRoom from "./CreateRoom"
import JoinRoom from "./JoinRoom"


function AccountHub(){
  const {roomID, setRoomID, username, userInfo} = useContext(ThemeContext)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
 
  useEffect(()=>{
    console.log(userInfo["profilePicURL"])
  },[])
  return(
    <div className={styles.accountHub}>
      {roomID}
      <section className={styles.header}>
        <span className={styles.profilePic}><img src={"http://localhost:5000/getImage/willow"} alt="nth" /></span>
        <span className={styles.username}>{username}</span>
      </section>
      <button className={styles.createRoom}
      onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>
        Create Room
      </button>
      {isCreatingRoom && 
      <CreateRoom {...{setIsCreatingRoom,setRoomID}}/>
      }
      
      <button className={styles.joinRoom}
      onClick={()=>{setIsLoadingRoom(true); setIsCreatingRoom(false)}}>
        Join Room
      </button>
      {isLoadingRoom && 
        <JoinRoom {...{setIsLoadingRoom,setRoomID}}/>
      }
    </div>
  )
}

export default AccountHub