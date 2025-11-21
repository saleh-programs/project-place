"use client"
//this will later need to be a nice page with descriptions everywhere

import styles from "styles/Home.module.css"
import BallContainer from "src/components/BallContainer"

function Home(){
  return(
  <div >
    <button onClick={()=>{window.location.href="http://localhost:5000/login"}}>Log In</button>
    <button onClick={()=>{window.location.href="http://localhost:5000/logout"}}>Log Out</button>
    <div style={{
      width:"300px",
      height: "300px", 
      border: "1px solid red", 
      position: "relative",
      margin: "10px"
      }}>
        <BallContainer imgList={["/showvideo_icon.png"]}/>
    </div>
  </div>
  )
}


export default Home;