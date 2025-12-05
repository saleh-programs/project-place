import { redirect } from "next/navigation"

function PlatformHome(){
  redirect("/platform/chat")

  return(
    <div>
      This is not needed
    </div>
  )
}

export default PlatformHome