import { readFileSync } from 'fs';
const parse = (f) => { try { return Object.fromEntries(readFileSync(f,'utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()])); } catch { return {}; } };
const env = { ...parse('.env.local'), ...parse('.env') };
const m = (env.CLOUDINARY_URL||'').match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
const [, key, secret, cloud] = m;
const auth = 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
const api = async (p) => { const r = await fetch('https://api.cloudinary.com/v1_1/' + cloud + '/' + p, { headers: { Authorization: auth } });
  try { return JSON.parse(await r.text()); } catch { return {}; } };
const list = async (folder) => {
  const r = await api('resources/by_asset_folder?asset_folder=' + encodeURIComponent(folder) + '&max_results=100');
  return r.resources || [];
};
const ratio = (w,h) => { const g=(a,b)=>b?g(b,a%b):a; const d=g(w,h); return (w/d)+':'+(h/d); };
const shape = (w,h) => { const r=w/h; return r > 1.5 ? 'wide landscape' : r > 1.1 ? 'landscape' : r > 0.9 ? 'square' : r > 0.66 ? 'portrait' : 'tall portrait'; };

for (const f of ['Havana','Universe','Paris','Mykonos']) {
  const res = await list(f);
  console.log('\n=== ' + f + ' — ' + res.length + ' assets ===');
  for (const r of res.sort((a,b)=> (b.width/b.height)-(a.width/a.height)))
    console.log('  ' + String(r.width+'x'+r.height).padEnd(11) + ratio(r.width,r.height).padEnd(9) + shape(r.width,r.height).padEnd(15) + r.format.padEnd(5) + r.public_id);
}
