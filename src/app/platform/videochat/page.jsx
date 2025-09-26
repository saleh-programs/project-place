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
      {
        selectedPeerCall
        ?
        <>
          {Object.keys(userStates).map((name,i)=>{
            return <button key={i} onClick={()=>router.push(`/platform/videochat/peercall?peer=${encodeURIComponent(name)}`)}>{name}</button>
          })} 
        </>
        :
        <button onClick={()=>setSelectedPeerCall(prev=>!prev)}>Call a peer</button>
      }
      
      <button onClick={()=>router.push("/platform/videochat/groupcall")}>Join Group Call</button>
    </div>
  )
}

export default VideoChat