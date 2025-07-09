// "use client"
import styles from "styles/components/Sidebar.module.css"
import { useRouter } from "next/navigation"

import AccountHub from "src/components/AccountHub"

function Sidebar(){
  const router = useRouter()
  return(
    <div className={styles.sidePanel}>
        <section className={styles.features}>
          <button onClick={()=>router.push("/platform/chat")}>Chat</button>
          <button onClick={()=>router.push("/platform/documents")}>Documents</button>
          <button onClick={()=>router.push("/platform/whiteboard")}>Whiteboard</button>
          <button onClick={()=>router.push("/platform/videochat")}>Video Chat</button>
        </section>
        <AccountHub/>
      </div>  
      )
}

export default Sidebar