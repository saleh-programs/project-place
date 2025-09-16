"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import * as mediasoupClient from "mediasoup-client"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef, deviceInfo, sendJsonMessage, username} = useContext(ThemeContext)

  const localCam = useRef(null)

  const [streams, setStreams] = useState({})
  

  useEffect(()=>{
    externalVideochatRef.current = externalVideochat

    return ()=>{
      externalVideochatRef.current = (param1) => {}
    }
  },[])
  useEffect(()=>{
    console.log("Streams changed:", streams)
  },[streams])

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

    //device setup
    const device = await setupDevice()

    sendJsonMessage({
      "username": username,
      "origin": "videochat",
      "type": "transportParams"
    })
  }

  async function setupDevice() {
    deviceInfo.current["device"] = new mediasoupClient.Device()
    await deviceInfo.current["device"].load({routerRtpCapabilities: deviceInfo.current["routerRtpCapabilities"]})
    return deviceInfo.current["device"]
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
        "data": {dtlsParameters, rtpCapabilities: device.rtpCapabilities}
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
    for (let i = 0; i < deviceInfo.current["producerParams"].length; i++){
      console.log("produced", deviceInfo.current["producerParams"][i])
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
      }else{
        newStreams[uuid] = new MediaStream([consumer.track])
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

  async function externalVideochat(data){
    const info = deviceInfo.current
    switch (data.type){
      case "sendConnect":
        info["sendTransport"]["connectCallback"]()
        console.log("ST callback called")
        break
      case "sendProduce":
        info["sendTransport"]["produceCallback"]({id: data.data})

        sendJsonMessage({
          "origin": "videochat",
          "username": username,
          "type": "producerReady",
          "data": data.data
        })
        console.log("produce callback called", data)
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
    }
  }

  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat
      </h1>
      <video ref={localCam} playsInline autoPlay width={200}></video>
      {Object.entries(streams).map(([peerID, stream])=>{
        const assignStream = (elem) => {if (elem){
          console.log(stream.getTracks(), stream.getVideoTracks(), stream.getAudioTracks())
          elem.srcObject = stream
        }}
        return <video key={peerID} ref={assignStream} autoPlay playsInline width={200}></video>
      })}
      <button onClick={startWebcam}>start webCam</button>
    </div>
  )
}

export default VideoChat