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
      {/* <video ref={localCam} playsInline autoPlay muted width={200}></video>
      {Object.entries(streams).map(([peerID, stream])=>{
        const assignStream = (elem) => {if (elem){
          elem.srcObject = stream
        }}
        return <video key={peerID} ref={assignStream} autoPlay playsInline width={200}></video>
      })}
      <button onClick={joinGroupCall}>Join Group Call</button>

      <video ref={p2pLocal} playsInline autoPlay muted width={200}></video>
      <video ref={p2pRemote} playsInline autoPlay muted width={200}></video>
      <button onClick={p2pSetup}>Set up p2p call</button>
      {Object.keys(callOffers).map((name,i) => {
        console.log("inside")
        return (<div key={i}>
          New call offer from <strong>{name}</strong>!
          <button onClick={()=>acceptCall(name)}>Accept</button>
          <button onClick={()=>rejectCall(name)}>Reject</button>
        </div>)
      })} */}
    </div>
  )
}

export default VideoChat