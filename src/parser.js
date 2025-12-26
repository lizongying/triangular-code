/**
 * https://github.com/lizongying/tricode
 */
import {
    bilateralFilterGrayscale,
    calculateLength,
    checkCorners,
    detectCorners,
    findConnected,
    grayDataToMatrix,
    isTriangleShape,
    packBitsToBytes,
    rgbToGrayscale,
    toBinaryMatrix,
    traceContourFromRegion,
} from './utils/imageData.js'
import { decode } from './decode.js'
import {
    RGB_PALETTE_4COLORS,
    RGB_PALETTE_8COLORS,
    table,
    table3,
} from './utils/constants.js'

export class Parser {
    constructor(imgData, width, height) {
        this.imgData = imgData
        this.w = width
        this.h = height

        this.bits = 3
    }

    getModuleValueByMedianFilter(x, y, moduleSize = 5) {
        const pixels = []
        const half = Math.floor(moduleSize / 2)

        for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
                const nx = x + dx
                const ny = y + dy
                if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h) {
                    switch (this.bits) {
                        case 3: {
                            const { r, g, b } = getPixelRGB(
                                this.imgData,
                                this.w,
                                nx,
                                ny,
                            )
                            const res = identifyColor([r, g, b], 3)
                            pixels.push(res)
                            break
                        }
                        case 2: {
                            const { r, g, b } = getPixelRGB(
                                this.imgData,
                                this.w,
                                nx,
                                ny,
                            )
                            const res = identifyColor([r, g, b], 2)
                            pixels.push(res)
                            break
                        }
                        default: {
                            pixels.push(this.binaryMatrix[ny][nx])
                        }
                    }
                }
            }
        }

        pixels.sort((a, b) => a - b)
        return pixels[Math.floor(pixels.length / 2)]
    }

    roundToNearest5(num) {
        return Math.floor(num / 5) * 5
    }

    parse() {
        const width = this.w
        const height = this.h

        this.grayData = rgbToGrayscale(this.imgData, width, height)
        // console.log('grayData', this.grayData)

        this.blurredGray = bilateralFilterGrayscale(
            {
                data: this.grayData,
                width: width,
                height: height,
            },
            5,
            30,
            15,
        )
        // console.log('blurredGray', this.blurredGray)

        this.binaryMatrix = toBinaryMatrix(
            grayDataToMatrix(this.blurredGray, width, height),
        )
        // console.log('binaryMatrix', this.binaryMatrix)

        const regions = findConnected(this.binaryMatrix)
        // console.log('regions', regions)

        let vertices = []

        const contours = []
        for (const region of regions) {
            const contour = traceContourFromRegion(this.binaryMatrix, region)
            // console.log('contour', contour)

            if (contour.length < 20) continue
            // console.log('contour', contour)

            const corners = detectCorners(contour)
            if (corners === null) {
                continue
            }
            // console.log('corners', corners)

            if (corners.length !== 3) continue

            if (!isTriangleShape(corners)) continue

            const res = checkCorners(this.binaryMatrix, corners)
            if (res.type === 1) {
                vertices = [res]
            }
            contours.push(res)
        }

        if (vertices.length !== 1) {
            console.log('not find')
            return null
        }

        vertices.unshift(
            contours.find(
                (v) =>
                    v.type === 0 &&
                    (v.side / contours[1].side < 1.2 ||
                        v.side / contours[1].side > 0.8),
            ),
        )
        console.log('vertices', vertices)

        let color = this.getModuleValueByMedianFilter(
            Math.round(vertices[0].center.x),
            Math.round(vertices[0].center.y),
        )

        switch (color) {
            case 1: {
                this.bits = 3
                break
            }
            case 3: {
                this.bits = 2
                break
            }
            default: {
                this.bits = 1
            }
        }

        console.log('bits', this.bits)

        const {
            A: A1,
            B: B1,
            C: C1,
        } = this.classifyTrianglePoints(vertices[1].corners, vertices[0].center)

        const basis0 = this.buildLocalBasis(A1, B1, C1)
        // console.log('basis0', basis0)

        const {
            A: A2,
            B: B2,
            C: C2,
        } = this.classifyTrianglePoints(vertices[0].corners, vertices[1].center)
        const basis1 = this.buildLocalBasis(A2, C2, B2)
        // console.log('basis1', basis1)

        const origin = basis0.origin
        const ex = {
            x: (basis0.ex.x + basis1.ex.x) / 2,
            y: (basis0.ex.y + basis1.ex.y) / 2,
        }
        const ey = {
            x: (basis0.ey.x + basis1.ey.x) / 2,
            y: (basis0.ey.y + basis1.ey.y) / 2,
        }
        const scaleX = (basis0.scaleX + basis1.scaleX) / 2
        const scaleY = (basis0.scaleY + basis1.scaleY) / 2
        const basis = { origin, ex, ey, scaleX, scaleY }
        // console.log('basis', basis)

        let x1 = (vertices[0].side + vertices[1].side) / 8
        let x = calculateLength(vertices[1].center, vertices[0].center) / x1

        console.log(
            'this.roundToNearest5(x)',
            calculateLength(vertices[1].center, vertices[0].center),
            x1,
            this.roundToNearest5(x),
        )
        const version = table[this.roundToNearest5(x)] ?? 93
        console.log('version:', version)

        let positions = decode(version)

        const len = table3[version]
        // let y0 = (vertices[1].center.y - vertices[0].center.y) / len
        // let x0 = (vertices[1].center.x - vertices[0].center.x) / len
        //
        // let ys = []
        // let xs = []
        // let points = []
        // const bits = []
        // for (const p of positions) {
        //     xs.push(vertices[1].center.x - x0 * p[0])
        //     ys.push(vertices[0].center.y + y0 * p[1])
        //
        //     let a = Math.round(vertices[1].center.x - x0 * p[0])
        //     let b = Math.round(vertices[0].center.y + y0 * p[1])
        //
        //     bits.push(this.getModuleValueByMedianFilter(this.binaryMatrix, a, b, 3))

        //     // points.push({x: a, y: b})
        // }

        let y0 =
            Math.abs(
                this.globalToLocal(vertices[1].center, basis).v -
                    this.globalToLocal(vertices[0].center, basis).v,
            ) / len
        // console.log('y0', y0)
        let x0 =
            Math.abs(
                this.globalToLocal(vertices[1].center, basis).u -
                    this.globalToLocal(vertices[0].center, basis).u,
            ) / len
        // console.log('x0', x0)

        let points = []
        const bits = []
        for (const p of positions) {
            let a = this.globalToLocal(vertices[1].center, basis).u - x0 * p[0]
            let b = this.globalToLocal(vertices[0].center, basis).v - y0 * p[1]
            if (p[2] === 1) {
                b = b + y0 / 3
            }

            let m = this.localToGlobal({ u: a, v: b }, basis)

            bits.push(
                this.getModuleValueByMedianFilter(
                    Math.round(m.x),
                    Math.round(m.y),
                    3,
                ),
            )

            points.push({ x: m.x, y: m.y })
        }
        // console.log(points)

        const content = packBitsToBytes(bits, this.bits)

        return {
            regions,
            contours,
            points,
            vertices,
            A1,
            B1,
            C1,
            A2,
            B2,
            C2,
            bits,
            content,
        }
    }

    classifyTrianglePoints(corners, center) {
        let minD = Infinity
        let maxD = -Infinity
        let minP = null
        let maxP = null

        for (const p of corners) {
            const d = calculateLength(p, center)

            if (d < minD) {
                minD = d
                minP = p // C
            }
            if (d > maxD) {
                maxD = d
                maxP = p // B
            }
        }

        // A = 剩下那个
        const A = corners.find((p) => p !== minP && p !== maxP)
        const B = maxP
        const C = minP

        if (!A || !B || !C) {
            throw new Error('三角点分类失败')
        }

        return { A, B, C }
    }

    safeHypot(a, b) {
        a = Math.abs(a)
        b = Math.abs(b)
        const max = Math.max(a, b)
        const min = Math.min(a, b)
        if (max < 1e-12) return 1e-12
        const ratio = min / max
        return max * Math.sqrt(1 + ratio * ratio)
    }

    ensureUnitVector(vec) {
        const len = this.safeHypot(vec.x, vec.y)
        if (Math.abs(len - 1) > 1e-6) return { x: vec.x / len, y: vec.y / len }
        return vec
    }

    /**
     * 新增：向量正交化（确保 ex 和 ey 近似正交，减少分量精度丢失影响）
     * 原理：ey = ey - (ex · ey) * ex → 移除 ey 在 ex 方向的投影，保证正交
     */
    orthogonalize(ex, ey) {
        const dot = ex.x * ey.x + ex.y * ey.y // ex 和 ey 的点积（理想应为0，实际有误差）
        // 移除 ey 在 ex 方向的投影，确保正交
        const eyOrth = {
            x: ey.x - dot * ex.x,
            y: ey.y - dot * ex.y,
        }
        return this.ensureUnitVector(eyOrth) // 重新归一化，保证是单位向量
    }

    /**
     * 最终版：y轴=AB中点→C（不垂直AB），x轴=AB方向（倾斜跟随）
     * 核心：原点=AB中点，x轴沿AB，y轴沿M→C，等比例计算
     * @param {Object} A - 顶点A（{x, y}）
     * @param {Object} B - 顶点B（{x, y}）
     * @param {Object} C - 顶点C（{x, y}）
     * @returns {Object} 局部坐标系：
     *  - origin: AB中点M
     *  - ex: x轴单位向量（沿AB方向）
     *  - ey: y轴单位向量（沿M→C方向）
     *  - scaleX: AB长度（x轴比例基准）
     *  - scaleY: M到C的距离（y轴比例基准）
     */
    buildLocalBasis(A, B, C) {
        // 1. 计算AB中点M（局部坐标系原点）
        const origin = {
            x: (A.x + B.x) / 2,
            y: (A.y + B.y) / 2,
        }

        // 2. 定义x轴：沿AB方向（跟随AB倾斜）
        const ABx = B.x - A.x
        const ABy = B.y - A.y
        const scaleX = this.safeHypot(ABx, ABy) // x轴比例基准（AB的真实长度）
        if (scaleX < 1e-6) throw new Error('顶点A和B不能重合')
        const ex = this.ensureUnitVector({ x: ABx / scaleX, y: ABy / scaleX }) // AB单位向量（x轴方向）

        // 3. 定义y轴：沿M→C方向（核心：不垂直AB，仅指向C）
        const MCx = C.x - origin.x
        const MCy = C.y - origin.y
        const scaleY = this.safeHypot(MCx, MCy) // y轴比例基准（M到C的真实距离）
        if (scaleY < 1e-6) throw new Error('C点不能与AB中点重合')
        // const ey = {x: MCx / scaleY, y: MCy / scaleY}; // M→C单位向量（y轴方向）

        let ey = { x: MCx / scaleY, y: MCy / scaleY } // 初始y轴
        ey = this.orthogonalize(ex, ey) // 关键：正交化修正，确保与ex垂直

        return { origin, ex, ey, scaleX, scaleY }
    }

    /**
     * 全局坐标 → 局部坐标（按x=AB、y=M→C的方向分解）
     * @param {Object} P - 全局坐标点（{x, y}）
     * @param {Object} basis - buildLocalBasis返回的坐标系
     * @returns {Object} 局部坐标：{u, v, uNorm, vNorm}
     *  - u: x轴分量（沿AB方向的长度）
     *  - v: y轴分量（沿M→C方向的长度）
     *  - uNorm: 归一化x分量（0~1对应AB全长）
     *  - vNorm: 归一化y分量（0~1对应M→C全长）
     */
    globalToLocal(P, basis) {
        // 计算P相对于中点M的向量
        const dx = P.x - basis.origin.x
        const dy = P.y - basis.origin.y

        // 分解到x轴（AB方向）和y轴（M→C方向）
        const u = this.preciseAdd(dx * basis.ex.x, dy * basis.ex.y)
        const v = this.preciseAdd(dx * basis.ey.x, dy * basis.ey.y)

        return {
            u,
            v,
            uNorm: u / basis.scaleX, // 归一化（比例计算用）
            vNorm: v / basis.scaleY, // 归一化（比例计算用）
        }
    }

    /**
     * 局部坐标 → 全局坐标（核心：v=0沿AB倾斜，v>0沿M→C方向）
     * @param {Object} localP - 局部坐标（{u, v} 或 {uNorm, vNorm}）
     * @param {Object} basis - buildLocalBasis返回的坐标系
     * @returns {Object} 全局坐标（{x, y}）
     */
    localToGlobal(localP, basis) {
        // 支持原始坐标（u, v）或归一化坐标（uNorm, vNorm）
        const u = localP.u ?? localP.uNorm * basis.scaleX
        const v = localP.v ?? localP.vNorm * basis.scaleY

        // 局部向量 = u*ex（沿AB倾斜） + v*ey（沿M→C）
        const vecX = this.preciseAdd(u * basis.ex.x, v * basis.ey.x)
        const vecY = this.preciseAdd(u * basis.ex.y, v * basis.ey.y)

        // 加上中点M的全局坐标，得到最终位置
        return {
            x: this.preciseAdd(basis.origin.x, vecX),
            y: this.preciseAdd(basis.origin.y, vecY),
        }
    }

    preciseAdd(a, b) {
        // 比较两个数的绝对值，确保小数在前、大数在后
        const absA = Math.abs(a)
        const absB = Math.abs(b)

        if (absA < absB) {
            // a是小数，b是大数 → 小数 + 大数
            return a + b
        } else {
            // b是小数，a是大数 → 小数 + 大数
            return b + a
        }
    }
}

