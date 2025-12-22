/**
 * https://github.com/lizongying/tricode
 */
// img: Jimp image
export function getImageDataFromJimp(img) {
    const { width, height, data } = img.bitmap
    return {
        width,
        height,
        data: new Uint8ClampedArray(data), // Canvas 风格
    }
}

export function getImageDataFromCanvas(ctx) {
    const canvas = ctx.canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return {
        width: imageData.width,
        height: imageData.height,
        data: imageData.data,
    }
}

/**
 * 将灰度图像数据转换为矩阵
 * @param {Uint8Array} grayData - 灰度图像数据（长度=width*height）
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @returns {Array<Array<number>>} 二维矩阵
 */
export function grayDataToMatrix(grayData, width, height) {
    const matrix = []
    for (let y = 0; y < height; y++) {
        const row = []
        for (let x = 0; x < width; x++) {
            const idx = y * width + x
            row.push(grayData[idx])
        }
        matrix.push(row)
    }
    return matrix
}

/**
 *
 * @param {Array<Array<number>>} matrix - 二维矩阵
 * @returns {Array<Array<number>>} 二维矩阵
 */
export function toBinaryMatrix(matrix) {
    return matrix.map((row) => row.map((v) => (v < 128 ? 1 : 0)))
}

/**
 * RGB 转灰度（单通道）
 * @param {Uint8ClampedArray} rgbData - RGB 图像数据（格式：R,G,B,A, R,G,B,A,...）
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @returns {Uint8Array} 灰度图像数据（单通道）
 */
export function rgbToGrayscale(rgbData, width, height) {
    const grayData = new Uint8Array(width * height)
    for (let i = 0; i < rgbData.length; i += 4) {
        const r = rgbData[i]
        const g = rgbData[i + 1]
        const b = rgbData[i + 2]
        grayData[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    }
    return grayData
}

//
// -----------------------------
// 1. 连通区域
// -----------------------------
export function findConnected(bin) {
    const h = bin.length,
        w = bin[0].length
    const visited = Array.from({ length: h }, () => Array(w).fill(false))
    const regions = []

    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
    ]

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (bin[y][x] === 1 && !visited[y][x]) {
                let q = [[x, y]],
                    region = [[x, y]]
                visited[y][x] = true

                while (q.length) {
                    let [cx, cy] = q.pop()
                    for (const [dX, dY] of dirs) {
                        let nx = cx + dX,
                            ny = cy + dY
                        if (
                            nx >= 0 &&
                            nx < w &&
                            ny >= 0 &&
                            ny < h &&
                            bin[ny][nx] === 1 &&
                            !visited[ny][nx]
                        ) {
                            visited[ny][nx] = true
                            region.push([nx, ny])
                            q.push([nx, ny])
                        }
                    }
                }
                regions.push(region)
            }
        }
    }
    return regions
}

//
// -----------------------------
// 2. 从区域提取轮廓（8 邻域）
// -----------------------------
export function traceContourFromRegion(bin, region) {
    const pts = new Set(region.map((p) => p.join(',')))
    const dirs = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
    ]

    const [sx, sy] = region[0]
    let cx = sx,
        cy = sy
    let prevDir = 0

    let contour = [{ x: cx, y: cy }]

    for (let step = 0; step < 50000; step++) {
        let found = false
        for (let k = -1; k <= 6; k++) {
            const d = (prevDir + k + 8) % 8
            const nx = cx + dirs[d][0]
            const ny = cy + dirs[d][1]
            if (pts.has(nx + ',' + ny)) {
                contour.push({ x: nx, y: ny })
                cx = nx
                cy = ny
                prevDir = d
                found = true
                break
            }
        }
        if (!found || (cx === sx && cy === sy && contour.length > 5)) break
    }

    return contour
}

//
// -----------------------------
// 4. 曲率角点检测（阈值可调）
// -----------------------------
const RAD_100DEG = 1.7 // 预计算的值（Math.PI * 100 / 180）
const RAD_30DEG = 0.5 // 预计算的值（Math.PI * 30 / 180）

