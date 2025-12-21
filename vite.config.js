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
            },
        },
        outDir: 'docs',
    },
    plugins: [
        createHtmlPlugin({
            minify: true,
        }),
    ],
})