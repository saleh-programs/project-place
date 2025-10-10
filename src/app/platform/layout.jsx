import MainDisplay from "./MainDisplay"
import { getUserInfoReq, getSessionUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"

async function PlatformLayout({ children }) {

  //Eventually flow will be get/store tokens here, no more session info. App will use the tokens we get here for all api calls...
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session").value

  const initialUserInfo = await getUserInfoReq(sessionToken) 

  const username = `murad${Math.floor(Math.random()*1000)}`  //initialUserInfo["username"]

  if (!username){
    redirect("/accountsetup")
  } 

  return (
    <MainDisplay {...{username, initialUserInfo}}>
      {children}
    </MainDisplay>
  )
}


export default PlatformLayout