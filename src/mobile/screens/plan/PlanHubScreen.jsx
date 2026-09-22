import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Screen from '../../shell/Screen';
import { FeatureTile, ProgressBar, ErrorState, Skeleton } from '../../ui';
import { GROUPS, featuresIn } from '../../features/registry';
import { prefGet, prefSet } from '../../native';

const OPEN_PREF = 'plan_open_groups';

/**
 * Owner fix 6: which accordion sections are open, remembered across opens.
 * Until the preference has been read the first visit's default applies:
 * the first group open, the rest collapsed.
 */
function useOpenGroups() {
  const [open, setOpen] = useState(() => new Set([GROUPS[0].key]));
  useEffect(() => {
    let live = true;
    prefGet(OPEN_PREF).then((v) => {
      if (!live || v == null) return;
      try { setOpen(new Set(JSON.parse(v))); } catch { /* a bad value keeps the default */ }
    });
    return () => { live = false; };
  }, []);
  const toggle = (key) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    prefSet(OPEN_PREF, JSON.stringify([...next]));
    return next;
  });
  return [open, toggle];
}

/**
 * The Plan hub: title, search, an overall progress card, then one accordion
 * section per desktop sidebar group (owner fix 6), each a two-column grid
 * of FeatureTiles. `data` is the usePlanData payload (or fixtures).
 */
export default function PlanHubScreen({ data, symbol = '$', progress, onOpen, onSearch, loading, error, onRetry }) {
  const [openGroups, toggleGroup] = useOpenGroups();
  return (
    <Screen title="Plan" root>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState what="your wedding" onRetry={onRetry} /> : loading ? (
          <>
            <Skeleton kind="block" />
            <div className="oi-m-grid2"><Skeleton kind="block" style={{ height: 148 }} /><Skeleton kind="block" style={{ height: 148 }} /></div>
          </>
        ) : (
          <>
            {progress && (
              <div className="oi-m-card">
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                  <span className="oi-m-section">{progress.label}</span>
                  <span className="oi-m-num" style={{ fontSize: 28, lineHeight: '34px' }}>{Math.round(progress.pct)}%</span>
                </div>
                <ProgressBar value={progress.pct} max={100} note={progress.note} />
              </div>
            )}
            <div>
              {GROUPS.map((g) => {
                const features = featuresIn(g.key);
                const isOpen = openGroups.has(g.key);
                const bodyId = `plan-group-${g.key}`;
                return (
                  <section key={g.key} className="oi-m-acc">
                    <button type="button" className="oi-m-acc__head" onClick={() => toggleGroup(g.key)} aria-expanded={isOpen} aria-controls={bodyId}>
                      <h2 className="oi-m-acc__title">{g.label}</h2>
                      <span className="oi-m-acc__count">{features.length} feature{features.length === 1 ? '' : 's'}</span>
                      <ChevronDown size={20} strokeWidth={1.75} className={`oi-m-acc__chevron${isOpen ? ' oi-m-acc__chevron--open' : ''}`} aria-hidden="true" />
                    </button>
                    <div id={bodyId} className={`oi-m-acc__body${isOpen ? ' oi-m-acc__body--open' : ''}`} aria-hidden={!isOpen}>
                      <div className="oi-m-acc__inner">
                        <div className="oi-m-grid2" style={{ paddingBottom: 16 }}>
                          {features.map((f) => (
                            <FeatureTile key={f.key} icon={f.icon} name={f.label} image={f.image} alt={f.label} tone={f.image ? 'photo' : (['guests', 'finances'].includes(g.key) ? 'neutral' : 'white')} onClick={() => onOpen(f)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}

/** Overall progress: a blend of the concrete counts the hub already has. */
export function planProgress(d) {
  if (!d) return null;
  const checks = [
    !!d.details?.weddingDate,
    !!(d.details?.mainCeremony?.venueName),
    (d.guests || []).length > 0,
    (d.guests || []).some((g) => g.invite_sent_at),
    (d.budget || []).length > 0,
    (d.vendors || []).some((v) => v.status === 'booked'),
    (d.schedule || []).length > 0,
    !!d.details?.celebrant?.name,
    !!d.details?.websiteEnabled,
    (d.tasks || []).length > 0 && (d.tasks || []).every((t) => t.completed),
  ];
  const done = checks.filter(Boolean).length;
  const pct = (done / checks.length) * 100;
  const open = (d.tasks || []).filter((t) => !t.completed).length;
  return { label: 'Overall', pct, note: open ? `${done} of ${checks.length} big things done. ${open} task${open === 1 ? '' : 's'} open.` : `${done} of ${checks.length} big things done.` };
}
