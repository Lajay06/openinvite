/**
 * tests/persistence/ava-pod-brand.mjs
 *
 * THE POD LOOKED LIKE TWO OTHER PRODUCTS, AND PRINTED ITS OWN MARKUP.
 *
 * Two owner observations, one PR.
 *
 * THE GRADIENTS. The pod's icon and its own message bubbles carried
 * `linear-gradient(135deg, #E03553, #803D81)` in five places, and the button
 * that opens it carried a DIFFERENT one, `#ec4899 -> #9333ea` — a pink-to-
 * purple pair that appears on no other control in the product. So the control
 * and the thing it opened did not match each other, and neither matched the
 * brand. One solid `color.primary`, from the token, everywhere.
 *
 * THE ASTERISKS. The pod printed `{msg.content}` into a `white-space:
 * pre-wrap` div, so `**$154,000**` reached the couple exactly as the model
 * typed it. Models write markdown; nothing here read it. Bold renders as bold
 * and every other mark is stripped to its text — the rule is no raw asterisk
 * ever, and leaving `_italics_` visible would break it as surely as leaving
 * `**bold**` would.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAvaText } from '../../src/lib/avaMarkdown.js';
import { color } from '../../src/styles/tokens.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const flat = (tokens) => tokens.map(t => t.text).join('');

export async function runAvaPodBrand() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The Ava pod — one brand colour, and bold that is bold:\n');

  // ── THE GRADIENT IS GONE, AND THE TOKEN IS USED ─────────────────────────
  {
    const pod = code('src/components/layout/AvaChatPod.jsx');
    const layout = code('src/Layout.jsx');
    check('the pod carries no gradient at all', !/linear-gradient/.test(pod),
      `${(pod.match(/linear-gradient/g) || []).length} remaining`);
    // SCOPED TO THE AVA LAUNCHER, not to Layout.jsx as a whole. The same
    // pink-to-purple pair is also the user AVATAR in the top bar
    // (Layout.jsx:275) — a different control, not named by the owner and not
    // touched here. A check that failed on it would be this PR reaching for
    // something it was not asked to change.
    check('  and the button that opens it carries none either',
      /background: chatOpen \? '#0A0A0A' : color\.primary/.test(layout)
        && !/chatOpen \? '#0A0A0A' : 'linear-gradient/.test(layout),
      'the launcher is solid; the user avatar above it is untouched');
    check('the pod reads the brand from the token, not a literal',
      /background: color\.primary/.test(pod) && !/#E03553/.test(pod),
      'color.primary, no hardcoded hex');
    check('  and so does the launcher',
      /background: chatOpen \? '#0A0A0A' : color\.primary/.test(layout), 'color.primary');
    check('  the token is the strawberry used elsewhere', color.primary === '#E03553', color.primary);
    check('the glow tuned to the old gradient went with it',
      !/rgba\(224,53,83,0\.3\)/.test(pod), 'no orphaned shadow');
  }

  // ── BOLD RENDERS; NOTHING ELSE SHOWS A MARK ─────────────────────────────
  {
    const t = parseAvaText('Your plan is **$154,000** and you committed **$112,000**.');
    check('bold becomes a bold token', t.filter(x => x.bold).map(x => x.text).join('|') === '$154,000|$112,000',
      t.filter(x => x.bold).map(x => x.text).join(', '));
    check('  and the sentence around it is unchanged',
      flat(t) === 'Your plan is $154,000 and you committed $112,000.', flat(t));

    const CASES = [
      ['*italic*',            'The deposit is *not* paid.',        'The deposit is not paid.'],
      ['_italic_',            'The deposit is _not_ paid.',        'The deposit is not paid.'],
      ['`code`',              'Read `budget.total` for it.',       'Read budget.total for it.'],
      ['~~strike~~',          'That was ~~old~~ news.',            'That was old news.'],
      ['heading',             '# Budget\nYou are fine.',           'Budget\nYou are fine.'],
      ['quote',               '> a quoted line',                   'a quoted line'],
      ['an unclosed pair',    'unclosed ** here',                  'unclosed  here'],
    ];
    for (const [label, input, expected] of CASES) {
      check(`  ${label} is stripped to its text`, flat(parseAvaText(input)) === expected,
        JSON.stringify(flat(parseAvaText(input))));
    }
    check('a bullet becomes a real bullet rather than an asterisk',
      flat(parseAvaText('- one\n- two')) === '• one\n• two', JSON.stringify(flat(parseAvaText('- one\n- two'))));

    // THE RULE, stated as one assertion over everything above.
    const everything = CASES.map(c => c[1]).join('\n') + '\n**bold** and - bullet';
    check('NO RAW ASTERISK SURVIVES ANY OF IT',
      !flat(parseAvaText(everything)).includes('*'), 'not one');
    check('  and nothing is dropped that was not a mark',
      flat(parseAvaText('plain sentence')) === 'plain sentence', 'plain text untouched');
    check('  empty and non-string input do not throw',
      flat(parseAvaText('')) === '' && flat(parseAvaText(null)) === '' && flat(parseAvaText(undefined)) === '', 'empty');
  }

  // ── TOKENS, NOT HTML ────────────────────────────────────────────────────
  {
    const pod = code('src/components/layout/AvaChatPod.jsx');
    check('the pod renders tokens as elements, never parsed markup',
      /parseAvaText\(msg\.content\)\.map/.test(pod) && !/dangerouslySetInnerHTML/.test(pod),
      'no dangerouslySetInnerHTML anywhere in the pod');
  }

  // ── PLANTS (R19) ────────────────────────────────────────────────────────
  {
    // PLANT 1: the raw render. The string the model sent, printed as-is.
    const raw = 'Your plan is **$154,000**.';
    check('PLANT: printing msg.content raw leaves the asterisks on screen',
      raw.includes('**') && !flat(parseAvaText(raw)).includes('*'),
      'the defect, and the fix, on the same input');

    // PLANT 2: bold-only handling that leaves other marks showing.
    const boldOnly = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1');
    check('PLANT: handling bold alone still leaves *italics* on screen',
      boldOnly('a **b** and *c*').includes('*') && !flat(parseAvaText('a **b** and *c*')).includes('*'),
      'which is why every other mark is stripped rather than ignored');
  }

  return results;
}
