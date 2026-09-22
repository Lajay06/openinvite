import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Wallet, AlertTriangle, Sparkles, RotateCcw } from 'lucide-react';
import { Row, RowGroup, StatCard, EmptyState, PillButton, StatusPill } from '../../ui';
import { money } from '../../lib/format';

/**
 * Budget forecasting on the phone (goal 8, item 7): BudgetForecasting.jsx
 * in full. The same benchmarks, flags, saving suggestions and projection
 * points as the desktop, computed the same way from the same expenses, and
 * the same InvokeLLM prompt and JSON schema for Ava's analysis (health
 * score, rationale, top risks, savings actions).
 *
 * What is drawn:
 *   the health panel, with Update my health (the desktop's Ask Ava /
 *     Refresh analysis) and, while Ava reads, a running bar that fills
 *     over about thirty seconds and completes when the answer lands;
 *   the remaining-balance projection graph (planned against actual),
 *     drawn as SVG on the app's tokens, the same points as the recharts area
 *     chart;
 *   budget used and the flag count;
 *   risk flags with budgeted, spent and benchmark figures;
 *   cost-saving opportunities with the saving;
 *   every category against the usual split.
 * Ask again re-runs the analysis; a failure says so and offers it again.
 */
/* BudgetForecasting.jsx's benchmarks, tips and category order, verbatim. */
export const BENCHMARKS = { venue: { pct: 0.31, label: 'Venue' }, catering: { pct: 0.29, label: 'Catering' }, photography: { pct: 0.10, label: 'Photography' }, flowers: { pct: 0.08, label: 'Flowers' }, music: { pct: 0.05, label: 'Music / Entertainment' }, attire: { pct: 0.07, label: 'Attire' }, transportation: { pct: 0.02, label: 'Transportation' }, decorations: { pct: 0.03, label: 'Decorations' }, rings: { pct: 0.02, label: 'Rings' }, beauty: { pct: 0.02, label: 'Beauty' }, stationery: { pct: 0.01, label: 'Stationery' }, honeymoon: { pct: 0.04, label: 'Honeymoon' }, miscellaneous: { pct: 0.02, label: 'Miscellaneous' } };
const TIPS = { catering: 'Opt for buffet or family-style service instead of plated; it saves 15 to 25 percent.', photography: 'Book a newer photographer building their portfolio for half the cost of established names.', flowers: 'Use greenery-heavy arrangements and seasonal blooms; that saves up to 40 percent.', venue: 'Consider off-peak dates (Fridays, Sundays) for 20 to 30 percent venue discounts.', attire: 'Sample sales, consignment boutiques, or trunk shows can cut costs by 30 to 50 percent.', music: 'A curated Spotify playlist with a good sound system can replace a live band.', decorations: 'DIY centerpieces and candles significantly reduce decoration costs.', transportation: 'Shuttle buses shared among guests are far cheaper than individual cars.', honeymoon: 'Traveling in shoulder season (May, September) cuts flights and hotels by about 30 percent.' };
const ORDER = ['venue', 'photography', 'catering', 'flowers', 'music', 'attire', 'beauty', 'decorations', 'transportation', 'stationery', 'rings', 'honeymoon', 'miscellaneous'];
const SHORT = { venue: 'Venue', photography: 'Photo', catering: 'Catering', flowers: 'Flowers', music: 'Music', attire: 'Attire', beauty: 'Beauty', decorations: 'Decor', transportation: 'Transport', stationery: 'Stationery', rings: 'Rings', honeymoon: 'Honeymoon', miscellaneous: 'Other' };

/** BudgetForecasting.jsx's prompt and schema, verbatim, so the phone asks exactly what the desktop asks. */
export function budgetAnalysisRequest(categoryData, stats) {
  const summary = Object.entries(categoryData).map(([category, d]) => ({ category, budgeted: d.budgeted, spent: d.spent, variance: d.spent - d.budgeted }));
  const prompt = `You are an expert wedding budget consultant. Analyze this couple's wedding budget data and provide actionable insights.\n\nBudget summary: Total budgeted $${stats.totalBudgeted}, Total spent $${stats.totalSpent}, Remaining $${stats.remaining}.\n\nCategory breakdown: ${JSON.stringify(summary)}\n\nIndustry benchmarks: Venue ~31%, Catering ~29%, Photography ~10%, Flowers ~8%, Music ~5%, Attire ~7%.\n\nProvide:\n1. Top 3 most urgent financial risks with specific dollar amounts\n2. Top 3 highest-ROI cost saving actions with estimated savings\n3. A brief overall financial health score (1-10) with one sentence rationale\n\nBe concise, specific, and use dollar figures.`;
  const response_json_schema = { type: 'object', properties: { health_score: { type: 'number' }, health_rationale: { type: 'string' }, risks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, urgency: { type: 'string' } } } }, savings_actions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, estimated_saving: { type: 'string' } } } } } };
  return { prompt, opts: { response_json_schema } };
}

