/**
 * Contact form topics and where each one is delivered.
 *
 * Owner spec, 2026-10-15: the topics are exactly General, Dashboard, Guest
 * Suite, Gifting, Billing, Privacy, Other, in that order, with General
 * selected by default. Billing goes to billing@, Privacy to privacy@, every
 * other topic to the contact address (hello@, or CONTACT_TO_ADDRESS). The
 * subject starts with the topic in brackets, e.g. "[Billing] ...".
 *
 * The client list (src/pages/Contact.jsx) and the server list (api/contact.js)
 * are separate literals, because a Vercel function and the client bundle share
 * no module. This guard is what keeps them the same list.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail, stripComments as strip } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);

const SPEC = ['General', 'Dashboard', 'Guest Suite', 'Gifting', 'Billing', 'Privacy', 'Other'];
const HELLO = 'hello@openinvite.com.au';
const ROUTES = {
  General: HELLO,
  Dashboard: HELLO,
  'Guest Suite': HELLO,
  Gifting: HELLO,
  Billing: 'billing@openinvite.com.au',
  Privacy: 'privacy@openinvite.com.au',
  Other: HELLO,
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function runContactTopicRouting() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Contact topics: the list, its order, the default and each route are exactly the owner spec:\n');

  // ---- client ----
  const CLIENT = strip(readFileSync(root('src/pages/Contact.jsx'), 'utf8'));
  const m = CLIENT.match(/const topics = (\[[^\]]*\]);/);
  const clientTopics = m ? JSON.parse(m[1]) : null;
  check('the form lists exactly the spec topics, in order',
    same(clientTopics, SPEC), JSON.stringify(clientTopics));
  check('  General is selected when the page opens',
    /useState\(\{[^}]*topic: "General"/.test(CLIENT), 'initial state');
  check('  and again after a successful send',
    /setFormData\(\{ name: "", email: "", topic: "General", message: "" \}\)/.test(CLIENT), 'reset state');
  check('  no placeholder option sits above General',
    !/<option value="" disabled>/.test(CLIENT), 'no empty option');

  // ---- server ----
  const savedTo = process.env.CONTACT_TO_ADDRESS;
  delete process.env.CONTACT_TO_ADDRESS;
  const mod = await import('../../api/contact.js');
  if (savedTo !== undefined) process.env.CONTACT_TO_ADDRESS = savedTo;

  check('the server accepts exactly the same list, in order',
    same(mod.TOPICS, SPEC), JSON.stringify(mod.TOPICS));
  check('  and the same default', mod.DEFAULT_TOPIC === 'General', mod.DEFAULT_TOPIC);
  const actual = Object.fromEntries(SPEC.map((t) => [t, mod.routeFor(t)]));
  check('every topic routes to its spec inbox, and no other topic has its own',
    same(actual, ROUTES) && same(Object.keys(mod.TOPIC_INBOX).sort(), ['Billing', 'Privacy']),
    JSON.stringify(actual));
  check('  an unknown topic is filed as Other and goes to hello@',
    mod.resolveTopic('Pricing') === 'Other' && mod.routeFor('Pricing') === HELLO
      && mod.routeFor('') === HELLO, mod.routeFor('Pricing'));
  check('  every subject starts with its topic in brackets',
    SPEC.every((t) => mod.subjectFor(t, 'Ada').startsWith(`[${t}] `)), mod.subjectFor('Billing', 'Ada'));
  check('  topics and subjects carry no em or en dash',
    SPEC.every((t) => !/[–—]/.test(t + mod.subjectFor(t, 'Ada'))), 'no dashes');

  const SERVER = strip(readFileSync(root('api/contact.js'), 'utf8'));
  check('the send itself uses the router and the bracketed subject',
    /to: routeFor\(safeTopic\)/.test(SERVER) && /subject: subjectFor\(safeTopic, name\)/.test(SERVER),
    'to + subject wired');
  check('  hello@ stays the configurable fallback',
    /const TO = process\.env\.CONTACT_TO_ADDRESS \|\| 'hello@openinvite\.com\.au'/.test(SERVER), 'CONTACT_TO_ADDRESS');

  return results;
}
