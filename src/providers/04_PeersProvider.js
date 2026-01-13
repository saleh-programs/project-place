import { useContext, useMemo, useState } from "react"
import { UserContext, RoomContext, PeersContext } from "./contexts"

function PeersProvider({children}){  
    const {username, userInfo} = useContext(UserContext)
    const {siteHistoryRef} = useContext(RoomContext)
    const [userStates, setUserStates] = useState({})
    
    function updateUserStates(data) {
        switch (data.type) {
            case "newUser":{
                setUserStates(prev => {
                    return {
                        ...prev,
                        [data["username"]]: {
                            avatar: `https://project-place-assets.s3.us-east-2.amazonaws.com/public/avatars/${data["username"]}`,
                            status: "idle",
                            location: data["data"]["location"]
                        }
                    };
                });
                break;
            }case "userLeft":
                setUserStates(prev => {
                    const newUserStates = {...prev}
                    if (newUserStates.hasOwnProperty(data["username"])){
                        delete newUserStates[data["username"]]
                    }
                    return newUserStates
                });
                break;
            case "userInfo":
                setUserStates(prev => {
                    return {
                        ...prev,
                        [data["username"]]: {
                            ...prev[data["username"]],
                            ...data["data"]
                        }
                    };
                });
                break;
            case "getUsers":
                const locations = ["videochat", "chat", "whiteboard"]
                const getLocation = () => {
                    let currLocation = "chat"
                    for (let i = 0; i < locations.length; i++){
                        if (window.location.pathname.includes(locations[i])){
                            return locations[i]
                        }
                    }
                    return currLocation
                }
                const users = {
                    [username]: {
                        avatar: userInfo["avatar"],
                        status: "idle",
                        location: getLocation()
                    }
                };
                data["data"].forEach(user => {
                    users[user["username"]] = {
                        avatar: `https://project-place-assets.s3.us-east-2.amazonaws.com/public/avatars/${user["username"]}`,
                        status: "idle",
                        location: user["location"]
                    };
                });
                setUserStates(users);

                const id = setInterval(() => {
                    setUserStates(prev => {
                        if (JSON.stringify(prev) === "{}"){
                            clearInterval(id)
                            return prev
                        }
                        if (prev[username]["location"] === getLocation()) return prev
                        window.location.reload()
                        return prev
                    })
                }, 3000)
                siteHistoryRef.current["userHistoryReceived"] = true;
                break;
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