import * as mediasoupClient from "mediasoup-client"
import { useContext, useMemo } from "react"
import useWebSocket from "react-use-websocket"

import { WebSocketContext, UserContext, RoomContext, PeersContext, ChatContext, WhiteboardContext, VideoChatContext } from "./contexts"



function WebSocketProvider({children}){  
    const {username} = useContext(UserContext)
    const {setUserStates, updateUserStates} = useContext(PeersContext)
    const {roomID, setRoomID, setRoomName, siteHistoryRef, externalChatRef, externalGroupcallRef, externalPeercallRef, externalWhiteboardRef} = useContext(RoomContext)
    const {messagesRef} = useContext(ChatContext)
    const {reconstructCanvas} = useContext(WhiteboardContext)
    const {callOffersRef, setCallOffers, device, stunCandidates} = useContext(VideoChatContext)

    const {sendJsonMessage} = useWebSocket("ws://localhost:8000",{
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
    onOpen: () => {console.log("connected")},
    shouldReconnect: () => {
        console.log("disconnected")
        setRoomID("")
        setRoomName("")
        setUserStates({})
        return true
    }
    }, roomID !== "")


    const value = useMemo(() => ({sendJsonMessage}), [sendJsonMessage])

    return(
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    )
}
export default WebSocketProvider