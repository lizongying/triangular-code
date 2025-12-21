/**
 * 有限域 GF(2^8) 运算（本原多项式 x^8 + x^4 + x^3 + x^2 + 1 = 0x11D）
 */
class GF256 {
    constructor() {
        // 预计算对数/反对数表（加速有限域运算）
        this.expTable = new Array(512); // 反对数表 (α^i)
        this.logTable = new Array(256); // 对数表 (log_α(x))
        let x = 1;
        for (let i = 0; i < 255; i++) {
            this.expTable[i] = x;
            this.logTable[x] = i;
            x = x << 1; // 乘以 α
            if (x & 0x100) { // 超过8位则模本原多项式
                x ^= 0x11D;
            }
        }
        // 扩展反对数表（避免越界）
        for (let i = 255; i < 512; i++) {
            this.expTable[i] = this.expTable[i - 255];
        }
    }

    // 有限域加法（异或）
    add(a, b) {
        return a ^ b;
    }

    // 有限域减法（同加法）
    sub(a, b) {
        return this.add(a, b);
    }

    // 有限域乘法
    mul(a, b) {
        if (a === 0 || b === 0) return 0;
        return this.expTable[(this.logTable[a] + this.logTable[b]) % 255];
    }

    // 有限域除法
    div(a, b) {
        if (b === 0) throw new Error("除数不能为0");
        if (a === 0) return 0;
        return this.expTable[(this.logTable[a] - this.logTable[b] + 255) % 255];
    }

    // 多项式乘法（有限域内）
    polyMul(p1, p2) {
        const res = new Array(p1.length + p2.length - 1).fill(0);
        for (let i = 0; i < p1.length; i++) {
            if (p1[i] === 0) continue;
            for (let j = 0; j < p2.length; j++) {
                res[i + j] = this.add(res[i + j], this.mul(p1[i], p2[j]));
            }
        }
        return res;
    }

    // 多项式除法（有限域内，返回商+余数）
    polyDiv(dividend, divisor) {
        let rem = [...dividend];
        const degDivisor = divisor.length - 1;
        const degRem = rem.length - 1;

        if (degRem < degDivisor) return [[0], rem];

        // 归一化除数（最高次项为1）
        const invLeading = this.div(1, divisor[degDivisor]);
        const normDivisor = divisor.map(c => this.mul(c, invLeading));

        // 多项式长除法
        for (let i = degRem; i >= degDivisor; i--) {
            const coef = this.mul(rem[i], invLeading);
            if (coef === 0) continue;
            for (let j = 0; j <= degDivisor; j++) {
                rem[i - j] = this.sub(rem[i - j], this.mul(normDivisor[degDivisor - j], coef));
            }
        }

        // 裁剪前导零
        while (rem.length > 1 && rem[rem.length - 1] === 0) rem.pop();
        return [[], rem]; // 仅返回余数（RS编码只需要余数）
    }
}

/**
 * Reed-Solomon 编码/解码器（支持错误修复，适配QR码L/M/Q/H四级）
 */
class ReedSolomon {
    /**
     * 初始化RS编码器
     * @param {number} level 纠错等级：L/M/Q/H（对应t=2/4/6/8）
     */
    constructor(level = "H") {
        this.gf = new GF256();
        this.n = 255; // GF(2^8)最大长度
        // 按纠错等级设置t和k
        const levelMap = {
            L: { t: 2, k: 251 },
            M: { t: 4, k: 247 },
            Q: { t: 6, k: 243 },
            H: { t: 8, k: 239 }
        };
        const { t, k } = levelMap[level] || levelMap.H;
        this.t = t; // 可纠错符号数
        this.k = k; // 原始数据长度
        this.r = this.n - this.k; // 冗余位长度
        this.generator = this._generateGeneratorPolynomial(); // 生成多项式
    }

    /**
     * 生成RS生成多项式：g(x) = (x - α^0)(x - α^1)...(x - α^(2t-1))
     */
    _generateGeneratorPolynomial() {
        let poly = [1]; // 初始多项式 [1] (x^0)
        for (let i = 0; i < 2 * this.t; i++) {
            // 多项式乘法：poly = poly * (x - α^i)
            const root = this.gf.expTable[i]; // α^i
            const newPoly = new Array(poly.length + 1).fill(0);
            for (let j = 0; j < poly.length; j++) {
                newPoly[j] = this.gf.add(newPoly[j], poly[j]); // x * poly[j]
                newPoly[j + 1] = this.gf.add(newPoly[j + 1], this.gf.mul(poly[j], root)); // -α^i * poly[j]
            }
            poly = newPoly;
        }
        // 裁剪前导零
        while (poly.length > 1 && poly[poly.length - 1] === 0) poly.pop();
        return poly;
    }

