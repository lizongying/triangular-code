/**
 * https://github.com/lizongying/tricode
 */
window.onload = () => {
    const video = document.getElementById('webcam')

    const result = document.getElementById('result')

    const canvas = document.getElementById('canvas')

    const container = document.getElementById('canvasContainer')

    const ctx = canvas.getContext('2d', {willReadFrequently: true})

    let renderId = 0

    let detectCount = 0
    let isScanned = false

    const DETECT_INTERVAL = 60

    let worker = null

    const setCanvasFullContainer = () => {
        const containerW = container.clientWidth * window.devicePixelRatio
        const containerH = container.clientHeight * window.devicePixelRatio

        canvas.width = containerW
        canvas.height = containerH
    }

    const getVideoRenderRect = () => {
        const canvasW = canvas.width
        const canvasH = canvas.height
        const videoW = video.videoWidth
        const videoH = video.videoHeight

        const videoRatio = videoW / videoH
        const canvasRatio = canvasW / canvasH

        let renderX = 0, renderY = 0, renderW = 0, renderH = 0

        if (videoRatio > canvasRatio) {
            renderH = canvasH
            renderW = canvasH * videoRatio
            renderX = (canvasW - renderW) / 2
        } else {
            renderW = canvasW
            renderH = canvasW / videoRatio
            renderY = (canvasH - renderH) / 2
        }

        return {x: renderX, y: renderY, w: renderW, h: renderH}
    }

    const playBeep = ()=> {
        const audioContext = new (window.AudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)

        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
    }

    const initWorker = () => {
        worker = new Worker(new URL('./detector.worker.js', import.meta.url), {type: 'module'})

        worker.onmessage = (e) => {
            const res = e.data
            // console.log('res', res)
            if (res.success) {
                // isScanned = true
                // alert(`掃碼成功：${res.text}`)
                result.textContent = res.text
                playBeep()
                // stopCamera()
                // terminateWorker()
            }
        }

        worker.onerror = (err) => {
            console.error(err)
            terminateWorker()
        }
    }

    async function initCamera() {
        try {
            initWorker()

            video.srcObject = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {ideal: 'environment'},
                    width: {ideal: 1080},
                    height: {ideal: 1920}
                },
            })

            video.onloadedmetadata = async () => {
                await video.play()
                setCanvasFullContainer()
                renderWithEffects()
            }
        } catch (err) {
            console.error(err)
            terminateWorker()
        }
    }

    const renderWithEffects = () => {
        if (video.paused || isScanned) return

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const renderRect = getVideoRenderRect()

        ctx.drawImage(
            video,
            0, 0, video.videoWidth, video.videoHeight,
            renderRect.x, renderRect.y, renderRect.w, renderRect.h
        );

        const minSide = Math.min(canvas.width, canvas.height)
        const baseLength = minSide * 0.9
        const triangleHeight = baseLength * (Math.sqrt(3) / 2)

        const point1X = (canvas.width - baseLength) / 2
        const point1Y = (canvas.height + triangleHeight) / 2
        const point2X = (canvas.width + baseLength) / 2
        const point2Y = point1Y
        const point3X = canvas.width / 2
        const point3Y = (canvas.height - triangleHeight) / 2

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(point1X, point1Y)
        ctx.lineTo(point2X, point2Y)
        ctx.lineTo(point3X, point3Y)
        ctx.closePath()
        ctx.stroke()

        detectCount++;
        if (detectCount >= DETECT_INTERVAL) {
            detectCount = 0
            const w = Math.floor(baseLength)
            const h = Math.floor(triangleHeight)
            const imageData = ctx.getImageData(point1X, point3Y, w, h)
            if (worker) {
                worker.postMessage({
                    imageData: imageData.data,
                    width: w,
                    height: h
                }, [imageData.data.buffer])
            }
        }

        renderId = requestAnimationFrame(renderWithEffects)
    }

    window.addEventListener('resize', setCanvasFullContainer)

    initCamera().then()

    const stopCamera = () => {
        cancelAnimationFrame(renderId)
        const stream = video.srcObject
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            video.srcObject = null
        }
    }

    const terminateWorker = () => {
        if (worker) {
            worker.terminate()
            worker = null
        }
    }

    window.addEventListener('beforeunload', () => {
        stopCamera()
        terminateWorker()
    })
}










