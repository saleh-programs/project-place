import { useEffect, useRef } from "react"
import styles from "styles/components/BallContainer.module.css"

import Ball from "utils/ball.js"


function BallContainer({imgList}){

    const canvasRef = useRef(null)
    const cxtRef = useRef(null)
    const ballGroup = useRef([])

    const rafRef = useRef(null) 

    useEffect(()=>{
        const rect = canvasRef.current.getBoundingClientRect()
        canvasRef.current.width = rect.width
        canvasRef.current.height = rect.height
        cxtRef.current = canvasRef.current.getContext("2d")

        imgList.forEach(src =>{
            const origin = {x: Math.floor(Math.random() * rect.width),y: Math.floor(Math.random() * rect.height)}
            const ball = new Ball(origin, ballGroup.current, rect.width, rect.height)

            const img = new Image()
            img.src = src
            img.onload = ()=>{
                const scaledImg = document.createElement("canvas")

                const scalar = (ball.radius * 2) / img.width
                const scaledWidth = ball.radius * 2
                const scaledHeight = img.height * scalar
                
                scaledImg.width = scaledWidth
                scaledImg.height = scaledHeight
                scaledImg.getContext("2d").drawImage(img, 0, 0, scaledWidth, scaledHeight)
                ball.image = scaledImg
            }
            ballGroup.current.push(ball)
        })

        const cxt = cxtRef.current
        const canvas = canvasRef.current
        let last = null; 
        let dt; 
        function updateBalls(step){
            if (last === null){
                last = step;
            }
            dt = step - last

            cxt.clearRect(0,0, canvas.width, canvas.height)
            for (let ball of ballGroup.current){
                ball.update(dt)
                if (ball.image === null){
                    continue
                }
                  
                cxt.save()
                cxt.beginPath()
                cxt.arc(ball.pos.x, ball.pos.y, ball.radius, 0, 2*Math.PI)
                cxt.stroke()
                cxt.clip()
                cxt.drawImage(ball.image, ball.pos.x - (ball.image.width / 2), ball.pos.y - (ball.image.height / 2))
                cxt.restore()
            }
            rafRef.current = requestAnimationFrame(updateBalls)
        }

        if (ballGroup.current.length > 0){
            rafRef.current = requestAnimationFrame(updateBalls)
        }

        return ()=>{
            cancelAnimationFrame(rafRef.current)
        }
    },[])


    return(
        <canvas className={styles.ballContainer} ref={canvasRef}>
        </canvas>
    )
}

export default BallContainer 