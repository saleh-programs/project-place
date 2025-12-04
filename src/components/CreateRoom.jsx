import { useState, useRef, useEffect } from "react"
import styles from "styles/components/CreateRoom.module.css"

import { createRoomReq, updateCanvasReq } from "backend/requests"

function CreateRoom({setIsCreatingRoom, setRoomID, setRoomName}){

  const [newRoomName, setNewRoomName] = useState("")
  const newRoomNameRef = useRef("")

  const customInputRef = useRef(null)
  
  useEffect(()=>{
    customInputRef.current?.focus()
  },[])

  async function handleRoomCreation(){
    if (newRoomNameRef.current === "") return
    const res = await createRoomReq(newRoomNameRef.current)
    if (!res){
      return
    }
    setRoomID(res)
    setRoomName(newRoomNameRef.current)

    setNewRoomName("")
    setIsCreatingRoom(false)
  }

  function handleChange(e){
    if (/^[a-zA-Z0-9_+!]*$/.test(e.target.value)){
      setNewRoomName(e.target.value)
      newRoomNameRef.current = e.target.value
    } 
  }

  return (
    <div className={styles.createRoom}>

      <section className={styles.createInput}>
        <h2>Enter Room Name</h2>
        <input ref={customInputRef} type="text" spellCheck="false"
        value={newRoomName} 
        onChange={handleChange}
        onKeyDown={e=>e.key === "Enter" && handleRoomCreation()}
        />
      </section>

      <button 
      className={styles.escape}
      onClick={()=>setIsCreatingRoom(false)} >
        X
      </button>
    </div>
  )
} 

export default CreateRoom