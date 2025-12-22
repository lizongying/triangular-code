/**
 * https://github.com/lizongying/tricode
 */

export const table = {
    5: 23,
    10: 33,
    15: 43,
    20: 53,
    25: 63, // 25*2+13=63
    30: 73,
    35: 83,
    40: 93,
}

// const table2 = {
//     23: 32, //5
//     33: 146, //14-4 = 10
//     43: 311, //19-4 = 15
//     53: 526, //24-4 = 20
//     63: 791, //29-4 = 25
//     73: 1106,
//     83: 1471,
//     93: 1886,
// }

export const table3 = {
    23: 5,
    33: 10,
    43: 15,
    53: 20,
    63: 25,
    73: 30,
    83: 35,
    93: 40,
}

export const RGB_PALETTE_8COLORS = [
    { name: 'white', index: 0, rgb: [255, 255, 255], hex: 0xffffff },
    { name: 'red', index: 1, rgb: [255, 0, 0], hex: 0xff0000 },
    { name: 'green', index: 2, rgb: [0, 255, 0], hex: 0x00ff00 },
    { name: 'blue', index: 3, rgb: [0, 0, 255], hex: 0x0000ff },
    { name: 'yellow', index: 4, rgb: [255, 255, 0], hex: 0xffff00 },
    { name: 'cyan', index: 5, rgb: [0, 255, 255], hex: 0x00ffff },
    { name: 'magenta', index: 6, rgb: [255, 0, 255], hex: 0xff00ff },
    { name: 'black', index: 7, rgb: [0, 0, 0], hex: 0x000000 },
]

export const RGB_PALETTE_4COLORS = [
    { name: 'white', index: 0, rgb: [255, 255, 255], hex: 0xffffff },
    { name: 'blue', index: 1, rgb: [0, 0, 255], hex: 0x0000ff },
    { name: 'green', index: 2, rgb: [0, 255, 0], hex: 0x00ff00 },
    { name: 'red', index: 3, rgb: [255, 0, 0], hex: 0xff0000 },
]
