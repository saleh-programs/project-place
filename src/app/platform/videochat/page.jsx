"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"
import Animation from "src/components/Animation"
import { useRouter } from "next/navigation"
function VideoChat(){
  const {darkMode} = useContext(ThemeContext)
  const router = useRouter()

  return(
    <div className={`${styles.videochatPage} ${darkMode ? styles.darkMode : ""}`}>
      <h1 className={styles.title}>
        <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/videochat?18" : "/light/videochat?18"} type="once" speed={4}/> 
      </h1>
      <div className={styles.mainContent}>
        <button onClick={()=>router.push(`/platform/videochat/peercall`)}>Call a Peer</button>
        <button onClick={()=>router.push("/platform/videochat/groupcall")}>Join Group Call</button>
      </div>
    </div>
  )
}

export default VideoChat  