import styles from "styles/components/ChooseImage.module.css"
import { updateUserInfoReq, uploadNewImageReq } from "backend/requests"
import { useEffect, useRef, useState } from "react"

function ChooseImage({setIsChangingImage, userInfo, setUserInfo, sendJsonMessage}){
  const [availableImages, setAvailableImages] = useState([])

  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const isUploadingImageRef = useRef(false)
  
  const publicImages = [
      "http://localhost:5000/users/images/public/willow.png",
      "http://localhost:5000/users/images/public/man.png",
      "http://localhost:5000/users/images/public/dude.png",
    ]

  useEffect(()=>{
    setAvailableImages([...publicImages, ...userInfo["images"]]) 
  },[])

  async function setNewUserImage(imageURL){
    const result = await updateUserInfoReq({"avatar": imageURL})
    if (!result){
      return
    }
    setUserInfo(prev => {
      return {
        ...prev,
        "avatar": imageURL
      }
    })
    sendJsonMessage({
      "origin": "user",
      "type": "userInfo",
      "username": userInfo["username"], 
      "data": {
        "avatar": imageURL
      }
    })

    setIsChangingImage(false)
  }
  async function uploadNewImage(e){ 
    const file = e.target.files[0]
    const newPath = await uploadNewImageReq(file)
    if (!newPath){
      return
    }

    let newImagesList = [...userInfo["images"], newPath]
    const result = await updateUserInfoReq({"images": JSON.stringify(newImagesList)})
    if (!result){
      return
    }
    setUserInfo((prev) => {
      return {
        ...prev,
        "images": newImagesList
      }
    })
    setAvailableImages([...publicImages, ...newImagesList])
    e.target.value = ""
  }

  return(
    <div className={styles.chooseImage}>
      <h1>Choose Your Avatar</h1>
      <section className={styles.scrollableImages}>
        {
          availableImages.map((imageURL)=>{
            return (
              <div key={imageURL} onClick={()=>setNewUserImage(imageURL)} className={styles.imgContainer}>
                <img src={imageURL} alt="nth" /> 
              </div>
            )
          })
        }
      </section>

      <label className={styles.uploadImageBtn}>
        Upload a new Image
        <input type="file" hidden onChange={()=>setIsUploadingImage(true)}/>
      </label>
      {
        isUploadingImage &&
        <section className={styles.selectImageArea}>
          <h2>Customize Visible Region</h2>
          <section className={styles.viewport}>

          </section>
          <button>
            Finish and Upload
          </button>
          <button className={styles.exit} onClick={()=>setIsUploadingImage(false)}>
            X
          </button>  
        </section>
      }

      <button className={styles.exit} onClick={()=>setIsChangingImage(false)}>
        X
      </button>    
    </div>
  )
}
export default ChooseImage