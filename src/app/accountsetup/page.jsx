"use client"

import { useEffect, useRef, useState } from "react";
import { updateUsernameReq, getSessionUserInfoReq } from "backend/requests";
import { useRouter } from "next/navigation";

import styles from "styles/accountsetup/AccountSetup.module.css"

function AccountSetup(){
  const router = useRouter()
  const inputRef = useRef(null)
  const [email, setEmail] = useState("")

  useEffect(()=>{
    async function getEmail(){
      const response = await getSessionUserInfoReq()
      setEmail(response["email"])
    }
    getEmail()
  },[])

  async function handleSubmit(){
    console.log(inputRef.current.value)
    const response = await updateUsernameReq(email, inputRef.current.value)
    if (response){
      router.push("/platform")
    }
  }
  return(
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={handleSubmit}>Submit</button>
      account setup
    </div>
  )
}

export default AccountSetup;