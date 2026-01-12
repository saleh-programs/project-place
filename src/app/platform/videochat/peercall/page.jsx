"use client"
import { memo, useContext, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { UserContext, AppearanceContext, RoomContext, VideoChatContext, WebSocketContext, PeersContext } from "src/providers/contexts"
import Animation from "src/components/Animation" 
import styles from "styles/platform/PeerCall.module.css"

function PeerCall(){
    const {username} = useContext(UserContext)
    const {darkMode} = useContext(AppearanceContext)
    const {roomID, externalPeercallRef} = useContext(RoomContext)
    const {userStates} = useContext(PeersContext)
    const {setCallOffers, callOffersRef, stunCandidates} = useContext(VideoChatContext)
    const {sendJsonMessage} = useContext(WebSocketContext)


    const searchParams = useSearchParams() 
    const router = useRouter()

    const servers = {
        iceServers: [{urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]}],
        iceCandidatePoolSize: 10,
    }
    const connectionInfo = useRef({ 
        pc: null,
        negotiating: false,
        acceptingCandidates: false,

        peerCalling: null,
        connectionState: "disconnected"
    })
    const localCam = useRef(null)
    const remoteCam = useRef(null)

    const callTimer = useRef(null)

    const [peerCalling, setPeerCalling] = useState(null)

    const [videoAdded, setVideoAdded] = useState(false)
    const [audioAdded, setAudioAdded] = useState(false)

    const [showVideo, setShowVideo] = useState(true)
    const [showAudio, setShowAudio] = useState(true)

    const [toggleActivePeers, setToggleActivePeers] = useState(true)
    


    useEffect(()=>{
        externalPeercallRef.current = externalPeercall
        startWebcam()

        const stream = localCam.current?.srcObject
        window.addEventListener("beforeunload", disconnect)
        return ()=>{
            externalPeercallRef.current = (param1) => {}
            disconnect()
            clearConnection()
            stream?.getTracks().forEach(t => {
                t.stop()
            })

            window.removeEventListener("beforeunload", disconnect)
        }
    },[roomID])

    useEffect(()=>{
        const peer = searchParams.get("peer")
        if (peer && localCam.current?.srcObject){
            acceptCall(peer)
            router.push("/platform/videochat/peercall")
        }
    },[searchParams])

    function clearConnection(){
        if (remoteCam.current?.srcObject){
            const stream = remoteCam.current.srcObject
            stream.getTracks().forEach(t => t.stop())
            remoteCam.current.srcObject = null
        }
        connectionInfo.current["pc"]?.close()
        connectionInfo.current["pc"] = null
        connectionInfo.current["negotiating"] = false
        connectionInfo.current["acceptingCandidates"] = false
        connectionInfo.current["connectionState"] = "disconnected"
        connectionInfo.current["peerCalling"] = null
        setPeerCalling(null)
        clearTimeout(callTimer.current)
    }

    function disconnect(){
        if (stunCandidates.current.hasOwnProperty(connectionInfo.current["peerCalling"])){
            delete stunCandidates.current[connectionInfo.current["peerCalling"]]
        }
        if (connectionInfo.current["peerCalling"]){
            sendJsonMessage({
                "origin": "peercall",
                "username": username,
                "type": "disconnect",
                "data": {"peer": connectionInfo.current["peerCalling"]}
            })
        }
    }

    async function startWebcam(){
        if (!localCam.current){
            return
        }
        const stream = new MediaStream()
        localCam.current.srcObject = stream
        await requestMedia("video")
        await requestMedia("audio")
    }

    async function callPeer(name) {
        if (connectionInfo.current["peerCalling"] === name){
            return
        }
        if (callOffersRef.current.hasOwnProperty(name)){
            acceptCall(name)
            return
        }
        disconnect()
        clearConnection()


        const pc = new RTCPeerConnection(servers)
        pc.createDataChannel("keepalive") //needed, otherwise calls won't send ICE candidates on 0 tracks
        const remoteStream = new MediaStream()
        remoteCam.current.srcObject = remoteStream

        connectionInfo.current["peerCalling"] = name
        connectionInfo.current["negotiating"] = true
        connectionInfo.current["connectionState"] = "waiting"
        connectionInfo.current["pc"] = pc
        localCam.current?.srcObject.getTracks().forEach(track => {
            pc.addTrack(track, localCam.current.srcObject)
        })
        setPeerCalling(name)

        pc.ontrack = event => {
            event.streams[0].getTracks().forEach(track=>{
                remoteCam.current.srcObject.addTrack(track)
                //remote tracks don't fire "onended" events, but rather onmute events
                track.onmute = () => {
                    const newStream = new MediaStream(remoteCam.current.srcObject.getTracks().filter(t => t !== track))
                    remoteCam.current.srcObject = newStream
                }
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
                }
            })
        }
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected"){
                connectionInfo.current["negotiating"] = false
                connectionInfo.current["acceptingCandidates"] = false
                connectionInfo.current["connectionState"] = "connected"
            }
        }

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        callTimer.current = setTimeout(()=>{
            if (connectionInfo.current["connectionState"] !== "connected" || connectionInfo.current["peerCalling"] !== name ){
                disconnect()
                clearConnection()
            }
            clearTimeout(callTimer.current)
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
    }
    async function acceptCall(name) {
        if (connectionInfo.current["peerCalling"] === name || !callOffersRef.current.hasOwnProperty(name)){
            return
        }
        disconnect()
        clearConnection()

        const pc = new RTCPeerConnection(servers)
        const remoteStream = new MediaStream()
        remoteCam.current.srcObject = remoteStream

        connectionInfo.current["negotiating"] = true
        connectionInfo.current["connectionState"] = "answering"
        connectionInfo.current["pc"] = pc
        connectionInfo.current["peerCalling"] = name
        setPeerCalling(name)

        localCam.current?.srcObject.getTracks().forEach(track => {
            pc.addTrack(track, localCam.current.srcObject)
        })
        const offer = callOffersRef.current[name]
    

        pc.ontrack = event => {
            event.streams[0].getTracks().forEach(track=>{
                remoteCam.current.srcObject.addTrack(track)
                track.onmute = () => {
                    const newStream = new MediaStream(remoteCam.current.srcObject.getTracks().filter(t => t !== track))
                    remoteCam.current.srcObject = newStream
                }
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
                }
            })
        }
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected"){
                connectionInfo.current["negotiating"] = false
                connectionInfo.current["acceptingCandidates"] = false
                connectionInfo.current["connectionState"]= "connected"
            }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        connectionInfo.current["acceptingCandidates"] = true
        recollectSTUN()

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
        if (callOffersRef.current.hasOwnProperty(name)){
            delete callOffersRef.current[name]
            setCallOffers({...callOffersRef.current})
        }
    }


    function recollectSTUN(){
        const peer = connectionInfo.current["peerCalling"]
        if (!stunCandidates.current.hasOwnProperty(peer)){
            return
        }
        stunCandidates.current[peer].forEach(c => {
            connectionInfo.current["pc"].addIceCandidate(new RTCIceCandidate(c))
        })
        stunCandidates.current[peer] = []
    }

    async function requestMedia(type){
        if (!localCam.current?.srcObject){
            return
        }
        let stream
        try{
            if (type === "video"){
                stream = await navigator.mediaDevices.getUserMedia({video: true})
                const track = stream.getVideoTracks()?.[0]
                if (track){
                    setVideoAdded(true)
                    localCam.current.srcObject.addTrack(track)
                    track.onended = () => {
                        setVideoAdded(false)
                        const newStream = new MediaStream(localCam.current.srcObject.getTracks().filter(t => t !== track))
                        localCam.current.srcObject = newStream
                        renegotiate()
                    }
                    renegotiate()
                }
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: true})
                const track = stream.getAudioTracks()?.[0]
                if (track){          
                    setAudioAdded(true)
                    localCam.current.srcObject.addTrack(track)
                    track.onended = () => {
                        setAudioAdded(false)
                        const newStream = new MediaStream(localCam.current.srcObject.getTracks().filter(t => t !== track))
                        localCam.current.srcObject = newStream
                        renegotiate()
                    }
                    renegotiate()
                }
            }
        }catch(err){
            if (err.name === "NotAllowedError"){
                //later iam going to add prompt in jsx to tell user how to turn media on
                console.log("Set permissions")
                return
            }
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

    async function renegotiate() {
        if (connectionInfo.current["connectionState"] !== "connected" || connectionInfo.current["negotiating"] || !localCam.current?.srcObject){
            return
        }

        let localTracks = localCam.current.srcObject.getTracks()
        const sentTracks = connectionInfo.current["pc"].getSenders().filter(s => s.track !==  null)
        const pc = connectionInfo.current["pc"]

        const needsRenegotiation = () => {
            if (localTracks.length !== sentTracks.length){
                return true
            }
            for (const s of sentTracks){
                if (!localTracks.includes(s.track)){
                    return true

                }
            }
            return false
        }
        if (!needsRenegotiation()){
            return
        }

        for (let s of sentTracks){
            if (!localTracks.includes(s.track)){
                pc.removeTrack(s)
            }else{
                localTracks  = localTracks.filter(t => t !== s.track)
            }
        }
        localTracks.forEach(t => {
            pc.addTrack(t, localCam.current.srcObject)
        })



        connectionInfo.current["negotiating"] = true  

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        sendJsonMessage({
            "username": username,
            "origin": "peercall",
            "type": "renegotiationRequest",
            "data": {
                "peer": connectionInfo.current["peerCalling"],
                "offer": {
                    sdp: offerDescription.sdp, 
                    type: offerDescription.type
                }
            }
        })
    }

    async function externalPeercall(data){
        const {pc, peerCalling, connectionState} = connectionInfo.current

        switch (data.type){
            case "callRequest":
                //=== waiting is a pretty rare case (when users call at exact same time). I just compare usernames to settle it
                const isRaceCollision = peerCalling === data["username"] && connectionState === "waiting"
                if (isRaceCollision){
                    if (data["username"] <  username){
                        clearConnection()
                        acceptCall(data["username"])
                    }else{
                        delete callOffersRef.current[data["username"]]
                        setCallOffers({...callOffersRef.current})
                    }
                }
                break
            case "callResponse":
                const notCalling = !peerCalling || peerCalling !== data["username"]
                const answered = peerCalling === data["username"] && connectionState !== "waiting"
                if (notCalling || answered){
                    break
                }
                
                if (data.data["status"] === "accepted"){        
                    await pc.setRemoteDescription(new RTCSessionDescription(data.data["answer"]))
                    connectionInfo.current["acceptingCandidates"] = true
                    recollectSTUN()
                }else{
                    clearConnection()
                }
                break
            case "answerCall":
                acceptCall(data["peer"])
                break
            case "renegotiationRequest":
                if (connectionState !== "connected" || peerCalling !== data["username"]){
                    break
                }

                await pc.setRemoteDescription(data.data["offer"])
                const answerDescription = await pc.createAnswer()
                await pc.setLocalDescription(answerDescription)
                
                recollectSTUN()

                sendJsonMessage({
                    "origin": "peercall",
                    "username": username,
                    "type": "renegotiationResponse",
                    "data": {
                        "peer": peerCalling,
                        "answer": {
                            type: answerDescription.type,
                            sdp: answerDescription.sdp 
                        }
                    }
                })
                break
            case "renegotiationResponse":
                if (connectionState !== "connected" || peerCalling !== data["username"]){
                    break
                }
                await pc.setRemoteDescription(data.data["answer"])
                connectionInfo.current["negotiating"] = false
                recollectSTUN()

                break
            case "stunCandidate":
                if (peerCalling === data["username"] && connectionInfo.current["acceptingCandidates"]){
                    pc.addIceCandidate(new RTCIceCandidate(data.data["candidate"]))
                    delete stunCandidates.current[data["username"]]
                }
                break
            case "disconnect":
                if (peerCalling === data["username"]){
                    clearConnection()
                }
                break
        } 
    }

    return(
        <div className={`${styles.peercallPage} ${darkMode ? styles.darkMode : ""}`}>
            <h1 className={styles.title}>
                <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/videochat?18" : "/light/videochat?18"} type="once" speed={4}/> 
            </h1>
            <h2 className={styles.smallTitle}>
                Peer Call
            </h2>
            {roomID &&
            <div className={styles.mainContent}>
                <section className={styles.streams}>
                    <section className={styles.peerStream}>
                        <section>
                            {peerCalling && <h3>{peerCalling}</h3>} 
                            <video ref={remoteCam} autoPlay playsInline></video>
                        </section>
                    </section>
                    <section className={styles.myStream}>
                        <video ref={localCam} playsInline autoPlay muted></video>
                        {
                            videoAdded
                            ?
                                <button onClick={()=>toggleMedia("video")}><img src={ showVideo ?  '/hidevideo_icon.png' : '/showvideo_icon.png'} alt="toggle video"></img></button>
                            :
                                <button onClick={()=>requestMedia("video")}><img src='/showvideo_icon.png' alt="show video"></img></button>
                        }
                        {
                            audioAdded
                            ?
                                <button onClick={()=>toggleMedia("audio")}><img src={ showAudio ?  '/muted_icon.png' : '/unmuted_icon.png'} alt="toggle audio"></img></button>
                            :
                                <button onClick={()=>requestMedia("audio")}><img src='/unmuted_icon.png' alt="show audio"></img></button>
                        }
                    </section>
                    <section className={styles.disconnect}>
                        {
                            peerCalling && <button onClick={()=>{disconnect(); clearConnection()}}>End Call</button>            
                        }
                    </section>
                </section>
                <section className={styles.activePeers} onClick={()=>setToggleActivePeers(prev=>!prev)}>
                    <h2>Currently Active Members</h2>
                    <hr />
                    {
                        toggleActivePeers &&
                        <>
                            {Object.keys(userStates).length <= 1 && <section>There are no active members</section>}
                            <ul>
                                {Object.keys(userStates).map((name)=>{
                                    if (name === username){return null}
                                    return <li key={name}><button onClick={(e)=>{e.stopPropagation();callPeer(name);}}>{name}</button></li>
                                })}
                            </ul>
                        </>
                    }
                </section>
            </div>
            }

        </div>
    )
}
export default memo(PeerCall)