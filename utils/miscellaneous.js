
function throttle(func){
let timerID = null
let lastFunc = null

function restartTimer(){
    timerID = setTimeout(()=>{
    timerID = null
    if (lastFunc){
        func(...lastFunc)
        lastFunc = null
        restartTimer()
    }
    },50)
}

return (...args) => {
    lastFunc = args
    if (timerID === null){
    restartTimer()
    func(...args)
    lastFunc = null
    }
}
}