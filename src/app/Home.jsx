"use client"

import { useState } from "react"
import styles from "styles/Home.module.css"
import BallContainer from "src/components/BallContainer"

const NEXT_PUBLIC_HTTP_BACKEND_URL = process.env.NEXT_PUBLIC_HTTP_BACKEND_URL

function Home(){
  const [ball1NormalView, setBall1NormalView] = useState(false);
  const [ball2NormalView, setBall2NormalView] = useState(false);
  const [ball3NormalView, setBall3NormalView] = useState(false);

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
    <div className={styles.featureDisplay}>
      <h2>Chat</h2>
      <section >
        <section className={styles.display} style={{backgroundColor: "rgba(16, 107, 16, 0.199)"}}>
          <button onClick={() => setBall1NormalView(prev=>!prev)} className={styles.toggleViewMode}>Toggle view mode</button>
          {ball1NormalView
          ?
            <video autoPlay muted controls playsInline loop src="/home_videos/chatFEATURE_SPED_noaudio.mp4"></video>
          :
            <BallContainer userList={[{"avatar": "/home_videos/chatFEATURE_SPED_distort_noaudio.mp4"}]} BALL_RADIUS={250} ELASTICITY={.8}/>
          }
        </section>
        <section className={styles.miniDescription}>
          <h3>Description</h3>
          <section>
            <p>
                The main area of discussion. <br />
                Edit or delete messages as you communicate with your team! <br />
                <br />
                Long conversations are supported, as the chat utilizes a custom form of <strong>*virtualization</strong> and even supports <strong>*infinite scroll.</strong> 
                <br />
                <br />
                You'll have the ability to send almost any file type, including images, videos, zip files, and much more. However, there is a 25MB limit per file.
                <br /><br />                
            </p>
          </section>
          <span style={{display: "block", textAlign: "left", fontSize: ".7em", width: "50%"}}>
            *Virtualization: Only the messages actually seen are rendered. This can cause jitter, so a custom implementation displays message ranges. <br/><br />
            *Infinite Scroll: Messages load as you scroll up in the chat, so you do not receive the entire chat history at once.
          </span>
        </section>
      </section>
    </div>
    <div className={styles.featureDisplay}>
      <h2>Whiteboard</h2>
      <section >
        <section className={styles.miniDescription}>
          <h3>Description</h3>
          <section style={{flexDirection: "column"}}>
            <p>
              View your team's changes in <strong>real time</strong>. <br /> The whiteboard is a completely shared space, and a big focus of this project. 
              <br /><br />
              A place to visualize and share your thoughts. Alternatively, it can be a fun place to experiment, with or without others!
              <br /> <br />
              There are many classical operations such as draw, erase, bucket fill, and others, all of which have been heavily optimized. <br />
              Ex) A full canvas fill has gone from 700ms to &asymp;25ms.
            </p>
            <section style={{display: "block", textAlign: "left"}}>
              <span >Some special operations include:</span>
              <ul style={{textAlign: "left", margin: "auto 0"}}>
                <li>Undo / Redo</li>
                <li>Import images</li>
                <li>Move selected area</li>
                <li>Save entire canvas (as PNG)</li>
                <li>Save selected area (as PNG)</li>
              </ul> 
            </section>
          </section>
        </section>
        <section className={styles.display} style={{backgroundColor: "rgba(88, 148, 189, 0.2)"}}>
          <button onClick={() => setBall2NormalView(prev=>!prev)} className={styles.toggleViewMode}>Toggle view mode</button>
          {ball2NormalView
          ?
            <video autoPlay muted controls playsInline loop src="/home_videos/whiteboardFEATURE_SPED_noaudio.mp4"></video>
          :
            <BallContainer userList={[{"avatar":  "/home_videos/whiteboardFEATURE_SPED_distort_noaudio.mp4"}]} BALL_RADIUS={250} ELASTICITY={.8}/>
          }
        </section>
      </section>
    </div>
    <div className={styles.featureDisplay}>
      <h2>Videochat</h2>
      <section >
        <section className={styles.display} style={{backgroundColor: "rgba(58, 48, 35, 0.29)"}}>
          <button onClick={() => setBall3NormalView(prev=>!prev)} className={styles.toggleViewMode}>Toggle view mode</button>
          {ball3NormalView
          ?
            <video autoPlay muted controls playsInline loop src="/home_videos/videoFEATURE_SPED_noaudio.mp4"></video>
          :
            <BallContainer userList={[{"avatar": "/home_videos/videoFEATURE_SPED_distort_noaudio.mp4"}]} BALL_RADIUS={250} ELASTICITY={.8}/>
          }
        </section>
        <section className={styles.miniDescription}>
          <h3>Description</h3>
          <section>
            <p>
              What is a collaboration platform without the option to hold actual meetings?
              <br /><br />
              Join the team in a call with the option of showing video and audio! 
              <strong> *Mediasoup</strong> is used to scale with the number of call participants.
              <br /><br />
              Alternatively, call a specific team member. This flow does not use mediasoup, and 
              instead uses a direct <strong>peer to peer connection</strong> for better performance!
            </p>
          </section>
          <span style={{display: "block", textAlign: "left", fontSize: ".7em", width: "50%"}}>
            *Mediasoup: A library that implements an SFU, or Selective Forwarding Unit. All video and audio is sent to this server first and then forwarded to
            the other call participants.<br/><br />
          </span>
        </section>
      </section>
    </div>
  </div>
  )
}

export default Home;
