"use client"

import { useRouter, useSearchParams } from "next/navigation"

function PeerCall(){
    const router = useRouter()
    const searchParams = useSearchParams()
    return(
        <div>
            hello to peer {searchParams.get("peer")}!
        </div>
    )
}
export default PeerCall