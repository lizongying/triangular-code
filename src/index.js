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

    let generator = new Generator(
        input.value,
        Number(bits.value),
        size,
        !isCanvas,
    )

    if (!svg.hasChildNodes()) {
        svg.appendChild(isCanvas ? generator.getCvs() : generator.getSvg())
    }

    input.addEventListener('input', () => {
        generator.updateText(input.value)
    })

    slider.addEventListener('input', () => {
        generator.updateSize(Number(slider.value))
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
        const link = document.createElement('a')
        link.download = `tricode-${Date.now()}.png`
        link.href = generator.getCvs().toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
            generator.updateBits(Number(Number(event.target.value)))
        })
    })
}
