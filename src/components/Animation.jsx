import { useEffect, useRef, useState } from "react"
import {preload} from "src/assets/preloadedImages.js"

function Animation({path, type="loop", speed=1, onClick=null}){
    const frame = useRef(0)
    const frameList = useRef([])
    const canvasRef = useRef(null)
    const cxtRef = useRef(null)

    const rafRef = useRef(null)

    const [dimensions, setDimensions] = useState(null)

    useEffect(()=>{
        const [frames, loadingFrames] = preload(path)
        loadingFrames.then(()=>{
            setDimensions([frames[0].width, frames[0].height])
            frameList.current = frames
        })
    },[path])

    useEffect(()=>{
        if (!dimensions){
            return
        }

        cxtRef.current = canvasRef.current.getContext("2d")
        frame.current = 0;

        let last = Date.now()
        const updateCanvas = () => {
            cxtRef.current.clearRect(0,0,dimensions[0],dimensions[1])
            cxtRef.current.drawImage(frameList.current[Math.floor(frame.current)], 0, 0)
            const currTime = Date.now()
            frame.current += ((currTime - last) / 1000) * speed
            last = currTime

            if (frame.current >= frameList.current.length){
                frame.current = 0
                if (type !== "loop"){ 
                    return
                }
            }
            rafRef.current = requestAnimationFrame(updateCanvas)
        }

        if (type !== "button"){
            updateCanvas()
        }else{
            cxtRef.current.clearRect(0,0,dimensions[0],dimensions[1])
            cxtRef.current.drawImage(frameList.current[Math.floor(frame.current)], 0, 0)
        }
        return () => {
            cancelAnimationFrame(rafRef.current)
        }
    }, [dimensions])

    function replay(){
        if (!onClick){
            return
        }
        cancelAnimationFrame(rafRef.current)
        onClick()
        frame.current = 1
        
        let last = Date.now()
        const updateCanvas = () => {
            cxtRef.current.clearRect(0,0,dimensions[0],dimensions[1])
            cxtRef.current.drawImage(frameList.current[Math.floor(frame.current)], 0, 0)
            const currTime = Date.now()
            frame.current += ((currTime - last) / 1000) * speed
            last = currTime

            if (frame.current >= frameList.current.length){
                frame.current = 0
                rafRef.current = requestAnimationFrame(()=>{
                    cxtRef.current.clearRect(0,0,dimensions[0],dimensions[1])
                    cxtRef.current.drawImage(frameList.current[0], 0, 0)
                })
                return
            }
            rafRef.current = requestAnimationFrame(updateCanvas)
        }
        updateCanvas()
    }
    
    if (!dimensions){
        return <></>
    }
    return(
        <>
            <canvas ref={canvasRef} width={dimensions[0]} height={dimensions[1]} onClick={replay}/>
        </>
    )
}

export default Animation