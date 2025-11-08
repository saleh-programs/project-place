
const animations = {
    "/light/chat?20": [],
    "/light/whiteboard?34": [],
    "/light/videochat?18": [],
    "/dark/chat?20": [],
    "/dark/whiteboard?34": [],
    "/dark/videochat?18": [], 
    "/submit?4": [],
}

function preloadAll(){
    const values = Object.entries(animations)
    const allImages = []
    for (let i = 0; i < values.length; i++){
        if (animations[values[i][0]].length > 0){
            continue
        }
        const [folder, numFiles] = values[i][0].split("?")
        for (let j = 0; j < Number(numFiles); j++){
            const frame = new Image()
            frame.src = `${folder}/${j}.png`
            animations[values[i][0]].push(frame)

            allImages.push(new Promise(resolve=>{
                frame.onload = resolve
            }))
        }
    }
    const loadingImages = Promise.all(allImages).then(()=>{
        console.log("All images loaded! at ", Date.now())
    })
    return [animations, loadingImages]
}

function preload(path){
    if (animations[path].length > 0){
        console.log("Already loaded")
        return [animations[path], Promise.resolve()]
    }
    const [folder, numFiles] = path.split("?")
    const allImages = []

    for (let i = 0; i < Number(numFiles); i++){
        const frame = new Image()
        frame.src = `${folder}/${i}.png`
        animations[path].push(frame)

        allImages.push(new Promise(resolve=>{
            frame.onload = resolve
        }))
    }
    const loadingImages = Promise.all(allImages).then(()=>{
        console.log("All images loaded! at ", Date.now())
    })
    return [animations[path], loadingImages]
}

export {preload, preloadAll}