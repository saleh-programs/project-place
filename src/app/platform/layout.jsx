import MainDisplay from "../../components/MainDisplay"
import { getUsernameReq, getUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"

async function PlatformLayout({ children }) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session").value

  const infoRes = await getUserInfoReq(sessionToken)
  const usernameRes = await getUsernameReq(infoRes["email"])
  const username = usernameRes["username"]

  if (!username){
    redirect("/accountsetup")
  } 

  return (
    <MainDisplay username={username}>
      {children}
    </MainDisplay>
  )
}


export default PlatformLayout