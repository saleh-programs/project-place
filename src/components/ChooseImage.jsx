import styles from "styles/components/ChooseImage.module.css"
import { modifyUserInfoReq } from "backend/requests"

function ChooseImage({setIsChangingImage, username, setUserInfo}){
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
      </section>

      <button className={styles.exit} onClick={()=>setIsChangingImage(false)}>
        X
      </button>    
    </div>
  )
}
export default ChooseImage