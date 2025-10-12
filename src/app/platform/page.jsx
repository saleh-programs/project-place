import { redirect } from "next/navigation"

function PlatformHome(){
  redirect("/platform/chat")

  return(
    <div>
      This is essentially a loading screen
    </div>
  )
}

export default PlatformHome