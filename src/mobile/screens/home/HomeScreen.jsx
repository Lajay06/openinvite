import React from 'react';
import { Search, Users, Wallet, CheckCircle2, Receipt } from 'lucide-react';
import Screen from '../../shell/Screen';
import { HeroCard, PeekCarousel, StatCard, PanelCard, ImageCard, Row, RowGroup, PillButton, Skeleton, ErrorState, ProgressBar, StatusPill } from '../../ui';
import { money, dateLong, dueLabel, dateShort } from '../../lib/format';
import ActivityRow from '../../notifications/ActivityRow';
import { imageUrl } from '../../images';

/** Keep-planning cards draw a fixed photo by position (images.ts), never the feature's Plan tile photo. */
const KEEP_PLANNING = ['keepPlanning1', 'keepPlanning2', 'keepPlanning3', 'keepPlanning4', 'keepPlanning5', 'keepPlanning6'];

/**
 * Home. Hero carousel, stat pair, next up, keep planning, from Ava, latest.
 * A section renders only when a real feature backs it. Everything arrives
 * as props so the preview renders it from fixtures.
 */
export default function HomeScreen({
  firstName, coupleName, weddingDate, daysToGo, images = [], siteUrl,
  rsvp, budget, tasks = [], payments = [], keepPlanning = [], briefing, badge = null, thisWeek = [], numbers = [], failedSources = '', latest = [],
  onOpenGuests, onOpenBudget, onOpenTasks, onCompleteTask, onOpenFeature, onOpenAva, onShare, onSearch, onOpenLatest, onOpenNotifications, onOpenLink,
  loading = false, error = null, onRetry, onRefresh,
}) {
  const img = (i) => images[i] || '';
  const countdown = daysToGo == null ? null : daysToGo > 1 ? `${daysToGo}` : daysToGo === 1 ? 'Tomorrow' : daysToGo === 0 ? 'Today' : null;
  const heroes = [];
  if (!loading) {
    heroes.push({ key: 'days', image: img(0), label: coupleName || 'Your wedding', number: countdown && daysToGo > 1 ? countdown : undefined, title: countdown && daysToGo > 1 ? 'days to go' : countdown || coupleName, sub: weddingDate ? dateLong(weddingDate) : 'Add your date in Event details', action: siteUrl ? 'View your site' : 'Event details', onAction: siteUrl ? () => onOpenFeature?.('site') : () => onOpenFeature?.('event-details') });
    if (rsvp && rsvp.invited > 0) heroes.push({ key: 'rsvp', image: img(1), label: 'Replies', number: rsvp.attending, title: `attending so far`, sub: rsvpSentence(rsvp), action: 'See who is yet to reply', onAction: onOpenGuests, progress: { value: rsvp.attending + rsvp.declined, max: rsvp.invited } });
    const lead = Array.isArray(briefing) ? (briefing[0]?.lead || briefing[0]?.body) : briefing;
    if (lead) heroes.push({ key: 'ava', image: img(2), label: 'From Ava', title: lead, action: 'Ask Ava', onAction: onOpenAva });
    if (siteUrl) heroes.push({ key: 'share', image: img(3), label: 'Your site', title: 'Share it with your guests', sub: siteUrl.replace(/^https?:\/\//, ''), action: 'Share link', onAction: onShare });
  }
  return (
    <Screen title={firstName ? `Hi ${firstName}` : 'Hi'} bell actions={[{ icon: Search, label: 'Search', onClick: onSearch }]} onRefresh={onRefresh}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : null}

        {loading ? <Skeleton kind="hero" /> : (
          <div style={{ margin: '0 calc(-1 * var(--m-gutter))' }}>
            <PeekCarousel size="full">
              {heroes.map((h) => (
                <HeroCard key={h.key} image={h.image} alt="" label={h.label} number={h.number} title={h.title} sub={h.sub} action={h.action} onAction={h.onAction}>
                  {h.progress && <div style={{ marginTop: 4 }}><ProgressBar value={h.progress.value} max={h.progress.max} onDark /></div>}
                </HeroCard>
              ))}
            </PeekCarousel>
          </div>
        )}

        {!loading && failedSources && (
          <PanelCard tone="neutral" label="Some numbers are incomplete" body={`Your ${failedSources} could not be loaded, so today's numbers are incomplete.`} action="Try again" onClick={onRetry} />
        )}

        {!loading && rsvp && budget && (
          <div className="oi-m-grid2">
            <StatCard icon={Users} label="Replies in" numeric={rsvp.attending + rsvp.declined} suffix={rsvp.invited ? ` of ${rsvp.invited}` : ''} onClick={onOpenGuests} />
            <StatCard icon={Wallet} label="Budget left" number={budget.total > 0 ? money(budget.total - budget.spent, budget.symbol) : 'Set a total'} ink onClick={onOpenBudget} />
          </div>
        )}

        {!loading && (tasks.length > 0 || payments.length > 0) && (
          <section>
            <div className="oi-m-section-head">
              <h2 className="oi-m-section">Next up</h2>
              <button type="button" className="oi-m-block__link" onClick={onOpenTasks}>All tasks</button>
            </div>
            <div className="oi-m-nextup" style={{ margin: '0 calc(-1 * var(--m-gutter))' }}>
              <PeekCarousel>
                {payments.slice(0, 2).map((p) => (
                  <PanelCard key={`p${p.id}`} tone="ink" label={`Due ${dateShort(p.payment_date)}`} title={money(p.actual_amount || p.budgeted_amount, budget?.symbol)} body={`${p.item_name}${p.vendor ? ` to ${p.vendor}` : ''}`} onClick={onOpenBudget}>
                    <Receipt size={18} style={{ opacity: 0.7 }} />
                  </PanelCard>
                ))}
                {tasks.slice(0, 5).map((t) => (
                  <PanelCard key={t.id} tone="neutral" label={dueLabel(t.due_date) || (t.priority ? `${t.priority} priority` : 'No date')} title={t.title}>
                    <PillButton variant="light" size="sm" icon={CheckCircle2} onClick={() => onCompleteTask?.(t)} style={{ alignSelf: 'flex-start' }}>Done</PillButton>
                  </PanelCard>
                ))}
              </PeekCarousel>
            </div>
          </section>
        )}

        {!loading && keepPlanning.length > 0 && (
          <section>
            <div className="oi-m-section-head"><h2 className="oi-m-section">Keep planning</h2></div>
            <div style={{ margin: '0 calc(-1 * var(--m-gutter))' }}>
              <PeekCarousel size="narrow" dots={false}>
                {keepPlanning.map((f, i) => <ImageCard key={f.key} image={imageUrl(KEEP_PLANNING[i] || KEEP_PLANNING[0])} alt={f.label} title={f.label} onClick={() => onOpenFeature?.(f.key)} width={240} />)}
              </PeekCarousel>
            </div>
          </section>
        )}

        {!loading && (thisWeek.length > 0 || badge) && (
          <section>
            <div className="oi-m-section-head"><h2 className="oi-m-section">This week</h2>{badge && <StatusPill tone={badge === 'Overdue' ? 'no' : badge === 'Today' ? 'warn' : badge === 'Clear' ? 'ok' : 'neutral'}>{badge}</StatusPill>}</div>
            {thisWeek.length === 0 ? <div className="oi-m-card"><p className="oi-m-meta">Nothing on your list this week.</p></div> : (
              <RowGroup>{thisWeek.map((l, i) => <Row key={i} label={l.text} sub={l.label} wrap onClick={() => onOpenLink?.(l.to)} />)}</RowGroup>
            )}
          </section>
        )}

        {!loading && (
          <PanelCard tone="ink" mark="✦" label="From Ava" action="Ask Ava" onClick={onOpenAva}>
            {briefing === null ? (
              <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[92, 100, 78].map((w, i) => <div key={i} style={{ height: 14, width: `${w}%`, background: 'rgba(255,255,255,0.12)', borderRadius: 4 }} />)}</div>
            ) : Array.isArray(briefing) ? briefing.map((b, i) => (
              <p key={i} className="oi-m-body" style={{ opacity: 0.88, marginTop: i ? 8 : 0 }}>{b.lead && <span className="oi-m-strong" style={{ opacity: 1 }}>{b.lead} </span>}{b.body}</p>
            )) : <p className="oi-m-body" style={{ opacity: 0.88 }}>{briefing}</p>}
          </PanelCard>
        )}

        {!loading && numbers.length > 0 && (
          <section>
            <div className="oi-m-section-head"><h2 className="oi-m-section">Your numbers</h2></div>
            <div className="oi-m-card oi-m-card--flush" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {numbers.map(([k, v]) => <div key={k} className="oi-m-kv"><div className="oi-m-kv__k">{k}</div><div className="oi-m-kv__v oi-m-strong">{v}</div></div>)}
            </div>
          </section>
        )}

        {!loading && latest.length > 0 && (
          <section>
            <div className="oi-m-section-head">
              <h2 className="oi-m-section">Latest</h2>
              <button type="button" className="oi-m-block__link" onClick={onOpenNotifications}>See all</button>
            </div>
            <RowGroup>
              {latest.slice(0, 3).map((it) => <ActivityRow key={it.id} item={it} onOpen={onOpenLatest} />)}
            </RowGroup>
          </section>
        )}
      </div>
    </Screen>
  );
}

export function rsvpSentence(r) {
  if (!r.invited) return 'No invitations sent yet.';
  if (r.awaiting === 0) return 'Everyone you invited has replied.';
  return `${r.awaiting} of ${r.invited} invited guests still to reply.`;
}
