import { useState, useRef, useEffect } from "react"
import styles from "styles/components/CreateRoom.module.css"

import { createRoomReq, updateCanvasReq } from "backend/requests"

function CreateRoom({setIsCreatingRoom, setRoomID, setRoomName}){

  const [newRoomName, setNewRoomName] = useState("")
  const newRoomNameRef = useRef("")

  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")

  const nameInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  
  useEffect(()=>{
    nameInputRef.current?.focus()
  },[])

  async function handleRoomCreation(){
    if (newRoomNameRef.current === "") return
    const res = await createRoomReq(newRoomNameRef.current, isPasswordProtected ? passwordInputRef.current : null)

    if (!res){
      return
    }
    setRoomID(res)
    setRoomName(newRoomNameRef.current)

    setNewRoomName("")
    setIsCreatingRoom(false)
  }

  function handleChange(e){
    if (/^[a-zA-Z0-9_+!\s]*$/.test(e.target.value)){
      setNewRoomName(e.target.value)
      newRoomNameRef.current = e.target.value
    } 
  }

  return (
    <div className={styles.createRoom}>

      <section className={styles.createInput}>
        <h2>Enter Room Name</h2>
        <input ref={nameInputRef} type="text" spellCheck="false"
        value={newRoomName} 
        onChange={handleChange}
        />
      </section>
      <button onClick={()=>{setIsPasswordProtected(prev=>!prev);setPassword("")}}>{isPasswordProtected ? "No Password" : "Using Password"}</button>Password
      <section>
        <h2>Create Room Password</h2>
        <input ref={passwordInputRef} type="text" spellCheck="false"
        value={password} 
        onChange={e=>setPassword(e.target.value)}
        />
      </section>
      <button onClick={handleRoomCreation}>Create Room</button>
      <button 
      className={styles.escape}
      onClick={()=>setIsCreatingRoom(false)} >
        X
      </button>
    </div>
  )
} 

export default CreateRoom