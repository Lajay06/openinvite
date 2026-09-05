/** D-READ part 2. Credentials never printed. */
import { readFileSync } from 'fs';
const parse = (f) => { try { return Object.fromEntries(readFileSync(f,'utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()])); } catch { return {}; } };
const env = { ...parse('.env.local'), ...parse('.env') };
const m = (env.CLOUDINARY_URL||'').match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
const [, key, secret, cloud] = m;
const auth = 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
const api = async (p) => { const r = await fetch('https://api.cloudinary.com/v1_1/' + cloud + '/' + p, { headers: { Authorization: auth } });
  const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t.slice(0,120), _status: r.status }; } };

const UNIVERSES = ['london','tulum','kyoto','capri','marrakech','brooklyn','bali','paris','capetown','mykonos',
                   'amalfi','sedona','aspen','taj','havana','edinburgh','monaco','florence','seoul','shanghai'];
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

const root = await api('folders');
const folders = (root.folders||[]).map(f => f.path);
// any subfolders?
const all = [...folders];
for (const f of folders) {
  const sub = await api('folders/' + encodeURIComponent(f));
  for (const s of (sub.folders||[])) all.push(s.path);
}
console.log('total folders (root + one level): ' + all.length);

const countIn = async (folder) => {
  const r = await api('resources/by_asset_folder?asset_folder=' + encodeURIComponent(folder) + '&max_results=100');
  if (r.resources) return r.resources;
  const r2 = await api('resources/image?type=upload&prefix=' + encodeURIComponent(folder + '/') + '&max_results=100');
  return r2.resources || [];
};

console.log('\nuniverse           folder path            assets');
console.log('-'.repeat(56));
const missing = [];
for (const u of UNIVERSES) {
  const hit = all.find(f => norm(f) === norm(u));
  if (!hit) { missing.push(u + ' (no folder)'); console.log(u.padEnd(18) + '—'.padEnd(23) + '0  NO FOLDER'); continue; }
  const res = await countIn(hit);
  if (!res.length) missing.push(u + ' (empty folder ' + hit + ')');
  console.log(u.padEnd(18) + hit.padEnd(23) + res.length + (res.length ? '' : '  EMPTY'));
}
console.log('\nWITHOUT PHOTOGRAPHY: ' + (missing.length ? missing.join(' | ') : 'none'));

const hav = all.find(f => norm(f) === 'havana');
const res = await countIn(hav);
console.log('\n=== HAVANA (' + hav + ') — ' + res.length + ' assets ===');
for (const r of res.sort((a,b) => a.public_id.localeCompare(b.public_id)))
  console.log('  ' + r.public_id.padEnd(46) + (r.width + 'x' + r.height).padEnd(12) + r.format + '  ' + (r.bytes/1024).toFixed(0) + 'KB  ' + (r.created_at||'').slice(0,10));
