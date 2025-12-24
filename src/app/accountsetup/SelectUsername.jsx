"use client"

import { useEffect, useRef, useState } from "react";
import {updateUserInfoReq, validateUsernameReq } from "backend/requests";
import { useRouter } from "next/navigation";

import styles from "styles/accountsetup/SelectUsername.module.css"

function AccountSetup(){
  const router = useRouter()

  const [newUsername, setNewUsername] = useState("")
  const [errMessage, setErrMessage] = useState("")

  const inputRef = useRef(null)

  useEffect(()=>{
    document.cookie = "roomID=; Max-Age=0; path=/"
    document.cookie = "roomName=; Max-Age=0; path=/" 
    inputRef.current.focus()
  },[])
  async function handleSubmit(){
    const userExists = await validateUsernameReq(inputRef.current.value)
    if (!userExists){
      setErrMessage("That username is taken")
      setTimeout(()=>setErrMessage(""),3000)
      return
    }
    const response = await updateUserInfoReq({"username": inputRef.current.value})
    if (!response){
      return
    }
    router.push("/accountsetup/profile")
  }

  function handleChange(e){
    if (/^(?!\d)[a-zA-Z0-9_+!]*$/.test(e.target.value)){
      setNewUsername(e.target.value)
    } 
  } 

  return(
    <div className={styles.accountSetupPage}>
      <div className={styles.interactable}>
        <section className={styles.usernameInput}>
        <h2>Create your username</h2>
        <input ref={inputRef} type="text" spellCheck="false"
        value={newUsername}
        onChange={handleChange}/>
        <span>{errMessage}</span>
        <button onClick={handleSubmit}>Submit</button>
        </section>

      </div>
      <button className={styles.logout} onClick={()=>{window.location.href="http://localhost:5000/logout"}}>
        Log Out
      </button>
    </div>
  )
}
 
export default AccountSetup; 