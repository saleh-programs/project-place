"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useContext, useEffect, useRef, useState } from "react"
import ThemeContext from "src/assets/ThemeContext"
 
function PeerCall(){
    const { externalPeercallRef, userStates, username,sendJsonMessage, callOffers, setCallOffers, callOffersRef  } = useContext(ThemeContext)
    const searchParams = useSearchParams()
    const router = useRouter()

    const servers = {
        iceServers: [{
        urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]
        }],
        iceCandidatePoolSize: 10,
    }
    const connectionInfo = useRef({ 
        pc: null,
        localStream: null,
        remoteStream: null,
        negotiating: false
    })
    const localCam = useRef(null)
    const remoteCam = useRef(null)

    const [videoAdded, setVideoAdded] = useState(false)
    const [audioAdded, setAudioAdded] = useState(false)

    const [showVideo, setShowVideo] = useState(true)
    const [showAudio, setShowAudio] = useState(true)

    const connectionStateRef = useRef("disconnected")
    const peerCalling = useRef(null)

    const webcamStartedRef = useRef(false)
    useEffect(()=>{
        externalPeercallRef.current = externalPeercall
        window.addEventListener("beforeunload", disconnect)

        const setup = async ()=>{
            await startWebcam()
                disconnect()

            const peer = searchParams.get("peer")
            if (peer){
                acceptCall(peer)
            }
        }
        setup()
        
        return ()=>{
            externalPeercallRef.current = (param1) => {}
            window.removeEventListener("beforeunload", disconnect)
            disconnect()
        }
    },[])

    useEffect(()=>{
        const peer = searchParams.get("peer")
        if (peer && webcamStartedRef.current){
            acceptCall(peer)
        }
    },[searchParams])
    function debuggingLogs(){
        console.log("Connection Info: ", connectionInfo.current)
        console.log("Connection State: ", connectionStateRef.current )
        console.log("Current Peer: ", peerCalling.current)
    }

    async function startWebcam(){
        let tempStream;
        let stream = new MediaStream()
        const pc = new RTCPeerConnection(servers)
        connectionInfo.current["pc"] = pc
        try{
            tempStream = await navigator.mediaDevices.getUserMedia({video: true})
            setVideoAdded(true)
            stream.addTrack(...tempStream.getVideoTracks())
        }catch(err){
            console.log("video permission denied")
        }
        try{
            tempStream = await navigator.mediaDevices.getUserMedia({audio: true})
            setAudioAdded(true)
            stream.addTrack(...tempStream.getAudioTracks())

        }catch(err){
            console.log("audio permission denied")
        }
        connectionInfo.current["localStream"] = stream
        localCam.current.srcObject = stream
        webcamStartedRef.current = true
    }

    async function callPeer(name) {
        if (peerCalling.current === name){
            return
        }
        if (callOffersRef.current.hasOwnProperty(name)){
            acceptCall(name)
            return
        }
        disconnect()
        
        connectionInfo.current["negotiating"] = true
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
        pc.onconnectionstatechange = () => {
            console.log(pc.connectionState)
            if (pc.connectionState === "connected"){
                connectionInfo.current["negotiating"] = false
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
            connectionInfo.current["negotiating"] = false
            peerCalling.current = null
            connectionStateRef.current = "disconnected"
            console.log("disconnected")
            remoteCam.current.srcObject = null
        }
        router.push("/platform/videochat/peercall")
    }

    async function acceptCall(name) {
        if (peerCalling.current === name || !callOffersRef.current.hasOwnProperty(name)){
            return
        }
        disconnect()

        connectionInfo.current["negotiating"] = true
        connectionStateRef.current = "answering"
        peerCalling.current = name

        const offer = callOffersRef.current[name]
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
        pc.onconnectionstatechange = () => {
            console.log(pc.connectionState)
            if (pc.connectionState === "connected"){
                connectionInfo.current["negotiating"] = false
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
                "peer": name,
                "status": "accepted", 
                "answer": {
                    type: answerDescription.type,
                    sdp: answerDescription.sdp 
                }
            }
        })
        delete callOffersRef.current[name]
        setCallOffers({...callOffersRef.current})
    }

    async function requestMedia(type){
        let stream
        try{
            if (type === "video"){
                stream = await navigator.mediaDevices.getUserMedia({video: true})
                const videoTrack = stream.getVideoTracks()[0]
                localCam.current.srcObject.addTrack(videoTrack)

                renegotiate(videoTrack)

                setVideoAdded(true)
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: true})
                const audioTrack = stream.getAudioTracks()[0]
                localCam.current.srcObject.addTrack(audioTrack)

                renegotiate(audioTrack)

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
    async function renegotiate(track) {
        if (connectionStateRef.current !== "connected" || connectionInfo.current["negotiating"]){
            return
        }
        connectionInfo.current["negotiating"] = true
        const pc = connectionInfo.current["pc"]
        pc.addTrack(track, connectionInfo.current["localStream"])
        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)
        console.log("sent negotiation offer")
        sendJsonMessage({
            "username": username,
            "type": "renegotiation",
            "data": {
                "peer": peerCalling.current,
                "offer": {
                    sdp: offerDescription.sdp,
                    type: offerDescription.type
                }}
        })
    }

    async function externalPeercall(data){
        const pc = connectionInfo.current["pc"]

        switch (data.type){
            case "callRequest":
                //=== waiting is a pretty rare case (when users call at exact same time). I just compare usernames to settle it
                const isRaceCollision = peerCalling.current === data["username"] && connectionStateRef.current === "waiting"
                if (isRaceCollision && data["username"] <  username){
                    peerCalling.current = null
                    connectionStateRef.current = "disconnected"
                    console.log("disconnected2")
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
                    console.log("disconnected3")
                    peerCalling.current = null
                    pc.close()
                }
                break
            case "renegotiationRequest":
                if (connectionStateRef.current !== "connected" || peerCalling.current !== data["username"]){
                    break
                }
                await pc.setRemoteDescription(data.data["offer"])
                const answerDescription = await pc.createAnswer()
                await pc.setLocalDescription(answerDescription)
                sendJsonMessage({
                    "origin": "peercall",
                    "username": username,
                    "type": "renegotiationResponse",
                    "data": {
                        "peer": peerCalling.current,
                        "answer": {
                            type: answerDescription.type,
                            sdp: answerDescription.sdp 
                        }
                    }
                })
                console.log("sent negotiation answer")

                break
            case "renegotiationResponse":
                if (connectionStateRef.current !== "connected" || peerCalling.current !== data["username"]){
                    break
                }
                await pc.setRemoteDescription(data.data["answer"])
                connectionInfo.current["negotiating"] = false
                console.log("completed negotiation")

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
                    console.log("disconnected final")
                    connectionInfo.current["pc"].close()
                    remoteCam.current.srcObject = null
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
            <button onClick={disconnect}>End Call</button>
            <button onClick={debuggingLogs}>debug</button>
            
        </div>
    )
}
export default PeerCall