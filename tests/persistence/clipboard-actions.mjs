/**
 * Clipboard actions never fail silently (COPY-LINKS-DEAD).
 *
 * "Copy links" on the guest list did nothing at all: no copy, no toast, no
 * error. Reproduced in a browser -- the my-guest-links request SUCCEEDS, the
 * clipboard write throws, and because the handler had no try/catch the
 * rejection went unhandled and the user saw a dead button.
 *
 * Safari requires the clipboard write to happen inside the click's TRANSIENT
 * USER ACTIVATION. An `await` on a network round-trip spends it, so by the time
 * the links arrive the write is denied. Chromium is permissive and writes
 * anyway, which is precisely how this survived development and died on the
 * owner's Mac. The owner confirmed Safari.
 *
 * The fix hands the clipboard a PROMISE, synchronously, inside the gesture --
 * `ClipboardItem` accepts one. Verified in webkit, where the bug lives:
 * webkit copies, chromium (headless, clipboard denied) shows the fallback, and
 * NEITHER is silent.
 *
 * Two sites had the identical shape: Guests' Copy links and GamesManager's
 * game links. Both are fixed; this pins both.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e)) out.push(p);
  }
  return out;
}

export async function runClipboardActions() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Clipboard actions — a click always says what happened:\n');

  const lib = strip(read('src/lib/copyToClipboard.js'));
  check('the helper hands the clipboard a PROMISE, inside the gesture',
    /new ClipboardItem\(\{ 'text\/plain': blob \}\)/.test(lib), 'survives Safari activation');
  check('  and never rejects — a denied clipboard is a normal outcome',
    /return \{ ok: false, text \}/.test(lib) && !/throw /.test(lib), '{ ok, text }');

  // THE ORDERING PIN. The write must not sit behind an await on a network call:
  // that is the exact shape that spends the activation and dies in Safari.
  const SITES = ['src/pages/Guests.jsx', 'src/components/games/GamesManager.jsx'];
  for (const f of SITES) {
    const src = strip(read(f));
    const name = f.split('/').pop();
    check(`${name}: no clipboard write behind an await on a fetch`,
      !/await fetchGuestLinks[\s\S]{0,600}?await navigator\.clipboard/.test(src),
      'the promise goes to the clipboard, not the result');
    check(`  ${name}: uses the shared helper`,
      /copyFromPromise\(textPromise\)/.test(src), 'one implementation');
    // Scoped to the HANDLER, not the file: a fallback elsewhere in the same
    // file masked its removal from the one under test when this was file-wide.
    const handler = src.slice(src.indexOf('copyFromPromise(textPromise)'));
    const body = handler.slice(0, handler.indexOf('};'));
    check(`  ${name}: shows the links when the clipboard is refused`,
      /setCopyFallback\(\{/.test(body), 'a working path, not an apology');
  }

  // Silence is the defect. A gate that returns without saying anything produces
  // the same dead button as an unhandled rejection.
  const guests = strip(read('src/pages/Guests.jsx'));
  check('gated controls say what they need instead of returning silently',
    !/if \(isPro\) return;/.test(guests) && /part of Ultra/.test(guests),
    'no silent no-ops');

  // No other call site may regrow the broken shape.
  // The helper itself legitimately awaits -- it is the one place allowed to
  // touch the API directly, which is the point of having it.
  const offenders = walk(root('src'))
    .filter((f) => !f.endsWith('lib/copyToClipboard.js'))
    .filter((f) => /await navigator\.clipboard/.test(strip(readFileSync(f, 'utf8'))))
    .map((f) => f.replace(root('src') + '/', ''));
  check('no awaited clipboard write remains anywhere in src',
    offenders.length === 0, offenders.join(', ') || 'clean');

  return results;
}
