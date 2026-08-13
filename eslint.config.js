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
  { ignores: ["src/lib/**/*", "src/components/ui/**/*", "dist/**"] },
  // dist/** is build output. It is gitignored and untracked, but ESLint does
  // not read .gitignore, so without this entry it visits 238 emitted bundles.
  // prerendered/ IS tracked in git but holds only .html, which ESLint never
  // visits, so it needs no entry.
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
      // Previously matched by no config group at all, so entirely unlinted:
      // four dead imports had accumulated in App.jsx alone. src/api/** is the
      // BROWSER-side base44 client (import.meta.env) — not to be confused with
      // the top-level api/**, which is Node and is configured separately below.
      "src/App.jsx",
      "src/main.jsx",
      "src/api/**/*.{js,jsx}",
      "src/hooks/**/*.{js,jsx}",
      "src/integrations/**/*.{js,jsx}",
      "src/pagePreload.js",
      "src/pages.config.js",
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
  {
    // Server-side and tooling code. Node globals, not browser: api/** uses
    // process.env in 38 files and window/localStorage in none (the few matches
    // are prose in JSDoc). tests/persistence/** is plain Node too — no vitest,
    // jest or mocha anywhere, every test script invokes bare `node` — so no
    // test-runner globals are needed.
    files: ["api/**/*.{js,mjs}", "scripts/**/*.{js,mjs}", "tests/**/*.{js,mjs}", "*.config.js"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // "latest", NOT a pinned year. api/verify-signup.js:68 uses an import
        // attribute — `import x from '...json' with { type: 'json' }` — which
        // Node 20+ and Vercel run happily but ecmaVersion 2022 cannot parse,
        // producing a hard "Parsing error: Unexpected token with" that reads
        // exactly like a real lint finding. Do not "tidy" this back to a year.
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: { "unused-imports": pluginUnusedImports },
    rules: {
      // No react/react-hooks rules here — this code never renders.
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["warn", { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }],
    },
  },
];
