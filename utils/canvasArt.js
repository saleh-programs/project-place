import Queue from "./Queue"

function draw(commands, canvas, erase, options){
    const context = canvas.getContext("2d")
    const {
      lineWidth, 
      color, 
      persistent=false} = options

    if (persistent){
      for (let i = 0; i < commands.length; i++){
        context.lineTo(...commands[i])
        context.stroke()
      }
      return
    }

    context.lineWidth = lineWidth
    context.strokeStyle = color
    context.globalCompositeOperation = erase ? "destination-out" : "source-over"

    context.beginPath()
    context.moveTo(...commands[0])
    for (let i = 1; i < commands.length; i++){
      context.lineTo(...commands[i])
      context.stroke()
    }
}
function fill([X,Y], canvas, options){
  const cxt = canvas.getContext('2d')
  const {color} = options

  // store starting color
  const startImage = cxt.getImageData(X, Y,1,1)
  const startColor = startImage.data

  // get computed fill color 
  cxt.fillStyle = color
  cxt.fillRect(X,Y,1,1)
  const fillColor = cxt.getImageData(X,Y,1,1).data
  cxt.putImageData(startImage,X,Y)


  const canvasImage = cxt.getImageData(0,0,canvas.width,canvas.height)
  const canvasData = canvasImage.data

  //bfs fill
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
function clear(canvas){
  canvas.getContext("2d").clearRect(0,0,canvas.width, canvas.height)
}

export {draw, fill, clear}