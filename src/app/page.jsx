import Home from "./Home"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

async function RootHome(){
  const allCookies = await cookies()
  const session = allCookies.get("session")?.value

  if (session){
    redirect("/platform")
  }
  return <Home/>
}

export default RootHome