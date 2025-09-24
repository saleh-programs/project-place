"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useContext } from "react"
import ThemeContext from "src/assets/ThemeContext"

function PeerCall(){
    const { externalPeercallRef } = useContext(ThemeContext)
    const searchParams = useSearchParams()

    const servers = {
        iceServers: [{
        urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"]
        }],
        iceCandidatePoolSize: 10,
    }
    const p2pInfo = useRef({ 
        pc: null,
        localStream: null,
        remoteStream: null
    })
    const [callOffers, setCallOffers] = useState({})
    const p2pLocal = useRef(null)
    const p2pRemote = useRef(null)

    useEffect(()=>{
        externalPeercallRef.current = externalPeercall
        p2pInfo.current["pc"] = new RTCPeerConnection(servers)
        return ()=>{
            externalPeercallRef.current = (param1) => {}
        }
    },[])

    //P2P logic now..
    async function p2pSetup(){
        const pc = p2pInfo.current["pc"]
        const localStream =  await navigator.mediaDevices.getUserMedia({video:true,audio:true})
        const remoteStream = new MediaStream()
        p2pInfo.current["localStream"] = localStream
        p2pInfo.current["remoteStream"] = remoteStream

        localStream.getTracks().forEach(track=>{
        pc.addTrack(track, localStream)
        })
        pc.ontrack = event => {
        event.streams[0].getTracks().forEach(track=>{
        remoteStream.addTrack(track)
        })
        }
        p2pLocal.current.srcObject = localStream
        p2pRemote.current.srcObject = remoteStream
    }
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
    }

    async function callPeer(name) {
        const pc = p2pInfo.current["pc"]
        pc.onicecandidate = event => {
        if (!event.candidate){
            return 
        }
        const data = {
            "origin": "peercall",
            "type": "stunCandidate",
            "username": username,
            "data": {
            "candidate": event.candidate.toJSON(),
            "peer": name
            }
        }
        sendJsonMessage(data)
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
    async function externalPeercall(data){
        const info = deviceInfo.current
        switch (data.type){
        case "sendConnect":
            info["sendTransport"]["connectCallback"]()
            break
        case "sendProduce":
            info["sendTransport"]["produceCallback"]({id: data.data})

            // Now we can GIVE this media.
            sendJsonMessage({
            "origin": "peercall",
            "username": username,
            "type": "givePeers",
            "data": data.data
            })
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
        case "disconnect":
            setStreams(prev => {
            const newStreams = {...prev}
            consumersRef.current[data.data["uuid"]].forEach(consumer=>{
                consumer.close()
            })
            delete newStreams[data.data["uuid"]]
            return newStreams
            })
            break
        case "callRequest":
            console.log("got offer")
            setCallOffers(prev => {
            return {...prev, [data["username"]]: data.data["offer"]}
            })
            break
        case "callResponse":
            if (data.data["status"] === "accepted"){
            p2pInfo.current["pc"].setRemoteDescription(new RTCSessionDescription(data.data["answer"]))
            }else{
            //i dont wanna talk to you bryan
            p2pInfo.current["pc"].onicecandidate = null
            console.log("rejected at least")
            }
            break
        case "stunCandidate":
            if (p2pInfo.current["pc"].currentRemoteDescription){
            p2pInfo.current["pc"].addIceCandidate(new RTCIceCandidate(data.data["candidate"]))
            }
        }
    }
    return(
        <div>
            hello to peer {searchParams.get("peer")}!
        </div>
    )
}
export default PeerCall