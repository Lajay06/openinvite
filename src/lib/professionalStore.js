/**
 * src/lib/professionalStore.js
 *
 * THE ADAPTER. goals/2026-10-14-professional.md, item 0.
 *
 * Every Professional screen reads and writes through this module and nothing
 * else. Until the owner adds the Pro* entities in Base44, it is an in-memory
 * store seeded with test data, so the screens can be built and seen. When the
 * entities exist, the bodies of list/create/update/remove move to the
 * api/professional/* endpoints (rows owned by their owner's account, every
 * cross-account read checked server-side), and no screen changes.
 *
 * Collections are named after the proposed entities. Nothing here reads or
 * writes a couple's data: the linked guest feed comes only from the server.
 */
import { useSyncExternalStore } from 'react';

/**
 * False until the owner adds the entities and the endpoints are wired. While
 * false, the app shows the test data and says so on every screen.
 */
export const STORE_LIVE = false;

export const COLLECTIONS = [
  'ProWorkspace', 'ProMember', 'ProEvent', 'PlannerLink', 'ProGuest', 'RunSheetRow',
  'VendorContact', 'ProVendorBooking', 'PaymentDue', 'ProTask', 'ProTemplate',
  'ProQuestionnaire', 'ProDocument', 'ProNote', 'PartnerCode', 'PartnerReward', 'ProCost',
];

let seq = 0;
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;
const nowIso = () => new Date().toISOString();

let state = {};
const listeners = new Set();
function emit() { state = { ...state }; listeners.forEach((l) => l()); }

export function resetStore(seed = seedData()) {
  state = {};
  for (const c of COLLECTIONS) state[c] = (seed[c] || []).map((r) => ({ ...r }));
  emit();
}

export function list(kind, where = {}) {
  const rows = state[kind] || [];
  const keys = Object.keys(where);
  return keys.length ? rows.filter((r) => keys.every((k) => r[k] === where[k])) : rows;
}
export function get(kind, id) { return (state[kind] || []).find((r) => r.id === id) || null; }

export function create(kind, data) {
  if (!COLLECTIONS.includes(kind)) throw new Error(`Unknown collection ${kind}`);
  const row = { ...data, id: newId(kind.toLowerCase()), created_date: nowIso() };
  state[kind] = [...(state[kind] || []), row];
  emit();
  return row;
}
export function update(kind, id, patch) {
  let out = null;
  state[kind] = (state[kind] || []).map((r) => (r.id === id ? (out = { ...r, ...patch, updated_date: nowIso() }) : r));
  emit();
  return out;
}
export function remove(kind, id) {
  state[kind] = (state[kind] || []).filter((r) => r.id !== id);
  emit();
}
/** Several writes, one render. */
export function bulk(fn) {
  const quiet = { create: (k, d) => { const row = { ...d, id: newId(k.toLowerCase()), created_date: nowIso() }; state[k] = [...(state[k] || []), row]; return row; } };
  fn(quiet);
  emit();
}

function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
const snapshot = () => state;
/** React hook: re-renders on any write. `select` receives the whole store. */
export function useProStore(select = (s) => s) {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  return select(s);
}

/** The current workspace and the signed-in member, in the adapter. */
export const CURRENT = { workspaceId: 'ws_demo', memberId: 'mem_owner' };
export function setCurrentMember(memberId) { CURRENT.memberId = memberId; emit(); }

/* ───────────────────────── the seed ───────────────────────── */