    /**
     * RS编码：原始数据 → 带冗余的编码数据
     * @param {Uint8Array} data 原始数据（长度 ≤ k）
     * @returns {Uint8Array} 编码后数据（长度 = n）
     */
    encode(data) {
        if (data.length > this.k) throw new Error(`原始数据长度不能超过 ${this.k} 字节`);

        // 补零到k长度
        const paddedData = new Uint8Array(this.k);
        paddedData.set(data);

        // 构造被除数：data(x) * x^r
        const dividend = [...paddedData, ...new Array(this.r).fill(0)];

        // 多项式除法：计算余数（冗余位）
        const [_, remainder] = this.gf.polyDiv(dividend, this.generator);

        // 修复点1：将paddedRemainder改为Uint8Array（支持set方法）
        const paddedRemainder = new Uint8Array(this.r).fill(0);
        // 计算余数的起始位置（确保不越界）
        const startPos = this.r - remainder.length;
        if (startPos >= 0) {
            // 仅当余数长度 ≤ r 时才复制
            for (let i = 0; i < remainder.length; i++) {
                paddedRemainder[startPos + i] = remainder[i];
            }
        }

        // 拼接原始数据 + 冗余位
        const encoded = new Uint8Array(this.n);
        encoded.set(paddedData);
        encoded.set(paddedRemainder, this.k);

        return encoded;
    }

    /**
     * 计算伴随式（判断错误并为纠错提供依据）
     * @param {Uint8Array} received 接收数据（长度 = n）
     * @returns {Uint8Array} 伴随式（长度 = 2t）
     */
    _computeSyndromes(received) {
        const syndromes = new Array(2 * this.t).fill(0);
        for (let i = 0; i < 2 * this.t; i++) {
            let s = 0;
            const alpha = this.gf.expTable[i]; // α^i
            for (let j = 0; j < this.n; j++) {
                s = this.gf.add(this.gf.mul(s, alpha), received[j]);
            }
            syndromes[i] = s;
        }
        return syndromes;
    }

    /**
     * Berlekamp-Massey算法：求解错误位置多项式
     * @param {Uint8Array} syndromes 伴随式
     * @returns {Uint8Array} 错误位置多项式 Λ(x)
     */
    _berlekampMassey(syndromes) {
        let lam = [1]; // 错误位置多项式 Λ(x)，初始为 1
        let b = [1];   // 辅助多项式 B(x)
        let l = 0;     // 错误位置多项式的度
        let m = 1;     // 步长
        let bError = 1; // 最后一次错误的系数

        for (let n = 0; n < 2 * this.t; n++) {
            // 计算差值 d
            let d = syndromes[n];
            for (let i = 1; i <= l; i++) {
                d = this.gf.add(d, this.gf.mul(lam[i], syndromes[n - i]));
            }

            if (d === 0) {
                // 无错误，更新步长
                m++;
            } else {
                // 有错误，更新多项式
                const temp = [...lam];
                const coef = this.gf.div(d, bError);
                // 计算 lam = lam - d/bError * B(x) * x^m
                for (let i = 0; i < b.length; i++) {
                    const pos = i + m;
                    if (pos >= lam.length) {
                        lam[pos] = 0; // 扩展数组长度
                    }
                    lam[pos] = this.gf.sub(lam[pos], this.gf.mul(coef, b[i]));
                }

                if (2 * l <= n) {
                    // 更新辅助多项式
                    l = n + 1 - l;
                    b = temp;
                    bError = d;
                    m = 1;
                } else {
                    m++;
                }
            }
        }

        // 裁剪前导零并反转（便于后续计算）
        while (lam.length > 1 && lam[lam.length - 1] === 0) lam.pop();
        return lam.reverse();
    }

    /**
     * Chien搜索：找到错误位置
     * @param {Uint8Array} lam 错误位置多项式
     * @returns {number[]} 错误位置索引（0~n-1）
     */
    _chienSearch(lam) {
        const errors = [];
        // 遍历所有可能的位置（α^0 ~ α^254）
        for (let i = 0; i < this.n; i++) {
            let x = this.gf.expTable[i]; // α^i
            let val = 0;
            // 计算 Λ(α^-i) = 0？
            for (let j = 0; j < lam.length; j++) {
                val = this.gf.add(val, this.gf.mul(lam[j], this.gf.expTable[(j * (255 - i)) % 255]));
            }
            if (val === 0) {
                errors.push(this.n - 1 - i); // 转换为数据索引
            }
        }
        return errors;
    }