export function detectCorners(contour) {
    const n = contour.length
    const corners = []
    const K = 10

    for (let i = 0; i < n; i++) {
        const p0 = contour[(i - K + n) % n]
        const p1 = contour[i]
        const p2 = contour[(i + K) % n]

        const v1 = [p0.x - p1.x, p0.y - p1.y]
        const v2 = [p2.x - p1.x, p2.y - p1.y]

        const d = dot(v1, v2) / (len(v1) * len(v2) + 1e-6)
        const ang = Math.acos(Math.max(-1, Math.min(1, d)))

        if (ang < RAD_100DEG && ang > RAD_30DEG) {
            // 小角度 = 角点
            corners.push(p1)
        }
    }

    if (corners.length < 1) {
        return null
    }

    // console.log(22222, corners)

    // 1. 初始化 DBSCAN
    const dbscan = new DBSCAN(20, 3) // 调整 eps 和 minSamples

    // 2. 执行聚类
    const labels = dbscan.fit(corners)

    // 3. 统计簇数量并筛选
    const clusters = {}
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i]
        if (!clusters[label]) clusters[label] = []
        clusters[label].push(corners[i])
    }

    // 4. 筛选簇数量为3的情况（可能是三角形）
    const validClusters = Object.values(clusters).filter(
        (cluster) => cluster.length >= 1,
    )

    // 5. 如果恰好有3个簇，可能是三角形
    if (validClusters.length === 3) {
        // return [validClusters[0]]
        return validClusters.map((cluster) => {
            // 计算簇内所有点的 x 和 y 的均值
            const sum = cluster.reduce(
                (acc, point) => {
                    return {
                        x: acc.x + point.x,
                        y: acc.y + point.y,
                    }
                },
                { x: 0, y: 0 },
            )

            return {
                x: sum.x / cluster.length, // x 均值
                y: sum.y / cluster.length, // y 均值
            } // 返回簇的中心点
        })
    } else {
        return null
    }
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1]
}

function len(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1])
}

class DBSCAN {
    constructor(eps, minSamples) {
        this.eps = eps // 邻域半径
        this.minSamples = minSamples // 最小样本数
    }

    // 计算两点之间的欧氏距离
    euclideanDistance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
    }

    // 获取邻域内的所有点
    getNeighbors(pointIndex, points) {
        const neighbors = []
        for (let i = 0; i < points.length; i++) {
            if (
                this.euclideanDistance(points[pointIndex], points[i]) <=
                this.eps
            ) {
                neighbors.push(i)
            }
        }
        return neighbors
    }

    // DBSCAN 主算法
    fit(points) {
        const labels = new Array(points.length).fill(-1) // -1 表示未分类（噪声）
        let clusterId = 0

        for (let i = 0; i < points.length; i++) {
            if (labels[i] !== -1) continue // 已分类的点跳过

            const neighbors = this.getNeighbors(i, points)
            if (neighbors.length < this.minSamples) {
                labels[i] = -1 // 标记为噪声
                continue
            }

            // 开始新簇
            labels[i] = clusterId
            let seedSet = new Set(neighbors)

            // 扩展簇
            for (const j of seedSet) {
                if (labels[j] === -1) {
                    labels[j] = clusterId // 噪声点重新分类
                }
                if (labels[j] !== -1) continue // 已分类的点跳过

                labels[j] = clusterId
                const newNeighbors = this.getNeighbors(j, points)
                if (newNeighbors.length >= this.minSamples) {
                    newNeighbors.forEach((neighbor) => seedSet.add(neighbor))
                }
            }

            clusterId++ // 下一个簇
        }

        return labels
    }
}

//
// -----------------------------
// 6. 是否为三角形形状
// -----------------------------
export function isTriangleShape(pts) {
    const d = []
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            let dx = pts[i].x - pts[j].x
            let dy = pts[i].y - pts[j].y
            d.push(Math.sqrt(dx * dx + dy * dy))
        }
    }
    d.sort((a, b) => a - b)
    return d[2] / d[0] < 1.15 // 三边长度差不能太大
}

