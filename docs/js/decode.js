/**
 * https://github.com/lizongying/triangular-code
 */
import {table3} from './utils/constants.js'

export const decode = (version = 23) => {
    const newArrAll = []

    let i = 5
    for (; ; i++) {
        if (version > 23) {
            newArrAll.push(Array.from({length: 2 * i + 1}, (_, j) => [
                    table3[version] + i - j,
                    i - 2,
                    j & 1,
                ]
            ))

            if (i + 2 === table3[version]) {
                const last = 2 * i + 2
                newArrAll.push(...Array.from({length: 5}, (_, j) =>
                    Array.from({length: last}, (__, k) => [
                        last - k + j + 1,
                        i + j - 1,
                        k & 1,
                    ])
                ))

                break
            }
        } else {
            newArrAll.push(...Array.from({length: 4}, (_, j) =>
                Array.from({length: 8}, (__, k) => [
                    10 - k + j,
                    i + j - 2,
                    k & 1,
                ])
            ))

            break
        }
    }

    // console.log('newArrAll', newArrAll)
    return newArrAll.flat()
}






