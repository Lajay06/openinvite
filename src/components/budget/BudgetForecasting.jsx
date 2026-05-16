import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { AlertTriangle, Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BENCHMARKS = {
  venue:          { pct: 0.31, label: 'Venue' },
  catering:       { pct: 0.29, label: 'Catering' },
  photography:    { pct: 0.10, label: 'Photography' },
  flowers:        { pct: 0.08, label: 'Flowers' },
  music:          { pct: 0.05, label: 'Music / Entertainment' },
  attire:         { pct: 0.07, label: 'Attire' },
  transportation: { pct: 0.02, label: 'Transportation' },
  decorations:    { pct: 0.03, label: 'Decorations' },
  rings:          { pct: 0.02, label: 'Rings' },
  beauty:         { pct: 0.02, label: 'Beauty' },
  stationery:     { pct: 0.01, label: 'Stationery' },
  honeymoon:      { pct: 0.04, label: 'Honeymoon' },
  miscellaneous:  { pct: 0.02, label: 'Miscellaneous' },
};

const fmt = n => `$${Math.round(n).toLocaleString()}`;

const bodyFont = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const labelStyle = {
  color: 'rgba(10,10,10,0.4)', ...bodyFont, margin: 0,
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', ...bodyFont }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 600, color: p.stroke, margin: '2px 0' }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function BudgetForecasting({ budgetItems, stats }) {
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAllFlags, setShowAllFlags] = useState(false);

  const categoryData = useMemo(() => {
    const map = {};
    budgetItems.forEach(item => {
      const cat = item.category || 'miscellaneous';
      if (!map[cat]) map[cat] = { budgeted: 0, spent: 0, count: 0 };
      map[cat].budgeted += item.budgeted_amount || 0;
      map[cat].spent += item.actual_amount || 0;
      map[cat].count++;
    });
    return map;
  }, [budgetItems]);

  const flags = useMemo(() => {
    const result = [];
    Object.entries(categoryData).forEach(([cat, data]) => {
      const benchmark = BENCHMARKS[cat];
      if (!benchmark || stats.totalBudgeted === 0) return;
      const benchmarkAmt = benchmark.pct * stats.totalBudgeted;
      const overBudget = data.spent > data.budgeted && data.budgeted > 0;
      const overBenchmark = data.budgeted > benchmarkAmt * 1.3;
      const severity = overBudget ? 'high' : overBenchmark ? 'medium' : null;
      if (severity) {
        result.push({
          cat, label: benchmark.label, severity,
          spent: data.spent, budgeted: data.budgeted, benchmark: benchmarkAmt,
          overBy: overBudget ? data.spent - data.budgeted : data.budgeted - benchmarkAmt,
          tip: overBudget
            ? `Actual spend exceeds budget by ${fmt(data.spent - data.budgeted)}. Consider renegotiating with your vendor.`
            : `Your planned spend is ${fmt(data.budgeted - benchmarkAmt)} above the typical industry allocation (${fmt(benchmarkAmt)}).`,
        });
      }
    });
    return result.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0));
  }, [categoryData, stats]);

  const savingSuggestions = useMemo(() => {
    const suggestions = [];
    Object.entries(categoryData).forEach(([cat, data]) => {
      const benchmark = BENCHMARKS[cat];
      if (!benchmark || stats.totalBudgeted === 0) return;
      const benchmarkAmt = benchmark.pct * stats.totalBudgeted;
      if (data.budgeted > benchmarkAmt * 1.2) {
        const savings = data.budgeted - benchmarkAmt;
        const tips = {
          catering:      'Opt for buffet or family-style service instead of plated — saves 15–25%.',
          photography:   'Book a newer photographer building their portfolio for half the cost of established names.',
          flowers:       'Use greenery-heavy arrangements and seasonal blooms — saves up to 40%.',
          venue:         'Consider off-peak dates (Fridays, Sundays) for 20–30% venue discounts.',
          attire:        'Sample sales, consignment boutiques, or trunk shows can cut costs by 30–50%.',
          music:         'A curated Spotify playlist with a good sound system can replace a live band.',
          decorations:   'DIY centrepieces and candles significantly reduce decoration costs.',
          transportation:'Shuttle buses shared among guests are far cheaper than individual cars.',
          honeymoon:     'Travelling in shoulder season (May, September) cuts flights and hotels by ~30%.',
        };
        suggestions.push({
          cat, label: benchmark.label, potentialSavings: savings,
          tip: tips[cat] || `Reducing ${benchmark.label} to industry norms could save you ${fmt(savings)}.`,
        });
      }
    });
    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 5);
  }, [categoryData, stats]);

  const projectionData = useMemo(() => {
    if (stats.totalBudgeted === 0) return [];
    const ORDER = ['venue','photography','catering','flowers','music','attire','beauty','decorations','transportation','stationery','rings','honeymoon','miscellaneous'];
    let cumActual = 0, cumBudgeted = 0;
    const points = [];
    ORDER.forEach(cat => {
      const data = categoryData[cat];
      if (!data) return;
      cumActual += data.spent;
      cumBudgeted += data.budgeted;
      points.push({
        name: BENCHMARKS[cat]?.label || cat,
        actual: Math.max(0, stats.totalBudgeted - cumActual),
        planned: Math.max(0, stats.totalBudgeted - cumBudgeted),
      });
    });
    const unallocated = stats.totalBudgeted - Object.values(categoryData).reduce((s, d) => s + d.budgeted, 0);
    if (unallocated > 0) {
      points.push({ name: 'Projected end', actual: Math.max(0, stats.totalBudgeted - cumActual - unallocated * 0.9), planned: 0 });
    }
    return [{ name: 'Start', actual: stats.totalBudgeted, planned: stats.totalBudgeted }, ...points];
  }, [categoryData, stats]);

  const runAIAnalysis = async () => {
    setLoadingAI(true);
    const summary = Object.entries(categoryData).map(([cat, d]) => ({
      category: cat, budgeted: d.budgeted, spent: d.spent, variance: d.spent - d.budgeted,
    }));
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert wedding budget consultant. Analyze this couple's wedding budget data and provide actionable insights.

Budget summary: Total budgeted $${stats.totalBudgeted}, Total spent $${stats.totalSpent}, Remaining $${stats.remaining}.

Category breakdown: ${JSON.stringify(summary)}

Industry benchmarks: Venue ~31%, Catering ~29%, Photography ~10%, Flowers ~8%, Music ~5%, Attire ~7%.

Provide:
1. Top 3 most urgent financial risks with specific dollar amounts
2. Top 3 highest-ROI cost saving actions with estimated savings
3. A brief overall financial health score (1-10) with one sentence rationale

Be concise, specific, and use dollar figures.`,
      response_json_schema: {
        type: 'object',
        properties: {
          health_score: { type: 'number' },
          health_rationale: { type: 'string' },
          risks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, urgency: { type: 'string' } } } },
          savings_actions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, estimated_saving: { type: 'string' } } } },
        },
      },
    });
    setAiInsights(result);
    setLoadingAI(false);
  };

  const visibleFlags = showAllFlags ? flags : flags.slice(0, 3);

  if (budgetItems.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <Info size={24} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: '#444444', ...bodyFont, margin: '0 0 4px' }}>No budget data yet</p>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', ...bodyFont, margin: 0 }}>Add expenses first to see forecasting analysis</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Ask Ava strip ──────────────────────────────────────────────────── */}
      <div style={{ background: '#0A1930', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px', ...bodyFont }}>
            AI budget analysis
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, ...bodyFont }}>
            Personalised risk flags, savings opportunities and financial health score
          </p>
        </div>
        <button
          onClick={runAIAnalysis}
          disabled={loadingAI}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 999,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF',
            fontSize: 13, fontWeight: 600, cursor: loadingAI ? 'default' : 'pointer',
            transition: 'background 0.2s, transform 0.2s', ...bodyFont,
            opacity: loadingAI ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loadingAI) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        >
          {loadingAI
            ? <><Loader2 size={14} className="animate-spin" />Analysing…</>
            : <><Sparkles size={14} />{aiInsights ? 'Refresh analysis' : 'Ask Ava'}</>
          }
        </button>
      </div>

      {/* ── AI results ─────────────────────────────────────────────────────── */}
      {aiInsights && !loadingAI && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24 }}>
          {/* Health score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: '#F5F5F5', marginBottom: 20 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1, ...bodyFont }}>
                {aiInsights.health_score}<span style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)' }}>/10</span>
              </p>
              <p style={{ ...labelStyle, marginTop: 4 }}>health</p>
            </div>
            <p style={{ fontSize: 13, color: '#444444', margin: 0, ...bodyFont, lineHeight: 1.5 }}>
              {aiInsights.health_rationale}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Risks */}
            <div>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Top risks</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {aiInsights.risks?.map((risk, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #E03553', background: 'rgba(224,53,83,0.06)', padding: '10px 14px', marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 3px', ...bodyFont }}>{risk.title}</p>
                    <p style={{ fontSize: 11, color: '#444444', margin: 0, ...bodyFont, lineHeight: 1.5 }}>{risk.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings actions */}
            <div>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Savings actions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {aiInsights.savings_actions?.map((action, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #DDF762', background: 'rgba(221,247,98,0.1)', padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <p style={{ fontSize: 11, color: '#444444', margin: 0, ...bodyFont, lineHeight: 1.5, flex: 1 }}>{action.action}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7700', ...bodyFont, whiteSpace: 'nowrap' }}>{action.estimated_saving}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance projection chart ───────────────────────────────────────── */}
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', ...bodyFont }}>
          Remaining balance projection
        </p>
        <p style={{ fontSize: 12, color: '#444444', margin: '0 0 20px', ...bodyFont }}>
          How your budget depletes as spending categories are locked in
        </p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#803D81" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#803D81" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E03553" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E03553" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 9, fill: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif", paddingTop: 8 }}
              />
              {stats.remaining < 0 && (
                <ReferenceLine y={0} stroke="#E03553" strokeDasharray="4 2"
                  label={{ value: 'Over budget', fill: '#E03553', fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
              )}
              <Area
                type="monotone" dataKey="planned" name="Planned"
                stroke="#803D81" strokeWidth={1.5}
                fill="url(#gradPlanned)"
                dot={false}
                isAnimationActive={true} animationBegin={0} animationDuration={1000}
              />
              <Area
                type="monotone" dataKey="actual" name="Actual"
                stroke="#E03553" strokeWidth={2}
                fill="url(#gradActual)"
                dot={{ r: 3, fill: '#E03553', strokeWidth: 0 }}
                isAnimationActive={true} animationBegin={200} animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Risk flags + cost savings ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Risk flags */}
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', ...bodyFont }}>Risk flags</p>
              <p style={{ fontSize: 11, color: '#444444', margin: 0, ...bodyFont }}>vs. industry benchmarks & your budget</p>
            </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: flags.length > 0 ? 'rgba(224,53,83,0.1)' : 'rgba(107,119,0,0.1)', color: flags.length > 0 ? '#E03553' : '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {flags.length} flagged
              </span>
          </div>

          {flags.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
              <CheckCircle2 size={16} style={{ color: '#6b7700', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#444444', margin: 0, ...bodyFont }}>No risk flags — your budget looks healthy!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {visibleFlags.map(flag => (
                <div
                  key={flag.cat}
                  style={{
                    width: '100%', padding: '12px 14px', marginBottom: 6,
                    borderLeft: `3px solid ${flag.severity === 'high' ? '#E03553' : '#DDF762'}`,
                    background: flag.severity === 'high' ? 'rgba(224,53,83,0.06)' : 'rgba(221,247,98,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', ...bodyFont }}>{flag.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: flag.severity === 'high' ? 'rgba(224,53,83,0.1)' : 'rgba(221,247,98,0.15)', color: flag.severity === 'high' ? '#E03553' : '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 3 }}>
                        <AlertTriangle size={10} />
                        {flag.severity === 'high' ? 'Over budget' : 'Above benchmark'}
                      </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#444444', margin: '0 0 6px', ...bodyFont, lineHeight: 1.5 }}>{flag.tip}</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { l: 'Budgeted', v: fmt(flag.budgeted) },
                      ...(flag.spent > 0 ? [{ l: 'Spent', v: fmt(flag.spent) }] : []),
                      { l: 'Benchmark', v: fmt(flag.benchmark) },
                    ].map(({ l, v }) => (
                      <span key={l} style={{ fontSize: 10, color: 'rgba(10,10,10,0.5)', ...bodyFont }}>
                        {l}: <strong style={{ color: '#0A0A0A' }}>{v}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {flags.length > 3 && (
                <button
                  onClick={() => setShowAllFlags(!showAllFlags)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#444444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', ...bodyFont, fontWeight: 600 }}
                >
                  {showAllFlags ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showAllFlags ? 'Show less' : `Show ${flags.length - 3} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cost-saving suggestions */}
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', ...bodyFont }}>
            Cost-saving opportunities
          </p>
          <p style={{ fontSize: 11, color: '#444444', margin: '0 0 16px', ...bodyFont }}>
            Based on your spending priorities
          </p>
          {savingSuggestions.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
              <CheckCircle2 size={16} style={{ color: '#6b7700', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#444444', margin: 0, ...bodyFont }}>Your allocations look well-optimised!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {savingSuggestions.map(s => (
                <div key={s.cat} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                  <div style={{ width: 3, background: '#803D81', flexShrink: 0, alignSelf: 'stretch' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', ...bodyFont }}>{s.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7700', ...bodyFont }}>Save ~{fmt(s.potentialSavings)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#444444', margin: 0, ...bodyFont, lineHeight: 1.5 }}>{s.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
