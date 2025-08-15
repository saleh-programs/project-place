"use client"
import { useEffect, useRef, useState, useContext } from "react"

import ThemeContext from "src/assets/ThemeContext"
import { createRoomReq, validateRoomReq } from "backend/requests"

import styles from "styles/components/AccountHub.module.css"

import CreateRoom from "./CreateRoom"
import JoinRoom from "./JoinRoom"
import ChooseImage from "./ChooseImage"

function AccountHub(){
  const {roomID, setRoomID, username, userInfo, setUserInfo} = useContext(ThemeContext)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)

  const [IsChangingImage, setIsChangingImage] = useState(false)
  return(
    <div className={styles.accountHub}>
      {roomID}
      <section className={styles.header}>
        <span className={`profilePic ${styles.changeImage}`} onClick={()=>setIsChangingImage(!IsChangingImage)}>
          <img src={userInfo["profilePicURL"]} alt="nth" />
        </span>
        {
          IsChangingImage &&
          <ChooseImage {...{setIsChangingImage, username,userInfo,setUserInfo}}/>
        }
        <span className={styles.username}>{username}</span>
      </section>
      <button className={styles.createRoom}
      onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>
        Create Room
      </button>
      {isCreatingRoom && 
      <CreateRoom {...{setIsCreatingRoom,setRoomID, username}}/>
      }
      
      <button className={styles.joinRoom}
      onClick={()=>{setIsLoadingRoom(true); setIsCreatingRoom(false)}}>
        Join Room
      </button>
      {isLoadingRoom && 
        <JoinRoom {...{setIsLoadingRoom,setRoomID, username}}/>
      }
    </div>
  )
}

export default AccountHub