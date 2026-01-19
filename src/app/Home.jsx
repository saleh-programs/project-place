"use client"

import styles from "styles/Home.module.css"
import BallContainer from "src/components/BallContainer"

const NEXT_PUBLIC_HTTP_BACKEND_URL = process.env.NEXT_PUBLIC_HTTP_BACKEND_URL

function Home(){
  return(
  <div className={styles.homePage}>
    <h1>Project Place</h1>
    <section className={styles.description}>
      Welcome to Project Place! <br /><br />This is something that's been in development for a while, centered around the bare essentials I would always need when working with a team.
      <br /><br />Share files, draw up outlines, videochat, text, and more! <br /><br /> Thank you for trying it out!
    </section>
    <section className={styles.buttons}>
      <button onClick={()=>{window.location.href=`${NEXT_PUBLIC_HTTP_BACKEND_URL}/login`}}> Sign Up / Sign In</button>
    </section>
    <BallContainer userList={[{"avatar": "https://file-examples.com/storage/fe839b57a2698cbba954073/2017/04/file_example_MP4_480_1_5MG.mp4"}]} BALL_RADIUS={100} ELASTICITY={.9}/>
  </div>
  )
}

export default Home;