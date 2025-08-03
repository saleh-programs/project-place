// "use client"
import styles from "styles/components/Sidebar.module.css"
import { useRouter } from "next/navigation"

import AccountHub from "src/components/AccountHub"
import { useRef } from "react"

function Sidebar(){
  const router = useRouter()
  const sideBarRef = useRef(null)

  function startDrag(){
    function onMove(e){
      sideBarRef.current.style.width = `${e.clientX}px`
    }
    function onRelease(){
      document.removeEventListener("mousemove",onMove)
      document.removeEventListener("mouseup",onRelease)
    }
    document.addEventListener("mousemove",onMove)
    document.addEventListener("mouseup",onRelease)

  }
  return(
    <div className={styles.sidePanel}  ref={sideBarRef}>
      <section className={styles.sidePanelMain}>
        <section className={styles.features}>
          <button onClick={()=>router.push("/platform/chat")}>Chat</button>
          <button onClick={()=>router.push("/platform/documents")}>Documents</button>
          <button onClick={()=>router.push("/platform/whiteboard")}>Whiteboard</button>
          <button onClick={()=>router.push("/platform/videochat")}>Video Chat</button>
        </section>
        <AccountHub/>
      </section>
      <section className={styles.sidePanelHandle} onMouseDown={startDrag}>
        hey
      </section>
    </div>  
      )
} 

export default Sidebar