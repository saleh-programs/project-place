import { redirect } from "next/navigation"

function Loading(){
  redirect("/platform/chat")

  return(
    <div>
      This is essentially a loading screen
    </div>
  )
}

export default Loading