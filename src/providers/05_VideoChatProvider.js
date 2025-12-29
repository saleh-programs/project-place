import { useMemo, useRef, useState } from "react"
import { VideoChatContext } from "./contexts"

function VideoChatProvider({children}){  
    const [callOffers, setCallOffers] = useState({})
    const callOffersRef = useRef(callOffers)

    const device = useRef(null)
    const stunCandidates = useRef({})

    const value = useMemo(() => ({device, callOffersRef, stunCandidates, callOffers, setCallOffers}), [callOffers])

    return(
        <VideoChatContext.Provider value={value}>
            {children}
        </VideoChatContext.Provider>
    )
}
export default VideoChatProvider