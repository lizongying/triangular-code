/**
 * @license
 * https://github.com/lizongying/triangular-code
 */
class TriangularCode {

    constructor(container, size = 200, color = 'green', colorBackground = 'white', text = '') {
        this.container = container;
        this.scale = Math.sin(this.degreesToRadians(60));

        this._svgNamespace = 'http://www.w3.org/2000/svg';

        this.color = color;
        this.colorBackground = colorBackground;
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

    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    stringToBinary(str) {
        const encoder = new TextEncoder();
        const byteArray = encoder.encode(str);
        return Array.from(byteArray)
            .flatMap(byte => byte.toString(2).padStart(8, '0').split(''))
            .map(Number);
    }

    encode(text = this.text) {
        this.text = text;
        const color = this.color;
        const colorBackground = this.colorBackground;
        let data = this.stringToBinary(text);
        console.log('data', data);

        if (data.length < 32) {
            data = data.concat(new Array(32 - data.length).fill(0));
        }

        let arr = [
            1,
            1, 1, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,
        ];

        if (data.length > 32) {
            arr = arr.concat([0]);
        }

        arr = arr.concat(data);
        let arr2 = [
            0,
            0, 0, 1,
            0, 0, 1, 1, 1,
            0, 0, 1, 1, 0, 1, 1,
            0, 0, 1, 1, 1, 1, 1, 1, 1,
        ];

        let cont = arr.length + 25;
        let row = Math.ceil(Math.sqrt(cont));
        let one = this.size / row;

        let index = 0;
        let index2 = 0;
        for (let i = 0; i < row; i++) {
            let l = 2 * i + 1;

            if (i > row - 6) {
                l -= ((5 - (row - i)) * 2 + 1);
                let m = i - (row - 5);
                let l2 = 2 * m + 1;
                for (let ii = 0; ii < l2; ii++) {
                    let x = (this.size - (5 / 2 * one)) - (m * one / 2);
                    let y = i * one;

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

                    const triangle = document.createElementNS(this._svgNamespace, 'polygon');
                    triangle.setAttribute('points', `${a.join(',')} ${b.join(',')} ${c.join(',')}`);
                    if (index2 < arr2.length && arr2[index2] === 1) {
                        triangle.setAttribute('fill', color);
                    } else {
                        triangle.setAttribute('fill', colorBackground);
                    }
                    this._svg.appendChild(triangle);
                    index2++;
                }
            }

            for (let ii = 0; ii < l; ii++) {
                let x = (this.size / 2) - (i * one / 2);
                let y = i * one;

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

                const triangle = document.createElementNS(this._svgNamespace, 'polygon');
                triangle.setAttribute('points', `${a.join(',')} ${b.join(',')} ${c.join(',')}`);
                if (index < arr.length && arr[index] === 1) {
                    triangle.setAttribute('fill', color);
                } else {
                    triangle.setAttribute('fill', colorBackground);
                }
                this._svg.appendChild(triangle);
                index++;
            }
        }
    }
}
