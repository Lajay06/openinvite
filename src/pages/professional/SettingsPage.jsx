/**
 * src/pages/professional/SettingsPage.jsx
 *
 * THE WORKSPACE: its name, its plan, the trial, what the plan allows and what
 * is in use, changing plan, canceling, and an Agency's own branding.
 * goals/2026-10-14-professional.md, Pricing and item 12.
 *
 * Money moves only on Stripe's own pages (Checkout and the customer portal),
 * in the sandbox until the owner says otherwise. While the adapter runs, a
 * plan change here only changes the test data, and the page says so.
 */
import React, { useState } from 'react';
import { useProStore, update, CURRENT, STORE_LIVE } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { PLANS, PLAN_ORDER, TRIAL, limitsFor, usd, readOnlyEventIds, TALK_TO_US, CANCEL_READ_ONLY_DAYS } from '@/lib/professionalPlans';
import { daysToGo } from '@/lib/professionalEvents';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProPage, ProEmpty, Pill, Field, Stat } from '@/components/professional/ProPage';
import { s, PRO } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';
import { goToStripe } from '@/lib/professionalApi';

const DID_NOT_GO_THROUGH = 'That did not go through. Try again in a moment.';

export default function SettingsPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const [interval, setBillingInterval] = useState('monthly');
  const [name, setName] = useState(ws?.name || '');
  const [brand, setBrand] = useState(ws?.brand_name || '');
  const [note, setNote] = useState('');
  if (!ws) return <ProPage title="Settings"><ProEmpty title="No workspace yet" /></ProPage>;

  const billing = can(me, 'workspace.billing');
  const limits = limitsFor(ws.plan);
  const active = store.ProEvent.filter((e) => e.workspace_id === ws.id && e.status !== 'archived').length;
  const ro = readOnlyEventIds(store.ProEvent.filter((e) => e.workspace_id === ws.id), ws.plan, { canceled: ws.plan_status === 'canceled' });
  const seats = store.ProMember.filter((m) => m.workspace_id === ws.id && m.event_type !== 'remove').length;
  const trialLeft = ws.plan === 'trial' && ws.trial_ends_at ? Math.max(0, daysToGo(String(ws.trial_ends_at).slice(0, 10))) : null;
  const planName = ws.plan === 'trial' ? TRIAL.name : PLANS[ws.plan]?.name;

  const choose = async (plan) => {
    setNote('');
    if (!STORE_LIVE) {
      update('ProWorkspace', ws.id, { plan, plan_status: 'active', event_limit: PLANS[plan].events, seat_limit: PLANS[plan].seats === Infinity ? 9999 : PLANS[plan].seats });
      setNote(`Test data: the workspace is now on ${PLANS[plan].name}. In the live product this opens Stripe.`);
      return;
    }
    if (!(await goToStripe('/api/professional/subscribe', { workspace_id: ws.id, plan, interval }))) setNote(DID_NOT_GO_THROUGH);
  };
  const portal = async () => {
    if (!STORE_LIVE) { update('ProWorkspace', ws.id, { plan_status: 'canceled' }); setNote(`Test data: canceled. The workspace is read-only for ${CANCEL_READ_ONLY_DAYS} days, with export.`); return; }
    if (!(await goToStripe('/api/professional/billing-portal', { workspace_id: ws.id }))) setNote(DID_NOT_GO_THROUGH);
  };
  const saveBasics = (e) => {
    e.preventDefault();
    update('ProWorkspace', ws.id, { name: name.trim() || ws.name, ...(ws.plan === 'agency' ? { brand_name: brand.trim() } : {}) });
    setNote('Saved.');
  };

  return (
    <ProPage title="Settings" subtitle={ws.name}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Stat label="Plan" value={planName} sub={ws.plan_status === 'canceled' ? `Canceled: read-only for ${CANCEL_READ_ONLY_DAYS} days, export any time` : trialLeft !== null ? `${trialLeft} day${trialLeft === 1 ? '' : 's'} of the trial left` : 'Active'} />
        <Stat label="Active events" value={`${active} of ${limits.events}`} sub={ro.size ? `${ro.size} read-only` : 'All editable'} />
        <Stat label="Seats" value={`${seats} of ${limits.seats === Infinity ? 'unlimited' : limits.seats}`} />
      </div>
      {ro.size > 0 && ws.plan_status !== 'canceled' && (
        <p role="status" style={{ ...s.card, ...s.body, borderLeft: '3px solid #854d0e', margin: '0 0 16px' }}>
          You have more active events than your plan runs at once, so the newest {ro.size === 1 ? 'one is' : `${ro.size} are`} read-only until a slot frees. Nothing has been deleted. Archive an event or change plan.
        </p>
      )}

      {billing && (
        <section aria-labelledby="plans-h" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h2 id="plans-h" style={{ ...s.cardTitle, flex: 1 }}>Plans</h2>
            <FilterPill label="Monthly" active={interval === 'monthly'} onClick={() => setBillingInterval('monthly')} />
            <FilterPill label="Yearly, 2 months free" active={interval === 'yearly'} onClick={() => setBillingInterval('yearly')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {PLAN_ORDER.map((k) => {
              const p = PLANS[k];
              const current = ws.plan === k && ws.plan_status !== 'canceled';
              return (
                <div key={k} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 6, borderColor: current ? PRO.text : PRO.border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: TYPE.input, fontWeight: 700 }}>{p.name}</span>{current && <Pill tone="good">Your plan</Pill>}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{usd(interval === 'monthly' ? p.monthly : p.yearly)}<span style={s.secondary}>{interval === 'monthly' ? ' a month' : ' a year'}</span></div>
                  <div style={s.secondary}>{p.events} active events, {p.seats === Infinity ? 'unlimited seats' : `${p.seats} seat${p.seats === 1 ? '' : 's'}`}{p.branding ? ', your own branding' : ''}</div>
                  {!current && <button type="button" style={{ ...s.btnPrimary, alignSelf: 'flex-start', marginTop: 6 }} onClick={() => choose(k)}>Choose {p.name}</button>}
                </div>
              );
            })}
          </div>
          <p style={{ ...s.secondary, marginTop: 8 }}>{TALK_TO_US} A plan change never deletes anything. Prices in US dollars.</p>
          {ws.plan !== 'trial' && ws.plan_status !== 'canceled' && <button type="button" style={s.btnSecondary} onClick={portal}>Card, invoices or cancel</button>}
        </section>
      )}

      <form onSubmit={saveBasics} style={{ ...s.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' }}>
        <h2 style={{ ...s.cardTitle, gridColumn: '1 / -1' }}>Workspace</h2>
        <Field label="Business name"><input style={s.input} value={name} onChange={(e) => setName(e.target.value)} disabled={!billing} /></Field>
        {ws.plan === 'agency'
          ? <Field label="Your brand on vendor sheets, forms and the couple invite" hint="Openinvite stays in the footer"><input style={s.input} value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!billing} /></Field>
          : <span style={s.secondary}>Agency adds your own branding to vendor sheets, questionnaires and the couple invite.</span>}
        {billing && <button type="submit" style={{ ...s.btnPrimary, justifySelf: 'start' }}>Save</button>}
      </form>
      {note && <p role="status" style={{ ...s.secondary, marginTop: 12 }}>{note}</p>}
    </ProPage>
  );
}
