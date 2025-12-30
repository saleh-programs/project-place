import { useContext, useEffect, useRef, useState } from "react";

import { RoomContext } from "src/providers/contexts";
import styles from "styles/components/JoinRoom.module.css"
import { checkRoomExistsReq, addRoomUserReq, getUserRoomsReq } from "backend/requests";

function JoinRoom({setIsLoadingRoom}){
  const {setRoomID, setRoomName} = useContext(RoomContext)

  const [joinRoomID, setJoinRoomID]= useState("")
  const joinRoomIDRef = useRef("")
  const [rooms, setRooms] = useState([])
  const [errorJoiningMsg, setErrorJoiningMsg] = useState("")
  
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")
  const [hideVisibility, setHideVisibility] = useState(false)

  const customInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const justSubmittedRef = useRef(false)

  useEffect(()=>{
    getUserRoomsReq()
    .then(roomList=>setRooms(roomList))
 
    customInputRef.current.focus()
  },[])

  async function handleRoomLoad(){
    justSubmittedRef.current = true
    setTimeout(()=>{justSubmittedRef.current = false}, 300)

    const roomInfo = await checkRoomExistsReq(joinRoomIDRef.current)

    if (!roomInfo){
      setErrorJoiningMsg("That room does not exist")
      setTimeout(()=>setErrorJoiningMsg(""), 2000)
      return
    }
    if (roomInfo["needsPassword"] && !rooms.some(r=>r["roomID"] === joinRoomIDRef.current)){
      setIsPasswordProtected(true)
      setPassword("")
      return
    }
    handleRoomJoin()
  }

  async function handleRoomJoin() {
    justSubmittedRef.current = true
    setTimeout(()=>{justSubmittedRef.current = false}, 300)

    const roomName = await addRoomUserReq(joinRoomIDRef.current,  passwordInputRef.current ? passwordInputRef.current.value : null) 
    if(!roomName){
      setErrorJoiningMsg("The password is incorrect")
      setTimeout(()=>setErrorJoiningMsg(""), 2000)
      return
    }
    
    setRoomID(joinRoomIDRef.current);
    setRoomName(roomName)
    setIsLoadingRoom(false)
  }

  function handleKeyPressRoom(e){
    const letter = e.key.toUpperCase()
    const ascii = letter.charCodeAt(0)

    isPasswordProtected && setIsPasswordProtected(false)

    if (letter === "BACKSPACE"){
      joinRoomIDRef.current = joinRoomIDRef.current.slice(0, -1)
      setJoinRoomID(joinRoomIDRef.current)
      return
    }
    if (letter === "ENTER" && !justSubmittedRef.current){
      !isPasswordProtected && handleRoomLoad()
      return
    }
    if (!(ascii >= 48 && ascii <= 57) && !(ascii >= 65 && ascii<= 90) || letter.length > 1){
      return
    }
    joinRoomIDRef.current = joinRoomIDRef.current.length >= 6 ? joinRoomIDRef.current : joinRoomIDRef.current + letter
    setJoinRoomID(joinRoomIDRef.current)
  }
  function handleKeyPressPassword(e){
    if (e.key === "Enter" && !justSubmittedRef.current){
      handleRoomJoin()
    }
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
    return result
  }

  return (
    <div className={styles.joinRoom}>
      <section className={styles.joinInput}>
        <h2>Enter Room Code</h2>
        <section ref={customInputRef} onKeyDown={handleKeyPressRoom} tabIndex={0}>
          {customRoomInput()}
        </section>
      </section>

      {isPasswordProtected &&       
        <section className={styles.enterPassword}>
          <h2>Enter Room Password</h2>
          <section>
            <input ref={passwordInputRef} type={hideVisibility ? "password" : "text"} spellCheck="false" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            onKeyDown={handleKeyPressPassword}
            
            />
            <button onClick={()=>setHideVisibility(prev=>!prev)}>{hideVisibility ? "show" : "hide"}</button>
          </section>
        </section>
      }
      {
        joinRoomID.length === 6 &&
        <button className={styles.joinRoomBtn} onClick={isPasswordProtected ? handleRoomJoin : handleRoomLoad}>
          {isPasswordProtected ? "Join Locked Room" : "Join Room"}
        </button>
      }
      <span className={styles.errorJoiningMsg}>{errorJoiningMsg}</span>
      <section className={styles.existingRooms}>
        <h2>Joined Rooms</h2>
        <section>
          <ul>
              {rooms.map(room => {
                return (
                <li key={room["roomID"]} onClick={()=>{
                  setJoinRoomID(room["roomID"]);
                  joinRoomIDRef.current = room["roomID"];  
                  handleRoomJoin();}}>
                  <span>{room["roomName"]}</span>
                  <span>{room["roomID"]}</span>
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