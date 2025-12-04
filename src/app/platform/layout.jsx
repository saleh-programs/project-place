import MainDisplay from "./MainDisplay"
import { getUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"


async function PlatformLayout({ children }) {
  const allCookies = await cookies()
  const storedRoomID = allCookies.get("roomID")?.value
  const storedRoomName = allCookies.get("roomName")?.value
  const session = allCookies.get("session")?.value

  const initialUserInfo = await getUserInfoReq(session) 
  initialUserInfo["storedRoomID"] = storedRoomID
  initialUserInfo["storedRoomName"] = storedRoomName
  
  const username = initialUserInfo["username"]

  if (!username){
    redirect(`/accountsetup`) 
  } 
  return (
    <MainDisplay {...{username, initialUserInfo}}>
      {children}
    </MainDisplay>
  )
}


export default PlatformLayout