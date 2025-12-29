import { useMemo, useRef } from "react"
import { ChatContext } from "./contexts"

function ChatProvider({children}){  
    const messagesRef= useRef([])   
    const value = useMemo(() => ({messagesRef}), [])

    return(
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
export default ChatProvider