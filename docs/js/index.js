/**
 * https://github.com/lizongying/triangular-code
 */
import {Parser} from './parser.js'
import {bilateralFilterGrayscale, getImageDataFromCanvas, rgbToGrayscale} from './utils/imageData.js'

const preview = document.getElementById('preview')
const input = document.getElementById('fileInput')
const result = document.getElementById('result')
const resultString = document.getElementById('result-string')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d', {willReadFrequently: true})

input.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const img = new Image()
    img.src = URL.createObjectURL(file)
    await img.decode()

    preview.src = img.src
    preview.width = img.width
    preview.height = img.height

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    canvas.style.display = ''

    const imgData = getImageDataFromCanvas(ctx)

    const grayData = rgbToGrayscale(imgData.data, img.width, img.height)

    let blurredGray = bilateralFilterGrayscale({
        data: grayData,
        width: img.width,
        height: img.height,
    }, 5, 30, 15)

    const outputImageData = ctx.createImageData(img.width, img.height)
    for (let i = 0; i < blurredGray.length; i++) {
        outputImageData.data[i * 4] = blurredGray[i]
        outputImageData.data[i * 4 + 1] = blurredGray[i]
        outputImageData.data[i * 4 + 2] = blurredGray[i]
        outputImageData.data[i * 4 + 3] = 255
    }
    ctx.putImageData(outputImageData, 0, 0)

    const parser = new Parser(grayData, imgData)
    let res = parser.parse()

    if (res === null) {
        return
    }

    console.log('res', res)

    res.vertices.slice(0, 2).forEach(v => drawPoint(v.center.x, v.center.y, 'green', 3))

    drawPoints(res.points, 'yellow', 3)

    drawPoints([res.A1, res.B1, res.C1], 'red', 3)
    drawPoints([res.A2, res.B2, res.C2], 'red', 3)

    result.textContent = res.bits.map(v => v.toString()).join(',')
    resultString.textContent = res.content
})

function drawPoints(points, color = 'blue', size = 2) {
    for (const p of points) {
        drawPoint(p.x, p.y, color, size)
    }
}

function drawPoint(x, y, color = 'red', size = 3) {
    ctx.fillStyle = color;
    ctx.fillRect(x - size / 2, y - size / 2, size, size)
}