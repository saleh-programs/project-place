import MainDisplay from "./MainDisplay"
import { getUserInfoReq, getSessionUserInfoReq } from "../../../backend/requests"

import { redirect } from "next/navigation"

async function PlatformLayout({ children }) {
  const initialUserInfo = await getUserInfoReq() 
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