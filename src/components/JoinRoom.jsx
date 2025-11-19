import { useContext, useState } from "react";
import styles from "styles/components/JoinRoom.module.css"

import { checkRoomExistsReq, addRoomUserReq } from "backend/requests";
import ThemeContext from "src/assets/ThemeContext";

function JoinRoom({setIsLoadingRoom, setRoomID, username}){
  const [joinRoomID, setJoinRoomID]= useState("")

  async function handleRoomLoad(){
    const res = await checkRoomExistsReq(joinRoomID)
    if (!res){
      setJoinRoomID("")
      return
    }
    const joinRes = await addRoomUserReq(joinRoomID)
    if(!joinRes){
      setJoinRoomID("")
      return
    }
    setRoomID(joinRoomID);
    setIsLoadingRoom(false)
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