/**
 * Contact form send path.
 *
 * THE BUG: src/pages/Contact.jsx's handleSubmit called preventDefault, set
 * submitted = true, cleared the fields after three seconds, and sent NOTHING.
 * Every visitor who used the form was shown "Wow, so nice of you" and had their
 * message discarded. A broken form is worse than no form, because it still
 * looks like a channel and people stop looking for another one.
 *
 * It also blocked a homepage line -- "that is a bug, and we want to hear about
 * it" -- whose build note forbids shipping it unless the feedback lands
 * somewhere.
 *
 * The property that matters is not "it sends". It is that SUCCESS IS NEVER
 * REPORTED WHEN THE SEND FAILED, and that a failure never costs the visitor
 * what they typed. Both are exercised here against the real handler.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CLIENT = strip(readFileSync(root('src/pages/Contact.jsx'), 'utf8'));

function mockRes() {
  return {
    _s: 200, _j: null, _h: {},
    setHeader(k, v) { this._h[k] = v; },
    status(c) { this._s = c; return this; },
    json(o) { this._j = o; return this; },
    end() { return this; },
  };
}
const req = (body, method = 'POST') => ({ method, body, headers: {}, query: {} });

export async function runContactSendPath() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Contact send path — success is never claimed for a message that went nowhere:\n');

  // ---- client ----
  check('the client actually posts the message',
    /fetch\("\/api\/contact"/.test(CLIENT) && /method: "POST"/.test(CLIENT), '/api/contact');
  check('  success is gated on a 2xx response',
    /if \(!res\.ok\)/.test(CLIENT) && /setSubmitted\(true\)/.test(CLIENT), 'res.ok gate');
  check('  the old fire-and-forget success is gone',
    !/setSubmitted\(true\);\s*setTimeout/.test(CLIENT), 'no unconditional success');
  check('  a failure sets an error state instead',
    /setSendError\(/.test(CLIENT) && /role="alert"/.test(CLIENT), 'failure state rendered');
  check('  the visitor keeps their text on failure (E3)',
    (() => {
      // setFormData({...}) may only appear on the success path, i.e. after
      // setSubmitted(true) and never inside the !res.ok branch.
      const failBranch = CLIENT.slice(CLIENT.indexOf('if (!res.ok)'), CLIENT.indexOf('setSubmitted(true)'));
      return !/setFormData\(\s*\{\s*name:\s*""/.test(failBranch);
    })(), 'fields cleared only after a confirmed send');

  // ---- server, exercised for real ----
  const handler = (await import('../../api/contact.js')).default;
  const good = { name: 'Ada', email: 'ada@example.com', topic: 'Ava', message: 'The date it gave me is wrong.' };

  let r = mockRes();
  await handler(req(good, 'GET'), r);
  check('server rejects a non-POST', r._s === 405, `HTTP ${r._s}`);

  r = mockRes();
  await handler(req({ ...good, email: 'not-an-email' }), r);
  check('  a bad email is rejected, not silently accepted', r._s === 400, `HTTP ${r._s}`);

  r = mockRes();
  await handler(req({ ...good, message: '' }), r);
  check('  an empty message is rejected', r._s === 400, `HTTP ${r._s}`);

  // THE POSITIVE CONTROL THAT MATTERS: force the send to fail and confirm the
  // endpoint reports failure. Without a key the send cannot possibly have
  // happened, so a 2xx here would be the original bug moved server-side.
  const savedKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  r = mockRes();
  await handler(req(good), r);
  check('a send that CANNOT have happened reports failure, not success',
    r._s >= 500 && !r._j?.sent, `HTTP ${r._s}, sent=${r._j?.sent}`);
  if (savedKey !== undefined) process.env.RESEND_API_KEY = savedKey;

  // Destination is configurable so support@ can go live without a commit.
  const SERVER = strip(readFileSync(root('api/contact.js'), 'utf8'));
  check('the destination is config, not a literal',
    /process\.env\.CONTACT_TO_ADDRESS/.test(SERVER), 'CONTACT_TO_ADDRESS');
  check('  a returned Resend error is treated as failure',
    /if \(result\?\.error\)/.test(SERVER), 'payload error handled');
  check('  replies go back to the person who wrote in',
    /replyTo: email/.test(SERVER), 'replyTo set');
  check('  no frozen payments file is touched',
    !/create-checkout-session|webhooks\/stripe/.test(SERVER), 'clear of frozen files');

  return results;
}
