import { useEffect, useRef, useState } from "react";
import styles from "styles/components/FileViewer.module.css"

const extensionToMimeType = {
    "jpg": "image/jpg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",

    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "mkv": "video/x-matroska",
    "webm": "video/webm",
    
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "ogg": "audio/ogg",

    "txt": "text/plain",
    "md": "text/markdown",
    "csv": "text/csv",
    "html": "text/html",
    "css": "text/css",
    "js": "text/javascript",
    "ts": "text/typescript",
    "c": "text/x-c", 
    "cpp": "text/x-c++",
    "py": "text/x-python",

    "pdf": "application/pdf",
    "zip": "application/zip",
    "json": "application/json",
    "rar": "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    "tar": "application/x-tar", 
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "odt": "application/vnd.oasis.opendocument.text",
    
}

function FileViewer({url, dimensions, type = null, size = 100000}){
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)

    const fileElem = useRef(null)
    const fillElem = useRef(null)
    const elem = getFile()



    useEffect(() => {
        if (error) return;

        // start loading animation
        let lastDT = Date.now()
        const estimatedTime = (Math.max(10000,size - 100000) / 1000000) * 1000 //subtract 100KB because upload began some time ago
        let elapsed = 0
        let timeoutID = null
        const increaseLoad = () => {
            if (!fillElem.current){
                return
            }
            const currTime = Date.now()
            elapsed += (currTime - lastDT)
            lastDT  = currTime
            fillElem.current.style.width = `${Math.round((elapsed / estimatedTime) * 100)}%`
            if (elapsed >= estimatedTime){
                fillElem.current.style.width = `100%`
                timeoutID = setTimeout(() => {
                    clearInterval(id)
                    setError(true)
                },5000)
                return
            }
            requestAnimationFrame(increaseLoad)
        }

        // check frequently if file is available yet
        let checking = false
        const checkAvailability = async () => {
            if (checking) return
            checking = true
            const response = await fetch(url)

            if (response.ok){
                cancelAnimationFrame(increaseLoad)
                clearInterval(id)
                clearTimeout(timeoutID)
                setLoading(false)
            }
            checking = false
        }
       const id = setInterval(checkAvailability, 700)
       requestAnimationFrame(increaseLoad)
       checkAvailability()

        return () => {
            cancelAnimationFrame(increaseLoad)
            clearInterval(id)
        }
    }, [])

    function getFile(){
        let mimeType = "application/octet-stream"
        let extension;
        if (!type){
            extension = url.split(".").at(-1).toLowerCase()
            if (extension.length === url.length){
                return null
            }
            if (Object.hasOwn(extensionToMimeType, extension)){
                mimeType = extensionToMimeType[extension]
            }
        }else{
            mimeType = type;
        }
        const [fileCategory, fileKind] = mimeType.split("/")
        
        if (!loading){
            switch (fileCategory){
                case "image":
                    return <img ref={fileElem} src={url} alt="file"/>
                case "video":
                    return <video ref={fileElem} src={url} onClick={e=>e.preventDefault()} controls/>
                case "audio":
                    return <audio ref={fileElem} src={url} controls/>
                case "application":
                    if (fileKind === "pdf"){
                        return <embed ref={fileElem} />
                    }
                    if (["zip", "x-tar", "x-rar-compressed", "x-7z-compressed"].includes(fileKind)){
                        return <img ref={fileElem} src="/compressed_file_icon.png" alt="file" />
                    }
                    return <img ref={fileElem} src="/uncommon_file_icon.png" alt="file" />
                case "text":
                    return <img ref={fileElem} src="/file_icon.png" alt="file" />
            }
            return  <img ref={fileElem} src="/uncommon_file_icon.png" alt="file" />
        }
        switch (fileCategory){
            case "image":
                return <img ref={fileElem} alt="file"/>
            case "video":
                return <video ref={fileElem} preload="none" controls/>
            case "audio":
                return <audio ref={fileElem} controls/>
            case "application":
                if (fileKind === "pdf"){
                    return <embed ref={fileElem} />
                }
                if (["zip", "x-tar", "x-rar-compressed", "x-7z-compressed"].includes(fileKind)){
                    return <img ref={fileElem} src="/compressed_file_icon.png" alt="file" />
                }
                return <img ref={fileElem} src="/uncommon_file_icon.png" alt="file" />
            case "text":
                return <img ref={fileElem} src="/file_icon.png" alt="file" />
        }
        return  <img ref={fileElem} src="/uncommon_file_icon.png" alt="file" />
    }

    if (error){
        return (
            <a className={styles.fileviewer} href={url} target="_blank" style={{border: "1px dotted red", boxShadow: "3px 3px 3px black"}}>
                <img src="/error.png"/>
            </a>
            )
    }else if (loading){
        if (dimensions){
            const height = Math.min(200,Math.max(50,dimensions[1]))
            const width = Math.round(dimensions[0] * (height / dimensions[1]))
            return (
                <a className={styles.fileviewer} href={url} target="_blank" style={{width:`${width}px`, height:`${height}px`}}>
                    <section className={styles.loadcontainer}>
                        <span className={styles.loadbar}>
                            <span className={styles.loadarea} ref={fillElem}>
                            </span>
                        </span>
                    </section>
                    {elem}
                </a>
            )
        }
        return (
            <a className={styles.fileviewer} href={url} target="_blank">
                <section className={styles.loadcontainer}>
                    <span className={styles.loadbar}>
                        <span className={styles.loadarea} ref={fillElem}>
                        </span>
                    </span>
                </section>
                {elem}
            </a>
        )
    }else{
        if (dimensions){
            const height = Math.min(200,Math.max(50,dimensions[1]))
            const width = Math.round(dimensions[0] * (height / dimensions[1]))
            return (
                <a className={styles.fileviewer} href={url} target="_blank" style={{width:`${width}px`, height:`${height}px`}}>
                    {elem}
                </a>
            )
        }
        return (
            <a className={styles.fileviewer} href={url} target="_blank">
                {elem}
            </a>
        )
    }
}

export default FileViewer
