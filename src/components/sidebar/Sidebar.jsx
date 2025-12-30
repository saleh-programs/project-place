// "use client"
import { memo, useContext, useRef } from "react"
import { useRouter } from "next/navigation"

import { AppearanceContext, PeersContext, UserContext, WebSocketContext } from "src/providers/contexts"
import AccountHub from "src/components/sidebar/AccountHub"
import BallContainer from "src/components/BallContainer"
import styles from "styles/components/Sidebar.module.css"


function Sidebar(){
  const {username} = useContext(UserContext)
  const {darkMode} = useContext(AppearanceContext)
  const {userStates} = useContext(PeersContext)
  const {sendJsonMessage} = useContext(WebSocketContext)


  const router = useRouter()
  const sidebarRef = useRef(null)

  function startDrag(e){
    e.preventDefault()
    const imgOffset = e.clientX - e.currentTarget.getBoundingClientRect().left

    const collapseBoundary = 50
    const leftBoundary = 200
    const rightBoundary = 800
    let done;

    document.body.style.userSelect = "none" 
    function onMove(e){
      if (done){ 
        return
      }
      done = true
      requestAnimationFrame(()=>{
        sidebarRef.current.style.width = `${e.clientX - imgOffset}px`
        sidebarRef.current.style.display = ""
        
        if (e.clientX < collapseBoundary){
          sidebarRef.current.style.display = "none"
        }else if (e.clientX < leftBoundary){
          sidebarRef.current.style.width = `${leftBoundary}px`
        }else if (e.clientX > rightBoundary){
          sidebarRef.current.style.width = `${rightBoundary}px`
        }

        done = false
      })
    }
    function onRelease(){
      document.body.style.userSelect = "" 
      document.removeEventListener("mousemove",onMove)
      document.removeEventListener("mouseup",onRelease)
    }
    document.addEventListener("mousemove",onMove)
    document.addEventListener("mouseup",onRelease)
  }

  const peerLocations = {
    "chat": [],
    "whiteboard":[],
    "videochat": []
  }
  Object.keys(userStates).forEach(user =>{
    peerLocations[userStates[user]["location"]].push({"username":user, "avatar": userStates[user]["avatar"]})
  })
  return(
    <div className={`${styles.sidePanel} ${darkMode ? styles.darkMode : ""}`}>
      <section className={styles.sidePanelMain} ref={sidebarRef}>
        <section className={styles.features}>
          <button onClick={()=>{
            router.push("/platform/chat")
              sendJsonMessage({
                "origin": "user",
                "username": username,
                "type": "userInfo",
                "data": {"location": "chat"}
              })
            }}>
            Chat
            {peerLocations["chat"].length !== 0 && 
            <BallContainer userList={peerLocations["chat"]} sidebarRef={sidebarRef}/>}
          </button>
          <button onClick={()=>{
            router.push("/platform/whiteboard")
            sendJsonMessage({
              "origin": "user",
              "username": username,
              "type": "userInfo",
              "data": {"location": "whiteboard"}
            })
            }}>
            Whiteboard
            {peerLocations["whiteboard"].length !== 0 &&
            <BallContainer userList={peerLocations["whiteboard"]} sidebarRef={sidebarRef}/>}
          </button>
          <button onClick={()=>{
            router.push("/platform/videochat")
            sendJsonMessage({
              "origin": "user",
              "username": username,
              "type": "userInfo",
              "data": {"location": "videochat"}
            })
            }}>
            Video Chat
            {peerLocations["videochat"].length !== 0 &&
            <BallContainer userList={peerLocations["videochat"]} sidebarRef={sidebarRef}/>
            }
          </button>
        </section>
        <AccountHub/>
      </section>
      <section className={styles.sidePanelHandle}>
        <img src="/sb_handle.png" alt="smth" onMouseDown={startDrag}/>
      </section>
    </div>  
      )
} 

export default memo(Sidebar)