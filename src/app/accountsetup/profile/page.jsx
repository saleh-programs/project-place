import ChooseAvatar from "./ChooseAvatar"
import { cookies } from "next/headers"
import { getUserInfoReq } from "backend/requests"

async function Profile(){
    const allCookies = await cookies()
    const session = allCookies.get("session")?.value

    const initialUserInfo = await getUserInfoReq(session) 

    if (!initialUserInfo){
    session && redirect("http://localhost:5000/logout")
    redirect(`/`) 
    }
    return <ChooseAvatar {...{initialUserInfo}}/>
}
export default Profile