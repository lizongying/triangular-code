import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";

export default [
    {
        ignores: ["dist/**", "node_modules/**", "src/tests/**", "vite.config.js"],
    },
    {
        files: ["src/**/*.{js}"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.worker,
            },
        },
        plugins: {
            import: eslintPluginImport,
        },
        rules: {
            'import/order': [
                'error',
                {
                    groups: [
                        ['builtin', 'external'],
                        ['internal'],
                        ['parent', 'sibling', 'index'],
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            // 'no-console': 'warn',
            // 'no-debugger': 'error',
            // 'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
        },
    },
    prettier,
];