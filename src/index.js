import { Generator } from './generator.js'

const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
const isAndroid = /Android/i.test(navigator.userAgent)

const isCanvas = isDarkMode && isAndroid

window.onload = () => {
    const svg = document.querySelector('#svg')
    const input = document.querySelector('#input')
    const slider = document.querySelector('#slider')
    const bits = document.querySelector('[name="bits"][checked]')

    let size = 200
    slider.value = size

    let instance = new Generator(
        svg,
        input.value,
        Number(bits.value),
        size,
        isCanvas,
    )

    input.addEventListener('input', () => {
        instance.updateText(input.value)
    })

    slider.addEventListener('input', () => {
        instance.updateSize(Number(slider.value))
    })

    let hide = false
    const container = document.querySelector('.container')
    const aside = document.querySelector('.aside')
    const action = document.querySelector('#action')
    action.onclick = () => {
        if (!hide) {
            input.style.display = 'none'
            container.style.width = '100%'
            aside.style.display = 'none'
            action.innerText = '顯'
        } else {
            input.style.display = 'flex'
            container.style.width = 'calc(100% - 5em)'
            aside.style.display = 'grid'
            action.innerText = '隱'
        }
        hide = !hide
    }

    document.querySelector('#export').onclick = (e) => {
        e.preventDefault()
        toPng()
        // toSvg()
    }

    const toPng = () => {
        if (isCanvas) {
            const cvs = container.querySelector('canvas')
            if (!cvs) {
                return
            }
            const link = document.createElement('a')
            link.download = `tricode-${Date.now()}.png`
            link.href = cvs.toDataURL('image/png')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } else {
            const svg = container.querySelector('svg')
            if (!svg) {
                return
            }
            const serializer = new XMLSerializer()
            const svgString = serializer.serializeToString(svg)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            ctx.imageSmoothingEnabled = false
            const img = new Image()
            const svgBlob = new Blob([svgString], {
                type: 'image/svg+xml;charset=utf-8',
            })
            const url = URL.createObjectURL(svgBlob)
            img.onload = () => {
                canvas.width = svg.width.baseVal.value * 10
                canvas.height = svg.height.baseVal.value * 10
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                const link = document.createElement('a')
                link.download = `tricode-${Date.now()}.png`
                link.href = canvas.toDataURL('image/png')
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
            img.src = url
        }
    }

    const toSvg = () => {
        if (isCanvas) {
            const cvs = container.querySelector('canvas')
            if (!cvs) {
                return
            }
            const link = document.createElement('a')
            link.download = `tricode-${Date.now()}.png`
            link.href = cvs.toDataURL('image/png')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } else {
            const svg = container.querySelector('svg')
            if (!svg) {
                return
            }
            const serializer = new XMLSerializer()
            const svgString = serializer.serializeToString(svg)

            const svgBlob = new Blob([svgString], {
                type: 'image/svg+xml;charset=utf-8',
            })
            const url = URL.createObjectURL(svgBlob)
            const link = document.createElement('a')
            link.download = `tricode-${Date.now()}.svg`
            link.href = url
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }
    }

    document.querySelectorAll('input[name="bits"]').forEach((checkbox) => {
        checkbox.addEventListener('change', (event) => {
            instance.updateBits(Number(Number(event.target.value)))
        })
    })
}
