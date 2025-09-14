"use client"
import React, { useContext, useEffect, useRef, useState } from "react"
import * as mediasoupClient from "mediasoup-client"
import ThemeContext from "src/assets/ThemeContext"
import styles from "styles/platform/VideoChat.module.css"

function VideoChat(){
  const {externalVideochatRef, deviceInfo, sendJsonMessage} = useContext(ThemeContext)

  const localCam = useRef(null)

  const [streams, setStreams] = useState({})
  

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
    const sendTransport = device.createSendTransport(deviceInfo.current["sendTransport"]["transportParams"])
    deviceInfo.current["sendTransport"]["ref"] = sendTransport
    sendTransport.on("connect", ({dtlsParameters}, callback)=>{
      sendJsonMessage({
        "username": username,
        "type": "producerConnect",
        "data": {dtlsParameters, rtpCapabilities: device.rtpCapabilities}
      })
      deviceInfo.current["sendTransport"]["connectCallback"] = callback
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

    //set up recv transport
    const recvTransport = device.createRecvTransport(deviceInfo.current["recvTransport"]["transportParams"])
    deviceInfo.current["recvTransport"]["ref"] = recvTransport

    recvTransport.on("connect", ({dtlsParameters}, callback) => {
      sendJsonMessage({
        "username": username,
        "type": "consumerConnect",
        "data": dtlsParameters
      })
      deviceInfo.current["recvTransport"]["connectCallback"] = callback
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

  async function addConsumer({id, producerId, kind, rtpParameters}){
    const consumer = await deviceInfo.current["recvTransport"]["ref"].consume({
      id,
      producerId,
      kind,
      rtpParameters
    })

    if (producerId in streams){
      streams[producerId].addTrack(consumer.track)
    }else{
      streams[producerId] = new MediaStream([consumer.track])
    }
  }

  async function externalVideochat(data){
    const info = deviceInfo.current
    switch (data.type){
      case "producerConnect":
        info["sendTransport"]["connectCallback"]()
        break
      case "producerProduce":
        info["sendTransport"]["produceCallback"]({id: data.data})
        break
      case "consumerConnect":
        info["recvTransport"]["connectCallback"]()
        break
      case "addConsumer":
        addConsumer(data.data)
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
        const assignStream = (elem) => {if (elem){elem.srcObject = stream}}
        return <video key={peerID} ref={assignStream} autoPlay playsInline></video>
      })}
      <button onClick={startWebcam}>start webCam</button>
    </div>
  )
}

export default VideoChat