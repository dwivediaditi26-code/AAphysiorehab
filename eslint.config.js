import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    settings: { react: { version: "detect" } },
    rules: {
      // The important one: Vite/esbuild will happily build a file that
      // references an undefined identifier (e.g. a missing icon import) —
      // it only breaks at runtime, in the browser, for whoever hits that
      // code path first. This is what catches it before deploy.
      "no-undef": "error",
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "no-unused-vars": "off",
    },
  },
];
