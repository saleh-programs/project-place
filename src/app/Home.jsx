"use client"

import styles from "styles/Home.module.css"

function Home(){

  return(
  <div className={styles.homePage}>
    <button onClick={()=>{window.location.href="http://localhost:5000/login"}}>Log In</button>
    <button onClick={()=>{window.location.href="http://localhost:5000/logout"}}>Log Out</button>
  </div>
  )
}

export default Home;