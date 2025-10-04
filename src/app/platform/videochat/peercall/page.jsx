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

    const callTimer = useRef(null)


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
        if (peer && connectionInfo.current["localStream"]){
            acceptCall(peer)
        }
    },[searchParams])

    function debuggingLogs(mssg = ""){
        console.log(mssg)
        console.log("Connection Info: ", connectionInfo.current)
        console.log("Connection State: ", connectionStateRef.current )
        console.log("Current Peer: ", peerCalling.current)
    }

    async function startWebcam(){
        let tempStream;
        let stream = new MediaStream()
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
        let allowSendCandidates = false
        const earlyCandidates = []
        pc.onicecandidate = event => {
            if (!event.candidate){
                return 
            }
            if (!allowSendCandidates){
                earlyCandidates.push(event.candidate.toJSON())
                return
            }
            sendJsonMessage({
                "origin": "peercall",
                "type": "stunCandidate",
                "username": username,
                "data": {
                    "candidate": event.candidate.toJSON(),
                    "peer": name,
                    "caller": true
                }
            })
        }
        pc.onconnectionstatechange = () => {
            console.log(pc.connectionState)
            if (pc.connectionState === "connected"){
                connectionInfo.current["negotiating"] = false
                connectionStateRef.current = "connected"
                debuggingLogs("Connected to call (caller)")
            }
        }

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        callTimer.current = setTimeout(()=>{
            if (connectionStateRef.current !== "connected" || peerCalling.current !== name ){
                disconnect()
            }
            callTimer.current = null
        },10000)

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
        allowSendCandidates = true
        earlyCandidates.forEach(candidate => {
            sendJsonMessage({
                "origin": "peercall",
                "type": "stunCandidate",
                "username": username,
                "data": {
                    "candidate": candidate,
                    "peer": name,
                    "caller": true
                }
            })
        })
        debuggingLogs("Made call")
    }

    function clearConnection(){
        connectionInfo.current["pc"]?.close()
        connectionInfo.current["negotiating"] = false

        connectionStateRef.current = "disconnected"
        peerCalling.current = null
        if (remoteCam.current){
            remoteCam.current.srcObject = null
        }
        

        callTimer.current && clearTimeout(callTimer.current)

        router.push("/platform/videochat/peercall")
    }

    function disconnect(){
        if (peerCalling.current){
            sendJsonMessage({
                "origin": "peercall",
                "username": username,
                "type": "disconnect",
                "data": {peer: peerCalling.current}
            })
        }
        clearConnection()
    }

    async function acceptCall(name) {
        if (peerCalling.current === name || !callOffersRef.current.hasOwnProperty(name)){
            return
        }
        disconnect()

        connectionInfo.current["negotiating"] = true
        connectionStateRef.current = "answering"
        peerCalling.current = name

        const offer = callOffersRef.current[name]["offer"]
        const candidates = callOffersRef.current[name]["candidates"]

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
                    "peer": name,
                    "caller": false
                }
            })
        }
        pc.onconnectionstatechange = () => {
            console.log(pc.connectionState)
            if (pc.connectionState === "connected"){
                connectionInfo.current["negotiating"] = false
                connectionStateRef.current = "connected"
                debuggingLogs("Connected to call (answerer)")
            }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))

        const answerDescription = await pc.createAnswer()
        await pc.setLocalDescription(answerDescription)

        candidates.forEach(c => {
            pc.addIceCandidate(new RTCIceCandidate(c))
        })

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
        if (callOffersRef.current.hasOwnProperty(name)){
            delete callOffersRef.current[name]
            setCallOffers({...callOffersRef.current})
        }
        debuggingLogs("Answered call")
    }

    async function requestMedia(type){
        let stream
        try{
            if (type === "video"){
                stream = await navigator.mediaDevices.getUserMedia({video: true})
                setVideoAdded(true)
                const videoTrack = stream.getVideoTracks()[0]
                localCam.current.srcObject.addTrack(videoTrack)
                videoTrack.onended = ()=>{
                    setVideoAdded(false)
                    localCam.current.srcObject.removeTrack(videoTrack)
                }
                renegotiate(videoTrack)
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: true})
                
                setAudioAdded(true)
                const audioTrack = stream.getAudioTracks()[0]
                localCam.current.srcObject.addTrack(audioTrack)
                audioTrack.onended = ()=>{
                    setAudioAdded(false)
                    localCam.current.srcObject.removeTrack(audioTrack)
                }

                renegotiate(audioTrack)
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
        const pc = connectionInfo.current["pc"]
        connectionInfo.current["negotiating"] = true

        pc.addTrack(track, connectionInfo.current["localStream"])

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        sendJsonMessage({
            "username": username,
            "origin": "peercall",
            "type": "renegotiationRequest",
            "data": {
                "peer": peerCalling.current,
                "offer": {
                    sdp: offerDescription.sdp,
                    type: offerDescription.type
                }}
        })
        debuggingLogs("new negotiation offer")
    }

    async function externalPeercall(data){
        const pc = connectionInfo.current["pc"]

        switch (data.type){
            case "callRequest":
                //=== waiting is a pretty rare case (when users call at exact same time). I just compare usernames to settle it
                const isRaceCollision = peerCalling.current === data["username"] && connectionStateRef.current === "waiting"
                if (!isRaceCollision){
                    break
                }
                if (data["username"] <  username){
                    clearConnection()
                    acceptCall(data["username"])
                }else{
                    delete callOffersRef.current[data["username"]]
                    setCallOffers({...callOffersRef.current})
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
                    clearConnection()
                }
                break
            case "renegotiationRequest":
                console.log("in reg")
                if (connectionStateRef.current !== "connected" || peerCalling.current !== data["username"]){
                    break
                }
                console.log("exited")
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
                debuggingLogs("gave negotiation answer")
                break
            case "renegotiationResponse":
                if (connectionStateRef.current !== "connected" || peerCalling.current !== data["username"]){
                    break
                }
                await pc.setRemoteDescription(data.data["answer"])
                connectionInfo.current["negotiating"] = false
                debuggingLogs("Completed negotiation!")
                break
            case "stunCandidate":
                console.log("got candidate")
                if (peerCalling.current === data["username"] && pc.currentRemoteDescription){
                    debuggingLogs("new stun candidated")
                    pc.addIceCandidate(new RTCIceCandidate(data.data["candidate"]))
                }
                break
            case "disconnect":
                if (peerCalling.current === data["username"]){
                    debuggingLogs("before disconnect")
                    clearConnection()
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