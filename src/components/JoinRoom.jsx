import { useContext, useEffect, useState } from "react";
import styles from "styles/components/JoinRoom.module.css"

import { checkRoomExistsReq, addRoomUserReq, getUserRoomsReq } from "backend/requests";
import ThemeContext from "src/assets/ThemeContext";

function JoinRoom({setIsLoadingRoom, setRoomID, setUserInfo, userInfo}){
  const [joinRoomID, setJoinRoomID]= useState("")
  const [rooms, setRooms] = useState([])

  useEffect(()=>{
    getUserRoomsReq()
    .then(roomList=>setRooms(roomList))
  },[])

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

      <div className={styles.existingRooms}>
        Join existing rooms
        <ul>
            {rooms.map(room => {
              return (
              <section>
                <span>{room["roomID"]}</span>
                <span>{room["roomName"]}</span>
              </section>)
            })}
        </ul>
      </div>
    </div>
  )
} 

export default JoinRoom