"use client"
//this will later need to be a nice page with descriptions everywhere

import styles from "styles/Home.module.css"

function Home(){
  return(
  <div className={styles.homepage}>
    <button onClick={()=>{window.location.href="http://localhost:5000/login"}}>Log In</button>
    <button onClick={()=>{window.location.href="http://localhost:5000/logout"}}>Log Out</button>
  </div>
  )
}


export default Home;