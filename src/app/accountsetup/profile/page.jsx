import ChooseAvatar from "./ChooseAvatar"
import { cookies } from "next/headers"
import { getUserInfoReq, getDefaultAvatars } from "backend/requests"

const NEXT_PUBLIC_HTTP_BACKEND_URL = process.env.NEXT_PUBLIC_HTTP_BACKEND_URL

async function Profile(){
    const allCookies = await cookies()

    const [initialUserInfo, publicImages] = await Promise.all([getUserInfoReq(allCookies.toString()), getDefaultAvatars()])
    if (!initialUserInfo){
        const session = allCookies.get("session")?.value
        session && redirect(`${NEXT_PUBLIC_HTTP_BACKEND_URL}/logout`)
        redirect(`/`) 
    }
    return <ChooseAvatar {...{initialUserInfo, publicImages}}/>
}
export default Profile