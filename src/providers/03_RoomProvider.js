import { useMemo, useState, useRef, useEffect, useContext } from "react"
import { RoomContext, UserContext } from "./contexts"

function RoomProvider({children}){  
    const {userInfo} = useContext(UserContext)
    const [roomID, setRoomID] = useState(()=>userInfo["storedRoomID"] ? userInfo["storedRoomID"] : "")
    const [roomName, setRoomName] = useState(()=>userInfo["storedRoomName"] ? userInfo["storedRoomName"] : "")
    const roomIDRef = useRef("")

    const externalChatRef = useRef((param1)=>{})
    const externalWhiteboardRef = useRef((param1)=>{})
    const externalGroupcallRef = useRef((param1)=>{})
    const externalPeercallRef = useRef((param1)=>{})


    const siteHistoryRef = useRef({
        "chatHistoryReceived": false,
        "canvasHistoryReceived": false,
        "userHistoryReceived": false
    })

    useEffect(()=>{
        roomIDRef.current = roomID
        document.cookie = `roomID=${roomID}; path=/`
        document.cookie = `roomName=${roomName}; path=/`
    },[roomID])


    const value = useMemo(() => ({
        roomID, setRoomID, roomName, setRoomName, roomIDRef, siteHistoryRef,
        externalChatRef, externalWhiteboardRef, externalGroupcallRef, externalPeercallRef
    }), [roomID, roomName])

    return(
        <RoomContext.Provider value={value}>
            {children}
        </RoomContext.Provider>
    )
}
export default RoomProvider