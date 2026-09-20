import React from 'react';
import { Search, Users, Wallet, CheckCircle2, Receipt } from 'lucide-react';
import Screen from '../../shell/Screen';
import { HeroCard, PeekCarousel, StatCard, PanelCard, ImageCard, Row, RowGroup, PillButton, Skeleton, ErrorState, ProgressBar } from '../../ui';
import { money, dateLong, dueLabel, dateShort } from '../../lib/format';
import { typeIcon } from '../../notifications/icons';
import { relativeTime } from '../../notifications/feed';

/**
 * Home. Hero carousel, stat pair, next up, keep planning, from Ava, latest.
 * A section renders only when a real feature backs it. Everything arrives
 * as props so the preview renders it from fixtures.
 */
export default function HomeScreen({
  firstName, coupleName, weddingDate, daysToGo, images = [], siteUrl,
  rsvp, budget, tasks = [], payments = [], keepPlanning = [], briefing, latest = [],
  onOpenGuests, onOpenBudget, onOpenTasks, onCompleteTask, onOpenFeature, onOpenAva, onShare, onSearch, onOpenLatest, onOpenNotifications,
  loading = false, error = null, onRetry, onRefresh,
}) {
  const img = (i) => images[i % Math.max(1, images.length)] || images[0] || '';
  const countdown = daysToGo == null ? null : daysToGo > 1 ? `${daysToGo}` : daysToGo === 1 ? 'Tomorrow' : daysToGo === 0 ? 'Today' : null;
  const heroes = [];
  if (!loading) {
    heroes.push({ key: 'days', image: img(0), label: coupleName || 'Your wedding', number: countdown && daysToGo > 1 ? countdown : undefined, title: countdown && daysToGo > 1 ? 'days to go' : countdown || coupleName, sub: weddingDate ? dateLong(weddingDate) : 'Add your date in Event details', action: siteUrl ? 'View your site' : 'Event details', onAction: siteUrl ? () => onOpenFeature?.('site') : () => onOpenFeature?.('event-details') });
    if (rsvp && rsvp.invited > 0) heroes.push({ key: 'rsvp', image: img(1), label: 'Replies', number: rsvp.attending, title: `attending so far`, sub: rsvpSentence(rsvp), action: 'See who is yet to reply', onAction: onOpenGuests, progress: { value: rsvp.attending + rsvp.declined, max: rsvp.invited } });
    if (briefing) heroes.push({ key: 'ava', image: img(2), label: 'From Ava', title: briefing, action: 'Ask Ava', onAction: onOpenAva });
    if (siteUrl) heroes.push({ key: 'share', image: img(3), label: 'Your site', title: 'Share it with your guests', sub: siteUrl.replace(/^https?:\/\//, ''), action: 'Share link', onAction: onShare });
  }
  return (
    <Screen title={firstName ? `Hi ${firstName}` : 'Hi'} bell actions={[{ icon: Search, label: 'Search', onClick: onSearch }]} onRefresh={onRefresh}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : null}

        {loading ? <Skeleton kind="hero" /> : (
          <div style={{ margin: '0 calc(-1 * var(--m-gutter))' }}>
            <PeekCarousel size="wide">
              {heroes.map((h) => (
                <HeroCard key={h.key} image={h.image} alt="" label={h.label} number={h.number} title={h.title} sub={h.sub} action={h.action} onAction={h.onAction}>
                  {h.progress && <div style={{ marginTop: 4 }}><ProgressBar value={h.progress.value} max={h.progress.max} onDark /></div>}
                </HeroCard>
              ))}
            </PeekCarousel>
          </div>
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
            <div style={{ margin: '0 calc(-1 * var(--m-gutter))' }}>
              <PeekCarousel>
                {payments.slice(0, 2).map((p) => (
                  <PanelCard key={`p${p.id}`} tone="wine" label={`Due ${dateShort(p.payment_date)}`} title={money(p.actual_amount || p.budgeted_amount, budget?.symbol)} body={`${p.item_name}${p.vendor ? ` to ${p.vendor}` : ''}`} onClick={onOpenBudget}>
                    <Receipt size={18} style={{ opacity: 0.7 }} />
                  </PanelCard>
                ))}
                {tasks.slice(0, 5).map((t) => (
                  <PanelCard key={t.id} tone="sand" label={dueLabel(t.due_date) || (t.priority ? `${t.priority} priority` : 'No date')} title={t.title}>
                    <PillButton variant="light" size="sm" icon={CheckCircle2} onClick={() => onCompleteTask?.(t)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>Done</PillButton>
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
                {keepPlanning.map((f) => <ImageCard key={f.key} image={f.image || img(4)} alt={f.label} title={f.label} line={f.line} onClick={() => onOpenFeature?.(f.key)} width={240} />)}
              </PeekCarousel>
            </div>
          </section>
        )}

        {!loading && briefing && (
          <PanelCard tone="ink" mark="✦" label="From Ava" body={briefing} action="Ask Ava" onClick={onOpenAva} />
        )}

        {!loading && latest.length > 0 && (
          <section>
            <div className="oi-m-section-head">
              <h2 className="oi-m-section">Latest</h2>
              <button type="button" className="oi-m-block__link" onClick={onOpenNotifications}>All activity</button>
            </div>
            <RowGroup>
              {latest.slice(0, 3).map((it) => {
                const { icon: Icon, tile } = typeIcon(it.type);
                return <Row key={it.id} icon={Icon} tile={tile} label={it.title} sub={it.body} value={relativeTime(it.ts)} onClick={() => onOpenLatest?.(it)} />;
              })}
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
