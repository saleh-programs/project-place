"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef, sendJsonMessage} = useContext(ThemeContext)
  const localCam = useRef(null)


  useEffect(()=>{
    externalVideochatRef.current = externalVideochat
    return ()=>{
      externalVideochatRef.current = (param1) => {}
    }
  },[])


  async function startWebcam(){
  }

  async function joinGroup(){
  }

  async function externalVideochat(data){
  }

  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat
      </h1>
      <video ref={localCam} playsInline autoPlay width={200}></video>
      <button onClick={startWebcam}>start webCam</button>
      <button onClick={joinGroup}>Join Group</button>
      {/* <input ref={joinInput}/> */}
      {/* <button onClick={joinCall}></button> */}
    </div>
  )
}

export default VideoChat