/**
 * tests/persistence/hero-masters-live.mjs
 *
 * THE ONE THING THE CI GUARD CANNOT KNOW: whether HERO_MASTERS matches
 * Cloudinary.
 *
 * hero-masters.mjs checks the shape — every hero is a heroes-jpg name, every
 * name is in the map, every delivered width is at or under its mapped master.
 * All of that is still true if a width in the map is WRONG. Overstate a
 * master and the map hands out a width the asset does not have; Cloudinary
 * upscales, charges for it, and nothing in the repo can tell.
 *
 * That is not a limit to write down and live with — it is a live check, and
 * this repo already has a lane for those. It runs with credentials, never in
 * the CI lane, and it is the reason the widths in the map are a measurement
 * rather than a claim.
 *
 * READ-ONLY. One Search API call, no writes, and no credential is printed.
 */
import { pass, fail } from './_shared.mjs';
import { HERO_MASTERS } from '../../src/lib/heroMasters.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function cloudinaryCreds() {
  let raw = process.env.CLOUDINARY_URL || '';
  for (const f of ['.env.local', '.env']) {
    if (raw) break;
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const i = line.indexOf('=');
      if (i < 0 || line.slice(0, i).trim() !== 'CLOUDINARY_URL') continue;
      // A BARE KEY WITH NO VALUE overrides nothing. .env.local carries
      // `CLOUDINARY_URL` with an empty value and .env carries the real one;
      // a reader that took the first match would find no credentials and
      // report the folder as empty.
      const v = line.slice(i + 1).trim();
      if (v) raw = v;
    }
  }
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(raw);
  return m ? { key: m[1], secret: m[2], cloud: m[3] } : null;
}

export async function runHeroMastersLive() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const creds = cloudinaryCreds();
  check('Cloudinary credentials are available to this lane', !!creds,
    creds ? 'read from the environment' : 'no CLOUDINARY_URL — this lane needs one');
  if (!creds) return results;

  const auth = 'Basic ' + Buffer.from(`${creds.key}:${creds.secret}`).toString('base64');
  // DYNAMIC FOLDERS: this cloud stores heroes-jpg as an asset folder, not as
  // a public-id prefix, so a `prefix=heroes-jpg/` listing returns ZERO and
  // reads as "the folder is empty" rather than "you asked the wrong way".
  const res = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloud}/resources/search`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression: 'folder="heroes-jpg"', max_results: 200 }),
  });
  check('the heroes-jpg folder can be listed', res.ok, res.ok ? 'Search API 200' : `HTTP ${res.status}`);
  if (!res.ok) return results;

  const live = new Map((await res.json()).resources.map((a) => [a.public_id, a]));
  check('  and it is not empty', live.size > 0, `${live.size} asset(s)`);

  for (const [pid, declared] of Object.entries(HERO_MASTERS)) {
    const asset = live.get(pid);
    // Assets outside heroes-jpg are the named exemptions — amalfi's old
    // master. They are checked one by one below rather than skipped.
    if (!asset) {
      const one = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloud}/resources/image/upload/${encodeURIComponent(pid)}`, { headers: { Authorization: auth } });
      if (!one.ok) { check(`${pid.slice(0, 30)}…: the asset exists`, false, `HTTP ${one.status}`); continue; }
      const j = await one.json();
      check(`${pid.slice(0, 30)}…: the map's width is the real one`,
        j.width === declared.width && j.height === declared.height,
        `map ${declared.width}x${declared.height} · live ${j.width}x${j.height}`);
      continue;
    }
    check(`${pid}: the map's width is the real one`,
      asset.width === declared.width && asset.height === declared.height,
      `map ${declared.width}x${declared.height} · live ${asset.width}x${asset.height}`);
  }

  // A hero the owner has uploaded and nobody has wired in is invisible
  // otherwise — the folder grows and the product does not change.
  const unmapped = [...live.keys()].filter((p) => !(p in HERO_MASTERS));
  check('every asset in heroes-jpg is mapped and in use', unmapped.length === 0,
    unmapped.join(', ') || 'none unclaimed');

  return results;
}
