import { terser } from "rollup-plugin-terser"

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