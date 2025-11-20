import { useEffect, useRef } from "react"
import styles from "styles/components/BallContainer.module.css"

import Ball from "utils/ball.js"


function BallContainer({imgList}){

    const canvasRef = useRef(null)
    const cxtRef = useRef(null)
    const ballGroup = useRef([])

    const rafRef = useRef(null)

    useEffect(()=>{
        const rect = containerRef.current.getBoundingClientRect()
        canvasRef.current.width = rect.width
        canvasRef.current.height = rect.height
        cxtRef.current = canvasRef.current.getContext("2d")

        imgList.forEach(src =>{
            const origin = {x: Math.floor(Math.random() * rect.width),y: Math.floor(Math.random() * rect.height)}
            const img = new Image()
            img.src = src
            ballGroup.current.push(new Ball(origin, ballGroup.current, rect.width, rect.height, img))
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
                // if (!ball.image.complete){
                //     continue
                // }
                const scalar = ball.radius / ball.image.width
                const scaledWidth = ball.radius
                const scaledHeight = ball.image.height * scalar
                
                cxt.beginPath()
                cxt.arc(ball.pos.x, ball.pos.y, ball.radius, 0, 2*Math.PI)
                cxt.stroke()
                cxt.clip()
                // cxt.drawImage(ball.image, ball.pos.x - (scaledWidth/2), ball.pos.y - (scaledHeight/2), scaledWidth, scaledHeight)
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