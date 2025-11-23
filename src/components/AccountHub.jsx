"use client"
import { useEffect, useRef, useState, useContext } from "react"

import ThemeContext from "src/assets/ThemeContext"

import styles from "styles/components/AccountHub.module.css"

import CreateRoom from "./CreateRoom"
import JoinRoom from "./JoinRoom"
import ChooseImage from "./ChooseImage"

function AccountHub(){
  const {roomID, setRoomID, username, userInfo, setUserInfo, sendJsonMessage, setDarkMode} = useContext(ThemeContext)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)

  const [isChangingImage, setIsChangingImage] = useState(false)

  return(
    <div className={styles.accountHub}>
      {roomID}
        <label className={styles.toggleAppearance}>
          dark mode
          <input 
          type="checkbox"
          onClick={(e)=>setDarkMode(e.target.checked)

          }
          /> 
          <span></span>
        </label>
      <section className={styles.header}>
        <span className={`profilePic ${styles.changeImage}`} onClick={()=>setIsChangingImage(!isChangingImage)}>
          <img src={userInfo["avatar"]} alt="nth" />
        </span>
        {
          isChangingImage &&
          <ChooseImage {...{setIsChangingImage, username, userInfo,setUserInfo, sendJsonMessage}}/>
        }
        <span className={styles.username}>{username}</span>
      </section>
      <button className={styles.createRoom}
      onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>
        Create Room
      </button>
      {isCreatingRoom && 
      <CreateRoom {...{setIsCreatingRoom,setRoomID, setUserInfo}}/>
      }
      
      <button className={styles.joinRoom}
      onClick={()=>{setIsLoadingRoom(true); setIsCreatingRoom(false)}}>
        Join Room
      </button>
      {isLoadingRoom && 
        <JoinRoom {...{setIsLoadingRoom,setRoomID, setUserInfo, userInfo}}/>
      }
    </div>
  )
}

export default AccountHub