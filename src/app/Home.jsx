"use client"

import styles from "styles/Home.module.css"

const NEXT_PUBLIC_HTTP_BACKEND_URL = process.env.NEXT_PUBLIC_HTTP_BACKEND_URL

function Home(){
  return(
  <div className={styles.homePage}>
    <button onClick={()=>{window.location.href=`${NEXT_PUBLIC_HTTP_BACKEND_URL}/login`}}>Log In</button>
    <button onClick={()=>{window.location.href=`${NEXT_PUBLIC_HTTP_BACKEND_URL}/logout`}}>Log Out</button>
  </div>
  )
}

export default Home;