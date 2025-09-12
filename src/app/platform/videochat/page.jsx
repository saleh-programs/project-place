"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import * as mediasoupClient from "mediasoup-client"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef, deviceInfo, sendJsonMessage} = useContext(ThemeContext)

  const localCam = useRef(null)

  

  useEffect(()=>{
    externalVideochatRef.current = externalVideochat

    return ()=>{
      externalVideochatRef.current = (param1) => {}
    }
  },[])

  async function startWebcam(){
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
    localCam.current.srcObject = stream
    const videoProducerParams = {
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
    } 
    const audioProducerParams = {
      track: stream.getAudioTracks()[0]
    } 

    //set up send transport
    const device = await setupDevice()
    const sendTransport = device.createSendTransport(deviceInfo.current["producer"]["params"])
    sendTransport.on("connect", ({dtlsParameters}, callback)=>{
      sendJsonMessage({
        "username": username,
        "type": "producerConnect",
        "data": dtlsParameters
      })
      deviceInfo.current["producer"]["connectCallback"] = callback
    })
    sendTransport.on("produce", ({kind, rtpParameters, appData}, callback)=>{
      sendJsonMessage({
        "username": username,
        "type": "producerProduce",
        "data": {
          kind,
          rtpParameters,
          appData
        }
      })
    })

    //create producers
    const videoProducer = await sendTransport.produce(videoProducerParams)
    const audioProducer = await sendTransport.produce(audioProducerParams)
  }

  async function setupDevice() {
    deviceInfo.current["device"] = new mediasoupClient.Device()
    await deviceInfo.current["device"].load({routerRtpCapabilities: deviceInfo.current["routerRtpCapabilities"]})
    return deviceInfo.current["device"]
  }


  async function externalVideochat(data){
    const producer = deviceInfo.current["producer"]
    switch (data.type){
      case "producerConnect":
        producer["connectCallback"]()
        break
      case "producerProduce":
        producer["produceCallback"]({id: data.data})
        break
    }
  }

  return(
    <div className={styles.videochatPage}>
      <h1 className={styles.title}>
        Videochat
      </h1>
      <video ref={localCam} playsInline autoPlay width={200}></video>
      <button onClick={startWebcam}>start webCam</button>
    </div>
  )
}

export default VideoChat