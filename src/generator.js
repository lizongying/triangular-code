/**
 * https://github.com/lizongying/tricode
 */
import { colors2, colors4, colors8, table2 } from './utils/constants.js'

export class Generator {
    constructor(text = '', bits = 3, size = 200, withSvg = false) {
        this.scale = Math.sin(this.degreesToRadians(60))

        this.text = text

        this.bits = bits

        this.size = size

        // this.dpr = window.devicePixelRatio || 1
        this.dpr = 10

        const cvs = document.createElement('canvas')
        const ctx = cvs.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.globalAlpha = 1
        this.cvs = cvs
        this.ctx = ctx

        if (withSvg) {
            this._svgNamespace = 'http://www.w3.org/2000/svg'
            const svg = document.createElementNS(this._svgNamespace, 'svg')
            svg.setAttribute('color-interpolation', `sRGB`)
            svg.setAttribute('shape-rendering', `crispEdges`)
            svg.setAttribute(
                'style',
                'forced-color-adjust: none; color-scheme: light; color: #FFFFFF; fill: #FFFFFF;',
            )
            this.svg = svg
        }
        this.withSvg = withSvg

        this.change(true)
    }

    getCvs() {
        return this.cvs
    }

    getSvg() {
        return this.svg
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
        this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height)
        if (resize) {
            this.cvs.width = this.size * this.dpr
            this.cvs.height = this.size * this.dpr

            this.cvs.style.width = this.size + 'px'
            this.cvs.style.height = this.size + 'px'
        }

        if (this.withSvg) {
            while (this.svg.firstChild) {
                this.svg.removeChild(this.svg.firstChild)
            }
            if (resize) {
                this.svg.setAttribute('width', `${this.size}`)
                this.svg.setAttribute('height', `${this.size}`)
                this.svg.setAttribute(
                    'viewBox',
                    `0 0 ${this.size} ${this.size}`,
                )
            }
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
     * Generate a filled segment (with random colors)
     * @param {number} fillLength - Total number of modules in the tricode
     * @returns {Array} - An array filled randomly
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

        return Array.from({ length: fillLength }, () => {
            return Math.floor(Math.random() * colorCount)
        })
    }

    /**
     * Pads the input data to the specified tricode version's capacity.
     * @param {Array} data - The input data array to be padded.
     * @param {number} capacity - The tricode target capacity.
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
     * Determines the minimum tricode version required to store the given data length.
     * @param {number} dataLength - The length of the data to be encoded.
     * @returns {{version: number, capacity: number}} - An object containing the suitable tricode version and its capacity.
     * @throws {Error} - If the data length exceeds all supported tricode versions.
     */
    getRequiredVersion(dataLength) {
        // Iterate through all tricode versions and their capacities
        for (const [versionStr, capacity] of Object.entries(table2)) {
            const version = Number(versionStr) // Convert version to number (since Object.entries returns strings)

            // Return the first version that can accommodate the data length
            if (dataLength <= capacity) {
                return { version, capacity }
            }
        }

        // If no version is found (data is too long for all supported versions)
        throw new Error(
            `Data length (${dataLength}) exceeds the maximum supported tricode capacity. ` +
                `Maximum supported capacity: ${Math.max(...Object.values(table2))}`,
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

        const { version, capacity } = this.getRequiredVersion(data.length)
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

        let arr1 = [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0, 0],
            [0, 0, 1, 0, 0],
        ]

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

            if (arr.length - newIdx <= last * 5 - 4) {
                for (let j = 0; j < 5; j++) {
                    let newArr = arr1[j]
                    let newIdx = lastIdx + last - (arr1[j].length - 2)
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
            const y0 = y * this.scale
            const y1 = (y + one) * this.scale

            let a = [x - one / 2, y1]
            let b = [x - one, y0]
            let c = [x, y0]

            v.forEach((vv, j) => {
                b = a
                a = c
                const up = (j & 1) === 0
                if (up) {
                    c = [x + (j * one) / 2 + one / 2, y1]
                } else {
                    c = [x + (j * one) / 2 + one / 2, y0]
                }

                let colors
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

                drawTriangle(
                    this.ctx,
                    this.dpr,
                    a,
                    b,
                    c,
                    argbToHex(colors[vv]),
                    up,
                )
                if (this.withSvg) {
                    const triangle = document.createElementNS(
                        this._svgNamespace,
                        'polygon',
                    )
                    triangle.setAttribute(
                        'points',
                        `${a.join(',')} ${b.join(',')} ${c.join(',')}`,
                    )
                    triangle.setAttribute('fill', argbToHex(colors[vv]))
                    this.svg.appendChild(triangle)
                }
            })
        })
    }
}

// const DPR = window.devicePixelRatio || 1
// const OVERLAP = 1 / DPR / 2
const OVERLAP = 1

const drawTriangle = (ctx, dpr, a, b, c, color, up = true) => {
    const [ax, ay] = a.map((v) => v * dpr)
    const [bx, by] = b.map((v) => v * dpr)
    const [cx, cy] = c.map((v) => v * dpr)

    ctx.save()
    // ctx.scale(dpr, dpr)
    ctx.beginPath()
    const hypotenuseExpand = Math.sqrt(OVERLAP * OVERLAP * 2)
    if (up) {
        ctx.moveTo(ax, ay - hypotenuseExpand)
        ctx.lineTo(bx - OVERLAP, by + OVERLAP)
        ctx.lineTo(cx + OVERLAP, cy + OVERLAP)
    } else {
        ctx.moveTo(ax, ay + hypotenuseExpand)
        ctx.lineTo(bx - OVERLAP, by - OVERLAP)
        ctx.lineTo(cx + OVERLAP, cy - OVERLAP)
    }

    ctx.closePath()

    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
}

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
