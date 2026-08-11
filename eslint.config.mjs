import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Python side. backend/README.md tells you to create the venv in here,
    // and its site-packages ship enough JavaScript to bury the app's own lint
    // output: 6,525 findings against the 10 the repo actually has.
    "backend/**",
  ]),
]);

export default eslintConfig;
