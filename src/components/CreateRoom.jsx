import { useState } from "react"
import styles from "styles/components/CreateRoom.module.css"

import { createRoomReq, updateCanvasReq } from "backend/requests"

function CreateRoom({setIsCreatingRoom, setRoomID, username}){
  const [newRoomName, setNewRoomName] = useState("")

  async function handleRoomCreation(){
    const res = await createRoomReq(newRoomName, username)
    if (res){
      const canvas = document.createElement("canvas")
      canvas.width = 1000
      canvas.height = 1000
      const blob = await new Promise((resolve)=>canvas.toBlob(resolve, "image/png"))

      updateCanvasReq(blob,res) //MURAD WHY ARE YOU SO LAZY JUST LET CREATEROOM HANDLE IT
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