/**
 * Retrieves the RGB values of a pixel at a given coordinate in an image.
 * @param {Uint8ClampedArray} imageData - The image data array containing pixel information.
 * @param {number} width - The width of the image.
 * @param {number} x - The x-coordinate of the pixel.
 * @param {number} y - The y-coordinate of the pixel.
 * @returns {Object} An object containing the red (r), green (g), and blue (b) components of the pixel.
 */
function getPixelRGB(imageData, width, x, y) {
    const index = (y * width + x) * 4
    // Ignore transparency
    return {
        r: imageData[index],
        g: imageData[index + 1],
        b: imageData[index + 2],
    }
}

/**
 * Calculate the squared Euclidean distance between two RGB colors (omitting the square root to improve performance).
 * @param {number[]} rgb1 - The RGB values of the first color, in the format [R, G, B], with values ranging from 0 to 255.
 * @param {number[]} rgb2 - The RGB values of the second color, in the format [R, G, B], with values ranging from 0 to 255.
 * @returns {number} - The squared distance between the two colors (the smaller the value, the closer the colors are).
 */
function rgbDistance(rgb1, rgb2) {
    return (
        Math.pow(rgb1[0] - rgb2[0], 2) +
        Math.pow(rgb1[1] - rgb2[1], 2) +
        Math.pow(rgb1[2] - rgb2[2], 2)
    )
}

function identifyColor(pixelRgb, bits) {
    let minDistance = Infinity
    let matchedColor = null

    let colors = RGB_PALETTE_8COLORS
    switch (bits) {
        case 2: {
            colors = RGB_PALETTE_4COLORS
            break
        }
    }

    for (const color of colors) {
        const distance = rgbDistance(pixelRgb, color.rgb)
        if (distance < minDistance) {
            minDistance = distance
            matchedColor = color.index
        }
    }

    return matchedColor
}
