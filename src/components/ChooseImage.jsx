import styles from "styles/components/ChooseImage.module.css"
import { updateUserInfoReq, uploadNewImageReq } from "backend/requests"
import { useEffect, useState } from "react"

function ChooseImage({setIsChangingImage, userInfo, setUserInfo, sendJsonMessage}){
  const [availableImages, setAvailableImages] = useState([])
  const publicImages = [
      "http://localhost:5000/users/images/public/willow.png",
      "http://localhost:5000/users/images/public/man.png",
      "http://localhost:5000/users/images/public/dude.png",
    ]

  useEffect(()=>{
    setAvailableImages([...publicImages, ...userInfo["images"]]) 
    console.log(userInfo["images"])
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
    // sendJsonMessage({
    //   "origin": "user",
    //   "type": "userInfo",
    //   "username": username, 
    //   "data": {
    //     "imageURL": imageURL
    //   }
    // })

    setIsChangingImage(false)
  }
  async function uploadNewImage(e){ 
    const file = e.target.files[0]
    const newPath = await uploadNewImageReq(file)
    console.log(newPath)
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
  }

  return(
    <div className={styles.chooseImage}>
      <h1>Choose your new Image</h1>
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

      <label className={styles.uploadImage}>
        Upload a new Image
        <input type="file" hidden onChange={uploadNewImage}/>
      </label>

      <button className={styles.exit} onClick={()=>setIsChangingImage(false)}>
        X
      </button>    
    </div>
  )
}
export default ChooseImage