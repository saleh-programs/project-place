import { useEffect, useRef } from "react"
import styles from "styles/components/BallContainer.module.css"

import Ball from "utils/ball.js"

// class Ball{
//     constructor(origin, circle_group, width, height){


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
            ballGroup.current.push(new Ball(origin, ballGroup.current, rect.width, rect.height, src))
        })


        let last = null;
        function updateBalls(step){
            if (!last){
                last = 0;
            }
            
            const cxt = cxtRef.current
            const canvas = canvasRef.current
            rafRef.current = requestAnimationFrame(()=>{
                cxt.clearRect(0,0, canvas.width, canvas.height)
                ballGroup.current.forEach(ball => {
                    ball.update()
                })
            })
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