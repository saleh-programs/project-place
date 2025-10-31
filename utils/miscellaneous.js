
function throttle(func, delay=80){
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
        },delay)
    }
    function cancelTimer(){
        clearTimeout(timerID)
    }

    return [(...args) => {
        lastFunc = args
        if (timerID === null){
            restartTimer()
            func(...args)
            lastFunc = null
        }
    }, cancelTimer]
}

export {throttle}