function addDays(n) { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

export function seedData() {
  const ws = 'ws_demo';
  const ProWorkspace = [{ id: ws, name: 'Holly Reed Events', plan: 'team', plan_status: 'active', event_limit: 30, seat_limit: 5, brand_name: '', trial_ends_at: null, is_test: true }];
  const ProMember = [
    { id: 'mem_owner', workspace_id: ws, name: 'Holly Reed', email_display: 'holly@example.com', phone: '+1 415 555 0110', role: 'owner', assigned_event_ids: [], is_test: true },
    { id: 'mem_sam', workspace_id: ws, name: 'Sam Ortiz', email_display: 'sam@example.com', phone: '+1 415 555 0111', role: 'planner', assigned_event_ids: ['ev_1', 'ev_3'], is_test: true },
    { id: 'mem_jo', workspace_id: ws, name: 'Jo Park', email_display: 'jo@example.com', phone: '+1 415 555 0112', role: 'assistant', assigned_event_ids: ['ev_1'], is_test: true },
    { id: 'mem_kai', workspace_id: ws, name: 'Kai Ruiz', email_display: 'kai@example.com', phone: '+1 415 555 0113', role: 'dayof', assigned_event_ids: ['ev_1'], is_test: true },
  ];
  const ProEvent = [
    { id: 'ev_1', workspace_id: ws, couple_names: 'Maya and Theo', event_date: addDays(23), venue: 'The Glasshouse, Napa', status: 'active', kind: 'linked', guest_estimate: 140, assigned_member_ids: ['mem_sam', 'mem_jo'], created_date: '2026-01-10T00:00:00Z', is_test: true },
    { id: 'ev_2', workspace_id: ws, couple_names: 'Priya and Jordan', event_date: addDays(23), venue: 'Rosewood Barn, Sonoma', status: 'active', kind: 'standalone', guest_estimate: 90, assigned_member_ids: ['mem_owner'], created_date: '2026-02-02T00:00:00Z', is_test: true },
    { id: 'ev_3', workspace_id: ws, couple_names: 'Ana and Luis', event_date: addDays(68), venue: 'Harbor Club, San Francisco', status: 'active', kind: 'standalone', guest_estimate: 180, assigned_member_ids: ['mem_sam'], created_date: '2026-03-15T00:00:00Z', is_test: true },
    { id: 'ev_4', workspace_id: ws, couple_names: 'Grace and Owen', event_date: addDays(190), venue: 'Mill Valley Lodge', status: 'active', kind: 'standalone', guest_estimate: 75, assigned_member_ids: [], created_date: '2026-05-01T00:00:00Z', is_test: true },
  ];
  const sheet = (event_id, sheet, rows) => rows.map(([start, dur, item, location, owner_ref, cue], i) => ({
    id: `rs_${event_id}_${sheet}_${i}`, event_id, sheet, start_minute: start, duration_minutes: dur, item, location, owner_ref, cue, notes: '', status: 'todo', sort: i, is_test: true,
  }));
  const RunSheetRow = [
    ...sheet('ev_1', 'Setup', [[9 * 60, 120, 'Florist load-in and arch build', 'Garden lawn', 'v_flor', 'Gates open at 9'], [11 * 60, 60, 'Chairs and aisle runner', 'Garden lawn', 'mem_jo', '']]),
    ...sheet('ev_1', 'Ceremony', [[15 * 60 + 30, 30, 'Guests arrive, welcome drinks', 'Terrace', 'mem_jo', ''], [16 * 60, 30, 'Ceremony', 'Garden lawn', 'mem_sam', 'Music cue: processional'], [16 * 60 + 30, 15, 'Confetti and group photo', 'Steps', 'v_photo', '']]),
    ...sheet('ev_1', 'Reception', [[17 * 60, 60, 'Canapes and cocktails', 'Terrace', 'v_cater', ''], [18 * 60, 15, 'Guests seated', 'Glasshouse', 'mem_jo', 'DJ: soft music'], [18 * 60 + 30, 15, 'Couple entrance', 'Glasshouse', 'v_dj', 'Entrance song'], [19 * 60, 60, 'Dinner service', 'Glasshouse', 'v_cater', ''], [20 * 60 + 15, 20, 'Speeches', 'Glasshouse', 'mem_sam', 'Mic check at 8:00 pm'], [21 * 60, 120, 'Dancing', 'Glasshouse', 'v_dj', 'First dance']]),
  ];
  const VendorContact = [
    { id: 'v_flor', workspace_id: ws, role: 'Florist', company: 'Wild Stem Florals', contact: 'Ruth Hale', phone: '+1 415 555 0101', email: 'ruth@example.com', insurance_expires: addDays(200), notes: '', is_test: true },
    { id: 'v_photo', workspace_id: ws, role: 'Photographer', company: 'Lena Cho Photography', contact: 'Lena Cho', phone: '+1 415 555 0102', email: 'lena@example.com', insurance_expires: addDays(12), notes: '', is_test: true },
    { id: 'v_cater', workspace_id: ws, role: 'Caterer', company: 'Fig and Salt', contact: 'Marco Bell', phone: '+1 415 555 0103', email: 'marco@example.com', insurance_expires: addDays(400), notes: '', is_test: true },
    { id: 'v_dj', workspace_id: ws, role: 'DJ', company: 'North Bay Sound', contact: 'Kai Lowe', phone: '+1 415 555 0104', email: 'kai@example.com', insurance_expires: addDays(90), notes: '', is_test: true },
  ];
  const ProVendorBooking = [
    { id: 'vb_1', event_id: 'ev_1', vendor_id: 'v_flor', role: 'Florist', fee: 4200, deposit: 1000, arrive: 9 * 60, finish: 23 * 60, contract_file: '', link_token: null, link_expires_at: null, is_test: true },
    { id: 'vb_2', event_id: 'ev_1', vendor_id: 'v_photo', role: 'Photographer', fee: 5800, deposit: 1500, arrive: 14 * 60, finish: 22 * 60, contract_file: '', link_token: null, link_expires_at: null, is_test: true },
    { id: 'vb_3', event_id: 'ev_1', vendor_id: 'v_cater', role: 'Caterer', fee: 16800, deposit: 4000, arrive: 13 * 60, finish: 24 * 60, contract_file: '', link_token: null, link_expires_at: null, is_test: true },
    { id: 'vb_4', event_id: 'ev_1', vendor_id: 'v_dj', role: 'DJ', fee: 2400, deposit: 500, arrive: 16 * 60 + 30, finish: 24 * 60, contract_file: '', link_token: null, link_expires_at: null, is_test: true },
    { id: 'vb_5', event_id: 'ev_2', vendor_id: 'v_photo', role: 'Photographer', fee: 5200, deposit: 1500, arrive: 13 * 60, finish: 22 * 60, contract_file: '', link_token: null, link_expires_at: null, is_test: true },
  ];
  const PaymentDue = [
    { id: 'pd_1', event_id: 'ev_1', booking_id: 'vb_3', label: 'Caterer, second installment', amount: 6400, due_date: addDays(3), payer: 'couple', status: 'due', is_test: true },
    { id: 'pd_2', event_id: 'ev_1', booking_id: 'vb_1', label: 'Florist balance', amount: 3200, due_date: addDays(9), payer: 'couple', status: 'due', is_test: true },
    { id: 'pd_3', event_id: 'ev_2', booking_id: 'vb_5', label: 'Photographer balance', amount: 3700, due_date: addDays(5), payer: 'couple', status: 'due', is_test: true },
    { id: 'pd_4', event_id: 'ev_1', booking_id: 'vb_2', label: 'Photographer deposit', amount: 1500, due_date: addDays(-40), payer: 'couple', status: 'paid', is_test: true },
    { id: 'pd_5', event_id: 'ev_3', booking_id: null, label: 'Planning fee, installment 2', amount: 2500, due_date: addDays(-2), payer: 'couple', status: 'due', is_test: true },
  ];
  const ProTask = [
    { id: 'tk_1', event_id: 'ev_1', title: 'Confirm final numbers with caterer', owner_id: 'mem_sam', due_date: addDays(2), done: false, months_out: null, is_test: true },
    { id: 'tk_2', event_id: 'ev_1', title: 'Send vendor run sheets', owner_id: 'mem_jo', due_date: addDays(6), done: false, months_out: null, is_test: true },
    { id: 'tk_3', event_id: 'ev_2', title: 'Book shuttle bus', owner_id: 'mem_owner', due_date: addDays(-1), done: false, months_out: null, is_test: true },
    { id: 'tk_4', event_id: 'ev_3', title: 'Tasting with Fig and Salt', owner_id: 'mem_sam', due_date: addDays(12), done: false, months_out: null, is_test: true },
  ];
  const ProGuest = [
    { id: 'pg_1', event_id: 'ev_2', name: 'Asha Rao', dietary: 'Vegetarian', meal: 'Risotto', table: 'Table 1', plus_one: true, child: false, status: 'coming', is_test: true },
    { id: 'pg_2', event_id: 'ev_2', name: 'Ben Cole', dietary: '', meal: 'Beef', table: 'Table 1', plus_one: false, child: false, status: 'coming', is_test: true },
    { id: 'pg_3', event_id: 'ev_2', name: 'Lily Cole', dietary: 'Nut allergy', meal: 'Kids pasta', table: 'Table 2', plus_one: false, child: true, status: 'coming', is_test: true },
    { id: 'pg_4', event_id: 'ev_2', name: 'Tom Hart', dietary: '', meal: '', table: '', plus_one: false, child: false, status: 'waiting', is_test: true },
  ];
  const PlannerLink = [
    { id: 'pl_0', event_id: 'ev_1', workspace_id: ws, event_type: 'request', created_date: '2026-08-30T10:00:00Z', is_test: true },
    { id: 'pl_1', event_id: 'ev_1', workspace_id: ws, event_type: 'approve', shares: { totals: true, names: true, party: true, dietary: true, meals: true, tables: true, basics: true, schedule: true }, created_date: '2026-09-01T10:00:00Z', is_test: true },
  ];
  const ProCost = [
    { id: 'pc_fee', event_id: 'ev_1', kind: 'fee', label: 'Full planning fee', amount: 9500, is_test: true },
    { id: 'pc_com', event_id: 'ev_1', kind: 'commission', label: 'Florist referral', amount: 420, is_test: true },
    { id: 'pc_cost', event_id: 'ev_1', kind: 'cost', label: 'Day-of assistant', amount: 450, is_test: true },
  ];
  const PartnerCode = [{ id: 'pc_1', workspace_id: ws, code: 'HOLLY10', label: 'Main', status: 'active', created_date: '2026-09-01T00:00:00Z', is_test: true }];
  const PartnerReward = [
    { id: 'pr_1', code_id: 'pc_1', plan: 'ultra', amount: 50, status: 'pending', created_date: '2026-10-08T00:00:00Z', earn_after: addDays(8), is_test: true },
    { id: 'pr_2', code_id: 'pc_1', plan: 'pro', amount: 20, status: 'earned', created_date: '2026-09-03T00:00:00Z', earn_after: addDays(-20), is_test: true },
  ];
  return { ProWorkspace, ProMember, ProEvent, RunSheetRow, VendorContact, ProVendorBooking, PaymentDue, ProTask, ProGuest, PlannerLink, PartnerCode, PartnerReward, ProCost };
}

resetStore();
