import { useMemo, useState } from "react"
import { AppearanceContext } from "./contexts"
function AppearanceProvider({children}){  
    const [darkMode, setDarkMode] = useState(false)

    const value = useMemo(() => ({darkMode, setDarkMode}), [darkMode])

    return(
        <AppearanceContext.Provider value={value}>
            {children}
        </AppearanceContext.Provider>
    )
}
export default AppearanceProvider