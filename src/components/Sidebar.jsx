// "use client"
import styles from "../../styles/components/Sidebar.module.css"
import { useRouter } from "next/navigation"

import AccountHub from "../components/AccountHub"

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
        <section className={styles.accountHub}>
          <AccountHub/>
          <div>Account is: </div>
          {/* <section>
            Would you like to create a room or join a room?
            <button onClick={()=>{setIsCreatingRoom(true);setIsLoadingRoom(false)}}>Create</button>
            {isCreatingRoom &&
              <span>
                <input 
                type="text" 
                placeholder="New Room Name"
                onChange={(e)=>setNewRoomName(e.target.value)} />
                <button onClick={handleRoomCreation}>Submit</button>
              </span>
            }
            <br />
            <button onClick={()=>{setIsCreatingRoom(false);setIsLoadingRoom(true)}}>Join</button>
              <span>
                <input type="text" placeholder="Room ID" value={joinRoomID} onChange={(e)=>setJoinRoomID(e.target.value)} />
                <button onClick={handleRoomLoad}>Submit</button>
              </span>
              
          </section> */}

        </section>
      </div>  
      )
}

export default Sidebar