function calculateTriangleCentroid(A, B, C) {
    return {
        x: (A.x + B.x + C.x) / 3,
        y: (A.y + B.y + C.y) / 3,
    }
}

export function calculateLength(A, B) {
    const dx = A.x - B.x
    const dy = A.y - B.y
    return Math.sqrt(dx * dx + dy * dy)
}

export function checkCorners(bin, corners) {
    const center = calculateTriangleCentroid(corners[0], corners[1], corners[2])
    const side = calculateLength(corners[0], corners[1])
    const l = (side * Math.sqrt(3) * 5) / 8

    let res = null
    for (const corner of corners) {
        const r = checkPattern(bin, corner, getOutVertices(corner, center, l))
        if (res === null) {
            res = r
        } else if (r !== res) {
            res = -1
            break
        }
    }
    return {
        corners: corners,
        center: center,
        side: side,
        type: res,
    }
}

/**
 * Given point A and point D, calculates point E that lies on the extension line of AD
 * at a distance `l` from point A.
 */
function getOutVertices(A, D, l) {
    // Vector AD
    const dx = D.x - A.x
    const dy = D.y - A.y

    // Length of AD
    const len = Math.hypot(dx, dy)

    if (len === 0) {
        throw new Error(
            'A and D are the same point; cannot determine direction',
        )
    }

    // Unit direction vector
    const ux = dx / len
    const uy = dy / len

    // E = A + unit vector * l
    return {
        x: A.x + ux * l,
        y: A.y + uy * l,
    }
}

function checkPattern(bin, A, E) {
    const h = bin.length
    const w = bin[0].length

    const N = 100
    const seg = 20

    let count = [0, 0, 0, 0, 0]

    for (let i = 0; i < N; i++) {
        const t = i / (N - 1)

        const x = A.x + (E.x - A.x) * t
        const y = A.y + (E.y - A.y) * t

        const sx = Math.round(x)
        const sy = Math.round(y)

        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue

        const val = bin[sy][sx]

        const idx = Math.min(Math.floor(i / seg), 4)
        count[idx] += val
    }

    function mostlyBlack(c) {
        return c > 12
    }

    function mostlyWhite(c) {
        return c < 8
    }

    if (
        mostlyBlack(count[0]) &&
        mostlyBlack(count[1]) &&
        mostlyBlack(count[2]) &&
        mostlyBlack(count[3]) &&
        mostlyWhite(count[4])
    ) {
        return 0
    }

    if (
        mostlyBlack(count[0]) &&
        mostlyBlack(count[1]) &&
        mostlyWhite(count[2]) &&
        mostlyBlack(count[3]) &&
        mostlyWhite(count[4])
    ) {
        return 1
    }

    return -1
}

