import styles from "styles/components/ChooseImage.module.css"
import { updateUserInfoReq, uploadNewImageReq } from "backend/requests"
import { useEffect, useRef, useState } from "react"

function ChooseImage({setIsChangingImage, userInfo, setUserInfo, sendJsonMessage}){
  const [availableImages, setAvailableImages] = useState([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const pannableImageRef = useRef(null)
  const storedImageRef = useRef(null)
  const viewportRef = useRef(null)
  const panImageInfo = useRef({
    "translateX": 0,
    "translateY": 0,
  })

  const VIEWPORT_DIAMETER = 150
  
  const publicImages = [
      "http://localhost:5000/users/images/public/willow.png",
      "http://localhost:5000/users/images/public/man.png",
      "http://localhost:5000/users/images/public/dude.png",
    ]

  useEffect(()=>{
    setAvailableImages([...publicImages, ...userInfo["images"]]) 
  },[])
  
  useEffect(()=>{
    if (!isUploadingImage || !pannableImageRef.current) return

    const img = storedImageRef.current

    const smallestDimension = Math.min(img.width, img.height)
    let scalar = smallestDimension < VIEWPORT_DIAMETER ? VIEWPORT_DIAMETER / smallestDimension : 1
    pannableImageRef.current.width = img.width * scalar
    pannableImageRef.current.height = img.height * scalar
    pannableImageRef.current.getContext("2d").drawImage(img, 0, 0, pannableImageRef.current.width, pannableImageRef.current.height)

    panImageInfo.current["translateX"] = 0
    panImageInfo.current["translateY"] = 0
  },[isUploadingImage])

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

  async function handleImageSetup(e) {
    const file = e.target.files[0]
    if (!/^image/.test(file["type"])){
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.src = url
    img.onload = () => {
      setIsUploadingImage(true)
      storedImageRef.current = img
      URL.revokeObjectURL(url)
    }
  } 

  // async function convertCanvasToFile(canvas) {
  //   // canvas.toBlob(()=>)
  //   return file
  // }
  async function uploadNewImage(e){ 
    const croppedUpload = document.createElement("canvas")
    croppedUpload.width = VIEWPORT_DIAMETER
    croppedUpload.height = VIEWPORT_DIAMETER
    croppedUpload.getContext("2d").drawImage(pannableImageRef.current, -1 * panImageInfo.current["translateX"], -1 * panImageInfo.current["translateY"], VIEWPORT_DIAMETER, VIEWPORT_DIAMETER, 0, 0, VIEWPORT_DIAMETER, VIEWPORT_DIAMETER)
    const file = await convertCanvasToFile(croppedUpload)

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

  function startDrag(e){

    let canvasRect = pannableImageRef.current.getBoundingClientRect()
    const viewportRect = viewportRef.current.getBoundingClientRect()
    
    const startMousePos = [Math.round(e.clientX), Math.round(e.clientY)]
    const shiftX = panImageInfo.current["translateX"]
    const shiftY = panImageInfo.current["translateY"]

    function onMoveNavigate(e){
      const pos = [Math.round(e.clientX), Math.round(e.clientY)]
      const offset = [pos[0] - startMousePos[0], pos[1] - startMousePos[1]]

      let newShiftX = panImageInfo.current["translateX"]
      let newShiftY = panImageInfo.current["translateY"]

      console.log(viewportRect.width, viewportRect.right - viewportRect.left)
      const withinHorizontalBounds = 
      (canvasRect.left + offset[0] <= viewportRect.left) && 
      (canvasRect.right + offset[0] >= viewportRect.right)
      const withinVerticalBounds = 
      (canvasRect.top + offset[1] <= viewportRect.top) && 
      (canvasRect.bottom + offset[1] >= viewportRect.bottom)


      if (withinHorizontalBounds){
        newShiftX = shiftX + offset[0]
      }
      if (withinVerticalBounds){
        newShiftY = shiftY + offset[1]
      }
      pannableImageRef.current.style.transform = `translate(${newShiftX}px, ${newShiftY}px)`;
      panImageInfo.current["translateX"] = newShiftX
      panImageInfo.current["translateY"] = newShiftY

    }

    function onReleaseNavigate(e){
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMoveNavigate)
      document.removeEventListener("mouseup", onReleaseNavigate)
    }

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMoveNavigate)
    document.addEventListener("mouseup", onReleaseNavigate)
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
        <input type="file" hidden onChange={handleImageSetup}/>
      </label>
      {
        isUploadingImage &&
        <section className={styles.selectImageArea}>
          <h2>Customize Visible Region</h2>
          <section ref={viewportRef} className={styles.viewport}>
            <canvas 
            ref={pannableImageRef}
            onMouseDown={startDrag}
            ></canvas>
          </section>
          <button onClick={uploadNewImage}> 
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