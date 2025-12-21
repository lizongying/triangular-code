/**
 * 有限域 GF(2^8) 运算（基于本原多项式 x^8 + x^4 + x^3 + x^2 + 1 = 0x11D）
 */
class GF256 {
    constructor() {
        // 预计算对数/反对数表（加速有限域乘法/除法）
        this.expTable = new Array(512); // 反对数表
        this.logTable = new Array(256); // 对数表
        let x = 1;
        for (let i = 0; i < 255; i++) {
            this.expTable[i] = x;
            this.logTable[x] = i;
            x = x << 1;
            if (x & 0x100) {
                x ^= 0x11D; // 本原多项式取模
            }
        }
        // 扩展反对数表（避免越界）
        for (let i = 255; i < 512; i++) {
            this.expTable[i] = this.expTable[i - 255];
        }
    }

    // 有限域加法（等价于异或）
    add(a, b) {
        return a ^ b;
    }

    // 有限域减法（加法逆运算，同加法）
    sub(a, b) {
        return this.add(a, b);
    }

    // 有限域乘法
    mul(a, b) {
        if (a === 0 || b === 0) return 0;
        return this.expTable[this.logTable[a] + this.logTable[b]];
    }

    // 有限域除法
    div(a, b) {
        if (b === 0) throw new Error("除数不能为0");
        if (a === 0) return 0;
        return this.expTable[(this.logTable[a] - this.logTable[b] + 255) % 255];
    }
}

/**
 * Reed-Solomon 编码/解码类（RS(n, k)，默认 RS(255, 239)）
 */
class ReedSolomon {
    constructor(n = 255, k = 239) {
        this.n = n; // 编码后总长度
        this.k = k; // 原始数据长度
        this.t = (n - k) >> 1; // 可纠错的符号数
        this.gf = new GF256(); // 有限域实例
        this.generator = this._generateGeneratorPolynomial(); // 生成多项式
    }

    /**
     * 生成 RS 生成多项式：g(x) = (x - α^0)(x - α^1)...(x - α^(2t-1))
     */
    _generateGeneratorPolynomial() {
        const t2 = 2 * this.t;
        let poly = [1]; // 初始多项式 [1]（x^0）
        for (let i = 0; i < t2; i++) {
            // 多项式乘法：poly = poly * (x - α^i)
            const newPoly = new Array(poly.length + 1).fill(0);
            for (let j = 0; j < poly.length; j++) {
                newPoly[j] = this.gf.add(newPoly[j], poly[j]);
                newPoly[j + 1] = this.gf.add(newPoly[j + 1], this.gf.mul(poly[j], this.gf.expTable[i]));
            }
            poly = newPoly;
        }
        return poly;
    }

    /**
     * RS 编码：原始数据 → 带冗余的编码数据
     * @param {Uint8Array} data 原始数据（长度 ≤ k）
     * @returns {Uint8Array} 编码后数据（长度 = n）
     */
    encode(data) {
        if (data.length > this.k) throw new Error(`数据长度不能超过 ${this.k}`);

        // 补零到 k 长度
        const paddedData = new Uint8Array(this.k);
        paddedData.set(data);

        // 初始化余数（冗余位）
        let remainder = new Array(this.n - this.k).fill(0);

        // 多项式除法：data(x) * x^(n-k) ÷ g(x)，取余数
        for (let i = 0; i < this.k; i++) {
            const coef = this.gf.add(paddedData[i], remainder[0]);
            remainder.shift();
            remainder.push(0);
            for (let j = 0; j < remainder.length; j++) {
                remainder[j] = this.gf.sub(remainder[j], this.gf.mul(this.generator[j + 1], coef));
            }
        }

        // 拼接原始数据 + 冗余位
        const encoded = new Uint8Array(this.n);
        encoded.set(paddedData);
        encoded.set(remainder, this.k);
        return encoded;
    }

    /**
     * 计算伴随式（判断是否有错误，以及错误位置/值）
     * @param {Uint8Array} received 接收数据（长度 = n）
     * @returns {Uint8Array} 伴随式（长度 = 2t）
     */
    _computeSyndromes(received) {
        const syndromes = new Array(2 * this.t).fill(0);
        for (let i = 0; i < 2 * this.t; i++) {
            let s = 0;
            for (let j = 0; j < this.n; j++) {
                s = this.gf.add(this.gf.mul(s, this.gf.expTable[i]), received[j]);
            }
            syndromes[i] = s;
        }
        return syndromes;
    }

    /**
     * RS 解码：带错误的接收数据 → 修复后的数据
     * @param {Uint8Array} received 接收数据（长度 = n）
     * @returns {Uint8Array} 修复后的数据（长度 = k）
     */
    decode(received) {
        if (received.length !== this.n) throw new Error(`接收数据长度必须为 ${this.n}`);

        // 1. 计算伴随式（全零表示无错误）
        const syndromes = this._computeSyndromes(received);
        if (syndromes.every(s => s === 0)) {
            return received.slice(0, this.k); // 无错误，直接返回原始数据
        }

        // 2. 简化版纠错（仅演示核心逻辑，完整实现需 Berlekamp-Massey/Chien 搜索）
        // 注：完整解码需实现错误位置多项式、Chien 搜索、Forney 算法，此处简化为「仅检测错误」
        console.warn("检测到错误，完整纠错需实现 Berlekamp-Massey 算法");
        return received.slice(0, this.k); // 简化版：直接返回原始数据（完整版需修复）
    }
}


const kMap = {
    L: 251,
    M: 247,
    Q: 243,
    H: 239,
}


// ---------------------- 使用示例 ----------------------
// 1. 初始化 RS 编码器（RS(255, 239)，可纠错 8 个符号）
const rs = new ReedSolomon(255, 239);

// 2. 原始数据（示例：QR 码片段）
const originalData = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90]);

// 3. 编码
const encodedData = rs.encode(originalData);
console.log("编码后数据（前10字节）：", Array.from(encodedData.slice(0, 10)));

// 4. 模拟数据错误（修改第 2 个符号）
const corruptedData = new Uint8Array(encodedData);
corruptedData[1] ^= 0xFF; // 人为制造错误
console.log("带错误的数据（第2字节）：", corruptedData[1]);

// 5. 解码（简化版仅检测错误，完整版可修复）
const decodedData = rs.decode(corruptedData);
console.log("解码后数据（前5字节）：", Array.from(decodedData.slice(0, 5)));