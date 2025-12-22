import {resolve} from 'path'
import {defineConfig} from 'vite'
import {createHtmlPlugin} from 'vite-plugin-html'

export default defineConfig({
    base: '/tricode/',
    build: {
        minify: 'oxc',
        rollupOptions: {
            input: {
                index: resolve(__dirname, './index.html'),
                scan: resolve(__dirname, './scan.html'),
                main: resolve(__dirname, './src/main.js'),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    return chunkInfo.name === 'main'
                        ? 'assets/main.js'
                        : 'assets/[name]-[hash].js'
                },
            },
        },
        outDir: 'dist',
    },
    plugins: [
        createHtmlPlugin({
            minify: true,
        }),
    ],
})