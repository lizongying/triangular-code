import {resolve} from 'path'
import {defineConfig} from 'vite'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, './index.html'),
                scan: resolve(__dirname, './scan.html'),
            },
        },
        outDir: 'docs',
    },
})