import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";

const PJS = "'Plus Jakarta Sans', sans-serif";

// ── Consideration items ────────────────────────────────────────────────────

const CULTURAL_BASE = [
  { id: 'c-comm', text: 'Communicate the ceremony format to guests in advance' },
  { id: 'c-prog', text: 'Design an order of service or ceremony program for guests' },
];

const CULTURAL_BY_STYLE = {
  'Christian': [
    { id: 'chr-book', text: 'Book the church 6–12 months ahead — popular dates fill fast' },
    { id: 'chr-prep', text: 'Check if a pre-marriage preparation course is required' },
    { id: 'chr-read', text: 'Select readings and music within church guidelines' },
    { id: 'chr-unity', text: 'Consider a unity candle or sand ceremony moment' },
    { id: 'chr-photo', text: 'Check photographer restrictions during the ceremony' },
    { id: 'chr-comm', text: 'Plan for communion — consider non-Catholic or non-Christian guests' },
  ],
  'Catholic': [
    { id: 'cat-book', text: 'Book the church 6–12 months ahead — popular dates fill fast' },
    { id: 'cat-prep', text: 'Check if a pre-marriage preparation course is required' },
    { id: 'cat-read', text: 'Select readings and music within church guidelines' },
    { id: 'cat-unity', text: 'Consider a unity candle or sand ceremony moment' },
    { id: 'cat-photo', text: 'Check photographer restrictions during the ceremony' },
    { id: 'cat-comm', text: 'Plan for communion — consider non-Catholic or non-Christian guests' },
  ],
  'Jewish': [
    { id: 'jew-ket', text: 'Arrange ketubah signing and witness requirements' },
    { id: 'jew-chup', text: 'Plan chuppah design and allow sufficient setup time' },
    { id: 'jew-shab', text: 'Check timing relative to Shabbat if relevant' },
    { id: 'jew-kos', text: 'Confirm kosher catering with your venue' },
    { id: 'jew-glass', text: 'Prepare for the breaking of the glass tradition' },
    { id: 'jew-seat', text: 'Consider separate seating if required by your tradition' },
  ],
  'Hindu': [
    { id: 'hin-mand', text: 'Plan mandap setup requirements and allow extra setup time' },
    { id: 'hin-pri', text: 'Book a priest 12+ months ahead — they book up quickly' },
    { id: 'hin-multi', text: 'Plan for multi-day ceremony logistics (accommodation, transport)' },
    { id: 'hin-meh', text: 'Schedule mehendi and sangeet events in the timeline' },
    { id: 'hin-att', text: 'Provide traditional attire guidance for guests if needed' },
    { id: 'hin-fire', text: 'Confirm fire ceremony safety requirements with the venue' },
  ],
  'Muslim': [
    { id: 'mus-nik', text: 'Confirm nikah ceremony requirements with your Imam' },
    { id: 'mus-hal', text: 'Confirm halal catering with every venue and caterer' },
    { id: 'mus-pray', text: 'Allow prayer times in the schedule if relevant' },
    { id: 'mus-seat', text: 'Plan separate seating arrangement if required' },
    { id: 'mus-dress', text: 'Communicate modest dress code to guests in advance' },
    { id: 'mus-wali', text: 'Confirm wali and witness requirements with your celebrant' },
  ],
  'Sikh': [
    { id: 'sik-ana', text: 'Book the Gurdwara for the Anand Karaj ceremony' },
    { id: 'sik-laa', text: 'Plan laavan (rounds) timing in the ceremony schedule' },
    { id: 'sik-lang', text: 'Coordinate langar (community meal) with the Gurdwara' },
    { id: 'sik-cov', text: 'Communicate head covering requirement to all guests' },
    { id: 'sik-alc', text: 'Ensure no alcohol is served inside the Gurdwara' },
    { id: 'sik-kir', text: 'Book kirtan musicians well ahead of your date' },
  ],
  'Buddhist': [
    { id: 'bud-tem', text: 'Check temple ceremony requirements and confirm availability' },
    { id: 'bud-monk', text: 'Book a monk or officiant well in advance' },
    { id: 'bud-off', text: 'Prepare traditional offerings for the ceremony' },
    { id: 'bud-med', text: 'Plan a meditation or blessing moment in the ceremony' },
  ],
  'Cultural Fusion': [
    { id: 'fus-blend', text: 'Plan how to blend two cultural traditions respectfully' },
    { id: 'fus-fam', text: 'Discuss family expectations early to avoid surprises' },
    { id: 'fus-ord', text: 'Decide the order and structure of combined ceremonies' },
    { id: 'fus-bil', text: 'Consider bilingual elements in your ceremony' },
    { id: 'fus-att', text: 'Coordinate attire across both cultural traditions' },
  ],
  'Civil': [
    { id: 'civ-cel', text: 'Research and book a licensed celebrant you connect with' },
    { id: 'civ-vows', text: 'Write personalised vows that reflect your relationship' },
    { id: 'civ-str', text: 'Design your ceremony structure — flexibility is your advantage' },
    { id: 'civ-rit', text: 'Choose symbolic rituals to personalise the ceremony' },
  ],
  'Non-religious': [
    { id: 'nor-cel', text: 'Research and book a licensed celebrant you connect with' },
    { id: 'nor-vows', text: 'Write personalised vows that reflect your relationship' },
    { id: 'nor-str', text: 'Design your ceremony structure — flexibility is your advantage' },
    { id: 'nor-rit', text: 'Choose symbolic rituals to personalise the ceremony' },
  ],
};

