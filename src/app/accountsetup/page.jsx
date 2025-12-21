"use client"

import { useEffect, useRef, useState } from "react";
import {updateUserInfoReq } from "backend/requests";
import { useRouter } from "next/navigation";

import styles from "styles/accountsetup/AccountSetup.module.css"

function AccountSetup(){
  const router = useRouter()

  const [newUsername, setNewUsername] = useState("")
  const [usernameSelected, setUsernameSelected] = useState(false)

  const [errMessage, setErrMessage] = useState("")

  const inputRef = useRef(null)

  useEffect(()=>{
    document.cookie = "roomID=; Max-Age=0; path=/"
    document.cookie = "roomName=; Max-Age=0; path=/"
  },[])
  async function handleSubmit(){
    const response = await updateUserInfoReq({"username": inputRef.current.value})
    if (response){
      router.push("/platform")
    }

    //ill verify username don't exist
    // setUsernameSelected(true)

    //if it doesn't, show error
    // setErrMessage("That username already exists");

  }

  function handleChange(e){
    if (/^(?!\d)[a-zA-Z0-9_+!]*$/.test(e.target.value)){
      setNewUsername(e.target.value)
    } 
  }

  return(
    <div className={styles.accountSetupPage}>
      <div className={styles.interactable}>
        {usernameSelected 
        ? 
          <section className={styles.pfpInput}>
            

          </section>
        :
          <section className={styles.usernameInput}>
            <h2>Create your username</h2>
            <input ref={inputRef} type="text" spellCheck="false"
            value={newUsername}
            onChange={handleChange}/>
            <span>{errMessage}</span>
            <button onClick={handleSubmit}>Submit</button>
          </section>
        }

      </div>
      <button className={styles.logout} onClick={()=>{window.location.href="http://localhost:5000/logout"}}>
        Log Out
      </button>
    </div>
  )
}
 
export default AccountSetup; 