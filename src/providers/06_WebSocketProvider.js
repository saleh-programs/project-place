import * as mediasoupClient from "mediasoup-client"
import { useContext, useMemo, useRef, useState } from "react"
import useWebSocket from "react-use-websocket"

import { WebSocketContext, UserContext, RoomContext, PeersContext, ChatContext, WhiteboardContext, VideoChatContext } from "./contexts"

const NEXT_PUBLIC_WS_BACKEND_URL = process.env.NEXT_PUBLIC_WS_BACKEND_URL

function WebSocketProvider({children}){  
    const {username} = useContext(UserContext)
    const {setUserStates, updateUserStates} = useContext(PeersContext)
    const {roomID, roomIDRef, setRoomID, setRoomName, siteHistoryRef, externalChatRef, externalGroupcallRef, externalPeercallRef, externalWhiteboardRef} = useContext(RoomContext)
    const {messagesRef} = useContext(ChatContext)
    const {reconstructCanvas} = useContext(WhiteboardContext)
    const {callOffersRef, setCallOffers, device, stunCandidates} = useContext(VideoChatContext)

    const connectedRoomRef = useRef(null)
    const {sendJsonMessage} = useWebSocket(NEXT_PUBLIC_WS_BACKEND_URL, {
        queryParams:{
            "username": username,
            "roomID": roomID
        }, 
        onMessage:(event)=>{
            if (event.data instanceof Blob){
            reconstructCanvas(event.data)
            return
            }

            const data = JSON.parse(event.data)
            switch (data.origin){
            case "user":
                updateUserStates(data)
                break
            case "chat":
                if (data.type === "chatHistory"){
                messagesRef.current = data.data
                siteHistoryRef.current["chatHistoryReceived"] = true;
                }else if (data.type === "newMessage"){ 
                messagesRef.current.push(data.data)
                }else if(data.type === "edit"){
                messagesRef.current = messagesRef.current.map(msg => {
                    if (msg["metadata"]["messageID"] === data.data["messageID"]){
                    return {
                        ...msg,
                        "content": data.data["content"],
                        "metadata": {...msg["metadata"], "edited": true}
                    }
                    }
                    return msg
                })
                }else if (data.type === "delete"){
                messagesRef.current = messagesRef.current.filter(msg => {
                    return msg["metadata"]["messageID"] !== data.data["messageID"]
                })
                }
                externalChatRef.current(data)
                break
            case "whiteboard":
                externalWhiteboardRef.current(data)
                break
            case "groupcall":
                if (data.type === "setup"){
                const {routerRtpCapabilities} = data.data
                device.current = new mediasoupClient.Device()
                device.current.load({routerRtpCapabilities})
                break
                }
                externalGroupcallRef.current(data)
                break
            case "peercall":
                if (data.type === "callRequest"){
                callOffersRef.current[data["username"]] = data.data["offer"]
                setCallOffers({...callOffersRef.current})
                }
                if (data.type === "disconnect" && callOffersRef.current.hasOwnProperty(data["username"])){
                delete callOffersRef.current[data["username"]]
                setCallOffers({...callOffersRef.current})

                if (stunCandidates.current.hasOwnProperty(data["username"])){
                    delete stunCandidates.current[data["username"]]
                }
                }

                if (data.type === "stunCandidate"){
                    if (!stunCandidates.current.hasOwnProperty(data["username"])){
                    stunCandidates.current[data["username"]] = [data.data["candidate"]]
                    }else{
                    stunCandidates.current[data["username"]].push(data.data["candidate"])
                    }
                }
                externalPeercallRef.current(data)
                break
            }
        },
        onOpen: () => {
            connectedRoomRef.current = roomID
        },
        shouldReconnect: () => {
            if (roomIDRef.current === connectedRoomRef.current){
                exitRoom()
            }
            return false
        }
    }, roomID !== "")


    function exitRoom(){
        setRoomID("")
        setRoomName("")
        setUserStates({})
        connectedRoomRef.current = null
    }
    

    const value = useMemo(() => ({sendJsonMessage, exitRoom}), [sendJsonMessage])

    return(
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    )
}
export default WebSocketProvider