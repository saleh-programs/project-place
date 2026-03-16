"use client"
import { memo, useEffect, useRef } from "react"


import styles from "styles/components/BallContainer.module.css"
import Ball from "utils/ball.js"


function BallContainer({userList, BALL_RADIUS = 15, ELASTICITY=.7, ACCELERATION={x:0, y:.0005}}){

    const containerRef = useRef(null)
    const canvasRef = useRef(null)

    const ballGroup = useRef([])
    const rafRef = useRef(null) 


    useEffect(()=>{
        if (userList.length === 0){
            return
        }
        addBalls()
    },[userList]) 

    useEffect(()=>{
        let rect = containerRef.current.getBoundingClientRect()
        const canvas = canvasRef.current
        const cxt = canvasRef.current.getContext("2d")

        canvasRef.current.width = rect.width
        canvasRef.current.height = rect.height
	cxt.fillStyle = "rgba(0,0,0,.2)"

        addBalls()
        
        cxt.strokeStyle = "rgba(0, 0, 0, 0.3)"
        let last = null; 
        let dt; 
        let impulse = {x: 0, y: 0};
        function updateBalls(step){
            if (last === null){
                last = step;
            }
            dt = Math.min(step - last, 150)
            last = step
            rect = containerRef.current.getBoundingClientRect()
            cxt.clearRect(0,0, canvas.width, canvas.height)

            if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)){
                if (ballGroup.current.length * BALL_RADIUS * BALL_RADIUS * 4> rect.width * rect.height * .85){
                    rafRef.current = requestAnimationFrame(updateBalls)
                    return
                }

                impulse.x = (rect.width - canvas.width) * dt * .001
                impulse.y = (rect.height - canvas.height) * dt * .001
                canvas.width = rect.width
                canvas.height = rect.height   
            }

            for (let ball of ballGroup.current){
                ball.addEnergy(impulse)
                ball.update(dt, canvas.width, canvas.height)
                if (ball.image === null){
                    continue
                }

                const width =  ball.image.tagName === "IMG" ? ball.image.naturalWidth : ball.image.videoWidth
                const height = ball.image.tagName === "IMG" ? ball.image.naturalHeight : ball.image.videoHeight

                const scalar = (BALL_RADIUS * 2) / width
                const scaledWidth = BALL_RADIUS * 2
                const scaledHeight = height * scalar 

                cxt.save()
                cxt.beginPath()
                cxt.arc(ball.pos.x, ball.pos.y, BALL_RADIUS, 0, 2*Math.PI)
                cxt.stroke()
                cxt.clip()
		        ball.image.tagName !== "IMG" && cxt.fillRect(ball.pos.x - BALL_RADIUS, ball.pos.y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2);
                

                cxt.drawImage(ball.image, ball.pos.x - (scaledWidth / 2), ball.pos.y - (scaledHeight / 2), scaledWidth, scaledHeight)
                cxt.restore()
            }
            impulse.x = 0
            impulse.y = 0
            rafRef.current = requestAnimationFrame(updateBalls)
        }

        if (ballGroup.current.length > 0){
            rafRef.current = requestAnimationFrame(updateBalls)
        }

        return ()=>{
            for (const oldBall of ballGroup.current){
                if (oldBall?.image?.tagName !== "VIDEO") continue;
                oldBall.image.pause();
                oldBall.image.src = "";
                oldBall.image.load();
            }
            ballGroup.current = []
            cancelAnimationFrame(rafRef.current)
        }
    },[])

    async function addBalls(){
        const newBallGroup = []

        for (const user of userList){
            let exists = false
            
            for (let ball of ballGroup.current){
                if (ball.metadata === user["avatar"]){
                    exists = true
                    newBallGroup.push(ball)
                    break
                }
            }
            if (exists){
                continue
            } 
            const origin = {x: Math.floor(Math.random() * canvasRef.current.width),y: Math.floor(Math.random() * canvasRef.current.height)}
            const ball = new Ball(origin, ballGroup, canvasRef.current.width, canvasRef.current.height, null, user["avatar"], BALL_RADIUS, ELASTICITY, ACCELERATION)
            
            if (["mp4", "webm"].includes(user["avatar"].split(".").at(-1)?.toLowerCase())){
                const video = document.createElement("video");
                video.src = user["avatar"]
                video.loop = true
                video.autoplay = true
                video.muted = true
                video.play()
                video.onloadeddata = () => {
                    ball.image = video
                }
                
            }else{
                const img = new Image()
                img.onload = ()=>{
                    ball.image = img
                }
                img.src = user["avatar"]

            }
            newBallGroup.push(ball)
        }
        for (const oldBall of ballGroup.current){
            if (oldBall?.image?.tagName !== "VIDEO") continue;
            if (!newBallGroup.includes(oldBall)){
                oldBall.image.pause();
                oldBall.image.src = "";
                oldBall.image.load();
            }
        }
        ballGroup.current = newBallGroup
    }

    return(
        <div ref={containerRef} className={styles.ballContainer} >
            <canvas ref={canvasRef}>
            </canvas>
        </div>
    )
}

export default memo(BallContainer)