export function bilateralFilterGrayscale(
    imageData,
    radius,
    sigmaColor,
    sigmaSpace,
) {
    const { width, height, data } = imageData // 单通道：data是Uint8Array，长度=width*height
    const output = new Uint8Array(data.length)

    // 预计算权重表
    const kernelRadius = Math.floor(radius)
    const kernelSize = kernelRadius * 2 + 1
    const spaceWeightTable = new Array(kernelSize * kernelSize)
    const colorWeightTable = new Array(256)

    // 空间权重表（固定sigmaSpace）
    const sigmaSpaceSq = 2 * sigmaSpace * sigmaSpace
    for (let i = -kernelRadius; i <= kernelRadius; i++) {
        for (let j = -kernelRadius; j <= kernelRadius; j++) {
            const dist = i * i + j * j
            spaceWeightTable[
                (i + kernelRadius) * kernelSize + (j + kernelRadius)
            ] = Math.exp(-dist / sigmaSpaceSq)
        }
    }

    // 颜色权重表（固定sigmaColor）
    const sigmaColorSq = 2 * sigmaColor * sigmaColor
    for (let i = 0; i < 256; i++) {
        colorWeightTable[i] = Math.exp(-(i * i) / sigmaColorSq)
    }

    // 边界处理：预计算每个像素的邻域范围
    const xMin = new Array(width)
        .fill(0)
        .map((_, x) => Math.max(0, x - kernelRadius))
    const xMax = new Array(width)
        .fill(0)
        .map((_, x) => Math.min(width - 1, x + kernelRadius))
    const yMin = new Array(height)
        .fill(0)
        .map((_, y) => Math.max(0, y - kernelRadius) * width)
    const yMax = new Array(height)
        .fill(0)
        .map((_, y) => Math.min(height - 1, y + kernelRadius) * width)

    for (let y = 0; y < height; y++) {
        const rowStart = y * width
        for (let x = 0; x < width; x++) {
            const centerIdx = rowStart + x
            const centerVal = data[centerIdx]

            let sum = 0
            let totalWeight = 0

            // 遍历邻域
            for (let i = yMin[y]; i <= yMax[y]; i += width) {
                for (let j = xMin[x]; j <= xMax[x]; j++) {
                    const idx = i + j
                    const kernelIdx =
                        (Math.floor(i / width) - (y - kernelRadius)) *
                            kernelSize +
                        (j - (x - kernelRadius))

                    // 空间权重（查表）
                    const spaceWeight = spaceWeightTable[kernelIdx]

                    // 颜色权重（查表）
                    const colorDist = Math.abs(data[idx] - centerVal)
                    const colorWeight = colorWeightTable[colorDist]

                    const weight = spaceWeight * colorWeight
                    sum += data[idx] * weight
                    totalWeight += weight
                }
            }

            // 归一化
            output[centerIdx] = Math.round(sum / totalWeight)
        }
    }

    // 返回单通道ImageData（需构造）
    return output
}

const m2 = {
    0: [0, 0],
    1: [0, 1],
    2: [1, 0],
    3: [1, 1],
}

const m3 = {
    0: [0, 0, 0],
    1: [0, 0, 1],
    2: [0, 1, 0],
    3: [0, 1, 1],
    4: [1, 0, 0],
    5: [1, 0, 1],
    6: [1, 1, 0],
    7: [1, 1, 1],
}

export function packBitsToBytes(bitsArray, bits = 1) {
    const bytes = []
    let buffer = 0
    let count = 0

    switch (bits) {
        case 1: {
            break
        }
        case 2: {
            bitsArray = bitsArray.flatMap((bit) => m2[bit])
            break
        }
        case 3: {
            bitsArray = bitsArray.flatMap((bit) => m3[bit])
            break
        }
        default: {
            throw new Error('bits error')
        }
    }

    const sign = (bitsArray.shift() << 1) | bitsArray.shift()
    console.log('sign', sign)

    let content = ''
    switch (sign) {
        case 0: {
            let bitPos = 10
            const lenBits = bitsArray.slice(0, bitPos)
            let originalLength = 0
            for (let i of lenBits) {
                originalLength = (originalLength << 1) | i
            }

            const bitsStr = bitsArray.slice(10).join('')

            // 4. 解析數據位（長度欄位後的部分）
            const dataStart = 0
            const dataBits = bitsStr.slice(dataStart)
            let remainingLength = originalLength // 剩餘需解析的數字位數
            let currentPos = 0 // 當前解析到的數據位位置
            // let numericStr = ""; // 還原的數字字串

            // 5. 按組解析數據位（逆向編碼邏輯）
            while (remainingLength > 0) {
                let groupBits, groupNum, groupLength
                if (remainingLength >= 3) {
                    // 剩餘≥3位 → 取10位二進位，還原3位數字
                    groupBits = 10
                    groupLength = 3
                } else if (remainingLength === 2) {
                    // 剩餘2位 → 取7位二進位，還原2位數字
                    groupBits = 7
                    groupLength = 2
                } else {
                    // 剩餘1位 → 取4位二進位，還原1位數字
                    groupBits = 4
                    groupLength = 1
                }

                // 截取當前組的二進位，並轉為十進位數字
                const currentBits = dataBits.slice(
                    currentPos,
                    currentPos + groupBits,
                )
                if (currentBits.length < groupBits) {
                    throw new Error('位元串長度不足，無法解析完整數據')
                }
                groupNum = parseInt(currentBits, 2).toString()
                // 補前導零（例如：二進位0111→7 → 還原為"007"（3位組）/"07"（2位組））
                groupNum = groupNum.padStart(groupLength, '0')

                console.log('groupNum', groupNum)

                // 拼接並更新狀態
                content += groupNum
                currentPos += groupBits
                remainingLength -= groupLength
            }

            // 6. 最終校驗：還原的字串長度需與解析的長度一致
            if (content.length !== originalLength) {
                throw new Error(
                    '還原的數字串長度與標註長度不匹配，位元串可能損壞',
                )
            }
            break
        }
        case 1: {
            // utf8
            for (const bit of bitsArray) {
                buffer = (buffer << 1) | bit
                count++
                if (count === 8) {
                    if (buffer === 0) {
                        break
                    }
                    bytes.push(buffer)
                    buffer = 0
                    count = 0
                }
            }

            content = decodeUtf8Bytes(bytes)
            break
        }
        default: {
            // TODO bits or bytes?
            throw new Error(`error sign ${sign}`)
        }
    }

    return content
}

