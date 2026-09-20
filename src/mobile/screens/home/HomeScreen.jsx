import React from 'react';
import { UserPlus, ListPlus, Receipt, Globe, CheckCircle2 } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Block, PillButton, PeekCarousel, ProgressBar, Skeleton, ErrorState, EmptyState } from '../../ui';
import { money, dateLong, dueLabel } from '../../lib/format';

/**
 * Home. Everything comes in through props so the preview can render it
 * from fixtures.
 *
 * props
 *   firstName, coupleName, weddingDate, daysToGo, heroImage
 *   nextAction  { label, onClick }
 *   tasks       open tasks (first few are shown)
 *   rsvp        { attending, declined, awaiting, invited }
 *   budget      { spent, total, symbol }
 *   on*         quick-action and section handlers
 *   loading, error, onRetry
 */
export default function HomeScreen({
  firstName, coupleName, weddingDate, daysToGo, heroImage, nextAction,
  tasks = [], rsvp, budget,
  onOpenTasks, onOpenGuests, onOpenBudget, onCompleteTask,
  onAddGuest, onAddTask, onAddExpense, onViewSite,
  loading = false, error = null, onRetry,
}) {
  const title = firstName ? `Hi ${firstName}` : 'Hi';
  const countdown = daysToGo == null ? '' : daysToGo > 1 ? `${daysToGo} days to go` : daysToGo === 1 ? 'Tomorrow' : daysToGo === 0 ? 'Today' : 'Married';

  return (
    <Screen title={title}>
      <div className="oi-m-stack oi-m-stack--16">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : null}

        {/* Hero */}
        {loading ? (
          <Skeleton kind="block" style={{ height: 240 }} />
        ) : (
          <div className="oi-m-hero">
            {heroImage && <img className="oi-m-hero__img" src={heroImage} alt="" />}
            <div className="oi-m-hero__scrim" />
            <div className="oi-m-hero__body">
              <div className="oi-m-meta" style={{ color: 'rgba(255,255,255,0.8)' }}>{countdown}</div>
              <h2 className="oi-m-section" style={{ color: '#FFFFFF', fontSize: 24, lineHeight: '32px' }}>{coupleName || 'Your wedding'}</h2>
              {weddingDate && <p className="oi-m-body" style={{ color: 'rgba(255,255,255,0.9)' }}>{dateLong(weddingDate)}</p>}
              {nextAction && (
                <PillButton variant="primary" onClick={nextAction.onClick} style={{ marginTop: 8 }}>{nextAction.label}</PillButton>
              )}
            </div>
          </div>
        )}

        {/* Next up */}
        <section>
          <div className="oi-m-block__head" style={{ padding: '0 0 8px' }}>
            <h2 className="oi-m-section">Next up</h2>
            {onOpenTasks && <button type="button" className="oi-m-block__link" onClick={onOpenTasks}>All tasks</button>}
          </div>
          {loading ? (
            <Skeleton kind="block" />
          ) : tasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Nothing open right now. Add a task when something comes up." actionLabel="Add a task" onAction={onAddTask} />
          ) : (
            <div style={{ margin: '0 calc(-1 * var(--m-gutter))' }}>
              <PeekCarousel>
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="oi-m-block" style={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p className="oi-m-body oi-m-strong" style={{ overflowWrap: 'anywhere' }}>{t.title}</p>
                      <p className="oi-m-meta">{dueLabel(t.due_date) || (t.priority ? `${t.priority} priority` : '')}</p>
                    </div>
                    {onCompleteTask && (
                      <PillButton variant="secondary" icon={CheckCircle2} onClick={() => onCompleteTask(t)} style={{ alignSelf: 'flex-start' }}>Done</PillButton>
                    )}
                  </div>
                ))}
              </PeekCarousel>
            </div>
          )}
        </section>

        {/* RSVP snapshot */}
        <Block title="Replies" action={onOpenGuests ? 'Guests' : undefined} onAction={onOpenGuests}>
          {loading || !rsvp ? (
            <Skeleton kind="text" width="70%" />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <Stat n={rsvp.attending} label="Attending" />
                <Stat n={rsvp.declined} label="Declined" />
                <Stat n={rsvp.awaiting} label="Awaiting" />
              </div>
              <ProgressBar
                value={rsvp.attending + rsvp.declined}
                max={rsvp.invited}
                note={rsvpSentence(rsvp)}
              />
            </>
          )}
        </Block>

        {/* Budget snapshot */}
        <Block title="Budget" action={onOpenBudget ? 'Budget' : undefined} onAction={onOpenBudget}>
          {loading || !budget ? (
            <Skeleton kind="text" width="70%" />
          ) : budget.total > 0 ? (
            <>
              <p className="oi-m-num" style={{ marginBottom: 8 }}>{money(budget.spent, budget.symbol)}</p>
              <ProgressBar value={budget.spent} max={budget.total} note={`${money(budget.spent, budget.symbol)} of ${money(budget.total, budget.symbol)} spent so far.`} />
            </>
          ) : (
            <p className="oi-m-meta">No budget yet. Set a total and Ava can help you split it.</p>
          )}
        </Block>

        {/* Quick actions */}
        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 8 }}>Quick actions</h2>
          <div className="oi-m-grid2">
            <Tile icon={UserPlus} label="Add a guest" onClick={onAddGuest} />
            <Tile icon={ListPlus} label="Add a task" onClick={onAddTask} />
            <Tile icon={Receipt} label="Add an expense" onClick={onAddExpense} />
            <Tile icon={Globe} label="View your site" onClick={onViewSite} />
          </div>
        </section>
      </div>
    </Screen>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="oi-m-num" style={{ fontSize: 28, lineHeight: '36px' }}>{n}</div>
      <div className="oi-m-meta">{label}</div>
    </div>
  );
}

function Tile({ icon: Icon, label, onClick }) {
  return (
    <button type="button" className="oi-m-tile" onClick={onClick}>
      <span className="oi-m-row__tile oi-m-row__tile--primary"><Icon size={20} strokeWidth={1.75} /></span>
      <span className="oi-m-body oi-m-strong">{label}</span>
    </button>
  );
}

export function rsvpSentence(r) {
  if (!r.invited) return 'No invitations sent yet.';
  if (r.awaiting === 0) return 'Everyone you invited has replied.';
  return `${r.awaiting} of ${r.invited} invited guests still to reply.`;
}
