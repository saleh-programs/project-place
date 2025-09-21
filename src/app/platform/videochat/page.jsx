"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef, deviceInfo, sendJsonMessage, username, userStates} = useContext(ThemeContext)

  const localCam = useRef(null)

  const [streams, setStreams] = useState({})
  const consumersRef = useRef({})
  const tempJoinedFlag = useRef(false)

  const servers = {
    iceServers: [{
      urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]
    }],
    iceCandidatePoolSize: 10,
  }
  const p2pInfo = useRef({ 
    pc: new RTCPeerConnection(servers),
    localStream: null,
    remoteStream: null
  })



  useEffect(()=>{
    externalVideochatRef.current = externalVideochat

    return ()=>{
      externalVideochatRef.current = (param1) => {}
      disconnect()
    }
  },[])

  function disconnect(){
    if (!tempJoinedFlag.current){
      return
    }
    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "disconnect",
    })
    //close our tracks and transports (which close producers/consumers)
    for (let param of deviceInfo.current["producerParams"]){
      param["track"].stop()
    }
    deviceInfo.current["sendTransport"]["ref"]?.close()
    deviceInfo.current["recvTransport"]["ref"]?.close()

    deviceInfo.current = {
      ...deviceInfo.current,
      "producerParams": [],
      "sendTransport":{
        "ref": null,
        "connectCallback": null,
        "produceCallback": null
      },
      "recvTransport": {
        "ref": null,
        "connectCallback": null
      }
    }
  }
  async function joinGroupCall() {
    if (!deviceInfo.current["device"]){
      return
    }
    tempJoinedFlag.current = true
    await startWebcam()
    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "transportParams",
      "data": {rtpCapabilities: deviceInfo.current["device"].rtpCapabilities}
    })
  }
  async function startWebcam(){
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
    localCam.current.srcObject = stream
    deviceInfo.current["producerParams"].push(
      {
        track: stream.getVideoTracks()[0],
        encodings: [
          {
            rid: 'r0',
            maxBitrate: 100000,
            scalabilityMode: 'S1T3',
          },
          {
            rid: 'r1',
            maxBitrate: 300000,
            scalabilityMode: 'S1T3',
          },
          {
            rid: 'r2',
            maxBitrate: 900000,
            scalabilityMode: 'S1T3',
          },
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000
        }
      },
      {
        track: stream.getAudioTracks()[0]
      } 
    )
  }

  async function createTransports({sendParams, recvParams}) {
    const device = deviceInfo.current["device"]
    //set up send transport
    const sendTransport = device.createSendTransport(sendParams)
    deviceInfo.current["sendTransport"]["ref"] = sendTransport
    sendTransport.on("connect", ({dtlsParameters}, callback)=>{
      sendJsonMessage({
        "username": username,
        "origin": "videochat",
        "type": "sendConnect",
        "data": {dtlsParameters}
      })
      deviceInfo.current["sendTransport"]["connectCallback"] = callback
    })
    sendTransport.on("produce", ({kind, rtpParameters, appData}, callback)=>{
      sendJsonMessage({
        "username": username,
        "origin": "videochat",
        "type": "sendProduce",
        "data": { 
          kind,
          rtpParameters,
          appData
        }
      })
      deviceInfo.current["sendTransport"]["produceCallback"] = callback
    })

    //set up recv transport
    const recvTransport = device.createRecvTransport(recvParams)
    deviceInfo.current["recvTransport"]["ref"] = recvTransport

    recvTransport.on("connect", ({dtlsParameters}, callback) => {
      sendJsonMessage({
        "username": username,
        "origin": "videochat",
        "type": "recvConnect",
        "data": dtlsParameters
      })
      deviceInfo.current["recvTransport"]["connectCallback"] = callback
    })

    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "receivePeers"
    })
    //create producers
    console.log(deviceInfo.current["producerParams"])
    for (let i = 0; i < deviceInfo.current["producerParams"].length; i++){
      sendTransport.produce(deviceInfo.current["producerParams"][i])
    }
  }  

  async function addConsumer({id, producerId, kind, rtpParameters, uuid}){
    const consumer = await deviceInfo.current["recvTransport"]["ref"].consume({
      id,
      producerId,
      kind,
      rtpParameters
    })

    setStreams(prev => {
      const newStreams = {...prev}
      if (uuid in newStreams){
        newStreams[uuid].addTrack(consumer.track)
        consumersRef.current[uuid].push(consumer)
      }else{
        newStreams[uuid] = new MediaStream([consumer.track])
        consumersRef.current[uuid] = [consumer]
      }
      return newStreams
    })

    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "unpauseConsumer",
      "data": id
    })
  }

  //P2P logic now..
  async function p2pSetup(){
    const pc = p2pInfo.current["pc"]
    const localStream =  await navigator.mediaDevices.getUserMedia({video:true,audio:true})
    const remoteStream = new MediaStream()
    p2pInfo.current["localStream"] = localStream
    p2pInfo.current["remoteStream"] = remoteStream

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
  async function callPeer(name) {
    const pc = p2pInfo.current["pc"]
    pc.onicecandidate = event => {
      if (!event.candidate){
        return
      }
      const data = {
        "origin": "videochat",
        "type": "stunCandidate",
        "data": {
          "candidate": event.candidate.toJSON(),
          "peer": name
        }
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
      "username": username,
      "origin": "videochat",
      "type": "callRequest",
      "data": {"peer": name, offer}
    })
  }

  async function acceptCall(peerName) {
    const {offer} = callOffers[peerName]
    pc.setRemoteDescription(new RTCSessionDescription(offer))

    pc.onicecandidate = event => {
      if (!event.candidate){
        return
      }
      const data = {
        "origin": "videochat",
        "type": "stunCandidate",
        "data": {
          "candidate": event.candidate.toJSON(),
          "peer": peerName
        }
      }
      sendJsonMessage(data)
    }
    
    const answerDescription = await pc.createAnswer()
    await pc.setLocalDescription(answerDescription)
    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp 
    }
    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "callResponse",
      "data": {
        "peer": peerName,
        "status": "accepted",
        answer
      }
    })
    console.log("sent my answer")
  }
  async function rejectCall(peerName) {
    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "callResponse",
      "data": {"status": "rejected", "peer": peerName}
    })
  }
  async function externalVideochat(data){
    const info = deviceInfo.current
    switch (data.type){
      case "sendConnect":
        info["sendTransport"]["connectCallback"]()
        break
      case "sendProduce":
        info["sendTransport"]["produceCallback"]({id: data.data})

        // Now we can GIVE this media.
        sendJsonMessage({
          "origin": "videochat",
          "username": username,
          "type": "givePeers",
          "data": data.data
        })
        break
      case "recvConnect":
        info["recvTransport"]["connectCallback"]()

        console.log("RT callback called")
        break
      case "transportParams":
        createTransports(data.data)
        console.log("Received transport params:", data.data)
        break
      case "addConsumer":
        console.log(data.data)
        addConsumer(data.data)
        console.log("adding a consumer")
        break
      case "disconnect":
        setStreams(prev => {
          const newStreams = {...prev}
          consumersRef.current[data.data["uuid"]].forEach(consumer=>{
            consumer.close()
          })
          delete newStreams[data.data["uuid"]]
          return newStreams
        })
        break
      case "callRequest":
        //pop up accept or deny screen
        break
      case "callResponse":
        if (data.data["status"] === "accepted"){
          pc.setRemoteDescription(new RTCSessionDescription(data.data["answer"]))
        }else{
          //i dont wanna talk to you bryan
        }
    }
  }

  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat
      </h1>
      <video ref={localCam} playsInline autoPlay muted width={200}></video>
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
      {Object.values(userStates).map(name=>{
        return <button onClick={()=>callPeer(name)}>{name}</button>
      })}
    </div>
  )
}

export default VideoChat