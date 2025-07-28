import styles from "styles/components/ChooseImage.module.css"
import { modifyUserInfoReq, uploadNewImageReq } from "backend/requests"
import { use } from "react"

function ChooseImage({setIsChangingImage, username,userInfo, setUserInfo}){
  const publicImages = ["willow","dude","man"]
  
  async function setNewUserImage(imageURL){
    const response = await modifyUserInfoReq({"profilePicURL": imageURL, "username": username})
    if (response){
      setUserInfo((prev) => {
        return {
          ...prev,
          "profilePicURL": imageURL
        }
      })

      setIsChangingImage(false)
    }

  }
  async function uploadNewImage(e){
    const file = e.target.files[0]
    const uploadImageRes = await uploadNewImageReq(file)
    if (!uploadImageRes){
      return
    }

    const oldImagesList = userInfo["images"]
    let newImagesList = []
    if (oldImagesList){
      newImagesList = JSON.parse(oldImagesList)
    }
    newImagesList.push(uploadImageRes)
    const newImagesListStr = JSON.stringify(newImagesList)
    const modifyInfoRes = await modifyUserInfoReq({"images": newImagesListStr, "username": username})
    if (!modifyInfoRes){
      return
    }
    setUserInfo((prev) => {
      return {
        ...prev,
        "images": newImagesListStr
      }
    })
  }

  function getUserImages(){
    console.log(userInfo["images"])
    if (!userInfo["images"]){
      return []
    }
    return JSON.parse(userInfo["images"])
  }
  return(
    <div className={styles.chooseImage}>
      <h1>Choose your new Image</h1>
      <section className={styles.scrollableImages}>
        {
          publicImages.map((item,i)=>{
            const imageURL = `http://localhost:5000/getImage/${item}`
            return (
            <div key={item} onClick={()=>setNewUserImage(imageURL)} className={styles.imgContainer}>
              <img src={imageURL} alt="nth" /> 
            </div>
            )
          })
        }
        {
          getUserImages().map((item,i)=>{
            const imageURL = `http://localhost:5000/getImage/${item}`
            return (
            <div key={item} onClick={()=>setNewUserImage(imageURL)} className={styles.imgContainer}>
              <img src={imageURL} alt="nth" /> 
            </div>
            )
          })
        }
      </section>

      <label htmlFor="imageInput" className={styles.uploadImage}>
        Upload a new Image
        <input type="file" id="imageInput" hidden onChange={uploadNewImage}/>
      </label>

      <button className={styles.exit} onClick={()=>setIsChangingImage(false)}>
        X
      </button>    
    </div>
  )
}
export default ChooseImage