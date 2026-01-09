import Queue from "./Queue.js"

function draw(commands, canvas, options){
    const context = canvas.getContext("2d")
    const {lineWidth, color, persistent=false, prev=null, erasing=false} = options

    if (persistent){
      let last = prev;
      for (let i = 0; i < commands.length; i++){
        const midpoint = [Math.round((commands[i][0] + last[0])/2),Math.round((commands[i][1] + last[1])/2)]
        context.quadraticCurveTo(...last, ...midpoint)
        last = commands[i]
      }
      context.stroke()
      return
    }

    context.lineWidth = lineWidth
    context.strokeStyle = color
    context.globalCompositeOperation = erasing ? "destination-out" : "source-over"

    context.beginPath()
    context.moveTo(...commands[0])
    for (let i = 1; i < commands.length; i++){
      const midpoint = [Math.round((commands[i][0] + commands[i-1][0])/2),Math.round((commands[i][1] + commands[i-1][1])/2)]
      context.quadraticCurveTo(...commands[i-1], ...midpoint)
    }
    context.lineTo(...commands.at(-1))
    context.stroke()
}


function floodFill([X,Y], canvas, color){
  const cxt = canvas.getContext('2d')
  const startImage = cxt.getImageData(X, Y,1,1)
  const startColor = startImage.data

  cxt.fillStyle = color
  cxt.fillRect(X,Y,1,1)
  const fillColor = cxt.getImageData(X,Y,1,1).data
  cxt.putImageData(startImage,X,Y)


  const canvasImage = cxt.getImageData(0,0,canvas.width,canvas.height)
  const canvasData = canvasImage.data

  const visited = new Uint8Array(canvas.width * canvas.height)
  const pixelQueue = new Queue()
  pixelQueue.enqueue([X,Y])
  const tolerance = 70


  while (!pixelQueue.isEmpty()){
    const [x, y] = pixelQueue.dequeue()
    const val = 4*(x + y * canvas.width)
    const currentColor = [
      canvasData[val],
      canvasData[val + 1],
      canvasData[val + 2],
      canvasData[val + 3]
    ]

    const RGBdistance = 
      (currentColor[0] - startColor[0])**2 +
      (currentColor[1] - startColor[1])**2 +
      (currentColor[2] - startColor[2])**2 +
      (currentColor[3] - startColor[3])**2 


    const matchesColor = RGBdistance < tolerance**2
    if (!matchesColor){
      continue
    }
    canvasData[val] = fillColor[0]
    canvasData[val + 1] = fillColor[1]
    canvasData[val + 2] = fillColor[2]
    canvasData[val + 3] = fillColor[3]

    const neighbors = [
      [x,y-1],[x,y+1],
      [x-1,y],[x+1,y],
    ]
    neighbors.forEach((item)=>{
      const isInCanvas = (item[0] >= 0 && item[0] < canvas.width) && (item[1] >=0 && item[1] < canvas.height);
      if (!visited[item[0] + item[1] * canvas.width] && isInCanvas){
        pixelQueue.enqueue(item);
        visited[item[0] + item[1] * canvas.width] = 1
      }
    })
  }
  cxt.putImageData(canvasImage,0,0)
}

function linefill([X,Y], canvas, color){
  const cxt = canvas.getContext('2d', {willReadFrequently: true})
  const startImage = cxt.getImageData(X, Y,1,1)
  const startColor = startImage.data

  cxt.fillStyle = color
  cxt.fillRect(X,Y,1,1)
  const fillColor = cxt.getImageData(X,Y,1,1).data
  cxt.putImageData(startImage,X,Y)


  const canvasImage = cxt.getImageData(0,0,canvas.width,canvas.height)
  const canvasData = canvasImage.data

  const visited = new Uint8Array(canvas.width * canvas.height)
  const pixelQueue = new Queue()
  pixelQueue.enqueue([X,Y])
  const tolerance = 70

  const validPixel = (x, y, noProcessing=false) => {

      const outsideCanvas = x < 0 || x >= canvas.width || y < 0 || y >= canvas.height
      if (outsideCanvas || visited[x + y * canvas.width]){
        return false
      }

      const val = 4*(x + y * canvas.width)
 
      const RGBdistance = 
        (canvasData[val] - startColor[0])**2 +
        (canvasData[val + 1] - startColor[1])**2 +
        (canvasData[val + 2] - startColor[2])**2 +
        (canvasData[val + 3] - startColor[3])**2 

      const matchesColor = RGBdistance < tolerance**2
      if (matchesColor && !noProcessing){
        visited[x + y * canvas.width] = 1
        canvasData[val] = fillColor[0]
        canvasData[val + 1] = fillColor[1]
        canvasData[val + 2] = fillColor[2]
        canvasData[val + 3] = fillColor[3]
      }
      return matchesColor
  }
  while (!pixelQueue.isEmpty()){
    const [x, y] = pixelQueue.dequeue()

    if (!validPixel(x,y)) continue

    let left = x - 1;
    while (left >= 0){
      if (!validPixel(left, y)){
        left += 1
        break
      }
      left -= 1
    }
    let right = x + 1
    while (right < canvas.width){
      if (!validPixel(right, y)){
        right -= 1
        break
      }
      right += 1
    }

    let trackTop = null
    let trackBottom = null

    for (let i = left; i <= right; i++){
      if (validPixel(i, y - 1, true)){
        if (trackTop !== i - 1){
          pixelQueue.enqueue([i, y-1])
        }
        trackTop = i
      }else{
        trackTop = null
      }
      if (validPixel(i, y + 1, true)){
        if (trackBottom !== i - 1){
          pixelQueue.enqueue([i, y+1])
        }
        trackBottom= i
      }else{
        trackBottom = null
      }
    }
  }

  cxt.putImageData(canvasImage,0,0)
}


function importImage(img, canvas, anchor){

  const row = Math.floor((anchor-1) / 3)
  const col = Math.floor((anchor-1) % 3)

  let top
  let left
  if (row === 0) top = 0
  if (row === 1) top = (canvas.height / 2 - img.height / 2 )
  if (row === 2) top = canvas.height - img.height

  if (col === 0) left = 0
  if (col === 1) left = (canvas.width / 2 - img.width / 2 )
  if (col === 2) left = canvas.width - img.width

  const cxt = canvas.getContext("2d")
  cxt.globalCompositeOperation = "source-over"
  cxt.drawImage(img, left, top)
}

function moveArea(canvas, storedRegion, region1, region2){
  const cxt = canvas.getContext("2d")

  cxt.globalCompositeOperation = "source-over"
  storedRegion.getContext("2d").drawImage(canvas, ...region1, 0, 0, region1[2], region1[3])

  cxt.globalCompositeOperation = "source-over"  
  cxt.clearRect(...region1)
  cxt.drawImage(storedRegion, ...region2)
}

function timeFunction(func){
  const t0 = performance.now()
  func()
  const t1 = performance.now()
  return t1 - t0
}
 
function clear(canvas){
  canvas.getContext("2d").clearRect(0,0,canvas.width, canvas.height)
}

export {draw, floodFill, linefill, clear, importImage, timeFunction, moveArea}