const LOGISTICS_ITEMS = [
  { id: 'log-acc', text: 'Check venue accessibility for elderly and disabled guests' },
  { id: 'log-park', text: 'Plan parking and transport options for guests' },
  { id: 'log-trans', text: 'Allow adequate transfer time between ceremony and reception' },
  { id: 'log-wet', text: 'Create a wet weather contingency plan' },
  { id: 'log-buf', text: 'Add 30-minute buffer for each major transition in the timeline' },
  { id: 'log-vend', text: 'Coordinate vendor arrival and setup schedule' },
  { id: 'log-coord', text: 'Decide on an on-the-day coordinator vs. DIY management' },
  { id: 'log-emerg', text: 'Create an emergency contact list for the wedding day' },
  { id: 'log-kit', text: 'Prepare a day-of emergency kit (safety pins, stain remover, painkillers)' },
];

const GUEST_EXP_ITEMS = [
  { id: 'gx-wbag', text: 'Prepare welcome bags or notes for out-of-town guests' },
  { id: 'gx-diet', text: 'Collect and manage dietary requirements for every guest' },
  { id: 'gx-kids', text: 'Plan entertainment, meals, and areas for children' },
  { id: 'gx-eld', text: 'Consider seating and access needs for elderly guests' },
  { id: 'gx-plus', text: 'Communicate your plus-one policy clearly' },
  { id: 'gx-rsvp', text: 'Set an RSVP deadline and follow-up plan for non-responses' },
  { id: 'gx-accom', text: 'Arrange accommodation block bookings for travelling guests' },
  { id: 'gx-info', text: 'Create a day-of information card (schedule, venue, parking)' },
  { id: 'gx-unp', text: 'Consider an unplugged ceremony — phones put away during vows' },
];

const LEGAL_ITEMS = [
  { id: 'leg-lic', text: 'Check marriage licence requirements in your country or state' },
  { id: 'leg-noim', text: 'File notice of intended marriage by the required deadline' },
  { id: 'leg-name', text: 'Research the legal name change process after the wedding' },
  { id: 'leg-os', text: 'If marrying overseas, check if the marriage is legally recognised' },
  { id: 'leg-pre', text: 'Consider whether a prenuptial agreement is right for you' },
  { id: 'leg-ins', text: 'Get wedding insurance — highly recommended for peace of mind' },
  { id: 'leg-con', text: 'Review all vendor contracts before signing' },
  { id: 'leg-venue', text: "Check your venue's insurance requirements" },
];

const BUDGET_ITEMS = [
  { id: 'bud-hid', text: 'Ask venues about hidden costs: service charges, cake cutting, corkage, overtime' },
  { id: 'bud-tip', text: 'Research tipping etiquette for each vendor type' },
  { id: 'bud-pay', text: 'Create a payment schedule to manage cash flow' },
  { id: 'bud-buf', text: 'Add a 10–15% contingency buffer to your total budget' },
  { id: 'bud-pri', text: 'Identify your top 3 priorities and protect that budget' },
  { id: 'bud-save', text: 'Consider saving on florals, favours, and stationery' },
  { id: 'bud-spl', text: 'Consider splurging on photography, food, and music — memories last' },
];

const VENDOR_ITEMS = [
  { id: 'ven-12', text: 'Book 12+ months ahead: venue, photographer, caterer' },
  { id: 'ven-9', text: 'Book 9 months ahead: band or DJ, florist, videographer' },
  { id: 'ven-6', text: 'Book 6 months ahead: hair & makeup, celebrant, cake' },
  { id: 'ven-3', text: 'Book 3 months ahead: transport, stationery' },
  { id: 'ven-1', text: 'Confirm all vendors and final payments 1 month out' },
  { id: 'ven-q', text: 'Prepare questions to ask every vendor before booking' },
  { id: 'ven-cont', text: 'Review contract must-haves: cancellation, refund, force majeure clauses' },
  { id: 'ven-sheet', text: 'Create a day-of vendor contact sheet' },
  { id: 'ven-meal', text: 'Confirm vendor meal requirements with your caterer' },
];

