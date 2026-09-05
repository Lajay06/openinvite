/** D-READ. Credentials read from .env CLOUDINARY_URL; never printed. */
import { readFileSync } from 'fs';
const parse = (f) => Object.fromEntries(readFileSync(f,'utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]));
const env = { ...parse('.env.local'), ...parse('.env') };
const url = env.CLOUDINARY_URL || '';
const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) { console.log('CLOUDINARY_URL not in cloudinary://key:secret@cloud form'); process.exit(0); }
const [, key, secret, cloud] = m;
const auth = 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
const api = async (p) => {
  const r = await fetch('https://api.cloudinary.com/v1_1/' + cloud + '/' + p, { headers: { Authorization: auth } });
  const t = await r.text();
  try { return { status: r.status, json: JSON.parse(t) }; } catch { return { status: r.status, text: t.slice(0,160) }; }
};
console.log('cloud: ' + cloud + '  (key/secret not shown)');
const root = await api('folders');
console.log('root -> ' + root.status + ' ' + JSON.stringify((root.json && root.json.folders || []).map(f => f.path)));
for (const f of (root.json && root.json.folders || [])) {
  const sub = await api('folders/' + encodeURIComponent(f.path));
  const subs = (sub.json && sub.json.folders || []).map(x => x.path);
  if (subs.length) console.log('  ' + f.path + ' -> ' + JSON.stringify(subs));
}
