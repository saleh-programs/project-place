import { memo, useContext, useEffect, useRef, useState } from "react"

import { UserContext, WebSocketContext } from "src/providers/contexts"
import styles from "styles/components/ChooseImage.module.css"
import { uploadNewImageReq, getDefaultAvatars, updateProfilePictureReq } from "backend/requests"

function ChooseImage({setIsChangingImage}){
  const {userInfo, setUserInfo} = useContext(UserContext)
  const {sendJsonMessage} = useContext(WebSocketContext)

  const [availableImages, setAvailableImages] = useState([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const fileinputRef = useRef(null)
  const pannableImageRef = useRef(null)
  const storedImageRef = useRef(null)
  const viewportRef = useRef(null)
  const panImageInfo = useRef({
    "translateX": 0,
    "translateY": 0,
  })

  const VIEWPORT_DIAMETER = 150
  
  const publicImagesRef = useRef([])

  useEffect(()=>{
    getDefaultAvatars
    .then(imgs => {
      publicImagesRef.current = imgs
      setAvailableImages([...publicImagesRef.current, ...userInfo["images"]])
    })
    setAvailableImages([...userInfo["images"]])
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

  async function setNewUserImage(key){
    const result = await updateProfilePictureReq(key)
    if (!result){
      return
    }
    setUserInfo(prev => {
      return {...prev}
    })
    sendJsonMessage({
      "origin": "user",
      "type": "userInfo",
      "username": userInfo["username"], 
      "data": {}
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

  async function convertCanvasToFile(canvas) {
    const blob = await new Promise(resolve => {
      canvas.toBlob(b=>resolve(b))
    })
    return new File([blob], "temp.png", {"type": "image/png"})
  }

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
    setIsUploadingImage(false)
    let newImagesList = [...userInfo["images"], newPath]

    setUserInfo((prev) => {
      return {
        ...prev,
        "images": newImagesList
      }
    })

    setAvailableImages([...publicImagesRef.current, ...newImagesList])
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
          availableImages.map(({url, key})=>{
            return (
              <div key={url} onClick={()=>setNewUserImage(key)} className={styles.imgContainer}>
                <img src={url} alt="nth" /> 
              </div>
            )
          })
        }
      </section>

      <label className={styles.uploadImageBtn}>
        Upload a new Image
        <input ref={fileinputRef} type="file" hidden onChange={handleImageSetup}/>
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
            Upload
          </button>
          <button className={styles.exit} onClick={()=>{setIsUploadingImage(false);fileinputRef.current.value=""}}>
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
export default memo(ChooseImage)