import { memo, useEffect, useRef } from "react"


import styles from "styles/components/BallContainer.module.css"
import Ball from "utils/ball.js"


function BallContainer({userList}){

    const containerRef = useRef(null)
    const canvasRef = useRef(null)

    const ballGroup = useRef([])
    const rafRef = useRef(null) 
    const BALL_RADIUS = 15

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
                  
                cxt.save()

                cxt.beginPath()
                cxt.arc(ball.pos.x, ball.pos.y, BALL_RADIUS, 0, 2*Math.PI)
                cxt.stroke()
                cxt.clip()
                cxt.drawImage(ball.image, ball.pos.x - (ball.image.width / 2), ball.pos.y - (ball.image.height / 2))
                
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
            ballGroup.current = []
            cancelAnimationFrame(rafRef.current)
        }
    },[])

    function addBalls(){
        const newBallGroup = []

        for (let user of userList){
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
            const ball = new Ball(origin, ballGroup, canvasRef.current.width, canvasRef.current.height, null, user["avatar"], BALL_RADIUS)

            const img = new Image()
            img.src = user["avatar"]
            img.onload = ()=>{
                const scaledImg = document.createElement("canvas")

                const scalar = (BALL_RADIUS * 2) / img.width
                const scaledWidth = BALL_RADIUS * 2
                const scaledHeight = img.height * scalar
                
                scaledImg.width = scaledWidth
                scaledImg.height = scaledHeight
                scaledImg.getContext("2d").drawImage(img, 0, 0, scaledWidth, scaledHeight)
                ball.image = scaledImg
            }
            newBallGroup.push(ball)
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