    /**
     * Forney算法：计算错误值并修复
     * @param {Uint8Array} received 接收数据
     * @param {number[]} errorLocs 错误位置
     * @param {Uint8Array} syndromes 伴随式
     * @returns {Uint8Array} 修复后的数据
     */
    _forneyAlgorithm(received, errorLocs, syndromes) {
        const fixed = new Uint8Array([...received]);
        const t = errorLocs.length;

        for (let i = 0; i < t; i++) {
            const pos = errorLocs[i];
            if (pos < 0 || pos >= this.n) continue; // 跳过无效位置
            const x = this.gf.expTable[this.n - 1 - pos]; // α^(n-1-pos)

            // 计算错误值的分子
            let numerator = 0;
            for (let j = 0; j < 2 * this.t; j++) {
                numerator = this.gf.add(numerator, this.gf.mul(syndromes[j], this.gf.expTable[(j * (255 - (this.gf.logTable[x] || 0))) % 255]));
            }

            // 计算错误值的分母
            let denominator = 1;
            for (let j = 0; j < t; j++) {
                if (i !== j) {
                    const xj = this.gf.expTable[this.n - 1 - errorLocs[j]];
                    denominator = this.gf.mul(denominator, this.gf.sub(x, xj));
                }
            }

            // 计算错误值并修复（避免除以0）
            if (denominator !== 0) {
                const errorVal = this.gf.div(numerator, denominator);
                fixed[pos] = this.gf.add(fixed[pos], errorVal);
            }
        }

        return fixed;
    }

    /**
     * RS解码：带错误的接收数据 → 修复后的数据
     * @param {Uint8Array} received 接收数据（长度 = n）
     * @returns {Uint8Array} 修复后的原始数据（长度 = k）
     */
    decode(received) {
        if (received.length !== this.n) throw new Error(`接收数据长度必须为 ${this.n} 字节`);

        // 1. 计算伴随式（全零 = 无错误）
        const syndromes = this._computeSyndromes(received);
        if (syndromes.every(s => s === 0)) {
            return received.slice(0, this.k);
        }

        // 2. Berlekamp-Massey算法：求错误位置多项式
        const lam = this._berlekampMassey(syndromes);
        if (lam.length - 1 > this.t) {
            throw new Error("错误数超过纠错能力");
        }

        // 3. Chien搜索：找到错误位置
        const errorLocs = this._chienSearch(lam);
        if (errorLocs.length === 0) {
            return received.slice(0, this.k);
        }

        // 4. Forney算法：计算错误值并修复数据
        const fixed = this._forneyAlgorithm(received, errorLocs, syndromes);

        // 5. 验证修复结果（重新计算伴随式）
        const newSyndromes = this._computeSyndromes(fixed);
        if (!newSyndromes.every(s => s === 0)) {
            throw new Error("数据修复失败（错误数超过纠错能力）");
        }

        // 返回修复后的原始数据
        return fixed.slice(0, this.k);
    }
}

// ---------------------- 完整测试示例（QR码H级纠错） ----------------------
(function testRS() {
    try {
        // 1. 初始化H级编码器（对应k=239, t=8）
        const rs = new ReedSolomon("H");
        console.log(`RS编码器初始化完成：n=${rs.n}, k=${rs.k}, t=${rs.t}`);

        // 2. 原始数据（示例：10字节测试数据）
        const originalData = new Uint8Array([
            0x12, 0x34, 0x56, 0x78, 0x90,
            0xAB, 0xCD, 0xEF, 0x01, 0x23
        ]);
        console.log("原始数据：", Array.from(originalData));

        // 3. RS编码（生成255字节带冗余的数据）
        const encodedData = rs.encode(originalData);
        console.log("编码后数据长度：", encodedData.length); // 255

        // 4. 模拟数据错误（人为损坏8个符号，刚好达到H级纠错上限）
        const corruptedData = new Uint8Array([...encodedData]);
        const errorPositions = [5, 10, 15, 20, 25, 30, 35, 40]; // 8个错误位置
        errorPositions.forEach(pos => {
            corruptedData[pos] ^= 0xFF; // 翻转字节值制造错误
        });
        console.log("制造错误位置：", errorPositions);
        console.log("错误位置原始值：", errorPositions.map(p => encodedData[p]));
        console.log("错误位置损坏值：", errorPositions.map(p => corruptedData[p]));

        // 5. RS解码（修复错误）
        const decodedData = rs.decode(corruptedData);
        console.log("解码修复后数据：", Array.from(decodedData.slice(0, originalData.length)));

        // 6. 验证结果
        const isEqual = JSON.stringify(Array.from(originalData)) === JSON.stringify(Array.from(decodedData.slice(0, originalData.length)));
        console.log(`数据修复验证：${isEqual ? "成功" : "失败"}`);

    } catch (e) {
        console.error("测试失败：", e.message);
        console.error("错误堆栈：", e.stack);
    }
})();