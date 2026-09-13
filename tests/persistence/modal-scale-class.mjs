/**
 * tests/persistence/modal-scale-class.mjs
 *
 * EVERY LABELLED FORM DIALOG IS AT THE PAGE'S SCALE — ENUMERATED, NOT LISTED.
 *
 * scripts/test-modal-scale.mjs opens seven dialogs in a browser and measures
 * the text they paint. That is the half that proves the class does what it
 * claims. This is the other half: it derives the SET of dialogs that ought to
 * carry the class from the source, so a dialog added next month is either
 * covered or red. A browser guard walking a hand-written list cannot do that —
 * it goes green on a list that has stopped being the truth.
 *
 * ── ONE LEVEL OF IMPORTS, BECAUSE THE FIRST READING WAS WRONG ───────────────
 *
 * The enumeration was first written to count <Label> inside the DialogContent
 * body. On that reading VendorFormModal has none — and the report went out
 * saying so. It has thirty-seven: the body renders <VendorForm />, and the
 * captions live there. The same mistake hid ScheduleHub's nine and Budget's
 * seven. So a dialog's field count is its own plus that of every component it
 * renders which this file imports, resolved one level. Two levels would be
 * more thorough and is not needed yet; when a form's fields move one hop
 * further out, this loop grows a hop, and until then the number it prints is
 * the number a reader can check by opening the file.
 *
 * ── WHAT IS EXEMPT, AND WHY IT IS A LIST AND NOT A RULE ─────────────────────
 *
 * EXEMPT is dialogs the owner ruled out of the standard. Each carries the
 * reason, because a bare path in a skip list is indistinguishable from an
 * oversight six months later.
 *
 * PENDING is the ratchet: dialogs that SHOULD carry the class and do not yet,
 * with the package that will do it. The set only ever shrinks. A file in
 * neither set and carrying labels is a failure, which is the safe default —
 * a new dialog nobody classified goes red rather than quietly uncovered.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'src');

/** Dialogs the owner ruled out of the standard, each with the ruling. */
const EXEMPT = new Map([
  ['src/components/vows/AIVowsSpeechesAssistant.jsx',
    'an Ava pane: conversational, not a form (owner ruling, R1b)'],
  ['src/components/guest-experience/AIGuestExperienceAssistant.jsx',
    'an Ava pane: conversational, not a form (owner ruling, R1b)'],
  ['src/pages/EventDetails.jsx',
    'a page-sized form, not a modal at page scale — OPEN-TICKETS, post-launch'],
]);

/** Should carry it, does not yet. This set only shrinks. */
const PENDING = new Map([
  ['src/components/vendors/VendorFormModal.jsx', 'R1b-b, vendors and planning'],
  ['src/pages/ScheduleHub.jsx',                  'R1b-b, vendors and planning'],
  ['src/pages/Budget.jsx',                       'R1b-b, vendors and planning'],
  ['src/components/seating/AddTableModal.jsx',   'R1b-b, vendors and planning'],
]);

/**
 * Components from the shared ui kit. Following them would count the <Input>
 * inside input.jsx itself, which is the definition and not a field.
 */
const UI_KIT = /^(Label|Input|Textarea|Select|SelectTrigger|SelectContent|SelectItem|SelectValue|Checkbox|Switch|Button|RadioGroup|RadioGroupItem|Dialog|DialogContent|DialogHeader|DialogTitle|DialogDescription|DialogFooter|DialogTrigger)$/;

const jsxFiles = (dir) => readdirSync(dir).flatMap((e) => {
  const p = join(dir, e);
  return statSync(p).isDirectory() ? jsxFiles(p) : (p.endsWith('.jsx') ? [p] : []);
});

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null;                       // a package, not ours
  for (const ext of ['.jsx', '.js']) if (existsSync(base + ext)) return base + ext;
  return existsSync(base) && statSync(base).isFile() ? base : null;
}

