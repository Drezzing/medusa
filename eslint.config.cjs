const js = require("@eslint/js");
const ts = require("typescript-eslint");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
    js.configs.recommended,
    ...ts.configs.recommended,
    prettier,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        files: ["**/*.cjs"],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
    {
        ignores: ["data/", ".cache/", "dist/", "build/"],
    },
];
