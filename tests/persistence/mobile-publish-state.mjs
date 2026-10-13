/**
 * tests/persistence/mobile-publish-state.mjs
 *
 * ON THE PHONE, "IS THE GUEST SUITE LIVE" HAS ONE ANSWER: src/lib/publishState.js.
 *
 * Lane A's #1029 (main 14e7237c) put the rule and its words in one module:
 * live is websiteEnabled === true AND a slug; no slug reads "No address yet",
 * never "Hidden"; "Draft" is gone. The phone held its own copies in four
 * places, and two disagreed with the rule: the Guest Suite tab and the Plan
 * hub read websiteEnabled alone, so a suite with the switch on and no address
 * read as live.
 *
 * Anchored on the module's names and on data- attributes, never on the words,
 * so a change to the wording in publishState.js does not turn this red; only
 * a surface that answers the question for itself does. By elimination, no
 * shell file outside the request payload reads websiteEnabled, and the word
 * "Draft" names no state.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'fixtures') walk(rel, out); }
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
}

export async function runMobilePublishState() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE RULE, DRIVEN FOR REAL ────────────────────────────────────────────
  const mod = await import(path.join(ROOT, 'src/lib/publishState.js'));
  const { publishState, isLive, PUBLISH_STATE } = mod;
  ok('the module is the one the shell imports',
     typeof publishState === 'function' && typeof isLive === 'function' && !!PUBLISH_STATE, 'src/lib/publishState.js');
  ok('  switch on and no address is not live', publishState({ websiteEnabled: true }) === PUBLISH_STATE.NO_ADDRESS && !isLive({ websiteEnabled: true }), 'no_address');
  ok('  an address and the switch on is live', isLive({ slug: 'a-b', websiteEnabled: true }), 'live');

  // ── EACH SURFACE ASKS IT ─────────────────────────────────────────────────
  const container = code('src/mobile/screens/site/SiteContainer.jsx');
  ok('the Guest Suite tab passes the state, not the switch',
     /state=\{publishState\(d\)\}/.test(container) && !/isLive=\{!!d\?\.websiteEnabled\}/.test(container), 'SiteContainer.jsx');
  ok('  and its toast is the module\'s sentence', /toast\.success\(PUBLISH_SENTENCE\[on \? PUBLISH_STATE\.LIVE : PUBLISH_STATE\.HIDDEN\]\)/.test(container), 'toggle');
  const screen = code('src/mobile/screens/site/SiteScreen.jsx');
  ok('the tab\'s pill is the module\'s label, marked with the state',
     /data-publish-state=\{state\}><StatusPill tone=\{isLive \? 'ok' : 'light'\}>\{PUBLISH_LABEL\[state\]\}<\/StatusPill>/.test(screen), 'pill');
  ok('  the row is the module\'s sentence, marked with the state', /data-publish-sentence=\{state\}>\{PUBLISH_SENTENCE\[state\]\}/.test(screen), 'row');
  ok('  and live is derived from the state alone', /const isLive = state === PUBLISH_STATE\.LIVE;/.test(screen), 'isLive');
  ok('the Plan hub counts live through isLive', /isLive\(d\.details\)/.test(code('src/mobile/screens/plan/PlanHubScreen.jsx')), 'PlanHubScreen.jsx');
  ok('the Design studio tile says the module\'s sentence', /stat: \(d\) => publishSentence\(d\.details\) \}/.test(code('src/mobile/features/registry.js')), 'registry.js');
  const send = code('src/mobile/screens/guests/SendInvitesScreen.jsx');
  ok('Send invites refuses on the module\'s state',
     /const pubState = publishState\(wedding\);/.test(send)
       && /const unpublished = pubState === PUBLISH_STATE\.NO_ADDRESS/.test(send)
       && /: pubState === PUBLISH_STATE\.HIDDEN/.test(send), 'SendInvitesScreen.jsx');

  // ── NOBODY ELSE ANSWERS IT ───────────────────────────────────────────────
  const files = walk('src/mobile');
  const readers = files.filter((f) => {
    const src = code(f).replace(/websiteEnabled: wedding\?\.websiteEnabled/g, '').replace(/save\('websiteEnabled'/g, '').replace(/websiteEnabled: on\b/g, '');
    return /websiteEnabled/.test(src);
  });
  ok('no shell file reads websiteEnabled for itself', readers.length === 0, readers.join(', ') || 'only the request payload and the switch write');
  const draft = files.filter((f) => /['"`>]Draft['"`<]|is a draft/.test(code(f)));
  ok('"Draft" names no state', draft.length === 0, draft.join(', ') || 'none');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobilePublishState();
  process.exit(r.every(Boolean) ? 0 : 1);
}
