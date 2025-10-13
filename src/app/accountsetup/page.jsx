"use client"

import { useEffect, useRef, useState } from "react";
import {updateUserInfoReq } from "backend/requests";
import { useRouter } from "next/navigation";


function AccountSetup(){
  const router = useRouter()
  const inputRef = useRef(null)

  async function handleSubmit(){
    const response = await updateUserInfoReq({"username": inputRef.current.value})
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