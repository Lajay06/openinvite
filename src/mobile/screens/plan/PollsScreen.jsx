import React, { useState } from 'react';
import { BarChart2, Plus } from 'lucide-react';
import Screen from '../../shell/Screen';
import { RowGroup, EmptyState, ErrorState, SkeletonRows, ProgressBar, StatusPill, PillButton, BottomSheet, TextField } from '../../ui';

/**
 * Polls: each poll with its options and vote counts. Create a poll, end a
 * poll. Polls live on WeddingDetails.polls, as Polls.jsx keeps them.
 */
export default function PollsScreen({ polls = [], votes = [], onCreate, onEnd, loading, error, onRetry, back }) {
  const [sheet, setSheet] = useState(false);
  const [title, setTitle] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const countFor = (poll, optionId) => votes.filter((v) => v.poll_id === poll.id && v.option_id === optionId).length + (poll.options?.find((o) => o.id === optionId)?.votes || 0);
  const create = async () => {
    const clean = opts.map((o) => o.trim()).filter(Boolean);
    if (!title.trim()) { setErr('Give the poll a question.'); return; }
    if (clean.length < 2) { setErr('Add at least two options.'); return; }
    setSaving(true); setErr('');
    try { await onCreate({ title: title.trim(), options: clean }); setSheet(false); setTitle(''); setOpts(['', '']); } catch (e) { setErr(e?.message || 'Could not create the poll.'); } finally { setSaving(false); }
  };
  const live = polls.filter((p) => p.isActive !== false);
  const ended = polls.filter((p) => p.isActive === false);
  return (
    <Screen title="Polls & games" subtitle={loading ? '' : `${live.length} live`} back={back} actions={[{ icon: Plus, label: 'New poll', onClick: () => setSheet(true) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : polls.length === 0 ? (
          <EmptyState icon={BarChart2} text="No polls yet. Ask your guests something and watch the answers come in." actionLabel="New poll" onAction={() => setSheet(true)} />
        ) : (
          [...live, ...ended].map((p) => {
            const total = (p.options || []).reduce((s, o) => s + countFor(p, o.id), 0);
            return (
              <div key={p.id} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div className="oi-m-body oi-m-strong" style={{ overflowWrap: 'anywhere' }}>{p.title}</div>
                  <StatusPill tone={p.isActive === false ? 'neutral' : 'ok'}>{p.isActive === false ? 'Ended' : 'Live'}</StatusPill>
                </div>
                {(p.options || []).map((o) => (
                  <div key={o.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{o.label}</span>
                      <span className="oi-m-meta">{countFor(p, o.id)}</span>
                    </div>
                    <ProgressBar value={countFor(p, o.id)} max={total || 1} />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="oi-m-meta">{total} vote{total === 1 ? '' : 's'}</span>
                  {p.isActive !== false && <PillButton variant="ghost" size="sm" onClick={() => onEnd(p)}>End poll</PillButton>}
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="New poll" footer={(
        <>
          <PillButton variant="secondary" onClick={() => setSheet(false)} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={create} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Create poll'}</PillButton>
        </>
      )}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextField label="Question" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Which song gets everyone dancing" error={err} />
          {opts.map((o, i) => <TextField key={i} label={`Option ${i + 1}`} value={o} onChange={(e) => setOpts((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />)}
          {opts.length < 6 && <PillButton variant="secondary" size="sm" onClick={() => setOpts((l) => [...l, ''])} style={{ alignSelf: 'flex-start' }}>Add an option</PillButton>}
        </div>
      </BottomSheet>
    </Screen>
  );
}
