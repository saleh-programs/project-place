import MainDisplay from "../../components/MainDisplay"
import { getUserInfoReq, getSessionUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"

async function PlatformLayout({ children }) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session").value

  const infoRes = await getSessionUserInfoReq(sessionToken)
  const email = infoRes["email"]

  const userInfoInitial = await getUserInfoReq(email)

  const username = `murad${Math.floor(Math.random()*1000)}` // userInfoInitial["username"]

  if (!username){
    redirect("/accountsetup")
  } 

  return (
    <MainDisplay {...{username, userInfoInitial}}>
      {children}
    </MainDisplay>
  )
}


export default PlatformLayout