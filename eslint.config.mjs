import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y-x";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    ".impeccable/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  next.configs["core-web-vitals"],
  { ...hooks.configs.flat.recommended, files: ["**/*.{tsx,jsx}"] },
  {
    ...a11y.configs.recommended,
    files: ["**/*.{tsx,jsx}"],
    rules: {
      ...a11y.configs.recommended.rules,
      "jsx-a11y-x/label-has-associated-control": ["error", { depth: 3 }],
    },
  },
]);
