/**
 * What the contact page says after a send, both ways.
 *
 * Owner spec, 2026-10-15. After a confirmed send the page drops "Let's plan
 * something beautiful." and says "Thanks, {first name}. Your message is with
 * us." over "We'll reply to {email} as soon as we can." With no first name the
 * heading is "Thanks. Your message is with us." After a failed send it says
 * "Your message didn't send. Please try again, or email
 * hello@openinvite.com.au." and the form keeps what the visitor typed (that
 * half is held by contact-send-path.mjs).
 *
 * The copy is built in src/lib/contactCopy.js, so it is CALLED here rather
 * than read; the page is read only for where each line is wired.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail, stripComments as strip } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);

export async function runContactSentState() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Contact outcome copy: the thanks names the person and their address, a failure says so plainly:\n');

  const { SEND_FAILED, firstNameOf, sentCopy } = await import('../../src/lib/contactCopy.js');
  const named = sentCopy({ firstName: firstNameOf('  Ada Lovelace '), email: 'ada@example.com' });
  check('a named sender is thanked by first name',
    named.heading === 'Thanks, Ada. Your message is with us.', named.heading);
  check('  and told where the reply goes',
    named.body === "We'll reply to ada@example.com as soon as we can.", named.body);
  const unnamed = sentCopy({ firstName: firstNameOf('   '), email: 'ada@example.com' });
  check('no first name: the heading has no gap where a name would be',
    unnamed.heading === 'Thanks. Your message is with us.', unnamed.heading);
  check('a failed send says exactly the ruled line',
    SEND_FAILED === "Your message didn't send. Please try again, or email hello@openinvite.com.au.", SEND_FAILED);
  check('  none of it carries an em or en dash',
    ![named.heading, named.body, unnamed.heading, SEND_FAILED].some((t) => /[–—]/.test(t)), 'no dashes');

  const CLIENT = strip(readFileSync(root('src/pages/Contact.jsx'), 'utf8'));
  const formBranch = CLIENT.slice(CLIENT.indexOf('{!submitted ? ('), CLIENT.indexOf(') : ('));
  const sentBranch = CLIENT.slice(CLIENT.indexOf(') : ('), CLIENT.indexOf('{/* RIGHT'));
  check('the tagline lives only on the form side, so a sent page drops it',
    formBranch.includes("Let's plan something beautiful.") && !sentBranch.includes("Let's plan")
      && CLIENT.split("Let's plan something beautiful.").length === 2, 'one tagline, inside !submitted');
  check('  the sent side shows the thanks heading and the reply line',
    /<h1[^>]*>\s*\{submitted\.heading\}\s*<\/h1>/.test(sentBranch) && /\{submitted\.body\}/.test(sentBranch), 'heading + body');
  check('  the thanks is built from what was sent, before the fields clear',
    CLIENT.indexOf('setSubmitted(sentCopy({ firstName: firstNameOf(formData.name), email: formData.email.trim() }))')
      > -1 && CLIENT.indexOf('setSubmitted(sentCopy(') < CLIENT.indexOf('setFormData({ name: ""'), 'captured first');
  check('every failure path shows the ruled line and no server text',
    (CLIENT.match(/setSendError\(SEND_FAILED\)/g) || []).length === 2 && !/payload\.error/.test(CLIENT)
      && !/setSendError\("/.test(CLIENT), 'non-2xx and network error');
  check('  the old panel is gone', !/Wow, so nice of you/.test(CLIENT), 'no old copy');

  return results;
}
