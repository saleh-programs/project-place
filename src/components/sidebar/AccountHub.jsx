"use client"
import { memo, useState, useContext } from "react"

import { UserContext, AppearanceContext } from "src/providers/contexts"
import CreateRoom from "./CreateRoom"
import JoinRoom from "./JoinRoom"
import ChooseImage from "./ChooseImage"
import styles from "styles/components/AccountHub.module.css"

function AccountHub(){
  const {username, userInfo} = useContext(UserContext)
  const {darkMode, setDarkMode} = useContext(AppearanceContext)

  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)

  const [isChangingImage, setIsChangingImage] = useState(false)

  return(
    <div className={styles.accountHub}>   

      <section className={styles.header}>
        <span className={`${styles.profilePicture}`} onClick={()=>setIsChangingImage(!isChangingImage)}>
          <img src={userInfo["avatar"]} alt="profile picture" />
        </span>
        {
          isChangingImage &&
          <ChooseImage {...{setIsChangingImage}}/>
        }
        <span className={styles.username}>{username}</span>
      </section>  


      <section className={styles.roomButtons}>
          <button className={styles.createRoom}
          onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>
            Create Room
          </button>
          {isCreatingRoom && 
          <CreateRoom {...{setIsCreatingRoom}}/>
          }
          
          <button className={styles.joinRoom}
          onClick={()=>{setIsLoadingRoom(true); setIsCreatingRoom(false)}}>
            Join Room
          </button>
          {isLoadingRoom && 
            <JoinRoom {...{setIsLoadingRoom}}/>
          }
          <button onClick={()=>{window.location.href="http://localhost:5000/logout"}}>
            Log Out
          </button>
      </section>
      <button className={`${styles.toggleAppearance} ${darkMode ? styles.darkMode : ""}`} onClick={()=>setDarkMode(prev=>!prev)}>
        <span>{darkMode ? "Try Light Mode" : "Try Dark Mode"}</span>
        <span><img src="/lightbulb_icon.png" alt="lightbulb" /></span>
        <span><img src="/moon_icon.png" alt="moon" /></span>
      </button>
    </div>
  ) 
}

export default memo(AccountHub)