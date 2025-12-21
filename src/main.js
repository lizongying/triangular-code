/**
 * https://github.com/lizongying/tricode
 */
import {Jimp} from 'jimp'

import {Parser} from './parser.js'
import {getImageDataFromJimp} from './utils/imageData.js'

const filePath = './screenshots/232323.png'

async function getImageMatrix(filePath) {
    const img = await Jimp.read(filePath)
    return getImageDataFromJimp(img)
}

const imageData = await getImageMatrix(filePath)
const parser = new Parser(imageData)

let res = parser.parse()
console.log(res)
