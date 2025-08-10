"use client"

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "styles/Home.module.css"

function Home(){
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  return(
  <div className={styles.homepage}>
    <button onClick={()=>{window.location.href="http://localhost:5000/login"}}>Log In</button>
    <button onClick={()=>{window.location.href="http://localhost:5000/logout"}}>Log Out</button>
  </div>
  )
}


export default Home;