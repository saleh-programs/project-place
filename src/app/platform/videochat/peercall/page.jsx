"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
 
function PeerCall(){
    const { externalPeercallRef, userStates, username,sendJsonMessage  } = useContext(ThemeContext)
    const searchParams = useSearchParams()

    const servers = {
        iceServers: [{
        urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]
        }],
        iceCandidatePoolSize: 10,
    }
    const connectionInfo = useRef({ 
        pc: null,
        localStream: null,
        remoteStream: null
    })
    const localCam = useRef(null)
    const remoteCam = useRef(null)

    const [videoAdded, setVideoAdded] = useState(false)
    const [audioAdded, setAudioAdded] = useState(false)

    const [showVideo, setShowVideo] = useState(true)
    const [showAudio, setShowAudio] = useState(true)

    useEffect(()=>{
        externalPeercallRef.current = externalPeercall

        startWebcam()
        
        return ()=>{
            externalPeercallRef.current = (param1) => {}
        }
    },[])

    async function startWebcam(){
        let stream = new MediaStream()
        try{
            stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
            setAudioAdded(true)
            setVideoAdded(true)
            connectionInfo.current["localStream"] = localStream
        }catch(err){
            console.log("permission denied")
        }
        localCam.current.srcObject = stream
    }
    async function callPeer(name) {
        const remoteStream = new MediaStream()
        connectionInfo.current["remoteStream"] = remoteStream
        remoteCam.current.srcObject = remoteStream

        const pc = new RTCPeerConnection(servers)
        connectionInfo.current["pc"] = pc

        connectionInfo.current["localStream"].getTracks().forEach(track => {
            pc.addTrack(track, connectionInfo.current["localStream"])
        })
        pc.ontrack = event => {
            event.streams[0].getTracks().forEach(track=>{
                remoteStream.addTrack(track)
            })
        }
        pc.onicecandidate = event => {
            if (!event.candidate){
                return 
            }
            sendJsonMessage({
                "origin": "peercall",
                "type": "stunCandidate",
                "username": username,
                "data": {
                    "candidate": event.candidate.toJSON(),
                    "peer": name
                }
            })
        }

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type
        }
        sendJsonMessage({
            "username": username,
            "origin": "peercall",
            "type": "callRequest",
            "data": {"peer": name, offer}
        })
    }



    async function acceptCall(peerName) {
        const {pc} = p2pInfo.current
        const offer = callOffers[peerName]
        pc.setRemoteDescription(new RTCSessionDescription(offer))

        pc.onicecandidate = event => {
        if (!event.candidate){
            return
        }
        const data = {
            "origin": "peercall",
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
        "origin": "peercall",
        "type": "callResponse",
        "data": {
            "peer": peerName,
            "status": "accepted",
            answer
        }
        })
        setCallOffers(prev => {
        const newCallOffers = {...prev}
        delete newCallOffers[peerName]
        return newCallOffers
        })
    }
    async function rejectCall(peerName) {
        sendJsonMessage({
        "username": username,
        "origin": "peercall",
        "type": "callResponse",
        "data": {"status": "rejected", "peer": peerName}
        })
        setCallOffers(prev => {
        const newCallOffers = {...prev}
        delete newCallOffers[peerName]
        return newCallOffers
        })
    }

    async function requestMedia(type){
        let stream
        try{
            if (type === "video"){
                stream = await navigator.mediaDevices.getUserMedia({video: true})
                const videoTrack = stream.getVideoTracks()[0]
                localCam.current.srcObject.addTrack(videoTrack)
                setVideoAdded(true)
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: true})
                const audioTrack = stream.getAudioTracks()[0]
                localCam.current.srcObject.addTrack(audioTrack)
                setAudioAdded(true)
            }
        }catch(err){
            if (err.name === "NotAllowedError"){
                //later iam going to add prompt in jsx to tell user how to turn media on
                console.log("set permissions")
                return
            }
            console.error(err)
        }
    }

    async function toggleMedia(type){
        const stream = localCam.current.srcObject
        if (type === "video"){
            const videoTrack = stream.getVideoTracks()[0]
            videoTrack.enabled = !videoTrack.enabled
            setShowVideo(videoTrack.enabled)
        }
        if (type === "audio"){
            const audioTrack = stream.getAudioTracks()[0]
            audioTrack.enabled = !audioTrack.enabled
            setShowAudio(audioTrack.enabled)
        }
    }

    async function externalPeercall(data){
        const pc = connectionInfo.current["pc"]

        switch (data.type){
            case "callRequest":
                console.log("got offer")
                setCallOffers(prev => {
                return {...prev, [data["username"]]: data.data["offer"]}
                })
                break
            case "callResponse":
                if (data.data["status"] === "accepted"){
                    pc.setRemoteDescription(new RTCSessionDescription(data.data["answer"]))
                }else{
                    //i dont wanna talk to you bryan
                    pc.close()
                }
                break
            case "stunCandidate":
                if (pc.currentRemoteDescription){
                    pc.addIceCandidate(new RTCIceCandidate(data.data["candidate"]))
                }
                break
        }
    }
    return(
        <div>
            hello to peer {searchParams.get("peer")}!\
            <video ref={localCam} playsInline autoPlay muted width={200}></video>
            {
                videoAdded
                ?
                    <button onClick={()=>toggleMedia("video")}>Toggle Video</button>
                :
                    <button onClick={()=>requestMedia("video")}>Add Video</button>
            }
            {
                audioAdded
                ?
                    <button onClick={()=>toggleMedia("audio")}>Toggle Audio</button>
                :
                    <button onClick={()=>requestMedia("audio")}>Add Audio</button>
            }
            <video ref={remoteCam} playsInline autoPlay width={200}></video>
            {Object.keys(userStates).map((name,i)=>{
                return <button key={i} onClick={()=>callPeer(name)}>{name}</button>
            })}
{/* 
            {Object.keys(callOffers).map((name,i) => {
                return (<div key={i}>
                New call offer from <strong>{name}</strong>!
                <button onClick={()=>acceptCall(name)}>Accept</button>
                <button onClick={()=>rejectCall(name)}>Reject</button>
                </div>)
            })} */}
        </div>
    )
}
export default PeerCall