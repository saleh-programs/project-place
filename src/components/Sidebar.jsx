// "use client"
import styles from "styles/components/Sidebar.module.css"
import { useRouter } from "next/navigation"

import AccountHub from "src/components/AccountHub"
import { useContext, useRef } from "react"
import ThemeContext from "src/assets/ThemeContext"
import BallContainer from "./BallContainer"

function Sidebar({userStates, sendJsonMessage, username}){
  const router = useRouter()
  const sideBarRef = useRef(null)

  function startDrag(e){
    e.preventDefault()
    const imgOffset = e.clientX - e.currentTarget.getBoundingClientRect().left

    const collapseBoundary = 50
    const leftBoundary = 100
    const rightBoundary = 800
    let done;

    document.body.style.userSelect = "none" 
    function onMove(e){
      if (done){
        return
      }
      done = true
      requestAnimationFrame(()=>{
        sideBarRef.current.style.width = `${e.clientX - imgOffset}px`
        sideBarRef.current.style.display = ""
        
        if (e.clientX < collapseBoundary){
          sideBarRef.current.style.display = "none"
        }else if (e.clientX < leftBoundary){
          sideBarRef.current.style.width = `${leftBoundary}px`
        }else if (e.clientX > rightBoundary){
          sideBarRef.current.style.width = `${rightBoundary}px`
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
    <div className={styles.sidePanel}>
      <section className={styles.sidePanelMain} ref={sideBarRef}>
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
            <BallContainer userList={peerLocations["chat"]}/>}
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
            <BallContainer userList={peerLocations["whiteboard"]}/>}
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
            <BallContainer userList={peerLocations["videochat"]}/>
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

export default Sidebar