/** The desktop's projection: the balance left as each category locks in, planned and actual. */
export function projectionPoints(categoryData, stats) {
  if (!stats.totalBudgeted) return [];
  let cumActual = 0; let cumBudgeted = 0;
  const points = [];
  ORDER.forEach((cat) => {
    const d = categoryData[cat]; if (!d) return;
    cumActual += d.spent; cumBudgeted += d.budgeted;
    points.push({ key: cat, name: SHORT[cat] || cat, actual: Math.max(0, stats.totalBudgeted - cumActual), planned: Math.max(0, stats.totalBudgeted - cumBudgeted) });
  });
  const unallocated = stats.totalBudgeted - Object.values(categoryData).reduce((s, d) => s + d.budgeted, 0);
  if (unallocated > 0) points.push({ key: 'end', name: 'End', actual: Math.max(0, stats.totalBudgeted - cumActual - unallocated * 0.9), planned: 0 });
  return [{ key: 'start', name: 'Start', actual: stats.totalBudgeted, planned: stats.totalBudgeted }, ...points];
}

/* The running bar: eases toward 90 percent over about thirty seconds, then completes when the answer lands. */
const RUN_MS = 30000;
const RUN_LINES = ['Reading your categories', 'Comparing with the usual split', 'Weighing what is already spent', 'Looking for the three biggest risks', 'Pricing the savings', 'Scoring your budget'];
function useRun(running) {
  const [pct, setPct] = useState(0);
  const [line, setLine] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (!running) { setPct((p) => (p > 0 ? 100 : 0)); const t = setTimeout(() => setPct(0), 700); return () => clearTimeout(t); }
    start.current = Date.now(); setPct(0); setLine(0);
    const id = setInterval(() => {
      const t = (Date.now() - start.current) / RUN_MS;
      setPct(Math.min(90, Math.round(90 * (1 - Math.exp(-2.2 * t)))));
      setLine(Math.min(RUN_LINES.length - 1, Math.floor(t * RUN_LINES.length)));
    }, 200);
    return () => clearInterval(id);
  }, [running]);
  return { pct, line: RUN_LINES[line] };
}

