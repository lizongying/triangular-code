/**
 * https://github.com/lizongying/tricode
 */
import {Parser} from './parser.js'

self.onmessage = (e) => {
    const {imageData, width, height} = e.data

    try {
        const data = new Uint8ClampedArray(imageData)
        const parser = new Parser(data, width, height)
        let res = parser.parse()

        console.log('res', res)

        // self.postMessage({
        //     success: true,
        //     text: 'res.content',
        // })

        if (res === null) {
            self.postMessage({
                success: false,
                text: ''
            })
            return
        }

        self.postMessage({
            success: true,
            text: res.content,
        })
    } catch (err) {
        self.postMessage({
            success: false,
            text: '',
            error: err.message
        })
    }
}