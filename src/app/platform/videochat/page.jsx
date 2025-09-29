"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

import { useRouter } from "next/navigation"
function VideoChat(){
  const {userStates} = useContext(ThemeContext)
  const router = useRouter()

  const [selectedPeerCall, setSelectedPeerCall] = useState(false)


  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat 
      </h1>
      <button onClick={()=>router.push(`/platform/videochat/peercall`)}>Call a Peer</button>
      <button onClick={()=>router.push("/platform/videochat/groupcall")}>Join Group Call</button>
    </div>
  )
}

export default VideoChat