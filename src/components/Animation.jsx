import { useEffect, useRef } from "react"

function Animation({path, type="loop", speed=1, onClick=null}){
    const imgRef = useRef(null)
    const frame = useRef(0);

    useEffect(()=>{
        const [folder, numFiles] = path.split("?");
        
        let raf
        let dt = Date.now()
        const updateImg = ()=>{
            if (!imgRef.current){
                raf = requestAnimationFrame(updateImg)
                return
            }
            const currTime = Date.now()
            imgRef.current.src = `${folder}/${Math.floor(frame.current)}.png`
            frame.current += ((currTime - dt) / 1000) * speed
            dt = currTime

            if (frame.current >= Number(numFiles)){
                frame.current = 0
                if (type !== "loop"){ 
                    return
                }
            }
            raf = requestAnimationFrame(updateImg)
        }
        if (type !== "button"){
            updateImg()
        }
        

        return () => {
            cancelAnimationFrame(raf)
        }
    }, [])

    function replay(){
        onClick()
        frame.current = 1
        const [folder, numFiles] = path.split("?");
        
        let raf
        let dt = Date.now()
        const updateImg = ()=>{
            const currTime = Date.now()
            imgRef.current.src = `${folder}/${Math.floor(frame.current)}.png`
            frame.current += ((currTime - dt) / 1000) * speed
            dt = currTime

            if (frame.current >= Number(numFiles)){
                frame.current = 0
                requestAnimationFrame(()=>{
                    imgRef.current.src = `${folder}/0.png`
                })
                return
            }
            raf = requestAnimationFrame(updateImg)
        }
        updateImg()
    }
    
    return(
        <>
            <img ref={imgRef} src={`${path.split("?")[0]}/0.png`} onClick={replay} alt="animation"/>
        </>
    )
}

export default Animation