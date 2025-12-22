import { Generator } from './generator.js'

window.onload = () => {
    const svg = document.querySelector('#svg')
    const input = document.querySelector('#input')
    const slider = document.querySelector('#slider')
    const bits = document.querySelector('[name="bits"][checked]')
    console.log('bits', bits.value)

    let size = 200
    slider.value = size
    let instance = new Generator(svg, input.value, Number(bits.value), size)

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
        const svg = container.querySelector('svg')
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        const svgBlob = new Blob([svgString], {
            type: 'image/svg+xml;charset=utf-8',
        })
        const url = URL.createObjectURL(svgBlob)
        img.onload = () => {
            canvas.width = svg.width.baseVal.value
            canvas.height = svg.height.baseVal.value
            ctx.drawImage(img, 0, 0)
            const link = document.createElement('a')
            link.download = 'tc.png'
            link.href = canvas.toDataURL('image/png')
            link.click()
            URL.revokeObjectURL(url)
        }
        img.src = url
    }

    // document.querySelector('button').onclick = _ => {
    //     input.value = Number(input.value) + 1
    //     instance.updateText(input.value);
    // }

    document.querySelectorAll('input[name="bits"]').forEach((checkbox) => {
        checkbox.addEventListener('change', (event) => {
            instance.updateColor(Number(Number(event.target.value)))
        })
    })
}
