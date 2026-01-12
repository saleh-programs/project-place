"use client"
import { memo, useContext,useRef, useState, useEffect } from "react"

import { UserContext, AppearanceContext, RoomContext, VideoChatContext, WebSocketContext } from "src/providers/contexts"
import styles from "styles/platform/GroupCall.module.css"
import Animation from "src/components/Animation"

function GroupCall(){
    const {username} = useContext(UserContext)
    const {darkMode} = useContext(AppearanceContext)
    const {roomID, externalGroupcallRef} = useContext(RoomContext)
    const {device} = useContext(VideoChatContext)
    const {sendJsonMessage} = useContext(WebSocketContext)

    const connectionInfo = useRef({
        sendTransport:{
            ref: null,
            connectCallback: null,
            produceCallbacks: {}
        },
        recvTransport: {
            ref: null,
            connectCallback: null 
        }, 
        consumers: {},
        producers: [],
        connectionState: "disconnected",
    })

    const [isJoined, setIsJoined] = useState(false)
    const joinTimerRef = useRef(null)

    const localCam = useRef(null)
    const [streams, setStreams] = useState({})
    
    const [videoAdded, setVideoAdded] = useState(false)
    const [audioAdded, setAudioAdded] = useState(false)

    const [showVideo, setShowVideo] = useState(true)
    const [showAudio, setShowAudio] = useState(true)

    useEffect(()=>{
        externalGroupcallRef.current = externalGroupcall
        
        startWebcam()

        const stream = localCam.current?.srcObject
        window.addEventListener("beforeunload", disconnect)
        return ()=>{
            externalGroupcallRef.current = (param1) => {}
            disconnect()
            clearConnection()
            stream?.getTracks().forEach(t => t.stop())
            window.removeEventListener("beforeunload",disconnect)
        }
    },[roomID])

    function clearConnection(){
        Object.values(connectionInfo.current["consumers"]).forEach(consumerList => {
            consumerList.forEach(c => c.close())
        })
        connectionInfo.current["producers"].forEach(p => p.close())

        connectionInfo.current["sendTransport"]["ref"]?.close()
        connectionInfo.current["recvTransport"]["ref"]?.close()

        connectionInfo.current = {
            "sendTransport":{
                "ref": null,
                "connectCallback": null,
                "produceCallbacks": {}
            },
            "recvTransport": {
                "ref": null,
                "connectCallback": null
            },
            "producers": [],
            "consumers": {},
            "connectionState": "disconnected"
        }
        setStreams({})        
        setIsJoined(false)
        startWebcam()

    }
    function disconnect(){
        if (connectionInfo.current["connectionState"] !== "disconnected"){
            sendJsonMessage({
                "username": username,
                "origin": "groupcall",
                "type": "disconnect",
            })
        }
    }

    async function startWebcam(){
        if (!localCam.current){
            return
        }
        if (localCam.current?.srcObject){
            const tracks = localCam.current.srcObject.getTracks()
            for (let t of tracks){
                if (t.readyState !== "ended") return
                t.stop()
                localCam.current.srcObject.removeTrack(t)
            }
        }else{
            localCam.current.srcObject = new MediaStream()
        }

        await requestMedia("video")
        await requestMedia("audio")
    }


    async function joinGroupCall() {
        if (!device.current || connectionInfo.current["connectionState"] !== "disconnected"){
            return
        }
        disconnect()
        clearConnection()

        connectionInfo.current["connectionState"] = "connecting"
        sendJsonMessage({
            "username": username,
            "origin": "groupcall",
            "type": "userJoined",
            "data": {rtpCapabilities: device.current.rtpCapabilities}
        })

        sendJsonMessage({
            "username": username,
            "origin": "groupcall",
            "type": "transportParams"
        })
        setIsJoined(true)
    }


    async function createTransports({sendParams, recvParams}) {
        const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

        //set up send transport
        const sendTransport = device.current.createSendTransport({...sendParams, iceServers})
        connectionInfo.current["sendTransport"]["ref"] = sendTransport
        sendTransport.on("connect", ({dtlsParameters}, callback)=>{
            sendJsonMessage({
                "username": username,
                "origin": "groupcall",
                "type": "sendConnect",
                "data": {dtlsParameters}
            })
            connectionInfo.current["sendTransport"]["connectCallback"] = callback
        })
        sendTransport.on("produce", ({kind, rtpParameters, appData}, callback)=>{
            const storedID = Date.now()
            sendJsonMessage({
                "username": username,
                "origin": "groupcall",
                "type": "sendProduce",
                "data": { 
                    storedID,
                    kind,
                    rtpParameters,
                    appData
                }
            })
            connectionInfo.current["sendTransport"]["produceCallbacks"][storedID] = callback
        })

        //set up recv transport
        const recvTransport = device.current.createRecvTransport({...recvParams, iceServers})
        connectionInfo.current["recvTransport"]["ref"] = recvTransport

        recvTransport.on("connect", ({dtlsParameters}, callback) => {
            sendJsonMessage({
                "username": username,
                "origin": "groupcall",
                "type": "recvConnect",
                "data": dtlsParameters
            })
            connectionInfo.current["recvTransport"]["connectCallback"] = callback
        })

        sendJsonMessage({
            "username": username, 
            "origin": "groupcall",
            "type": "receivePeers"
        })

        connectionInfo.current["connectionState"] = "connected"

        ////we now have the ability to send media, so we create producers
        localCam.current.srcObject.getTracks().forEach(track => {
            addProducer(track)
        })
    }  
    async function addProducer(track) {
        if (connectionInfo.current["connectionState"] !== "connected"){
            return
        }
        let produceOptions = {track}
        if (track.kind === "video"){
            produceOptions = {
                ...produceOptions,
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
        }
        connectionInfo.current["producers"].push(await connectionInfo.current["sendTransport"]["ref"].produce(produceOptions))
    }
    function removeProducer(track) {
        if (connectionInfo.current["connectionState"] !== "connected"){
            return
        }
        for (let producer of connectionInfo.current["producers"]){
            if (producer.track === track){
                producer.close()
                sendJsonMessage({
                    "origin": 'groupcall',
                    "username": username,
                    "type": "closeProduce",
                    "data": {"id": producer.id}
                })
            }
        }
        
        connectionInfo.current["producers"] = connectionInfo.current["producers"].filter(p => p.track !== track)
    }


    async function addConsumer({id, producerId, kind, rtpParameters, peerName}){
        if (!(connectionInfo.current["consumers"]).hasOwnProperty(peerName)){
            return
        }

        const consumer = await connectionInfo.current["recvTransport"]["ref"].consume({
            id,
            producerId,
            kind,
            rtpParameters
        })
        connectionInfo.current["consumers"][peerName].push(consumer)
        setStreams(prev => {
            const newStreams = {...prev}
            const consumerExists = newStreams[peerName]?.getTracks().some(t => t === consumer.track)
            if (consumerExists) {
                return prev
            }
            newStreams[peerName].addTrack(consumer.track)
            return newStreams
        })


        sendJsonMessage({
            "username": username,
            "origin": "groupcall",
            "type": "unpauseConsumer",
            "data": id
        })
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
                        removeProducer(track)
                    }
                    addProducer(track)
                }
            }
            if (type === "audio"){
                stream = await navigator.mediaDevices.getUserMedia({audio: {"echoCancellation": true, "noiseSuppression": true, "autoGainControl": true}})
                const track = stream.getAudioTracks()?.[0]
                if (track){
                    setAudioAdded(true)
                    localCam.current.srcObject.addTrack(track)
                    track.onended = () => {
                        setAudioAdded(false)
                        const newStream = new MediaStream(localCam.current.srcObject.getTracks().filter(t => t !== track))
                        localCam.current.srcObject = newStream
                        removeProducer(track)
                    }
                    addProducer(track)
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
    function toggleJoin(){
        if (joinTimerRef.current){
            return
        }
        if (isJoined){
            disconnect()
            clearConnection()
        }else{
            joinGroupCall()
        }
        joinTimerRef.current = setTimeout(() => {
            joinTimerRef.current = null
        },300)
    }

    async function externalGroupcall(data){
        if (connectionInfo.current["connectionState"] === "disconnected"){
            return
        }
        switch (data.type){
            case "getParticipants":
                const newStreams = {}
                for (let user of data.data){
                    connectionInfo.current["consumers"][user] = []
                    newStreams[user] =  new MediaStream()
                }
                setStreams(newStreams)
                break
            case "transportParams":
                createTransports(data.data)
                break
            case "sendConnect":
                connectionInfo.current["sendTransport"]["connectCallback"]?.()
                break
            case "sendProduce":
                const {storedID, id} = data.data
                connectionInfo.current["sendTransport"]["produceCallbacks"][storedID]?.({id})
                delete connectionInfo.current["sendTransport"]["produceCallbacks"][storedID]
                // Now we can GIVE this media.
                sendJsonMessage({
                    "origin": "groupcall",
                    "username": username,
                    "type": "givePeers",
                    "data": id
                })
                break
            case "closeConsume":{
                const peerName = data["username"]
                const {producerID} = data.data
                const consumer = Object.values(connectionInfo.current["consumers"]?.[peerName])?.find(c => c.producerId === producerID)
                if (consumer){
                    if (connectionInfo.current["consumers"]?.[peerName]){
                        connectionInfo.current["consumers"][peerName] = connectionInfo.current["consumers"][peerName].filter(c => c !==consumer)
                        setStreams(prev => {
                            const newStreams = {...prev}
                            const peerTracks = newStreams[peerName]?.getTracks() 
                            const consumerExists = peerTracks?.some(t => t === consumer.track)
                            if (consumerExists) {
                                const newStream = new MediaStream(peerTracks.filter(t => t !== consumer.track))
                                newStreams[peerName] = newStream
                                return newStreams
                            }
                            return prev
                        })
                    }
                    consumer.close()
                }
                break
            }
            case "recvConnect":
                connectionInfo.current["recvTransport"]["connectCallback"]?.()
                break
            case "addConsumer":
                addConsumer(data.data)
                break
            case "userJoined":
                connectionInfo.current["consumers"][data["username"]] = []
                setStreams(prev => {
                    return {...prev, [data["username"]]: new MediaStream()}
                })
                break
            case "disconnect":
                connectionInfo.current["consumers"][data["username"]].forEach(consumer=>{
                    consumer.close()
                })
                delete connectionInfo.current["consumers"][data["username"]]
                setStreams(prev => {
                    const newStreams = {...prev}
                    delete newStreams[data["username"]]
                    return newStreams
                })
                break
        }
    }
    
    return(
        <div className={`${styles.groupcallPage} ${darkMode ? styles.darkMode : ""}`}>
            <h1 className={styles.title}>
                <Animation key={darkMode ? "dark" : "light"} path={darkMode ? "/dark/videochat?18" : "/light/videochat?18"} type="once" speed={4}/> 
            </h1>
            <h2 className={styles.smallTitle}>
                Group Call
            </h2>
            {roomID &&
            <div className={styles.mainContent}>
                <section className={styles.streams}>
                    <section className={styles.otherStreams}>
                        {Object.entries(streams).sort(([a],[b])=>a.localeCompare(b)).map(([peerID, stream])=>{
                            const assignStream = (elem) => {
                                if (elem && elem.srcObject !== stream){
                                    elem.srcObject = stream 
                                }
                        }
                            
                            return <section key={peerID} ><h3>{peerID}</h3><video ref={assignStream} autoPlay playsInline></video></section>
                        })}
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
                    <section className={styles.joinOrExit}>
                        {
                            isJoined 
                            ?
                                <button className={`${styles.joinOrExit} ${styles.joined}`}  onClick={toggleJoin}>Exit Group Call</button>
                            :
                                <button className={`${styles.joinOrExit} ${styles.exited}`} onClick={toggleJoin}>Join Group Call</button>
                                
                        }
                    </section>
                </section>
            </div>
            }
        </div>
    )
}
export default memo(GroupCall)