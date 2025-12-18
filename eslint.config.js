// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";

export default [
    {
        ignores: ["dist/", "node_modules/"],
    },

    // 基础规则
    js.configs.recommended,

    // 运行环境
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },

    // import 校验
    {
        plugins: {
            import: eslintPluginImport,
        },
        rules: {
            semi: ["error", "never"],
            quotes: ['error', 'single', { avoidEscape: true }],
            "import/order": [
                "error",
                {
                    groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
                    "newlines-between": "always",
                },
            ],
        },
    },

    // 推荐关闭与 prettier 冲突的规则
    prettier,
];