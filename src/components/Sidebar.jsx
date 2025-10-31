// "use client"
import styles from "styles/components/Sidebar.module.css"
import { useRouter } from "next/navigation"

import AccountHub from "src/components/AccountHub"
import { useRef } from "react"

function Sidebar(){
  const router = useRouter()
  const sideBarRef = useRef(null)

  function startDrag(){
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
        sideBarRef.current.style.width = `${e.clientX}px`

        sideBarRef.current.style.display = ""
        if (e.clientX < collapseBoundary){
          sideBarRef.current.style.display = "none"
        }else if (e.clientX < leftBoundary){
          sideBarRef.current.style.width = `${leftBoundary}px`
        }else if (e.clientX > rightBoundary){
          sideBarRef.current.style.width = `${rightBoundary}px`
        }else{
          sideBarRef.current.style.width = `${e.clientX}px`
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
  return(
    <div className={styles.sidePanel}>
      <section className={styles.sidePanelMain} ref={sideBarRef}>
        <section className={styles.features}>
          <button onClick={()=>router.push("/platform/chat")}>Chat</button>
          <button onClick={()=>router.push("/platform/whiteboard")}>Whiteboard</button>
          <button onClick={()=>router.push("/platform/videochat")}>Video Chat</button>
        </section>
        <AccountHub/>
      </section>
      <section className={styles.sidePanelHandle}>
        <img src={null} alt="smth" onMouseDown={startDrag}/>
      </section>
    </div>  
      )
} 

export default Sidebar