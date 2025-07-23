import { useState } from "react"
import styles from "styles/components/CreateRoom.module.css"

import { createRoomReq } from "backend/requests"

function CreateRoom({setIsCreatingRoom, setRoomID}){
  const [newRoomName, setNewRoomName] = useState("")

  async function handleRoomCreation(){
    const res = await createRoomReq(newRoomName)
    if (res){
      setNewRoomName("")
      setRoomID(res)
      setIsCreatingRoom(false)
    }
  }


  return (
    <div className={styles.createRoom}>
      Enter new room name!<br/>
      <input type="text"
      value={newRoomName}
      onChange={(e) => {setNewRoomName(e.target.value)}} />

      <button onClick={handleRoomCreation}>Submit</button>

      <button 
      className={styles.escape}
      onClick={()=>setIsCreatingRoom(false)} >
        X
      </button>
    </div>
  )
}

export default CreateRoom