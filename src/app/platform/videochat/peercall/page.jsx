"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
 
function PeerCall(){
    const { externalPeercallRef, userStates, username,sendJsonMessage, callOffers, setCallOffers  } = useContext(ThemeContext)
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

    const connectionStateRef = useRef("disconnected")
    const peerCalling = useRef(null)

    useEffect(()=>{
        externalPeercallRef.current = externalPeercall

        const setup = async () => {
            await startWebcam()
            const peer = searchParams.get("peer")
            if (peer){
                acceptCall(peer)
            }
        }
        setup()
        
        return ()=>{
            externalPeercallRef.current = (param1) => {}
        }
    },[])

    async function startWebcam(){
        let stream = new MediaStream()
        const pc = new RTCPeerConnection(servers)
        connectionInfo.current["pc"] = pc
        try{
            stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
            setAudioAdded(true)
            setVideoAdded(true)
            connectionInfo.current["localStream"] = stream
        }catch(err){
            console.log("permission denied")
        }
        localCam.current.srcObject = stream
    }

    async function callPeer(name) {
        if (peerCalling.current === name){
            return
        }
        if (callOffers.hasOwnProperty(name)){
            acceptCall(name)
            return
        }
        disconnect()

        connectionStateRef.current = "waiting"
        peerCalling.current = name

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
            if (!event.candidate || connectionStateRef.current !== "connected"){
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
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected"){
                connectionStateRef.current = "connected"
            }
        }

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        sendJsonMessage({
            "username": username,
            "origin": "peercall",
            "type": "callRequest",
            "data": {
                "peer": name,
                "offer": {
                    sdp: offerDescription.sdp,
                    type: offerDescription.type
                }}
        })
    }
    function disconnect(){
        if (peerCalling.current){
            sendJsonMessage({
                "origin": "peercall",
                "username": username,
                "type": "disconnect",
                "data": {peer: peerCalling.current}
            })
            connectionInfo.current["pc"].close()
            peerCalling.current = null
            connectionStateRef.current = "disconnected"
            remoteCam.current.srcObject = null
        }
    }

    async function acceptCall(name) {
        if (peerCalling.current === name){
            return
        }
        disconnect()

        connectionStateRef.current = "answering"
        peerCalling.current = name

        const offer = callOffers[peerName]
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
            if (!event.candidate || connectionStateRef.current !== "connected"){
                return 
            }
            sendJsonMessage({
                "origin": "peercall",
                "type": "stunCandidate",
                "username": username,
                "data": {
                    "candidate": event.candidate.toJSON(),
                    "peer": peerName
                }
            })
        }
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected"){
                connectionStateRef.current = "connected"
            }
        }
        pc.setRemoteDescription(new RTCSessionDescription(offer))

        const answerDescription = await pc.createAnswer()
        await pc.setLocalDescription(answerDescription)

        sendJsonMessage({
            "username": username,
            "origin": "peercall",
            "type": "callResponse",
            "data": {
                "peer": peerName,
                "status": "accepted", 
                "answer": {
                    type: answerDescription.type,
                    sdp: answerDescription.sdp 
                }
            }
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
                //regnotiate here
                setVideoAdded(true)
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: true})
                const audioTrack = stream.getAudioTracks()[0]
                localCam.current.srcObject.addTrack(audioTrack)
                //regnotiate here
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
                //=== waiting is a pretty rare case. When users call at exact same time, I just compare their usernames to settle it
                const isRaceCollision = peerCalling.current === data["username"] && connectionStateRef.current === "waiting"
                if (isRaceCollision && data["username"] <  username){
                    peerCalling.current = null
                    connectionStateRef.current = "disconnected"
                    pc.close()
                    acceptCall(data["username"])
                }
                break
            case "callResponse":
                const notCalling = !peerCalling.current || peerCalling.current !== data["username"]
                const answered = peerCalling.current === data["username"] && connectionStateRef.current !== "waiting"
                if (notCalling || answered){
                    break
                }

                if (data.data["status"] === "accepted"){                    
                    pc.setRemoteDescription(new RTCSessionDescription(data.data["answer"]))
                }else{
                    connectionStateRef.current = "disconnected"
                    peerCalling.current = null
                    pc.close()
                }
                break
            case "stunCandidate":
                if (peerCalling.current === data["username"] && pc.currentRemoteDescription){
                    pc.addIceCandidate(new RTCIceCandidate(data.data["candidate"]))
                }
                break
            case "disconnect":
                if (peerCalling.current === data["username"]){
                    peerCalling.current = null
                    connectionStateRef.current = "disconnected"
                    connectionInfo.current["pc"].close()
                    remoteCam.current.srcObject = null
                }
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
            <button onClick={disconnect}>End Call</button>
            
        </div>
    )
}
export default PeerCall