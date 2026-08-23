/**
 * Ultra gate unification.
 *
 * TT-1 replaced `plan === 'ultra' || plan === 'free'` with canAccessUltra()
 * because `'free'` is true for an ACTIVE trial and equally true for an EXPIRED
 * one -- so expiry revoked nothing, and a paying Pro customer sat below a
 * lapsed free account. That fix reached trialStatus.js, the sidebar and
 * journeySteps.js, but three page-level gates were never touched and kept the
 * old expression: StudioGuestSuite (the guest website), UniverseStudio (the
 * designs) and FoodBeverage (custom RSVP meal options). TT-3 blocks their
 * WRITES, so this was a surface leak rather than free Ultra, but the gate
 * itself was wrong.
 *
 * UniverseStudio additionally answered the question twice and disagreed: the
 * page gate let an active trial in, while the per-universe logic
 * (`plan === 'ultra'` alone) muted every Ultra universe behind an upgrade CTA
 * for that same user. One question, one answer, per the published promise:
 * active trial gets access WITHOUT the upsell.
 *
 * These probes are proven by in-situ regression, not by watching them pass.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PAGES = {
  'StudioGuestSuite': 'src/pages/StudioGuestSuite.jsx',
  'UniverseStudio':   'src/pages/UniverseStudio.jsx',
  'FoodBeverage':     'src/pages/FoodBeverage.jsx',
};

export async function runUltraGateUnification() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Ultra gate unification — one expression, three pages:\n');

  for (const [name, path] of Object.entries(PAGES)) {
    const src = strip(readFileSync(root(path), 'utf8'));
    check(`${name}: no stale plan-string gate`,
      !/plan === 'ultra' \|\| plan === 'free'/.test(src) && !/plan === 'free' \|\| plan === 'ultra'/.test(src),
      'the free-means-trial proxy is gone');
    check(`  ${name}: gates on canAccessUltra(user)`,
      /canAccessUltra\(user\)/.test(src), 'shared expression');
    check(`  ${name}: imports it from the single source`,
      /import \{ canAccessUltra \} from '@\/lib\/trialStatus'/.test(src), 'trialStatus.js');
  }

  // UniverseStudio must not answer the question two different ways.
  const us = strip(readFileSync(root(PAGES.UniverseStudio), 'utf8'));
  check('UniverseStudio asks the Ultra question exactly once',
    (us.match(/canAccessUltra\(user\)/g) || []).length === 1, 'single call');
  check('  the page gate and the per-universe logic read the same value',
    /if \(!hasUltra\) \{/.test(us) && /muted=\{opened\?\.isUltra && !hasUltra\}/.test(us)
      && /canAccessUltra=\{hasUltra\}/.test(us), 'hasUltra everywhere');
  check('  no local binding shadows the imported helper',
    !/const canAccessUltra\s*=/.test(us), 'no shadow');

  // The promise itself: active trial in, expired out, Pro never below free.
  const ts = await import('../../src/lib/trialStatus.js');
  const day = 24 * 60 * 60 * 1000;
  const iso = (d) => new Date(Date.now() - d * day).toISOString();
  const cases = [
    ['active trial (day 1)',   { plan: 'free', trialStartedAt: iso(1) },  true],
    ['expired trial (day 60)', { plan: 'free', trialStartedAt: iso(60) }, false],
    ['expired, plan null',     { plan: null,   trialStartedAt: iso(60) }, false],
    ['Pro',                    { plan: 'pro',  trialStartedAt: iso(60) }, false],
    ['Ultra',                  { plan: 'ultra',trialStartedAt: iso(60) }, true],
  ];
  for (const [label, user, want] of cases) {
    check(`  ${label} -> ${want ? 'access' : 'no access'}`,
      ts.canAccessUltra(user) === want, `got ${ts.canAccessUltra(user)}`);
  }

  return results;
}
