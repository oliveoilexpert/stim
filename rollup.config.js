import { terser } from "rollup-plugin-terser"
import copy from 'rollup-plugin-copy'

export default [
    {
        input: "src/index.js",
        output: [
            {
                name: "stim",
                file: "dist/stim.umd.js",
                format: "umd",
            },
            {
                file: "dist/stim.js",
                format: "es",
            },
        ],
        context: "window",
        plugins: [
            copy({
                targets: [
                    { src: 'src/index.d.ts', dest: 'dist/', rename: 'stim.d.ts' },
                ]
            })
        ]
    },
    {
        input: "src/index.js",
        output: {
            file: "dist/stim.min.js",
            format: "es",
            sourcemap: true
        },
        context: "window",
        plugins: [
            terser({
                mangle: true,
                compress: true
            })
        ]
    }
]