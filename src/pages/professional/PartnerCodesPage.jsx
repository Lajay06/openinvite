/**
 * src/pages/professional/PartnerCodesPage.jsx
 *
 * PARTNER CODES: the workspace's codes, their uses, and pending and earned
 * credit. A couple is never named: "a couple, Ultra, 3 Nov".
 */
import React, { useState } from 'react';
import { useProStore, create, update, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { partnerRows, partnerTotals, isValidCode, isCodeFree, normalizeCode, codeLimit, suggestCode, MONTHLY_CAP_USD, REFUND_WINDOW_DAYS } from '@/lib/professionalCodes';
import { money } from '@/lib/professionalMoney';
import { ProPage, ProTable, Pill, Stat, Field, ProEmpty } from '@/components/professional/ProPage';
import { downloadCsv } from '@/components/professional/proExport';
import { s } from '@/components/professional/proTheme';

export default function PartnerCodesPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const [form, setForm] = useState({ code: '', label: '' });
  const [note, setNote] = useState('');
  if (!can(me, 'workspace.codes')) {
    return <ProPage title="Partner codes"><ProEmpty title="Partner codes belong to the workspace owner" line="Ask the owner if you need a code to give a couple." /></ProPage>;
  }
  const codes = store.PartnerCode.filter((c) => c.workspace_id === CURRENT.workspaceId);
  const ids = new Set(codes.map((c) => c.id));
  const rewards = store.PartnerReward.filter((r) => ids.has(r.code_id));
  const rows = partnerRows(rewards, codes);
  const t = partnerTotals(rewards);
  const active = codes.filter((c) => c.status === 'active');
  const limit = codeLimit(ws?.plan);
  const uses = (c) => rewards.filter((r) => r.code_id === c.id && r.status !== 'canceled').length;

  const add = (e) => {
    e.preventDefault();
    const code = normalizeCode(form.code || suggestCode(ws?.name, store.PartnerCode.map((c) => c.code)));
    if (!isValidCode(code)) { setNote('Use 4 to 16 letters and numbers.'); return; }
    if (!isCodeFree(code, store.PartnerCode)) { setNote(`${code} is taken. Try another.`); return; }
    if (active.length >= limit) { setNote(limit === 1 ? 'Your plan has one code. Team and Agency can make up to 10.' : 'You have 10 codes, the most a workspace can hold. Turn one off first.'); return; }
    create('PartnerCode', { workspace_id: CURRENT.workspaceId, code, label: form.label.trim(), status: 'active', is_test: true });
    setForm({ code: '', label: '' });
    setNote(`${code} is ready. Couples who use it save 10% on Pro or Ultra.`);
  };
  const csv = () => downloadCsv('partner-credit.csv', ['Date', 'Who', 'Plan', 'Code', 'Credit', 'Status'], rows.map((r) => [r.date, r.who, r.plan, r.code, r.amount, r.status]));

  return (
    <ProPage title="Partner codes" subtitle="Your couples save 10%. You earn credit.">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Stat label="Couples who used a code" value={t.uses} />
        <Stat label="Pending credit" value={money(t.pending)} sub={`Clears ${REFUND_WINDOW_DAYS} days after the purchase`} />
        <Stat label="Earned credit" value={money(t.earned)} sub="Goes on your next bill" />
        <Stat label="Credited so far" value={money(t.credited)} />
      </div>

      <ProTable
        label="Your codes"
        rows={codes}
        empty="No codes yet."
        columns={[
          { key: 'code', label: 'Code', render: (c) => <span style={{ fontWeight: 600 }}>{c.code}</span> },
          { key: 'label', label: 'Name', render: (c) => c.label || '' },
          { key: 'uses', label: 'Uses', align: 'right', render: uses },
          { key: 'status', label: 'Status', render: (c) => (c.status === 'active' ? <Pill tone="good">On</Pill> : <Pill>Off</Pill>) },
          { key: 'x', label: '', render: (c) => <button type="button" style={s.btnQuiet} onClick={() => update('PartnerCode', c.id, { status: c.status === 'active' ? 'revoked' : 'active' })}>{c.status === 'active' ? 'Turn off' : 'Turn on'}</button> },
        ]}
      />

      <form onSubmit={add} style={{ ...s.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end', margin: '16px 0' }}>
        <Field label="New code" hint="Letters and numbers; leave blank and we'll suggest one"><input style={s.input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={suggestCode(ws?.name, store.PartnerCode.map((c) => c.code))} /></Field>
        <Field label="Name it" hint="For you, for example Instagram"><input style={s.input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></Field>
        <button type="submit" style={s.btnPrimary}>Make a code</button>
        {note && <p role="status" style={{ ...s.secondary, gridColumn: '1 / -1', margin: 0 }}>{note}</p>}
      </form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <h2 style={s.cardTitle}>Credit</h2>
        <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
      </div>
      <ProTable
        label="Credit from partner codes"
        rows={rows.map((r, i) => ({ ...r, id: i }))}
        empty="No couples have used a code yet."
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'who', label: 'Who', render: (r) => `${r.who}, ${r.plan}` },
          { key: 'code', label: 'Code' },
          { key: 'amount', label: 'Credit', align: 'right', render: (r) => money(r.amount) },
          { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Earned' || r.status === 'Credited' ? 'good' : r.status === 'Canceled' ? 'plain' : 'wait'}>{r.status}</Pill> },
        ]}
      />
      <p style={{ ...s.secondary, marginTop: 12, lineHeight: 1.5 }}>
        Each couple who buys with your code saves 10%, and you earn {money(20)} for Pro or {money(50)} for Ultra as credit on your Professional bill. Credit is pending for {REFUND_WINDOW_DAYS} days in case of a refund, then earned. One reward per couple; codes don&apos;t combine with a gift; your own purchases and your team&apos;s don&apos;t count. Up to {money(MONTHLY_CAP_USD)} of credit a month.
      </p>
    </ProPage>
  );
}
