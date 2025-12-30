"use client"
import { memo, useContext, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { UserContext, AppearanceContext, RoomContext, VideoChatContext, WebSocketContext, PeersContext } from "src/providers/contexts"
import Animation from "src/components/Animation" 
import styles from "styles/platform/PeerCall.module.css"

function PeerCall(){
    const {username} = useContext(UserContext)
    const {darkMode} = useContext(AppearanceContext)
    const {externalPeercallRef} = useContext(RoomContext)
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
        localStream: null,
        remoteStream: null,
        negotiating: false,
        acceptingCandidates: false
    })
    const localCam = useRef(null)
    const remoteCam = useRef(null)

    const connectionStateRef = useRef("disconnected")
    const callTimer = useRef(null)

    const peerCallingRef = useRef(null)
    const [peerCalling, setPeerCalling] = useState(null)

    const [videoAdded, setVideoAdded] = useState(false)
    const [audioAdded, setAudioAdded] = useState(false)

    const [showVideo, setShowVideo] = useState(true)
    const [showAudio, setShowAudio] = useState(true)

    const [toggleActivePeers, setToggleActivePeers] = useState(true)
    


    useEffect(()=>{
        externalPeercallRef.current = externalPeercall
        window.addEventListener("beforeunload", disconnect)

        const setup = async ()=>{
            await startWebcam()
            disconnect()

            //to renegotiate if a producer disconnects
            setInterval(()=>{
                if (!connectionInfo.current["pc"] || connectionInfo.current["pc"].connectionState === "closed"){
                    return
                }
                const badTracks = []
                connectionInfo.current["pc"].getSenders().forEach(s => {
                    if (s.track && s.track.readyState === "ended"){
                        badTracks.push(s)
                    }
                })
                badTracks.forEach(s => {
                    if (s.track.kind === "video"){
                        setVideoAdded(false)
                        localCam.current.srcObject.removeTrack(s.track)
                    }
                    if (s.track.kind === "audio"){
                        setAudioAdded(false)
                        localCam.current.srcObject.removeTrack(s.track)
                    }
                    connectionInfo.current["pc"].removeTrack(s)
                })
                badTracks.length > 0 && renegotiate()
            },1000)
            
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
        console.log("Current Peer: ", peerCallingRef.current)
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
        if (peerCallingRef.current === name){
            return
        }
        if (callOffersRef.current.hasOwnProperty(name)){
            acceptCall(name)
            return
        }
        disconnect()
        
        peerCallingRef.current = name
        setPeerCalling(name)

        connectionInfo.current["negotiating"] = true
        connectionStateRef.current = "waiting"

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
                track.onmute = (e) => {
                    console.log("peer's muted")
                    remoteStream.removeTrack(track)
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
                connectionStateRef.current = "connected"
            }
        }

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        callTimer.current = setTimeout(()=>{
            if (connectionStateRef.current !== "connected" || peerCallingRef.current !== name ){
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
    }

    function clearConnection(){
        connectionInfo.current["pc"]?.close()
        connectionInfo.current["negotiating"] = false
        connectionInfo.current["acceptingCandidates"] = false

        connectionStateRef.current = "disconnected"
        peerCallingRef.current = null
        setPeerCalling(null)
        if (remoteCam.current){
            remoteCam.current.srcObject = null
        }
        

        callTimer.current && clearTimeout(callTimer.current)

        // router.push("/platform/videochat/peercall")
    }

    function disconnect(){
        if (peerCallingRef.current){
            sendJsonMessage({
                "origin": "peercall",
                "username": username,
                "type": "disconnect",
                "data": {"peer": peerCallingRef.current}
            })
            if (stunCandidates.current.hasOwnProperty(peerCallingRef.current)){
                delete stunCandidates.current[peerCallingRef.current]
            }
        }
        clearConnection()
    }

    async function acceptCall(name) {
        if (peerCallingRef.current === name || !callOffersRef.current.hasOwnProperty(name)){
            return
        }
        disconnect()

        connectionInfo.current["negotiating"] = true

        connectionStateRef.current = "answering"
        peerCallingRef.current = name
        setPeerCalling(name)

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
                connectionInfo.current["remoteStream"].addTrack(track)
                track.onmute = (e) => {
                    remoteStream.removeTrack(track)
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
                connectionStateRef.current = "connected"
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
        if (!peerCallingRef.current.hasOwnProperty(peerCallingRef.current)){
            return
        }
        stunCandidates.current[peerCallingRef.current].forEach(c => {
            connectionInfo.current["pc"].addIceCandidate(new RTCIceCandidate(c))
        })
        stunCandidates.current[peerCallingRef.current] = []
    }

    async function requestMedia(type){
        let stream
        try{
            if (type === "video"){
                stream = await navigator.mediaDevices.getUserMedia({video: true})
                setVideoAdded(true) 
                const videoTrack = stream.getVideoTracks()[0]
                localCam.current.srcObject.addTrack(videoTrack)

                connectionInfo.current["pc"].addTrack(videoTrack, connectionInfo.current["localStream"])
                renegotiate()
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: true})
                
                setAudioAdded(true)
                const audioTrack = stream.getAudioTracks()[0]
                localCam.current.srcObject.addTrack(audioTrack)

                connectionInfo.current["pc"].addTrack(audioTrack, connectionInfo.current["localStream"])
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
    async function renegotiate() {
        if (connectionStateRef.current !== "connected" || connectionInfo.current["negotiating"]){
            return
        }
        const pc = connectionInfo.current["pc"]
        connectionInfo.current["negotiating"] = true

        const offerDescription = await pc.createOffer()
        await pc.setLocalDescription(offerDescription)

        sendJsonMessage({
            "username": username,
            "origin": "peercall",
            "type": "renegotiationRequest",
            "data": {
                "peer": peerCallingRef.current,
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
                const isRaceCollision = peerCallingRef.current === data["username"] && connectionStateRef.current === "waiting"
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
                const notCalling = !peerCallingRef.current || peerCallingRef.current !== data["username"]
                const answered = peerCallingRef.current === data["username"] && connectionStateRef.current !== "waiting"
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
            case "renegotiationRequest":
                if (connectionStateRef.current !== "connected" || peerCallingRef.current !== data["username"]){
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
                        "peer": peerCallingRef.current,
                        "answer": {
                            type: answerDescription.type,
                            sdp: answerDescription.sdp 
                        }
                    }
                })
                break
            case "renegotiationResponse":
                if (connectionStateRef.current !== "connected" || peerCallingRef.current !== data["username"]){
                    break
                }
                connectionInfo.current["remoteStream"].getTracks().forEach(t => {
                    if (t.readyState === "ended"){
                        connectionInfo.current["remoteStream"].removeTrack(t)
                    }
                })
                await pc.setRemoteDescription(data.data["answer"])
                connectionInfo.current["negotiating"] = false
                recollectSTUN()

                break
            case "stunCandidate":
                if (peerCallingRef.current === data["username"] && connectionInfo.current["acceptingCandidates"]){
                    pc.addIceCandidate(new RTCIceCandidate(data.data["candidate"]))
                    delete stunCandidates.current[data["username"]]
                }
                break
            case "disconnect":
                if (peerCallingRef.current === data["username"]){
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
                            peerCalling && <button onClick={disconnect}>End Call</button>            
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

        </div>
    )
}
export default memo(PeerCall)