"use client"
import { useContext } from "react"
import { useRouter } from "next/navigation"

import { UserContext, PeersContext,AppearanceContext, RoomContext, VideoChatContext, WebSocketContext} from "src/providers/contexts"
import styles from "styles/components/MainDisplay.module.css"
import Sidebar from "src/components/sidebar/Sidebar"


function MainDisplay({children}){
  const {username} = useContext(UserContext)
  const {darkMode} = useContext(AppearanceContext)
  const {roomID, roomName} = useContext(RoomContext)
  const {callOffers, setCallOffers, callOffersRef} = useContext(VideoChatContext)
  const {sendJsonMessage, exitRoom} = useContext(WebSocketContext)

  const router = useRouter()

  function rejectCall(peerName) {
      sendJsonMessage({
      "username": username, 
      "origin": "peercall",
      "type": "callResponse", 
      "data": {"status": "rejected", "peer": peerName}
      })
      delete callOffersRef.current[peerName]
      setCallOffers({...callOffersRef.current})
  }

  return(
      <div className={styles.columnWrapper}>
        {roomID && 
          <h1 className={darkMode ? styles.darkMode : ""}>
            <span>{roomID}</span>
            <span>"{roomName}"</span>
            <button onClick={exitRoom}>Leave Room</button>
          </h1>
        }
        <div className={styles.siteWrapper}>
          <Sidebar/>
          <div className={styles.pageContainer} style={roomID === "" ? {boxShadow: "10px 10px 90px black inset",opacity: ".5"} : {}}>
            {children}
            {Object.keys(callOffers).map((name) => {
              return (
              <div key={name} className={styles.callNotification}>
                New call offer from <strong>{name}</strong>!
                <button onClick={()=>router.push(`/platform/videochat/peercall?peer=${encodeURI(name)}`)}>Accept</button>
                <button onClick={()=>rejectCall(name)}>Reject</button>
              </div>
              )
            })}
          </div>
        </div>
      </div>
  ) 
}


export default MainDisplay