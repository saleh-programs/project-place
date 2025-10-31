import MainDisplay from "./MainDisplay"
import { getUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"


async function PlatformLayout({ children }) {
  const allCookies = await cookies()
  const session = allCookies.get("session")?.value

  const initialUserInfo = await getUserInfoReq(session) 
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