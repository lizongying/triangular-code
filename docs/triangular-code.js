/**
 * https://github.com/lizongying/triangular-code
 */
class TriangularCode {
    constructor(container, text = '', bits = 3, size = 200) {
        this.container = container;
        this.scale = Math.sin(this.degreesToRadians(60));

        this._svgNamespace = 'http://www.w3.org/2000/svg';

        this.bits = bits

        this.text = text;

        this.updateSize(size);
    }


    updateSize(size) {
        this.size = size;
        const container = this.container;
        let svg = container.querySelector('svg');
        if (svg) {
            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }
        } else {
            svg = document.createElementNS(this._svgNamespace, 'svg');
            svg.setAttribute('transform', `scale(1,${this.scale})`);
            container.appendChild(svg);
        }
        svg.setAttribute('width', `${size}`);
        svg.setAttribute('height', `${size}`);
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        this._svg = svg;
        this.encode();
    }

    updateText(text) {
        this.text = text;
        const container = this.container;
        let svg = container.querySelector('svg');
        if (svg) {
            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }
        } else {
            svg = document.createElementNS(this._svgNamespace, 'svg');
            svg.setAttribute('transform', `scale(1,${this.scale})`);
            container.appendChild(svg);
        }
        this._svg = svg;
        this.encode();
    }

    updateColor(bits) {
        this.bits = bits
        const container = this.container;
        let svg = container.querySelector('svg');
        if (svg) {
            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }
        } else {
            svg = document.createElementNS(this._svgNamespace, 'svg');
            svg.setAttribute('transform', `scale(1,${this.scale})`);
            container.appendChild(svg);
        }
        this._svg = svg;
        this.encode();
    }

    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Converts a string to a bits array (3-bit or 2-bit mode).
     * @param {string} str - The input string to convert.
     * @returns {number[]} - An array of bits.
     */
    stringToBits(str) {
        const encoder = new TextEncoder();
        const byteArray = encoder.encode(str);

        const sign = '01'
        const signArr = [0, 1]
        switch (this.bits) {
            case 3: {
                // 1. 將 byteArray 轉換成 bit 序列（例如 [0b11001010, 0b00011111] → "1100101000011111"）
                let bitString = sign
                for (const byte of byteArray) {
                    bitString += byte.toString(2).padStart(8, '0')
                }

                while (bitString.length % 3 !== 0) {
                    bitString += '0'
                }

                // 3. 每 3 bits 一組，轉換回數字
                const res = [];
                for (let i = 0; i < bitString.length; i += 3) {
                    const triplet = bitString.slice(i, i + 3);
                    res.push(parseInt(triplet, 2)); // 3-bit 二進制轉十進制
                }

                return res
            }
            case 2: {
                let bitString = sign
                for (const byte of byteArray) {
                    bitString += byte.toString(2).padStart(8, '0')
                }

                const res = [];
                for (let i = 0; i < bitString.length; i += 2) {
                    const triplet = bitString.slice(i, i + 2);
                    res.push(parseInt(triplet, 2))
                }

                return res
            }

            default: {
                return signArr.concat(Array.from(byteArray)
                    .flatMap(byte => byte.toString(2).padStart(8, '0').split(''))
                    .map(Number))
            }
        }
    }

    //
    numberToBits(str) {
        const bitArray = numericToQrBits(str);

        const sign = '00'
        const signArr = [0, 0]
        switch (this.bits) {
            case 3: {
                // 1. 將 byteArray 轉換成 bit 序列（例如 [0b11001010, 0b00011111] → "1100101000011111"）
                let bitString = sign
                for (const bit of bitArray) {
                    bitString += bit
                }

                while (bitString.length % 3 !== 0) {
                    bitString += '0'
                }

                // 3. 每 3 bits 一組，轉換回數字
                const res = [];
                for (let i = 0; i < bitString.length; i += 3) {
                    const triplet = bitString.slice(i, i + 3);
                    res.push(parseInt(triplet, 2)); // 3-bit 二進制轉十進制
                }

                return res
            }
            case 2: {
                let bitString = sign
                for (const bit of bitArray) {
                    bitString += bit
                }

                const res = [];
                for (let i = 0; i < bitString.length; i += 2) {
                    const triplet = bitString.slice(i, i + 2);
                    res.push(parseInt(triplet, 2))
                }

                return res
            }

            default: {
                return signArr.concat(bitArray.split('').map(Number))
            }
        }
    }

    defaultColor() {
        return 0
    }

    /**
     * Pads the input data to the specified TC version's capacity.
     * @param {Array} data - The input data array to be padded.
     * @param {number} version - The TC version (determines target capacity).
     * @returns {Array} - The padded data array (original data + padding if needed).
     * @throws {Error} - If the version is unsupported or data is too long.
     */
    padDataToVersion(data, version) {
        const capacity = table[version]
        if (!capacity) throw new Error(`Unsupported TC version: ${version}`)
        if (data.length > capacity) {
            throw new Error(`Data length (${data.length}) exceeds capacity (${capacity}) for TC version ${version}`)
        }
        if (data.length < capacity) {
            return data.concat(new Array(capacity - data.length).fill(this.defaultColor()));
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
            `Maximum supported capacity: ${Math.max(...Object.values(table))}`
        )
    }

    encode(text = this.text) {
        this.text = text
        // data = new Array(Number(text)).fill(this.defaultColor())

        let data = []
        if (/^\d+$/.test(text)) {
            data = this.numberToBits(text)
        } else {
            data = this.stringToBits(text)
        }

        console.log('data', data)

        const {version, capacity} = this.getRequiredVersion(data.length);
        console.log(`version: ${version}, capacity: ${capacity}`);

        // const a = 32
        // if (data.length < a) {
        //     data = data.concat(new Array(a - data.length).fill(0));
        // }

        data = this.padDataToVersion(data, version)

        let arr = [
            1,
            1, 1, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,
        ];
        if (data.length > 32) {
            arr.push(0)
        }
        arr = arr.concat(data)

        let arr2 = [
            [0, 0, 0,],
            [0, 0, 1, 0, 0,],
            [0, 0, 1, 1, 1, 0, 0,],
            [0, 0, 1, 1, 0, 1, 1, 0, 0,],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0,],
        ];

        const newArrAll = [
            [0],
            [0, 0, 0],
        ]

        let lastIdx = 0
        let i = 0
        for (; ; i++) {
            let newArr = []

            newArr.push(0, 0)

            let newIdx = lastIdx + 2 * i + 1
            newArr.push(...(arr.slice(lastIdx, newIdx)))

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
                    newArr.push(...(arr.slice(lastIdx, newIdx)))

                    newArr.push(...Array(last - newArr.length + 2).fill(0))

                    newArr.push(...arr2[j])

                    newArrAll.push(newArr)

                    lastIdx = newIdx
                }

                break
            }
        }

        // console.log('max', 2 * i + 17, data.length)
        //
        // const version1 = Math.ceil((2 * i + 17 - 13) / 10);
        // console.log('version', version1)


        //如果 2 * i + 17 不夠23/33/43/... newArrAll繼續填充下一行，保證下行比上一行多2個
        newArrAll.push(Array(2 * i + 17).fill(0))

        let one = this.size / (i + 9);

        newArrAll.forEach((v, i) => {
            let x = (this.size / 2) - (i * one / 2);
            let y = i * one;

            v.forEach((vv, ii) => {
                let a;
                let b;
                let c;
                if (ii % 2 === 0) {
                    a = [x + (ii * one / 2), y];
                    b = [x + (ii * one / 2) - one / 2, y + one];
                    c = [x + (ii * one / 2 + one / 2), y + one];
                } else {
                    a = [x + (ii * one / 2), y + one];
                    b = [x + (ii * one / 2) - one / 2, y];
                    c = [x + (ii * one / 2 + one / 2), y];
                }

                const triangle = document.createElementNS(this._svgNamespace, 'polygon')
                triangle.setAttribute('points', `${a.join(',')} ${b.join(',')} ${c.join(',')}`)
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
                    default : {
                        colors = colors2
                    }

                }
                triangle.setAttribute('fill', argbToHex(colors[vv]))
                this._svg.appendChild(triangle)
            })
        })
    }
}