function ProjectionChart({ points, symbol, over }) {
  const W = 342; const H = 180; const padL = 8; const padR = 8; const padT = 12; const padB = 28;
  const max = Math.max(1, ...points.map((p) => Math.max(p.actual, p.planned)));
  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, points.length - 1);
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  const line = (k) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const area = (k) => `${line(k)} L${x(points.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${padL},${(H - padB).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1].map((f) => ({ v: max * f, y: y(max * f) }));
  const short = (v) => (v >= 1000 ? `${symbol}${Math.round(v / 1000)}k` : `${symbol}${Math.round(v)}`);
  // At most five labels along the bottom, so none overlap at 342px.
  const every = Math.max(1, Math.ceil((points.length - 1) / 4));
  return (
    <div className="oi-m-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Remaining balance, planned and actual, as each category locks in">
        {ticks.map((t) => <line key={t.v} x1={padL} x2={W - padR} y1={t.y} y2={t.y} className="oi-m-chart__grid" />)}
        {ticks.map((t) => <text key={`t${t.v}`} x={W - padR} y={t.y - 3} textAnchor="end" className="oi-m-chart__tick">{short(t.v)}</text>)}
        <path d={area('planned')} className="oi-m-chart__area oi-m-chart__area--planned" />
        <path d={area('actual')} className="oi-m-chart__area oi-m-chart__area--actual" />
        <path d={line('planned')} className="oi-m-chart__line oi-m-chart__line--planned" />
        <path d={line('actual')} className="oi-m-chart__line oi-m-chart__line--actual" />
        {points.map((p, i) => <circle key={p.key} cx={x(i)} cy={y(p.actual)} r={3} className="oi-m-chart__dot" />)}
        {points.map((p, i) => (i === 0 || i === points.length - 1 || (i % every === 0 && i < points.length - 2)) && <text key={`l${p.key}`} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="oi-m-chart__tick">{p.name}</text>)}
      </svg>
      <div className="oi-m-chart__legend"><span><i className="oi-m-chart__swatch oi-m-chart__swatch--planned" />Planned</span><span><i className="oi-m-chart__swatch oi-m-chart__swatch--actual" />Actual</span>{over && <StatusPill tone="no">Over budget</StatusPill>}</div>
    </div>
  );
}

export default function BudgetForecast({ items, stats, symbol, onAsk }) {
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [showAll, setShowAll] = useState(false);
  const run = useRun(busy);
  const fmt = (n) => money(n, symbol);
  const categoryData = useMemo(() => { const m = {}; items.forEach((i) => { const c = i.category || 'miscellaneous'; if (!m[c]) m[c] = { budgeted: 0, spent: 0, count: 0 }; m[c].budgeted += i.budgeted_amount || 0; m[c].spent += i.actual_amount || 0; m[c].count++; }); return m; }, [items]);
  const flags = useMemo(() => Object.entries(categoryData).flatMap(([cat, d]) => {
    const b = BENCHMARKS[cat]; if (!b || stats.totalBudgeted === 0) return [];
    const amt = b.pct * stats.totalBudgeted;
    const overBudget = d.spent > d.budgeted && d.budgeted > 0;
    const overBench = d.budgeted > amt * 1.3;
    const severity = overBudget ? 'high' : overBench ? 'medium' : null;
    return severity ? [{ cat, label: b.label, severity, spent: d.spent, budgeted: d.budgeted, benchmark: amt, tip: overBudget ? `Actual spend exceeds budget by ${fmt(d.spent - d.budgeted)}. Consider renegotiating with your vendor.` : `Your planned spend is ${fmt(d.budgeted - amt)} above the typical allocation (${fmt(amt)}).` }] : [];
  }).sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0)), [categoryData, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => Object.entries(categoryData).flatMap(([cat, d]) => { const b = BENCHMARKS[cat]; if (!b || stats.totalBudgeted === 0) return []; const amt = b.pct * stats.totalBudgeted; if (d.budgeted <= amt * 1.2) return []; const savings = d.budgeted - amt; return [{ cat, label: b.label, savings, tip: TIPS[cat] || `Reducing ${b.label} to industry norms could save you ${fmt(savings)}.` }]; }).sort((a, b) => b.savings - a.savings).slice(0, 5), [categoryData, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  const points = useMemo(() => projectionPoints(categoryData, stats), [categoryData, stats]);

  const ask = async () => {
    if (busy) return;
    setBusy(true); setFailed('');
    try {
      const { prompt, opts } = budgetAnalysisRequest(categoryData, stats);
      const r = await onAsk(prompt, opts);
      if (!r || typeof r !== 'object' || r.health_score == null) throw new Error('Ava did not return a score.');
      setAi(r);
    } catch (e) { setFailed(e?.message || 'Ava could not look at the budget just now.'); } finally { setBusy(false); }
  };

  if (items.length === 0) return <EmptyState icon={Wallet} text="Add a few expenses and the forecast shows what is over, what could save you money, and what Ava thinks." />;
  const shown = showAll ? flags : flags.slice(0, 3);
  return (
    <>
      {/* The health panel: the score when Ava has read the numbers, the run while she does, the ask before. */}
      <div className="oi-m-panel oi-m-panel--ink oi-m-health" aria-busy={busy}>
        <span className="oi-m-meta oi-m-health__label"><span aria-hidden="true">✦</span> From Ava</span>
        {busy ? (
          <>
            <div className="oi-m-body oi-m-strong">Reading the numbers</div>
            <div className="oi-m-progress oi-m-progress--on-dark" style={{ marginTop: 12 }}><div className="oi-m-progress__fill" style={{ width: `${run.pct}%`, background: '#FFFFFF', transition: 'width 400ms linear' }} /></div>
            <div className="oi-m-meta oi-m-health__line" aria-live="polite">{run.line}. About thirty seconds.</div>
          </>
        ) : ai ? (
          <>
            <div className="oi-m-health__score"><span className="oi-m-hero-num">{ai.health_score}</span><span className="oi-m-body oi-m-health__of"> of 10</span></div>
            <div className="oi-m-meta oi-m-health__label">Health score</div>
            {ai.health_rationale && <p className="oi-m-body oi-m-health__why">{ai.health_rationale}</p>}
            <PillButton variant="light" size="sm" icon={RotateCcw} onClick={ask} style={{ alignSelf: 'flex-start', marginTop: 12 }}>Update my health</PillButton>
          </>
        ) : (
          <>
            <div className="oi-m-body oi-m-strong">Your budget's health</div>
            <p className="oi-m-body oi-m-health__why">Ava reads the numbers and gives a score out of 10, the three biggest risks and the three best savings.</p>
            {failed && <p className="oi-m-meta oi-m-health__fail" role="alert">{failed} Try again.</p>}
            <PillButton variant="light" size="sm" icon={Sparkles} onClick={ask} style={{ alignSelf: 'flex-start', marginTop: 12 }}>{failed ? 'Try again' : 'Update my health'}</PillButton>
          </>
        )}
      </div>

      {ai && !busy && (
        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Top risks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(ai.risks || []).map((r, i) => <div key={i} className="oi-m-card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{r.title}</span>{r.urgency && <StatusPill tone="warn">{r.urgency}</StatusPill>}</div><p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{r.detail}</p></div>)}
          </div>
          <h2 className="oi-m-section" style={{ margin: '24px 0 12px' }}>Savings actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(ai.savings_actions || []).map((a, i) => <div key={i} className="oi-m-card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body">{a.action}</span>{a.estimated_saving && <span className="oi-m-body oi-m-strong" style={{ flexShrink: 0 }}>{a.estimated_saving}</span>}</div></div>)}
          </div>
          {failed && <p className="oi-m-meta" role="alert" style={{ marginTop: 12 }}>{failed}</p>}
          <PillButton variant="secondary" size="sm" icon={RotateCcw} onClick={ask} disabled={busy} style={{ marginTop: 12 }}>Ask again</PillButton>
        </section>
      )}

      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 4 }}>Remaining balance projection</h2>
        <p className="oi-m-meta" style={{ marginBottom: 12 }}>How your budget depletes as each category is locked in.</p>
        <div className="oi-m-card"><ProjectionChart points={points} symbol={symbol} over={stats.remaining < 0} /></div>
      </section>

      <div className="oi-m-grid2">
        <StatCard icon={Wallet} label="Budget used" number={`${Math.round(stats.percentageUsed)}%`} />
        <StatCard icon={AlertTriangle} label="Flags" numeric={flags.length} ink />
      </div>

      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 4 }}>Risk flags</h2>
        <p className="oi-m-meta" style={{ marginBottom: 12 }}>Against the usual split and your own budget.</p>
        {flags.length === 0 ? <div className="oi-m-card"><p className="oi-m-body">Nothing is over budget or well above the usual split. Keep going.</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.map((f) => (
              <div key={f.cat} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{f.label}</span><StatusPill tone={f.severity === 'high' ? 'no' : 'warn'}>{f.severity === 'high' ? 'Over budget' : 'Above benchmark'}</StatusPill></div>
                <p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{f.tip}</p>
                <div className="oi-m-meta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><span>Budgeted <span className="oi-m-strong" style={{ color: 'var(--m-text)' }}>{fmt(f.budgeted)}</span></span>{f.spent > 0 && <span>Spent <span className="oi-m-strong" style={{ color: 'var(--m-text)' }}>{fmt(f.spent)}</span></span>}<span>Benchmark <span className="oi-m-strong" style={{ color: 'var(--m-text)' }}>{fmt(f.benchmark)}</span></span></div>
              </div>
            ))}
            {flags.length > 3 && <PillButton variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: 'flex-start' }}>{showAll ? 'Show fewer' : `Show ${flags.length - 3} more`}</PillButton>}
          </div>
        )}
      </section>

      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 4 }}>Cost-saving opportunities</h2>
        <p className="oi-m-meta" style={{ marginBottom: 12 }}>Based on your spending priorities.</p>
        {suggestions.length === 0 ? <div className="oi-m-card"><p className="oi-m-body">Your allocations look well balanced.</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map((x) => <div key={x.cat} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{x.label}</span><span className="oi-m-body oi-m-strong">Save about {fmt(x.savings)}</span></div><p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{x.tip}</p></div>)}
          </div>
        )}
      </section>

      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Against the usual split</h2>
        <RowGroup>
          {Object.entries(BENCHMARKS).filter(([k]) => categoryData[k]).map(([k, b]) => { const d = categoryData[k]; const amt = b.pct * stats.totalBudgeted; return <Row key={k} label={b.label} sub={`Usually about ${Math.round(b.pct * 100)}%, ${fmt(amt)}`} value={fmt(d.budgeted)} trailing={d.budgeted > amt * 1.3 ? <StatusPill tone="warn">High</StatusPill> : undefined} />; })}
        </RowGroup>
      </section>
    </>
  );
}
