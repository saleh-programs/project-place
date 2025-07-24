import MainDisplay from "../../components/MainDisplay"
import { getUserInfoReq, getSessionUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"

async function PlatformLayout({ children }) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session").value

  const infoRes = await getSessionUserInfoReq(sessionToken)
  const email = infoRes["email"]

  const userInfo = await getUserInfoReq(email)
  const username = userInfo["username"]

  if (!username){
    redirect("/accountsetup")
  } 

  return (
    <MainDisplay {...{username, userInfo}}>
      {children}
    </MainDisplay>
  )
}


export default PlatformLayout