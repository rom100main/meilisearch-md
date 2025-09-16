/** @type {import('stylelint').Config} */
export default {
    extends: ["stylelint-config-standard"],
    plugins: ["stylelint-prettier"],
    rules: {
        "prettier/prettier": true,
    },
};
