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

  function handleKeyPress(e){
    const letter = e.key.toUpperCase()
    const ascii = letter.charCodeAt(0)
    if (letter === "BACKSPACE"){
      setJoinRoomID(prev => prev.slice(0,-1))
      return
    }
    if (!(ascii >= 48 && ascii <= 57) && !(ascii >= 65 && ascii<= 90) || letter.length > 1){
      return
    }
    setJoinRoomID(prev => prev.length >= 6 ? prev : prev + letter)
  }

  function customRoomInput(){
    const result = []
    for (let i = 0; i < 6; i++){
      if (joinRoomID.length - 1 >= i){
        result.push(
          <span key={i} className={styles.fullSquare}>
            {joinRoomID[i]}
          </span>
        )
      }else{
        result.push(
          <span key={i}>
          </span>
        )
      }
    }
    console.log(result, joinRoomID)
    return result
  }

  return (
    <div className={styles.joinRoom}>

      <section className={styles.joinInput}>
        <h2>Enter Room Code</h2>
        <section onKeyDown={handleKeyPress} tabIndex={0}>
          {customRoomInput()}
        </section>
      </section>

      <section className={styles.existingRooms}>
        <h2>Joined Rooms</h2>
        <section>
          <ul>
              {rooms.map(room => {
                return (
                <li key={room["roomID"]}>
                  <span>{room["roomID"]}</span>
                  <span>{room["roomName"]}</span>
                </li>)
              })}
          </ul>
        </section>
      </section>



      <button 
      className={styles.escape}
      onClick={()=>{setIsLoadingRoom(false)}} >
        X
      </button>
    </div>
  )
} 

export default JoinRoom 