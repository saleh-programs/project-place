"use client"
import { useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef, sendJsonMessage} = useContext(ThemeContext)
  const localCam = useRef(null)
  const remoteCam = useRef(null)
  const servers = {
    iceServers: [{
      urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]
    }],
    iceCandidatePoolSize: 10,
  }
  const camInfo = useRef({ 
    pc: new RTCPeerConnection(servers),
    localStream: null,
    remoteStream: null
  })

  useEffect(()=>{
    externalVideochatRef.current = externalVideochat
    return ()=>{
      externalVideochatRef.current = (param1) => {}
    }
  },[])

  async function startWebcam(){
    const pc = camInfo.current["pc"]
    const localStream =  await navigator.mediaDevices.getUserMedia({video:true,audio:true})
    const remoteStream = new MediaStream()
    camInfo.current["localStream"] = localStream
    camInfo.current["remoteStream"] = remoteStream

    localStream.getTracks().forEach(track=>{
      pc.addTrack(track, localStream)
    })
    pc.ontrack = event => {
     event.streams[0].getTracks().forEach(track=>{
      remoteStream.addTrack(track)
     })
    }

    localCam.current.srcObject = localStream
    remoteCam.current.srcObject = remoteStream
  }

  async function makeCall(){
    const {pc} = camInfo.current
    
    pc.onicecandidate = event => {
      if (!event.candidate){
        return
      }
      const data = {
        "origin": "videochat",
        "type": "stunCandidate",
        "data": event.candidate.toJSON()
      }
      sendJsonMessage(data)
    }

    const offerDescription = await pc.createOffer()
    await pc.setLocalDescription(offerDescription)

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type
    }
    sendJsonMessage({
      "origin": "videochat",
      "type": "RTCsession",
      "data": offer
    })
  }
  


  async function externalVideochat(data){
    const {pc} = camInfo.current
    console.log(data)
    switch(data.type){
      case "RTCsession":
        if (!pc.currentRemoteDescription){
          pc.setRemoteDescription(new RTCSessionDescription(data.data))
        }

        // if (im sending an answer), else (I got an answer)
        if (!pc.localDescription){
          console.log("start")
          pc.onicecandidate = event => {
            if (!event.candidate){
              return
            }
            const data = {
              "origin": "videochat",
              "type": "stunCandidate",
              "data": event.candidate.toJSON()
            }
            sendJsonMessage(data)
          }
          
          const answerDescription = await pc.createAnswer()
          await pc.setLocalDescription(answerDescription)
          const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp 
          }
          const data = {
            "origin": "videochat",
            "type": "RTCsession",
            "data": answer
          }
          console.log("sent my answer")
          sendJsonMessage(data)
        }
        break
      case "stunCandidate":
        if (pc.currentRemoteDescription){
          pc.addIceCandidate(new RTCIceCandidate(data.data))
        }
        break
    }
  }

  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat
      </h1>
      <video ref={localCam} playsInline autoPlay width={500}></video>
      <video ref={remoteCam} playsInline autoPlay width={500}></video>
      <div>de</div>
      <button onClick={startWebcam}>start webCam</button>
      <button onClick={makeCall}>Make call</button>
      {/* <input ref={joinInput}/> */}
      {/* <button onClick={joinCall}></button> */}
    </div>
  )
}

export default VideoChat