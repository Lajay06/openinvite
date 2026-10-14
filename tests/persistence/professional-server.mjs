/**
 * tests/persistence/professional-server.mjs
 *
 * Openinvite Professional: every endpoint checks the role server-side, from
 * the same table the Team page shows. goals/2026-10-14-professional.md, item 8
 * ("server-side role checks on every endpoint; a truthful-permissions guard").
 *
 * Three halves:
 *   1. authorize() refuses what the roles table refuses, and the default is no.
 *   2. Every collection the app writes has a server rule, and the hosted
 *      function serves exactly the collections the server maps (no drift).
 *   3. Every api/professional/*.js handler checks the flag first and, for
 *      data, calls authorize() before it reaches a row.
 *
 * PLANT (R19): an authorize() that lets a day-of seat edit an item (not just
 * tick it) must fail the same check.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { pass, fail, stripComments } from './_shared.mjs';
import { authorize, areaFor, AREA_MAP, liveMember } from '../../api/_lib/professionalAuth.js';
import { FIELDS, ENC, toStored } from '../../api/_lib/professionalData.js';

const ROOT = new URL('../..', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const EV = { id: 'ev_1', workspace_id: 'ws', assigned_member_ids: [] };
const m = (role) => ({ id: `m_${role}`, role, assigned_event_ids: ['ev_1'] });

export function runProfessionalServer(auth = authorize) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, server-side role checks:\n');
  const ok = (role, collection, op, patch = null, event = EV) => auth({ member: m(role), collection, op, patch, event }).ok;

  check('professional server: an assistant is refused every payment and budget read and write', !ok('assistant', 'PaymentDue', 'list') && !ok('assistant', 'ProCost', 'create', { amount: 1 }) && !ok('assistant', 'PaymentDue', 'update', { status: 'paid' }), 'refused');
  check('professional server: an assistant may edit the run sheet, tasks and standalone guests', ok('assistant', 'RunSheetRow', 'update', { item: 'x' }) && ok('assistant', 'ProTask', 'create', { title: 'x' }) && ok('assistant', 'ProGuest', 'update', { meal: 'Beef' }), 'allowed');
  check('professional server: a day-of seat may tick a row done', ok('dayof', 'RunSheetRow', 'update', { status: 'done' }), 'tick');
  check('professional server: a day-of seat may not change anything else on a row', !ok('dayof', 'RunSheetRow', 'update', { status: 'done', item: 'changed' }) && !ok('dayof', 'RunSheetRow', 'create', { item: 'x' }) && !ok('dayof', 'RunSheetRow', 'remove'), 'refused');
  check('professional server: a day-of seat sees no money, tasks or documents', !ok('dayof', 'PaymentDue', 'list') && !ok('dayof', 'ProTask', 'list') && !ok('dayof', 'ProDocument', 'list'), 'refused');
  check('professional server: a planner is refused an event not assigned to them', !auth({ member: { id: 'p', role: 'planner', assigned_event_ids: [] }, collection: 'RunSheetRow', op: 'list', event: EV }).ok, 'refused');
  check('professional server: only the owner reaches billing, codes and the team', ok('owner', 'ProWorkspace', 'update', { plan: 'team' }) && !ok('planner', 'ProWorkspace', 'update', { plan: 'team' }) && !ok('planner', 'PartnerCode', 'create') && !ok('planner', 'ProMember', 'create'), 'owner only');
  check('professional server: nobody writes a partner reward through the data endpoint', !ok('owner', 'PartnerReward', 'create') && !ok('owner', 'PartnerReward', 'update', { status: 'credited' }), 'webhook and job only');
  check('professional server: an unknown collection, an unknown operation, or no member is refused', !auth({ member: m('owner'), collection: 'Guest', op: 'list' }).ok && areaFor('RunSheetRow', 'drop') === null && !auth({ member: null, collection: 'RunSheetRow', op: 'list', event: EV }).ok, 'default no');

  const log = [
    { member_user_id_hash: 'u1', member_email_hash: 'e1', role: 'planner', event_type: 'accept', created_date: '2026-10-01' },
    { member_user_id_hash: 'u1', member_email_hash: 'e1', role: 'planner', event_type: 'remove', created_date: '2026-10-02' },
  ];
  check('professional server: a removed seat is no longer a member', liveMember(log, { userHash: 'u1' }) === null && liveMember(log.slice(0, 1), { userHash: 'u1' })?.role === 'planner', 'removed');

  const appCollections = (read('src/lib/professionalStore.js').match(/export const COLLECTIONS = \[([\s\S]*?)\];/)[1].match(/'(\w+)'/g) || []).map((x) => x.slice(1, -1));
  const missing = appCollections.filter((c) => !AREA_MAP[c]);
  check('professional server: every collection the app writes has a server rule', missing.length === 0, missing.join(', ') || `${appCollections.length} collections`);
  const fn = read('base44/functions/professionalData/entry.ts');
  const fnCollections = [...(fn.match(/EVENT_SCOPED = \[([^\]]*)\]/)[1] + fn.match(/WORKSPACE_SCOPED = \[([^\]]*)\]/)[1]).matchAll(/'(\w+)'/g)].map((x) => x[1]).sort();
  check('professional server: the hosted function serves exactly the collections the server maps', fnCollections.join() === Object.keys(AREA_MAP).sort().join(), fnCollections.join(','));
  check('professional server: the function re-checks membership and the shared secret', /isLiveMember\(members, userHash\)/.test(fn) && /sameSecret\(req\.headers\.get\('X-Pro-Fn-Secret'\)/.test(fn), 'both');

  check('professional server: a standalone guest can never store an email, phone or address', !FIELDS.ProGuest.some((f) => /email|phone|address/i.test(f)), FIELDS.ProGuest.join(','));
  const stored = toStored('ProGuest', { meal: 'Beef', email: 'a@b.co', phone: '1', mailing_address: 'x', event_id: 'ev' });
  check('professional server: fields outside the allowlist are dropped before storage', !('email' in stored) && !('phone' in stored) && !('mailing_address' in stored) && stored.event_id === 'ev' && stored.meal === 'Beef', Object.keys(stored).join(','));
  check('professional server: names, notes and dietary needs are encrypted at rest', ENC.ProEvent.couple_names && ENC.ProGuest.name && ENC.ProGuest.dietary && ENC.RunSheetRow.notes && ENC.ProNote.body, 'mapped');

  const handlers = readdirSync(new URL('api/professional/', ROOT)).filter((f) => f.endsWith('.js'));
  const noFlag = handlers.filter((f) => !/if \(!professionalOnServer\(\)\) return res\.status\(404\)/.test(read(`api/professional/${f}`)));
  check('professional server: every Professional endpoint is a 404 while the flag is off', noFlag.length === 0, noFlag.join(', ') || `${handlers.length} handlers`);
  const authSrc = stripComments(read('api/_lib/professionalAuth.js'), { trailing: true });
  const ownFlag = handlers.filter((f) => /VERCEL_ENV|process\.env\.PROFESSIONAL/.test(stripComments(read(`api/professional/${f}`), { trailing: true })));
  check('professional server: the flag comes from professionalFlag.js alone; no handler or helper decides it', /export \{ professionalOnServer \} from '\.\/professionalFlag\.js';/.test(authSrc) && !/function professionalOnServer/.test(authSrc) && ownFlag.length === 0, ownFlag.join(', ') || 'one source');
  const data = stripComments(read('api/professional/data.js'), { trailing: true });
  const iAuth = data.indexOf('authorize({');
  const iWrite = data.search(/proFn\(op,|proFn\('list'|proFn\('remove'/);
  check('professional server: the data endpoint authorizes before it lists or writes a row', iAuth > 0 && iWrite > iAuth && /verifyBase44User\(req\)/.test(data) && !/err\.message/.test(data), `authorize at ${iAuth}, first write at ${iWrite}`);

  if (auth === authorize) {
    const planted = ({ member, collection, op, patch, event }) => (member?.role === 'dayof' && collection === 'RunSheetRow' && op === 'update' ? { ok: true } : authorize({ member, collection, op, patch, event }));
    const p = planted({ member: m('dayof'), collection: 'RunSheetRow', op: 'update', patch: { item: 'x' }, event: EV });
    check('PLANT: a check that lets day-of edit an item is told apart', p.ok === true, 'planted allows it');
  }
  return r;
}
