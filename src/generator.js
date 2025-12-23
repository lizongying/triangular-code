/**
 * https://github.com/lizongying/tricode
 */
export class Generator {
    constructor(container, text = '', bits = 3, size = 200, canvas = false) {
        this.container = container
        this.scale = Math.sin(this.degreesToRadians(60))

        this.text = text

        this.bits = bits

        this.size = size

        this.canvas = canvas

        this._svgNamespace = 'http://www.w3.org/2000/svg'

        this._unitScale = 10

        this.change(true)
    }

    updateSize(size) {
        this.size = size
        this.change(true)
    }

    updateText(text) {
        this.text = text
        this.change()
    }

    updateBits(bits) {
        this.bits = bits
        this.change()
    }

    change(resize = false) {
        if (this.canvas) {
            let cvs = this.container.querySelector('canvas')
            if (cvs) {
                this.ctx.clearRect(0, 0, cvs.width, cvs.height)
            } else {
                cvs = document.createElement('canvas')
                const ctx = cvs.getContext('2d')
                ctx.imageSmoothingEnabled = false
                ctx.globalAlpha = 1
                this.ctx = ctx

                this.container.appendChild(cvs)
            }
            if (resize) {
                cvs.width = this.size * this._unitScale
                cvs.height = this.size * this._unitScale

                cvs.style.width = this.size + 'px'
                cvs.style.height = this.size + 'px'
            }
            this._cvs = cvs
        } else {
            let svg = this.container.querySelector('svg')
            if (svg) {
                while (svg.firstChild) {
                    svg.removeChild(svg.firstChild)
                }
            } else {
                svg = document.createElementNS(this._svgNamespace, 'svg')
                svg.setAttribute('color-interpolation', `sRGB`)
                svg.setAttribute('shape-rendering', `crispEdges`)
                svg.setAttribute('style', 'forced-color-adjust: none; color-scheme: light; color: #FFFFFF; fill: #FFFFFF;');
                this.container.appendChild(svg)
            }
            if (resize) {
                svg.setAttribute('width', `${this.size}`)
                svg.setAttribute('height', `${this.size}`)
                svg.setAttribute('viewBox', `0 0 ${this.size} ${this.size}`)
            }
            this._svg = svg
        }

        this.encode()
    }

    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180)
    }

    /**
     * Converts a string to a bits array (3-bit or 2-bit mode).
     * @param {string} str - The input string to convert.
     * @returns {number[]} - An array of bits.
     */
    stringToBits(str) {
        const encoder = new TextEncoder()
        const coreBytes = encoder.encode(str)
        let byteArray = new Uint8Array(coreBytes.length + 1)
        byteArray.set(coreBytes)
        byteArray[coreBytes.length] = 0

        const signArr = [0, 1]
        let bitString = '01'
        const res = []
        switch (this.bits) {
            case 3:
                for (const byte of byteArray) {
                    bitString += byte.toString(2).padStart(8, '0')
                }

                while (bitString.length % 3 !== 0) {
                    bitString += '0'
                }

                for (let i = 0; i < bitString.length; i += 3) {
                    res.push(parseInt(bitString.slice(i, i + 3), 2))
                }

                return res
            case 2:
                for (const byte of byteArray) {
                    bitString += byte.toString(2).padStart(8, '0')
                }

                for (let i = 0; i < bitString.length; i += 2) {
                    res.push(parseInt(bitString.slice(i, i + 2), 2))
                }

                return res

            case 1:
                return signArr.concat(
                    Array.from(byteArray)
                        .flatMap((byte) =>
                            byte.toString(2).padStart(8, '0').split(''),
                        )
                        .map(Number),
                )

            default:
        }
    }

    numberToBits(str) {
        const bitArray = numericToQrBits(str)

        const signArr = [0, 0]
        let bitString = '00'
        const res = []
        switch (this.bits) {
            case 3: {
                for (const bit of bitArray) {
                    bitString += bit
                }

                while (bitString.length % 3 !== 0) {
                    bitString += '0'
                }

                for (let i = 0; i < bitString.length; i += 3) {
                    res.push(parseInt(bitString.slice(i, i + 3), 2))
                }

                return res
            }
            case 2: {
                for (const bit of bitArray) {
                    bitString += bit
                }

                for (let i = 0; i < bitString.length; i += 2) {
                    res.push(parseInt(bitString.slice(i, i + 2), 2))
                }

                return res
            }

            case 1:
                return signArr.concat(bitArray.split('').map(Number))

            default:
        }
    }

    /**
     * 生成填充段（随机颜色，替代固定默认色）
     * @param {number} fillLength - 二维码总模块数
     * @returns {Array} 随机填充的数组
     */
    fillRandomColor(fillLength) {
        if (fillLength <= 0) return []

        let colorCount = 2
        switch (this.bits) {
            case 3:
                colorCount = 8
                break
            case 2:
                colorCount = 4
                break
            case 1:
                colorCount = 2
                break
            default:
        }

        return Array.from({length: fillLength}, () => {
            return Math.floor(Math.random() * colorCount)
        })
    }

    /**
     * Pads the input data to the specified TC version's capacity.
     * @param {Array} data - The input data array to be padded.
     * @param {number} capacity - The TC target capacity.
     * @returns {Array} - The padded data array (original data + padding if needed).
     * @throws {Error} - If the version is unsupported or data is too long.
     */
    padDataToVersion(data, capacity) {
        if (data.length > capacity) {
            throw new Error(
                `Data length (${data.length}) exceeds capacity (${capacity})`,
            )
        }
        if (data.length < capacity) {
            return data.concat(this.fillRandomColor(capacity - data.length))
        }
        return data
    }

    /**
     * Determines the minimum TC version required to store the given data length.
     * @param {number} dataLength - The length of the data to be encoded.
     * @returns {{version: number, capacity: number}} - An object containing the suitable TC version and its capacity.
     * @throws {Error} - If the data length exceeds all supported TC versions.
     */
    getRequiredVersion(dataLength) {
        // Iterate through all TC versions and their capacities
        for (const [versionStr, capacity] of Object.entries(table)) {
            const version = Number(versionStr) // Convert version to number (since Object.entries returns strings)

            // Return the first version that can accommodate the data length
            if (dataLength <= capacity) {
                return {version, capacity}
            }
        }

        // If no version is found (data is too long for all supported versions)
        throw new Error(
            `Data length (${dataLength}) exceeds the maximum supported TC capacity. ` +
            `Maximum supported capacity: ${Math.max(...Object.values(table))}`,
        )
    }

    encode(text = this.text) {
        this.text = text

        let data = []
        if (/^\d+$/.test(text)) {
            data = this.numberToBits(text)
        } else {
            data = this.stringToBits(text)
        }

        // console.log('data', data)

        const {version, capacity} = this.getRequiredVersion(data.length)
        // console.log(`version: ${version}, capacity: ${capacity}`)

        data = this.padDataToVersion(data, capacity)

        let arr = [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
            0,
        ]
        if (data.length > 32) {
            arr.push(0)
        }
        arr = arr.concat(data)

        let arr2 = [
            [0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 0, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        ]

        const newArrAll = [[0], [0, 0, 0]]

        let lastIdx = 0
        let i = 0
        for (; ; i++) {
            let newArr = []

            newArr.push(0, 0)

            let newIdx = lastIdx + 2 * i + 1
            newArr.push(...arr.slice(lastIdx, newIdx))

            newArr.push(0, 0)

            newArrAll.push(newArr)

            if (newIdx >= arr.length) {
                break
            }

            let last = 2 * i + 2

            lastIdx = newIdx

            if (arr.length - newIdx <= last * 5) {
                for (let j = 0; j < 5; j++) {
                    let newArr = []

                    newArr.push(0, 0)

                    let newIdx = lastIdx + last
                    newArr.push(...arr.slice(lastIdx, newIdx))

                    newArr.push(...Array(last - newArr.length + 2).fill(0))

                    newArr.push(...arr2[j])

                    newArrAll.push(newArr)

                    lastIdx = newIdx
                }

                break
            }
        }

        newArrAll.push(Array(2 * i + 17).fill(0))

        let one = this.size / (i + 9)

        newArrAll.forEach((v, i) => {
            let x = this.size / 2 - (i * one) / 2
            let y = i * one

            v.forEach((vv, ii) => {
                let a
                let b
                let c
                const y0 = y * this.scale
                const y1 = (y + one) * this.scale
                if (ii % 2 === 0) {
                    a = [x + (ii * one) / 2, y0]
                    b = [x + (ii * one) / 2 - one / 2, y1]
                    c = [x + (ii * one) / 2 + one / 2, y1]
                } else {
                    a = [x + (ii * one) / 2, y1]
                    b = [x + (ii * one) / 2 - one / 2, y0]
                    c = [x + (ii * one) / 2 + one / 2, y0]
                }

                let colors = colors2
                switch (this.bits) {
                    case 3: {
                        colors = colors8
                        break
                    }
                    case 2: {
                        colors = colors4
                        break
                    }
                    default: {
                        colors = colors2
                    }
                }

                if (this.canvas) {
                    drawTriangle(this.ctx,
                        [a[0] * this._unitScale, a[1] * this.scale * this._unitScale],
                        [b[0] * this._unitScale, b[1] * this.scale * this._unitScale],
                        [c[0] * this._unitScale, c[1] * this.scale * this._unitScale],
                        argbToHex(colors[vv]))
                } else {
                    const triangle = document.createElementNS(
                        this._svgNamespace,
                        'polygon',
                    )
                    triangle.setAttribute(
                        'points',
                        `${a.join(',')} ${b.join(',')} ${c.join(',')}`,
                    )
                    triangle.setAttribute('fill', argbToHex(colors[vv]))
                    this._svg.appendChild(triangle)
                }
            })
        })
    }
}

