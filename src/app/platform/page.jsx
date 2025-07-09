import { redirect } from "next/navigation"

import styles from "styles/platform/PlatformHome.module.css"

function PlatformHome(){
  redirect("/platform/chat")

  return(
    <div>
      This is essentially a loading screen
    </div>
  )
}

export default PlatformHome