/** Local name -> file, for both default and named imports. */
function importMap(src, file) {
  const m = new Map();
  for (const im of src.matchAll(/import\s+([^;]+?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const p = resolveImport(file, im[2]);
    if (!p) continue;
    const clause = im[1];
    const def = clause.match(/^\s*(\w+)/);
    if (def && !clause.trim().startsWith('{')) m.set(def[1], p);
    for (const n of clause.matchAll(/\b(\w+)\b(?:\s+as\s+(\w+))?/g)) m.set(n[2] || n[1], p);
  }
  return m;
}

const countFields = (s) => ({
  labels: (s.match(/<Label\b/g) || []).length,
  fields: (s.match(/<(Input|Textarea|SelectTrigger|Checkbox)\b/g) || []).length,
});

export async function runModalScaleClass() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const dialogs = [];
  for (const abs of jsxFiles(SRC)) {
    const src = readFileSync(abs, 'utf8');
    if (!src.includes('<DialogContent')) continue;
    const rel = abs.slice(ROOT.length + 1);
    const imports = importMap(src, abs);
    const opens = [...src.matchAll(/<DialogContent\b/g)].map((m) => m.index);
    const closes = [...src.matchAll(/<\/DialogContent>/g)].map((m) => m.index);
    opens.forEach((o, i) => {
      const body = src.slice(o, closes[i] ?? src.length);
      const tag = body.slice(0, body.indexOf('>') + 1);
      let { labels, fields } = countFields(body);
      const via = [];
      for (const comp of new Set([...body.matchAll(/<([A-Z]\w+)/g)].map((m) => m[1]))) {
        if (UI_KIT.test(comp)) continue;
        const p = imports.get(comp);
        if (!p || !existsSync(p)) continue;
        const sub = countFields(readFileSync(p, 'utf8'));
        if (sub.labels || sub.fields) { labels += sub.labels; fields += sub.fields; via.push(`${comp} +${sub.labels}`); }
      }
      dialogs.push({ rel, line: src.slice(0, o).split('\n').length, labels, fields, via, has: tag.includes('oi-modal-scale') });
    });
  }

  // PRESENCE BEFORE PROPERTIES. An enumeration that found nothing would pass
  // every property below it.
  check('every dialog in the product was enumerated', dialogs.length >= 40, `${dialogs.length} DialogContents across src/`);
  const labelled = dialogs.filter((d) => d.labels > 0);
  check('  and the labelled forms among them', labelled.length >= 12, `${labelled.length} carry at least one field caption`);
  check('  by following one level of imports', labelled.some((d) => d.via.length), 
    labelled.filter((d) => d.via.length).map((d) => `${d.rel.split('/').pop()} via ${d.via.join(', ')}`).join('; ') || 'no dialog draws its fields elsewhere — suspicious');

  // The reading that was wrong once, pinned so it cannot go back.
  const vendor = dialogs.find((d) => d.rel === 'src/components/vendors/VendorFormModal.jsx');
  check('  VendorFormModal reads as a form, not as an empty wrapper', !!vendor && vendor.labels > 30,
    vendor ? `${vendor.labels} captions, ${vendor.via.join(', ')}` : 'not found');

  for (const d of labelled.sort((a, b) => a.rel.localeCompare(b.rel))) {
    const where = `${d.rel}:${d.line} (${d.labels} captions)`;
    if (EXEMPT.has(d.rel)) {
      check(`  ${d.rel} is out of the standard`, !d.has, `${EXEMPT.get(d.rel)}${d.has ? ' — but it carries the class' : ''}`);
    } else if (PENDING.has(d.rel)) {
      check(`  ${d.rel} is still owed the class`, !d.has,
        d.has ? 'it has it now — delete its PENDING line' : `${PENDING.get(d.rel)}, ${d.labels} captions waiting`);
    } else {
      check(`  ${where} is at the page's scale`, d.has, d.has ? 'oi-modal-scale' : 'no oi-modal-scale on its DialogContent');
    }
  }

  // THE CLASS IS NOT A CLASS NAME, it is the rule it names. If the block goes,
  // every check above still passes against a class that styles nothing.
  const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
  check('the class the sweep applies still sets a scale', /\.oi-modal-scale label\s*\{[^}]*font-size:\s*12px/.test(css),
    'labels 12px');
  check('  and reaches the fields as well as the captions',
    /\.oi-modal-scale input[^{]*\{[^}]*font-size:\s*12px/.test(css) && /\.oi-modal-scale \[role='combobox'\]\s*\{[^}]*font-size:\s*12px/.test(css),
    'inputs, textareas and the Radix select trigger');

  // A FORM DIALOG THAT PAINTS ITS PHOTO FULL-BLEED IS NOT A FORM. MoodboardGrid
  // holds two dialogs; only the first is one, and a sweep that pasted the class
  // onto both would shrink the caption beside a 1100px image for no reason.
  const mood = dialogs.filter((d) => d.rel === 'src/components/moodboard/MoodboardGrid.jsx');
  check('MoodboardGrid\'s two dialogs are told apart', mood.length === 2 && mood[0].has && !mood[1].has,
    mood.map((d) => `:${d.line} ${d.labels} captions ${d.has ? 'scaled' : 'left alone'}`).join(', '));

  return results;
}
