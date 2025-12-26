/**
 * https://github.com/lizongying/tricode
 */
import { table3 } from './utils/constants.js'

export const decode = (version = 23) => {
    const newArrAll = []

    let i = 5
    for (; ; i++) {
        if (version > 23) {
            newArrAll.push(
                Array.from({ length: 2 * i + 1 }, (_, j) => [
                    table3[version] + i - j,
                    i - 2,
                    j & 1,
                ]),
            )

            if (i + 2 === table3[version]) {
                const last = 2 * i + 2
                newArrAll.push(
                    ...Array.from({ length: 5 }, (_, j) => {
                        let left = Math.max(0, (j - 3) * 2 + 1)
                        return Array.from({ length: last - left }, (__, k) => [
                            last - k + j + 1 - left,
                            i + j - 1,
                            (k + left) & 1,
                        ])
                    }),
                )

                break
            }
        } else {
            newArrAll.push(
                ...Array.from({ length: 4 }, (_, j) => {
                    let left = Math.max(0, (j - 2) * 2 + 1)
                    return Array.from({ length: 8 - left }, (__, k) => [
                        10 - k + j - left,
                        i + j - 2,
                        (k + left) & 1,
                    ])
                }),
            )

            break
        }
    }

    // newArrAll.forEach(v => {
    //     console.log('newArrAll', v)
    // })
    return newArrAll.flat()
}
