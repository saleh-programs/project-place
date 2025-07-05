import styles from "../../styles/components/Sidebar.module.css"

function Sidebar(){
  return(
    <div className={styles.sidePanel}>
        <section className={styles.features}>
          <button>Chat</button>
          <button>Documents</button>
          <button>Whiteboard</button>
          <button>Video Chat</button>
        </section>
        <section className={styles.accountHub}>
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