import { useContext, useMemo, useRef } from "react"
import { RoomContext, WhiteboardContext } from "./contexts"

function WhiteboardProvider({children}){  
    const {siteHistoryRef, externalWhiteboardRef} = useContext(RoomContext)
    const savedCanvasInfoRef = useRef({
        "snapshot": null,
        "operations": [],
        "latestOp": -1
    })
    async function reconstructCanvas(data){
        const canvasBuffer = await data.arrayBuffer()

        const view = new DataView(canvasBuffer)
        const opsLen = view.getUint32(0, false)

        savedCanvasInfoRef.current["latestOp"] = view.getInt8(4)
        savedCanvasInfoRef.current["operations"] = JSON.parse(new TextDecoder().decode(canvasBuffer.slice(5,5+opsLen)))

        const img = await createImageBitmap(new Blob([canvasBuffer.slice(5+opsLen)], {"type": "image/png"}))
        
        const tempCanvas = Object.assign(document.createElement("canvas"), {"width":1000, "height":1000})
        const tempCxt = tempCanvas.getContext("2d")
        tempCxt.drawImage(img, 0, 0)
        savedCanvasInfoRef.current["snapshot"] = tempCanvas
        img.close()

        externalWhiteboardRef.current("canvasReceived")
        siteHistoryRef.current["canvasHistoryReceived"] = true;
    }
    
    const value = useMemo(() => ({savedCanvasInfoRef, reconstructCanvas}), [])

    return(
        <WhiteboardContext.Provider value={value}>
            {children}
        </WhiteboardContext.Provider>
    )
}
export default WhiteboardProvider