import { useContext, useMemo, useState } from "react"
import { UserContext, RoomContext, PeersContext } from "./contexts"

function PeersProvider({children}){  
    const {username, userInfo} = useContext(UserContext)
    const {siteHistoryRef} = useContext(RoomContext)
    const [userStates, setUserStates] = useState({})
    
    function updateUserStates(data){
        switch (data.type){
            case "newUser":
            setUserStates(prev => {
                return ({
                ...prev, 
                [data["username"]]: {
                    "avatar": `http://localhost:5000/users/images/${data["username"]}`,
                    "status": "idle",
                    "location": "chat"
                }})
            })
            break
            case "userInfo":
            setUserStates(prev => {
                console.log(prev)
                return ({
                ...prev, 
                [data["username"]]: {
                    ...prev[data["username"]],
                    ...data["data"]
                }})
            })
            break
            case "getUsers":
            const users = {
                [username]: {
                "avatar": userInfo["avatar"],
                "status": "idle",
                "location": "chat"
                }
            }
            data["data"].forEach(user => {
                users[user] = {
                "avatar": `http://localhost:5000/users/images/${user}`,
                "status": "idle",
                "location": "chat"          
                }
            })
            setUserStates(users)
            siteHistoryRef.current["userHistoryReceived"] = true;
            break
        }
    }
    const value = useMemo(() => ({userStates, setUserStates, updateUserStates}), [userStates])

    return(
        <PeersContext.Provider value={value}>
            {children}
        </PeersContext.Provider>
    )
}
export default PeersProvider