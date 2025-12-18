/**
 * https://github.com/lizongying/triangular-code
 */
window.compatibility = (() => {
    let lastTime = 0,
        isLittleEndian = true,

        URL = window.URL || window.webkitURL,

        requestAnimationFrame = function (callback, element) {
            const requestAnimationFrame =
                window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) {
                    const currTime = new Date().getTime()
                    const timeToCall = Math.max(0, 16 - (currTime - lastTime))
                    const id = window.setTimeout(function () {
                        callback(currTime + timeToCall)
                    }, timeToCall)
                    lastTime = currTime + timeToCall;
                    return id
                }

            return requestAnimationFrame.call(window, callback, element)
        },

        cancelAnimationFrame = function (id) {
            const cancelAnimationFrame = window.cancelAnimationFrame ||
                function (id) {
                    clearTimeout(id)
                }
            return cancelAnimationFrame.call(window, id)
        },

        getUserMedia = function (options, success, error) {
            const getUserMedia =
                window.navigator.getUserMedia ||
                window.navigator.mozGetUserMedia ||
                window.navigator.webkitGetUserMedia ||
                window.navigator.msGetUserMedia ||
                function (options, success, error) {
                    error()
                }

            return getUserMedia.call(window.navigator, options, success, error)
        },

        detectEndian = function () {
            const buf = new ArrayBuffer(8)
            const data = new Uint32Array(buf)
            data[0] = 0xff000000

            isLittleEndian = buf[0] !== 0xff
            return isLittleEndian
        }

    return {
        URL: URL,
        requestAnimationFrame: requestAnimationFrame,
        cancelAnimationFrame: cancelAnimationFrame,
        getUserMedia: getUserMedia,
        detectEndian: detectEndian,
        isLittleEndian: isLittleEndian
    }
})()