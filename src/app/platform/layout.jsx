import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import MainDisplay from "./MainDisplay"
import { getUserInfoReq } from "backend/requests"
import AllProviders from "src/providers/00_AllProviders"

const NODE_PUBLIC_HTTP_BACKEND_URL = process.env.NODE_PUBLIC_HTTP_BACKEND_URL

async function PlatformLayout({ children }) {

  const allCookies = await cookies()
  const storedRoomID = allCookies.get("roomID")?.value
  const storedRoomName = allCookies.get("roomName")?.value
  const session = allCookies.get("session")?.value

  const initialUserInfo = await getUserInfoReq(session) 
  if (!initialUserInfo){
    session && redirect(`${NODE_PUBLIC_HTTP_BACKEND_URL}/logout`)
    redirect(`/`) 
  }

  initialUserInfo["storedRoomID"] = storedRoomID
  initialUserInfo["storedRoomName"] = storedRoomName
  
  const username = initialUserInfo["username"]

  if (!username){
    redirect(`/accountsetup`) 
  } 
  return (
    <AllProviders initialUserInfo={initialUserInfo}>
      <MainDisplay>
        {children}
      </MainDisplay>
    </AllProviders>
  )
}


export default PlatformLayout