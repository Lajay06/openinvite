/**
 * tests/persistence/professional-access.mjs
 *
 * Openinvite Professional: the roles table says what the goal says, and only
 * that. goals/2026-10-14-professional.md, Team and access inside a workspace.
 * This is the truthful-permissions guard: the Team page shows each role's
 * line from the same table this file checks, so the words and the rule cannot
 * drift apart.
 *
 * PLANT (R19): an assistant row that gains money.view must be caught by the
 * same "no money" check.
 */
import { pass, fail } from './_shared.mjs';
import { can, ROLES, visibleEvents, resolveEntry, isCoupleAccount } from '../../src/lib/professionalAccess.js';

const EV = { id: 'ev_1', assigned_member_ids: [] };
const OTHER = { id: 'ev_2', assigned_member_ids: [] };
const m = (role, ids = ['ev_1']) => ({ id: `m_${role}`, role, assigned_event_ids: ids });

export function runProfessionalAccess(canFn = can) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, roles and access:\n');

  const owner = m('owner', []);
  check('professional access: the owner can do everything on every event, billing and codes included', ['money.edit', 'workspace.billing', 'workspace.codes', 'workspace.team'].every((a) => canFn(owner, a, OTHER)), 'all');

  const planner = m('planner');
  check('professional access: a planner has full access to an assigned event', ['money.edit', 'runsheet.edit', 'guests.edit', 'link.invite'].every((a) => canFn(planner, a, EV)), 'assigned');
  check('professional access: a planner cannot open an event not assigned to them', !canFn(planner, 'event.view', OTHER), 'not assigned');
  check('professional access: a planner has no billing, codes or team', !canFn(planner, 'workspace.billing') && !canFn(planner, 'workspace.codes') && !canFn(planner, 'workspace.team'), 'owner only');

  const assistant = m('assistant');
  const moneyAreas = ['money.view', 'money.edit'];
  check('professional access: an assistant sees no money', moneyAreas.every((a) => !canFn(assistant, a, EV)), 'no money');
  check('professional access: an assistant works tasks, run sheet and standalone guests on assigned events', ['tasks.edit', 'runsheet.edit', 'guests.edit'].every((a) => canFn(assistant, a, EV)), 'yes');

  const dayof = m('dayof');
  check('professional access: day-of sees the run sheet and contacts, and can tick', ['runsheet.view', 'contacts.view', 'runsheet.tick'].every((a) => canFn(dayof, a, EV)), 'yes');
  check('professional access: day-of cannot edit the run sheet, see money, edit guests or tasks', ['runsheet.edit', 'money.view', 'guests.edit', 'tasks.edit', 'vendors.edit'].every((a) => !canFn(dayof, a, EV)), 'no');

  check('professional access: an unknown role, or no member, can do nothing', !canFn({ role: 'admin', assigned_event_ids: ['ev_1'] }, 'event.view', EV) && !canFn(null, 'event.view', EV), 'nothing');
  check('professional access: an event lists only for members who can open it', visibleEvents(planner, [EV, OTHER]).length === 1 && visibleEvents(owner, [EV, OTHER]).length === 2, 'filtered');

  check('professional access: every role has a plain line for the Team page', Object.values(ROLES).every((x) => x.label && x.line), Object.keys(ROLES).join(', '));
  check('professional access: the assistant’s line says no money, as the rule does', /no money/i.test(ROLES.assistant.line), ROLES.assistant.line);

  check('professional entry: before the entities exist, everyone sees the test data', resolveEntry({ user: null, live: false }) === 'demo', 'demo');
  check('professional entry: a couple’s account is told one email cannot be both', resolveEntry({ user: { plan: 'ultra' }, live: true }) === 'couple' && isCoupleAccount({ onboardingCompleted: true }), 'couple');
  check('professional entry: a professional account enters the app; a new one chooses', resolveEntry({ user: { accountType: 'professional', plan: 'ultra' }, live: true }) === 'app' && resolveEntry({ user: { email: 'a@b.c' }, live: true }) === 'start' && resolveEntry({ user: null, live: true }) === 'signin', 'routed');

  return r;
}

/** PLANT: an assistant table that leaks money must fail the "no money" check above. */
export function plantedAssistantMoney() {
  const leaky = (member, area, event) => (member?.role === 'assistant' && area === 'money.view') || can(member, area, event);
  return runProfessionalAccess(leaky);
}
