// Both directions, per file, no assumption carried across.
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const TARGETS=['src/lib/planFeatures.js','src/lib/marketingSeo.js','src/lib/universeCatalog.js',
  'src/hooks/useMarketingSeo.js','src/hooks/useOrganizationStructuredData.js'];
const ENTRIES=execSync("node -e \"import('./scripts/marketingRoutes.mjs').then(m=>console.log(Object.keys(m).join(',')))\"",{encoding:'utf8'}).trim();
// resolve an import specifier to a repo path
const resolve=(spec,from)=>{
  let p = spec.startsWith('@/') ? 'src/'+spec.slice(2) : null;
  if(!p && spec.startsWith('.')){
    const base=from.split('/').slice(0,-1).join('/');
    p=new URL(spec, 'file:///'+base+'/').pathname.replace(/^\//,'');
  }
  if(!p) return null;
  for(const ext of ['','.js','.jsx','/index.js','/index.jsx'])
    if(existsSync(p+ext)) return p+ext;
  return null;
};
const imports=(f)=>{
  if(!existsSync(f)) return [];
  const src=readFileSync(f,'utf8');
  return [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>resolve(m[1],f)).filter(Boolean);
};
// forward: BFS from each marketing page
const PAGES=['Home','Features','Ava','FAQ','Universes','Gifting','Pricing','Contact','About',
  'PrivacyPolicy','TermsOfService','Login','Register','ForgotPassword'];
const seen=new Set(), q=PAGES.map(p=>`src/pages/${p}.jsx`).filter(existsSync);
q.forEach(f=>seen.add(f));
while(q.length){ const f=q.shift(); for(const d of imports(f)) if(!seen.has(d)){seen.add(d);q.push(d);} }
console.log(`  reachable from ${PAGES.length} marketing entry points: ${seen.size} modules\n`);
const pats=readFileSync('scripts/test-prerendered-freshness.mjs','utf8');
for(const t of TARGETS){
  const exists=existsSync(t);
  const reach=seen.has(t);
  const esc=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\//g,'\\\\?/');
  const guarded=new RegExp(t.replace(/\./g,'\\.').replace(/\//g,'\\\\?/')).test(pats)
    || pats.includes(t.split('/').pop().replace('.js',''));
  const verdict = !exists ? 'FILE MISSING'
    : (reach && guarded) ? 'reachable AND guarded'
    : (reach && !guarded) ? 'REACHABLE BUT NOT GUARDED  <-- gap'
    : (!reach && guarded) ? 'guarded but NOT reachable  <-- stale entry'
    : 'neither';
  console.log(`  ${t.padEnd(44)} ${verdict}`);
}
