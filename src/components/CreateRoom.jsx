import { useState, useRef, useEffect } from "react"
import styles from "styles/components/CreateRoom.module.css"

import { createRoomReq, updateCanvasReq } from "backend/requests"

function CreateRoom({setIsCreatingRoom, setRoomID, setRoomName}){

  const [newRoomName, setNewRoomName] = useState("")
  const newRoomNameRef = useRef("")

  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")
  const [hideVisibility, setHideVisibility] = useState(false)

  const nameInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  
  useEffect(()=>{
    nameInputRef.current?.focus()
  },[])

  async function handleRoomCreation(){
    if (newRoomNameRef.current === "") return
    const res = await createRoomReq(newRoomNameRef.current, passwordInputRef.current ? passwordInputRef.current.value : null)

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
      <button className={styles.enterPasswordBtn} onClick={()=>{setIsPasswordProtected(prev=>!prev);setPassword("")}}>{!isPasswordProtected ? "Use Password" : "Don't use Password"}</button>
      {isPasswordProtected &&       
        <section className={styles.createPassword}>
          <h2>Create Room Password</h2>
          <section>
            <input ref={passwordInputRef} type={hideVisibility ? "password" : "text"} spellCheck="false" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}/>
            <button onClick={()=>setHideVisibility(prev=>!prev)}>{hideVisibility ? "show" : "hide"}</button>
          </section>
        </section>
      }

      <button className={styles.createRoomBtn} onClick={handleRoomCreation}>Create Room</button>
      <button 
      className={styles.escape} 
      onClick={()=>setIsCreatingRoom(false)} >
        X
      </button>
    </div>
  )
} 

export default CreateRoom