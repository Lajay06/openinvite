const fs=await import('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
 .filter(l=>l.includes('=')&&!l.trim().startsWith('#'))
 .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'')]));
const B='https://base44.app/api', A='68731d183f075e406eda2236';
const lg=await(await fetch(`${B}/apps/${A}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({email:env.BASE44_TEST_EMAIL,password:env.BASE44_TEST_PASSWORD})})).json();
const r=await fetch(`${B}/apps/${A}/entities/MoodboardItem?limit=1000`,{headers:{Authorization:'Bearer '+lg.access_token}});
const p=await r.json(); const rows=Array.isArray(p)?p:(p.data||p.results||[]);
const b44=rows.find(x=>String(x.image_url).includes('base44.app'));
const cld=rows.find(x=>String(x.image_url).includes('cloudinary'));
for (const [label,u] of [['Base44 file',b44?.image_url],['Cloudinary',cld?.image_url]]) {
  if(!u){ console.log(`  ${label}: none in data`); continue; }
  const res=await fetch(u,{redirect:'follow'});
  console.log(`  ${label.padEnd(12)} -> HTTP ${res.status}  ${res.headers.get('content-type')}  ${res.headers.get('content-length')||'?'} bytes`);
  console.log(`     url: ${u.slice(0,100)}`);
  if (label==='Base44 file') {
    const noRedir=await fetch(u,{redirect:'manual'});
    console.log(`     unauthenticated, no-follow: ${noRedir.status} -> ${String(noRedir.headers.get('location')).slice(0,80)}`);
  }
}
// total byte weight of the couple's photo set
let total=0, n=0;
for (const x of rows) {
  try { const h=await fetch(x.image_url,{method:'HEAD',redirect:'follow'});
        const cl=Number(h.headers.get('content-length')||0); total+=cl; n++; } catch {}
}
console.log(`\n  moodboard items: ${rows.length}, measured ${n}, total ${(total/1024/1024).toFixed(2)} MB`);