/**
 * 正确解码 UTF-8 字节数组为汉字字符串
 * @param {number[]} bytes UTF-8 字节数组（十进制）
 * @returns {string} 解码后的字符串
 */
function decodeUtf8Bytes(bytes) {
    try {
        // 方案1：现代环境（推荐）- 使用 TextDecoder 解析 UTF-8
        if (typeof TextDecoder !== 'undefined') {
            const uint8Arr = new Uint8Array(bytes)
            const decoder = new TextDecoder('utf-8', { fatal: true }) // 开启错误检测
            return decoder.decode(uint8Arr)
        }

        // 方案2：兼容旧环境 - 手动解析 UTF-8 字节（无 TextDecoder 时）
        let str = ''
        let i = 0
        while (i < bytes.length) {
            let byte = bytes[i]
            let charCode = 0

            // 单字节（0xxxxxxx）
            if ((byte & 0x80) === 0) {
                charCode = byte
                i += 1
            }
            // 双字节（110xxxxx 10xxxxxx）
            else if ((byte & 0xe0) === 0xc0) {
                if (i + 1 >= bytes.length) throw new Error('UTF-8 字节不完整')
                charCode = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f)
                i += 2
            }
            // 三字节（1110xxxx 10xxxxxx 10xxxxxx）→ 汉字核心范围
            else if ((byte & 0xf0) === 0xe0) {
                if (i + 2 >= bytes.length) throw new Error('UTF-8 字节不完整')
                charCode =
                    ((byte & 0x0f) << 12) |
                    ((bytes[i + 1] & 0x3f) << 6) |
                    (bytes[i + 2] & 0x3f)
                i += 3
            }
            // 四字节（11110xxx ...）
            else if ((byte & 0xf8) === 0xf0) {
                if (i + 3 >= bytes.length) throw new Error('UTF-8 字节不完整')
                charCode =
                    ((byte & 0x07) << 18) |
                    ((bytes[i + 1] & 0x3f) << 12) |
                    ((bytes[i + 2] & 0x3f) << 6) |
                    (bytes[i + 3] & 0x3f)
                i += 4
            } else {
                throw new Error(`无效的 UTF-8 字节：${byte}`)
            }

            str += String.fromCharCode(charCode)
        }
        return str
    } catch (e) {
        console.error('UTF-8 解码失败：', e.message)
        return '' // 解码失败返回空串（或按需处理）
    }
}
