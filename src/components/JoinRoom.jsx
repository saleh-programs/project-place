import { useState } from "react";
import styles from "styles/components/JoinRoom.module.css"

import { validateRoomReq } from "backend/requests";

function JoinRoom({setIsLoadingRoom, setRoomID}){
  const [joinRoomID, setJoinRoomID]= useState("")

  async function handleRoomLoad(){
    const res = await validateRoomReq(joinRoomID)
    if(res){
      setRoomID(joinRoomID);
      setIsLoadingRoom(false)
    }
  }

  return (
    <div className={styles.joinRoom}>
      Enter existing room name!<br/>
      <input type="text"
       value={joinRoomID}
      onChange={(e)=>setJoinRoomID(e.target.value)}/>

      <button onClick={handleRoomLoad}>
        Submit
      </button>  

      <button 
      className={styles.escape}
      onClick={()=>{setIsLoadingRoom(false)}} >
        X
      </button>
    </div>
  )
}

export default JoinRoom