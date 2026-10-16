/**
 * tests/persistence/mobile-no-undef.mjs
 *
 * EVERY NAME THE APP CALLS IS DEFINED. ExpenseFormSheet.jsx called
 * currencySymbol() without importing it (it came in with #990), so opening
 * Add expense threw and Budget showed "Something went wrong". The build passed
 * because Vite does not resolve free identifiers, and `npm run lint` passed
 * because eslint.config.js does not list src/mobile, so no-undef never read the
 * shell at all.
 *
 * This guard runs ESLint's no-undef and react/jsx-no-undef over src/mobile
 * with browser globals, the same two rules the web half of the repo already
 * has. It does not bring src/mobile into `npm run lint`: that would also turn
 * on unused-imports and no-use-before-define, which report 23 cosmetic items
 * in the shell today (none of them a crash), and eslint.config.js is shared.
 * Those are a finding for whoever owns the lint config, not part of this fix.
 *
 * A probe proves the rule fires: a snippet that calls an unimported
 * currencySymbol must report exactly one error.
 */

import path from 'path';
import { ESLint } from 'eslint';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

function linter() {
  return new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: [{
      files: ['**/*.{js,jsx}'],
      // react-hooks is registered, with no rule on, so the shell's inline
      // exhaustive-deps disable comments resolve (eslint.config.js explains why).
      plugins: { react: pluginReact, 'react-hooks': pluginReactHooks },
      linterOptions: { reportUnusedDisableDirectives: 'off' },
      languageOptions: {
        globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
        parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      },
      rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error' },
    }],
  });
}

export async function runMobileNoUndef() {
  const results = [];
  const ok = (name, cond, note) => results.push(cond ? pass(name, note) : fail(name, 'defined', note));
  const eslint = linter();

  const reports = await eslint.lintFiles(['src/mobile/**/*.{js,jsx}']);
  const problems = reports.flatMap((r) => r.messages.map((m) => `${path.relative(ROOT, r.filePath)}:${m.line} ${m.message}`));
  ok('every name src/mobile uses is imported or declared', problems.length === 0,
     problems.length ? problems.join('; ') : `${reports.length} files`);

  const probe = await eslint.lintText(
    "import React from 'react';\nexport default function X({ c }) { return <p>{currencySymbol(c)}</p>; }\n",
    { filePath: path.join(ROOT, 'src/mobile/__probe__.jsx') },
  );
  const fired = probe[0].messages.filter((m) => m.ruleId === 'no-undef').length;
  ok('  and the rule catches an unimported currencySymbol', fired === 1, `${fired} reported`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileNoUndef();
  process.exit(r.every(Boolean) ? 0 : 1);
}
