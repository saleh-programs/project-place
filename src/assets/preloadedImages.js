
function preloadAll(){
    const animations = {
        "/light/chat?20": [],
        "/light/whiteboard?34": [],
        "/light/videochat?18": [],
        "/dark/chat?20": [],
        "/dark/whiteboard?34": [],
        "/dark/videochat?18": [], 
        "/submit?4": [],
    }

    const values = Object.entries(animations)
    const allImages = []
    for (let i = 0; i < values.length; i++){
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
    const [folder, numFiles] = path.split("?")
    const animations = []
    const allImages = []

    for (let i = 0; i < numFiles; i++){
        const frame = new Image()
        frame.src = `${folder}/${i}.png`
        animations.push(frame)

        allImages.push(new Promise(resolve=>{
            frame.onload = resolve
        }))
    }
    const loadingImages = Promise.all(allImages).then(()=>{
        console.log("All images loaded! at ", Date.now())
    })
    return [animations, loadingImages]
}

export {preload, preloadAll}