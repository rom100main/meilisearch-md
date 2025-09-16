import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
    eslint.configs.recommended,
    {
        files: ["**/*.{js,ts}"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                sourceType: "module",
            },
            globals: {
                ...globals.node,
                ...globals.browser,
            },
            ecmaVersion: "latest",
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
            "@typescript-eslint/ban-ts-comment": "off",
            "no-prototype-builtins": "off",
            "@typescript-eslint/no-empty-function": "off",
        },
    },
    {
        ignores: ["node_modules/", "main.js", "version-bump.mjs"],
    },
    eslintConfigPrettier,
    eslintPluginPrettierRecommended,
];
