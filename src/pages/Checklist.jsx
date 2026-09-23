import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { useNavigate } from 'react-router-dom';
import { getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};


// --- Planning overview ---

const OVERVIEW_GROUPS = [
  {
    group: 'Essential',
    items: [
      { key: 'wedding_date',         label: 'Wedding date set',          route: '/event-details' },
      { key: 'guests_started',       label: 'Guest list started',        route: '/guests' },
      { key: 'budget_setup',         label: 'Budget set up',             route: '/budget' },
      { key: 'venue_sourced',        label: 'Venue sourced or booked',   route: '/vendors' },
      { key: 'photographer_sourced', label: 'Photographer sourced',      route: '/vendors' },
      { key: 'caterer_sourced',      label: 'Caterer sourced',           route: '/vendors' },
    ],
  },
  {
    group: 'Recommended',
    items: [
      { key: 'rsvps_tracked',    label: 'RSVPs being tracked',       route: '/guests' },
      { key: 'schedule_created', label: 'Day schedule created',      route: '/schedule' },
      { key: 'music_sourced',    label: 'Music / DJ sourced',        route: '/vendors' },
      { key: 'florist_sourced',  label: 'Florist sourced',           route: '/vendors' },
      { key: 'notes_added',      label: 'Vows or speeches started',  route: '/vows-speeches' },
    ],
  },
  {
    group: 'Nice to have',
    items: [
      { key: 'videographer_sourced', label: 'Videographer sourced',    route: '/vendors' },
      { key: 'transport_arranged',   label: 'Transport arranged',      route: '/vendors' },
      { key: 'beauty_sourced',       label: 'Beauty & hair sourced',   route: '/vendors' },
      { key: 'wedding_city',         label: 'Wedding location set',    route: '/event-details' },
    ],
  },
];

function evaluateStatus({ guests, budgets, vendors, schedules, notes }) {
  return {
    wedding_date:         !!localStorage.getItem('oi_wedding_date'),
    guests_started:       guests.length > 0,
    budget_setup:         budgets.length > 0,
    venue_sourced:        vendors.some(v => v.category === 'venue'),
    photographer_sourced: vendors.some(v => v.category === 'photography'),
    caterer_sourced:      vendors.some(v => v.category === 'catering'),
    rsvps_tracked:        guests.some(g => g.rsvp_status && g.rsvp_status !== 'pending'),
    schedule_created:     schedules.length > 0,
    music_sourced:        vendors.some(v => v.category === 'music'),
    florist_sourced:      vendors.some(v => v.category === 'flowers'),
    notes_added:          notes.length > 0,
    videographer_sourced: vendors.some(v => v.category === 'videography'),
    transport_arranged:   vendors.some(v => v.category === 'transportation'),
    beauty_sourced:       vendors.some(v => v.category === 'beauty'),
    wedding_city:         !!localStorage.getItem('oi_wedding_city'),
  };
}

function PlanningOverview() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [guests, budgets, vendors, schedules, notes] = await Promise.all([
          getMyGuestsWithRsvp().catch(() => []),
          getMyRecords('Budget').catch(() => []),
          getMyRecords('Vendor').catch(() => []),
          getMyRecords('Schedule').catch(() => []),
          getMyRecords('Note').catch(() => []),
        ]);
        if (!cancelled) setStatus(evaluateStatus({ guests, budgets, vendors, schedules, notes }));
      } catch {
        if (!cancelled) setStatus({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(10,10,10,0.12)', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: PJS, marginTop: 16 }}>Scanning your planning data…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const allItems = OVERVIEW_GROUPS.flatMap(g => g.items);
  const completedCount = allItems.filter(i => status?.[i.key]).length;
  const overallProgress = allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  return (
    <div style={{ padding: '32px 32px 48px' }}>
      {/* Progress summary */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={labelStyle}>What is left</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
            {allItems.length - completedCount === 0 ? 'Nothing left' : `${allItems.length - completedCount} left`}
          </span>
        </div>
      </div>

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {OVERVIEW_GROUPS.map(group => {
          const groupDone = group.items.filter(i => status?.[i.key]).length;
          return (
            <div key={group.group}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={labelStyle}>{group.group}</span>
                <span style={{ fontSize: 11, color: '#444444', fontFamily: PJS }}>({groupDone}/{group.items.length})</span>
                {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
                    regardless of implementation. This one is a background fill, not a
                    border, so the feel-pass property guard skipped it; the guard is
                    unchanged and this exemption lives here at the site. */}
                <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.12)' }} />
              </div>
              <div style={{ border: '1px solid rgba(10,10,10,0.12)' }}>
                {group.items.map((item, idx) => {
                  const done = !!status?.[item.key];
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px',
                        borderBottom: idx < group.items.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                        background: '#FFFFFF',
                      }}
                    >
                      {done
                        ? <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        : <XCircle size={16} style={{ color: '#E03553', flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: done ? '#444444' : '#0A0A0A', fontFamily: PJS }}>
                        {item.label}
                      </span>
                      {!done && (
                        <button
                          onClick={() => navigate(item.route)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS,
                            padding: '4px 8px', borderRadius: 999,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                          Go <ArrowRight size={12} />
                        </button>
                      )}
                      {done && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', fontFamily: PJS, padding: '2px 10px', borderRadius: 999, background: 'rgba(22,163,74,0.1)' }}>
                          Done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main page ---

/**
 * THE SUB-TAB BAR IS GONE, AND SO IS "MY CHECKLIST" — owner ruling, round two
 * item 6: "delete the 'My checklist' sub-tab entirely. Keep Planning overview.
 * Remove the sub-tab bar and its heading so the Checklist tab opens straight
 * into Planning overview."
 *
 * WHY THAT LIST WAS NEVER REAL DATA, which is worth recording because it is
 * the reason nothing is being migrated. My checklist read and wrote
 * `localStorage['oi_checklist']` and nothing else. It never reached Base44, so
 * it lived in one browser on one device: a couple who ticked twelve items on a
 * laptop opened the same page on a phone to an empty list, a collaborator saw
 * nothing at all, and clearing site data erased it with no warning and no
 * copy. There is no server-side row to move, and a backfill would have nothing
 * to read from.
 *
 * The stat strip goes with it. Its three figures — Overall progress,
 * Essentials done, Nice-to-haves done — counted that list and only that list,
 * so keeping the strip would leave three zeros over a list that no longer
 * exists.
 *
 * What stays: the page header (when not embedded in the To do hub), the Ava
 * button, and Planning overview, which reads the couple's real records.
 */
export default function ChecklistPage({ embedded = false }) {
  const [avaOpen, setAvaOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {!embedded && <DashboardPageHeader title="Checklist" subtitle="Track every task from first steps to big day" />}

      {/* Ava button */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        <AvaButton label="Ask Ava to review your checklist" onClick={() => setAvaOpen(true)} />
      </div>

      <PlanningOverview />

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Checklist"
        systemPrompt="You are Ava, a wedding planning checklist advisor. Help prioritize tasks and stay on track."
        quickActions={["What should I do this month?", "Am I behind schedule?", "Most important tasks right now", "12-month wedding checklist"]}
      />
    </div>
  );
}
