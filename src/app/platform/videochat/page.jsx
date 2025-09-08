"use client"
import { useContext, useEffect, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef} = useContext(ThemeContext)
  const localCam = useRef(null)
  const remoteCam = useRef(null)
  const joinInput = useRef(null)
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

    const callDoc = firestore.collection("calls").doc()
    const offerCandidates = callDoc.collection("offerCandidates")
    const answerCandidates = callDoc.collection("answerCandidates")

    joinInput.value = callDoc.id
    
    pc.onicecandidate = event => {
      event.candidate && offerCandidates.add(event.candidate.toJSON())
    }

    const offerDescription = await pc.createOffer()
    await pc.setLocalDescription(offerDescription)

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type
    }
    await callDoc.set({offer})

    callDoc.onSnapshot(snapshot => {
      const data = snapshot.data()
      if (!pc.currentRemoteDescription && data?.answer){
        pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    })

    answerCandidates.onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added"){
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
        }    
      })
    })
  }

  async function answerCall(){
    const {pc} = camInfo.current
    const callID = joinInput.current.value
    const callDoc = firestore.collection("calls").doc(callID)
    const answerCandidates = callDoc.collection("answerCandidates")
    const offerCandidates = callDoc.collection("offerCandidates")

    pc.onicecandidate = event => {
      event.candidate && answerCandidates.add(event.candidate.toJSON())
    }
    const callData = (await callDoc.get()).data()

    const offerDescription = callData.offer
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

    const answerDescription = await pc.createAnswer()
    await pc.setLocalDescription(answerDescription)

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp 
    }
    await callDoc.update({answer})

    offerCandidates.onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added"){
          pc.addIceCandidate(new RTCIceCandidate(change.doc().data()))
        }
      })
    })
  }

  function externalVideochat(data){

  }
  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat
      </h1>
      <video ref={localCam} playsInline autoPlay></video>
      <video ref={remoteCam}></video>
      <button onClick={startWebcam}>start webCam</button>
      <button onClick={makeCall}>Make call</button>
      <button onClick={answerCall}>answer call</button>
      {/* <input ref={joinInput}/> */}
      {/* <button onClick={joinCall}></button> */}
    </div>
  )
}

export default VideoChat