// (x-5)/2 * (x-5)/2-50
// ((x-5)/2)**2 -50
// 32特殊
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

// 25*2+13=63

const colors2 = [
    0xFFFFFF, //white
    0x000000, //black
]

const colors4 = [
    0xFFFFFF, // white
    0x0000FF, // blue
    0x00FF00, // green
    0xFF0000, // red
]

const colors8 = [
    0xFFFFFF, //white
    0xFF0000, //red
    0x00FF00, //green
    0x0000FF, //blue
    0xFFFF00, //yellow
    0x00FFFF, //cyan
    0xFF00FF, //magenta
    0x000000, //black
]

const argbToHex = (argb) => {
    const hex = (argb & 0xFFFFFF).toString(16).padStart(6, '0')
    return `#${hex.toUpperCase()}`
}

const numericToQrBits = (numStr, lengthBits = 10) => {
    const strLength = numStr.length;
    const lengthBinary = strLength.toString(2).padStart(lengthBits, "0");

    // 5. 處理數據位（3位一組編碼）
    let dataBits = "";
    // 拆分為每3位一組
    const groups = [];
    for (let i = 0; i < numStr.length; i += 3) {
        groups.push(numStr.slice(i, i + 3));
    }

    // 逐組轉換為對應位數的二進位
    groups.forEach(group => {
        const num = parseInt(group, 10);
        let binary;
        switch (group.length) {
            case 3:
                // 3位數 → 10位二進位
                binary = num.toString(2).padStart(10, "0");
                break;
            case 2:
                // 2位數 → 7位二進位
                binary = num.toString(2).padStart(7, "0");
                break;
            case 1:
                // 1位數 → 4位二進位
                binary = num.toString(2).padStart(4, "0");
                break;
            default:
                throw new Error("分組異常，請檢查輸入");
        }
        dataBits += binary;
    });


    // 6. 組合完整的位元串（模式 + 長度 + 數據）

    return lengthBinary + dataBits;
}
