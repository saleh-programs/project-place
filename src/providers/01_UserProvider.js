import { useMemo, useState } from "react"
import { UserContext } from "./contexts"

function UserProvider({children, initialUserInfo}){  

    const username = initialUserInfo['username']
    const [userInfo, setUserInfo] = useState(initialUserInfo) 

    const value = useMemo(() => ({username, userInfo, setUserInfo}), [userInfo])

    return(
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    )
}
export default UserProvider