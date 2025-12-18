/**
 * https://github.com/lizongying/triangular-code
 */
import {Parser} from './parser.js'
import {
    bilateralFilterGrayscale,
    getImageDataFromCanvas, rgbToGrayscale
} from './utils/imageData.js'

window.onload = function () {
    const input = document.getElementById('fileInput')

    const video = document.getElementById('webcam')

    const result = document.getElementById('result')

    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d', {willReadFrequently: true})

    const canvas1 = document.getElementById('canvas1')
    const ctx1 = canvas1.getContext('2d', {willReadFrequently: true})

    try {
        let attempts = 0
        const readyListener = () => findVideoSize()
        const findVideoSize = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                video.removeEventListener('loadeddata', readyListener)
                onDimensionsReady(video.videoWidth, video.videoHeight)
            } else {
                if (attempts < 10) {
                    attempts++
                    setTimeout(findVideoSize, 200)
                } else {
                    onDimensionsReady(640, 480)
                }
            }
        }
        const onDimensionsReady = (width, height) => {
            console.log(width, height)
            ctx.fillStyle = 'rgb(0,255,0)'
            ctx.strokeStyle = 'rgb(0,255,0)'
            window.compatibility.requestAnimationFrame(tick)
        }

        video.addEventListener('loadeddata', readyListener)

        window.compatibility.getUserMedia({video: true}, (stream) => {
            if (video.srcObject !== undefined) {
                video.srcObject = stream
            } else {
                try {
                    video.src = window.compatibility.URL.createObjectURL(stream)
                } catch (error) {
                    console.log(error)
                    video.src = stream
                }
            }
            setTimeout(() => {
                video.play()
            }, 500)
        }, (error) => {
            console.log(error)
        })
    } catch (error) {
        console.log(error)
    }

    const tick = () => {
        window.compatibility.requestAnimationFrame(tick)
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            ctx.drawImage(video, 0, 0, 640, 480)
            const imgData = ctx.getImageData(0, 0, 640, 480)
            ctx.putImageData(imgData, 0, 0)

            draw(imgData)
        }
    }

    const draw = (imgData) => {
        const grayData = rgbToGrayscale(imgData.data, imgData.width, imgData.height)

        let blurredGray = bilateralFilterGrayscale({
            data: grayData,
            width: imgData.width,
            height: imgData.height,
        }, 5, 30, 15)

        canvas1.width = imgData.width
        canvas1.height = imgData.height

        const outputImageData0 = ctx1.createImageData(imgData.width, imgData.height);
        for (let i = 0; i < blurredGray.length; i++) {
            outputImageData0.data[i * 4] = blurredGray[i]
            outputImageData0.data[i * 4 + 1] = blurredGray[i]
            outputImageData0.data[i * 4 + 2] = blurredGray[i]
            outputImageData0.data[i * 4 + 3] = 255
        }
        ctx1.putImageData(outputImageData0, 0, 0)

        const parser = new Parser(blurredGray, imgData)
        let res = parser.parse()

        if (res === null) {
            return
        }

        console.log('res', res)

        result.textContent = res.content

        if (res.vertices.length > 0) {
            res.vertices.forEach(v => drawPoint(v.center.x, v.center.y, 'green', 3))
            drawPoints(ctx1, [res.A1, res.B1, res.C1], 'red', 3)
            drawPoints(ctx1, [res.A2, res.B2, res.C2], 'red', 3)
        }

        if (res.points.length > 0) {
            drawPoints(res.points, 'yellow', 3)
        }
    }

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const img = new Image()
        img.src = URL.createObjectURL(file)
        await img.decode()

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        canvas.style.display = ''

        const imgData = getImageDataFromCanvas(ctx)
        draw(imgData)
    })
}

const drawPoints = (ctx, points, color = 'blue', size = 2) => {
    for (const p of points) {
        drawPoint(ctx, p.x, p.y, color, size)
    }
}

const drawPoint = (ctx, x, y, color = 'red', size = 3) => {
    ctx.fillStyle = color
    ctx.fillRect(x - size / 2, y - size / 2, size, size)
}











