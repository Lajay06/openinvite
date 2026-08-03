import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  // A global-ignores entry (an object with ONLY `ignores`, no `files`) tells
  // ESLint to skip these files outright. Putting the same `ignores` list
  // inside the files-scoped object below instead only narrows which files
  // get THAT config's rules — it doesn't stop ESLint from still visiting
  // them, so an inline `eslint-disable-next-line react-hooks/exhaustive-deps`
  // comment in src/lib/a11y.js failed with "Definition for rule ... was not
  // found" (the react-hooks plugin was never registered for that file, so
  // its own disable comment couldn't be validated against it).
  { ignores: ["src/lib/**/*", "src/components/ui/**/*"] },
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      // fix/silent-catch-family: bans a literally-empty catch block
      // (catch {} / catch (e) {}) anywhere in src/components or src/pages —
      // the exact shape of two of the bugs this PR fixed (Polls.jsx's
      // persist(), StudioHub.jsx's load()). Discovered while adding this
      // that eslint:recommended's own no-empty (and everything else in
      // ...pluginJs.configs.recommended/...pluginReact.configs.flat.recommended
      // spread above) was silently inert this whole time — object spread
      // doesn't merge a nested `rules` key, so this file's own explicit
      // `rules: {}` block below was overwriting the entire recommended
      // ruleset, not layering on top of it. Not fixed wholesale here
      // (unknown how many other now-dormant recommended-rule violations
      // exist across the whole src/ tree — that's its own audit), just
      // flagging the mechanism and turning this one specific rule back on
      // explicitly, since it's exactly what this PR needs enforced.
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
