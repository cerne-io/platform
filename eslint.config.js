import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-server", "dist-ssr", "tests", "tmp_test", "*.config.ts", "*.config.js"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-unused-expressions": ["warn", { 
        "allowShortCircuit": true, 
        "allowTernary": true 
      }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["server/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: [
      "src/utils/debugLogger.ts",
      "src/utils/errorLogging.ts",
      "src/utils/errorMonitoring.ts",
      "src/utils/logSanitizer.ts",
      "src/utils/productionLogger.ts",
      "src/**/__tests__/**",
      "server/**/__tests__/**",
      "tests/**",
      "scripts/**"
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["src/hooks/queries/**/*.ts", "src/hooks/mutations/**/*.ts"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.object.object.name='supabase'][callee.object.property.name='auth'][callee.property.name='getUser']",
        message: "Use useAuth() in query/mutation hooks. supabase.auth.getUser() is a network round-trip; public/utility flows require individual review."
      }]
    }
  }
);