const TABS = [
  { key: 'cultural',  label: 'Cultural & religious' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'guest',     label: 'Guest experience' },
  { key: 'legal',     label: 'Legal' },
  { key: 'budget',    label: 'Budget' },
  { key: 'vendors',   label: 'Vendors' },
];

function getCulturalItems(weddingStyles) {
  const religiousCultural = ['Christian', 'Catholic', 'Jewish', 'Hindu', 'Muslim', 'Sikh', 'Buddhist', 'Cultural Fusion', 'Civil', 'Non-religious'];
  const matchedStyles = (weddingStyles || []).filter(s => religiousCultural.includes(s));
  const seen = new Set();
  const specific = [];
  matchedStyles.forEach(style => {
    (CULTURAL_BY_STYLE[style] || []).forEach(item => {
      if (!seen.has(item.id)) { seen.add(item.id); specific.push(item); }
    });
  });
  if (specific.length === 0) {
    // No specific tradition selected — show generic items
    return [
      { id: 'gen-cel', text: 'Book a licensed celebrant or officiant you connect with' },
      { id: 'gen-vows', text: 'Write or choose ceremony readings and vows' },
      { id: 'gen-str', text: 'Design the ceremony structure and run-of-show' },
      ...CULTURAL_BASE,
    ];
  }
  return [...specific, ...CULTURAL_BASE];
}

function getTabItems(tabKey, weddingStyles) {
  switch (tabKey) {
    case 'cultural':  return getCulturalItems(weddingStyles);
    case 'logistics': return LOGISTICS_ITEMS;
    case 'guest':     return GUEST_EXP_ITEMS;
    case 'legal':     return LEGAL_ITEMS;
    case 'budget':    return BUDGET_ITEMS;
    case 'vendors':   return VENDOR_ITEMS;
    default:          return [];
  }
}

// ── Progress bar ───────────────────────────────────────────────────────────

function ProgressBar({ checked, total }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
          {checked} of {total} considered
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(10,10,10,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#E03553', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

// ── Checklist item ─────────────────────────────────────────────────────────

function CheckItem({ item, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item.id)}
          style={{
            flexShrink: 0, marginTop: 2,
            width: 18, height: 18,
            border: `2px solid ${checked ? '#E03553' : 'rgba(10,10,10,0.2)'}`,
            background: checked ? '#E03553' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontFamily: PJS, margin: 0, lineHeight: 1.5,
            color: checked ? 'rgba(10,10,10,0.3)' : '#0A0A0A',
            textDecoration: checked ? 'line-through' : 'none',
            transition: 'all 0.2s',
          }}>
            {item.text}
          </p>
          {item.detail && (
            <>
              <button
                onClick={() => setExpanded(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', fontSize: 11, fontWeight: 600, color: '#E03553', fontFamily: PJS }}
              >
                {expanded ? 'Show less ↑' : 'Learn more ↓'}
              </button>
              {expanded && (
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '6px 0 0', lineHeight: 1.6 }}>
                  {item.detail}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Considerations() {
  const [activeTab, setActiveTab] = useState('cultural');
  const [weddingStyles, setWeddingStyles] = useState([]);
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('oi_considerations_checked') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(rows => {
      const r = rows[0] || {};
      setWeddingStyles(r.weddingStyle || []);
    }).catch(() => {});
  }, []);

  const toggle = (id) => {
    setChecked(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('oi_considerations_checked', JSON.stringify(next));
      return next;
    });
  };

  const tabItems = getTabItems(activeTab, weddingStyles);
  const checkedCount = tabItems.filter(item => checked.includes(item.id)).length;

  const contextPills = weddingStyles.filter(s => s);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader
        title="Considerations"
        subtitle="A personalised guide based on your wedding style"
      />

      {/* Ava button */}
      <div style={{ padding: '16px 32px 0' }}>
        <AvaButton label="Ask Ava for personalised advice" />
      </div>

      {/* Context banner */}
      {contextPills.length > 0 && (
        <div style={{
          margin: '16px 32px 0',
          background: 'rgba(10,10,10,0.03)',
          border: '1px solid rgba(10,10,10,0.06)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, flexShrink: 0 }}>
            Personalised for your wedding
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {contextPills.map(s => (
              <span key={s} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(10,10,10,0.06)', color: '#0A0A0A', fontFamily: PJS,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', overflowX: 'auto', marginTop: 16 }}>
        <div style={{ padding: '0 32px', display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: PJS,
                color: activeTab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
                borderBottom: activeTab === t.key ? '2px solid #0A0A0A' : '2px solid transparent',
                transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 80px' }}>
        <ProgressBar checked={checkedCount} total={tabItems.length} />
        <div>
          {tabItems.map(item => (
            <CheckItem
              key={item.id}
              item={item}
              checked={checked.includes(item.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
