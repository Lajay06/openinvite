import React from 'react';
import { Search } from 'lucide-react';
import Screen from '../../shell/Screen';
import { FeatureTile, ProgressBar, ErrorState, Skeleton } from '../../ui';
import { GROUPS, featuresIn } from '../../features/registry';

/**
 * The Plan hub: title, search, an overall progress card, then one section
 * per desktop sidebar group, each a two-column grid of FeatureTiles with a
 * live stat. `data` is the usePlanData payload (or fixtures).
 */
export default function PlanHubScreen({ data, symbol = '$', progress, onOpen, onSearch, loading, error, onRetry }) {
  return (
    <Screen title="Plan" bell actions={[{ icon: Search, label: 'Search', onClick: onSearch }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? (
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
            {GROUPS.map((g) => (
              <section key={g.key}>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{g.label}</h2>
                <div className="oi-m-grid2">
                  {featuresIn(g.key).map((f) => (
                    <FeatureTile key={f.key} icon={f.icon} name={f.label} image={f.image} alt={f.label} tone={f.image ? 'photo' : (['guests', 'finances'].includes(g.key) ? 'neutral' : 'white')} onClick={() => onOpen(f)} />
                  ))}
                </div>
              </section>
            ))}
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
