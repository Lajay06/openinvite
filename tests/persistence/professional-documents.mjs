/**
 * tests/persistence/professional-documents.mjs
 *
 * Openinvite Professional: documents and notes. goals/2026-10-14-professional.md,
 * What a professional gets, 12 and 13. A document is a link, and only an
 * https link is kept or opened, so a pasted javascript: or data: link can
 * never run in a teammate's browser. Notes stay with the team.
 *
 * PLANT (R19): a check that only looks for "http" at the start lets
 * http://evil.example and javascript:http through; the same assertions fail it.
 */
import { readFileSync } from 'node:fs';
import { pass, fail } from './_shared.mjs';
import { isSafeFileUrl, DOC_KINDS } from '../../src/lib/professionalNotes.js';

export function runProfessionalDocuments(safe = isSafeFileUrl) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, documents and notes:\n');
  check('professional documents: contracts, floor plans, licenses and insurance', DOC_KINDS.map((k) => k.key).join() === 'contract,floorplan,license,insurance,other', 'kinds');
  check('professional documents: only an https link is kept or opened', safe('https://drive.google.com/x') && !safe('javascript:alert(1)') && !safe('data:text/html,x') && !safe('http://evil.example') && !safe(''), 'https only');
  const notes = readFileSync(new URL('../../src/components/professional/event/NotesTab.jsx', import.meta.url), 'utf8');
  const ava = readFileSync(new URL('../../src/lib/professionalAva.js', import.meta.url), 'utf8');
  check('professional notes: private to the team, and never part of what Ava is sent', /Private to your team/.test(notes) && !/ProNote/.test(ava), 'team only');
  return r;
}
