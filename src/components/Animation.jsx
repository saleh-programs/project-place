import { useEffect, useRef } from "react"

function Animation({path, type="loop"}){
    const imgRef = useRef(null)
    const frame = useRef(0);

    useEffect(()=>{        
        const [folder, numFiles] = path.split("?");
        
        let raf
        const updateImg = ()=>{
            imgRef.current.src = `${folder}/${frame.current}.png`
            frame.current += 1

            if (frame.current >= Number(numFiles)){
                frame.current = 0
                if (type === "once"){ 
                    return
                }
            }
            raf = requestAnimationFrame(updateImg)
        }
        updateImg()

        return () => {
            cancelAnimationFrame(raf)
        }
    }, [])

    return(
        <>
            <img ref={imgRef} src="" alt="animation"/>
        </>
    )
}

export default Animation