const drawTriangle = (ctx, a, b, c, color) => {
    const [ax, ay] = a.map(v => Math.round(v))
    const [bx, by] = b.map(v => Math.round(v))
    const [cx, cy] = c.map(v => Math.round(v))

    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.lineTo(cx, cy)
    ctx.closePath()

    ctx.fillStyle = color
    ctx.fill()
}

// (x-5)/2 * (x-5)/2-50
// ((x-5)/2)**2 -50
// 25*2+13=63
const table = {
    23: 32, //5
    33: 146, //14-4 = 10
    43: 311, //19-4 = 15
    53: 526, //24-4 = 20
    63: 791, //29-4 = 25
    73: 1106,
    83: 1471,
    93: 1886,
}

const colors2 = [
    0xffffff, //white
    0x000000, //black
]

const colors4 = [
    0xffffff, // white
    0x0000ff, // blue
    0x00ff00, // green
    0xff0000, // red
]

const colors8 = [
    0xffffff, //white
    0xff0000, //red
    0x00ff00, //green
    0x0000ff, //blue
    0xffff00, //yellow
    0x00ffff, //cyan
    0xff00ff, //magenta
    0x000000, //black
]

const argbToHex = (argb) => {
    const hex = (argb & 0xffffff).toString(16).padStart(6, '0')
    return `#${hex.toUpperCase()}`
}

const numericToQrBits = (numStr, lengthBits = 10) => {
    const strLength = numStr.length
    const lengthBinary = strLength.toString(2).padStart(lengthBits, '0')

    let dataBits = ''
    const groups = []
    for (let i = 0; i < numStr.length; i += 3) {
        groups.push(numStr.slice(i, i + 3))
    }

    groups.forEach((group) => {
        const num = parseInt(group, 10)
        let binary
        switch (group.length) {
            case 3:
                binary = num.toString(2).padStart(10, '0')
                break
            case 2:
                binary = num.toString(2).padStart(7, '0')
                break
            case 1:
                binary = num.toString(2).padStart(4, '0')
                break
            default:
        }
        dataBits += binary
    })

    return lengthBinary + dataBits
}
