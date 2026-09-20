import React, { useContext, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MobileShell, { ShellContext } from './shell/MobileShell';
import HomeScreen from './screens/home/HomeScreen';
import GuestsScreen from './screens/guests/GuestsScreen';
import GuestDetailScreen from './screens/guests/GuestDetailScreen';
import GuestFormSheet from './screens/guests/GuestFormSheet';
import PlanScreen, { BudgetCategoryScreen } from './screens/plan/PlanScreen';
import TaskFormSheet from './screens/plan/TaskFormSheet';
import ExpenseFormSheet from './screens/plan/ExpenseFormSheet';
import SiteScreen from './screens/site/SiteScreen';
import AccountScreen from './screens/account/AccountScreen';
import { isAttending, isDeclined, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { getUniverse } from '@/lib/universeCatalog';
import { FIXTURE_USER, FIXTURE_WEDDING, FIXTURE_GUESTS, FIXTURE_TASKS, FIXTURE_BUDGET, FIXTURE_SCHEDULE, FIXTURE_VENDORS, FIXTURE_AVA_MESSAGES } from './fixtures';

export const PREVIEW_BASE = '/m/preview';

/**
 * /m/preview/* in development only: the same shell and every presentational
 * screen, fed from src/mobile/fixtures. No network calls. Writes update
 * local state so the sheets can be exercised.
 *
 * `?state=loading|empty|error` on any screen shows that state.
 */
export default function MobilePreviewApp() {
  if (!import.meta.env.DEV) return <Navigate to="/m" replace />;
  return (
    <Routes>
      <Route element={<MobileShell base={PREVIEW_BASE} renderAva={() => <PreviewAva />} />}>
        <Route index element={<PreviewHome />} />
        <Route path="guests" element={<PreviewGuests />} />
        <Route path="guests/:id" element={<PreviewGuests />} />
        <Route path="plan" element={<PreviewPlan />} />
        <Route path="plan/budget/:category" element={<PreviewPlan />} />
        <Route path="site" element={<PreviewSite />} />
        <Route path="account" element={<PreviewAccount />} />
        <Route path="*" element={<Navigate to={PREVIEW_BASE} replace />} />
      </Route>
    </Routes>
  );
}

function useStateParam() {
  const [params] = useSearchParams();
  const s = params.get('state');
  return { loading: s === 'loading', error: s === 'error' ? new Error('preview') : null, empty: s === 'empty' };
}

// A local static, so the preview loads nothing over the network.
const heroImage = getUniverse(FIXTURE_WEDDING.activeUniverse)?.imageUrl || '';

function PreviewHome() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const st = useStateParam();
  const guests = st.empty ? [] : FIXTURE_GUESTS;
  const tasks = st.empty ? [] : FIXTURE_TASKS.filter((t) => !t.completed);
  const invited = guests.filter((g) => !!g.invite_sent_at);
  const rsvp = { attending: guests.filter(isAttending).length, declined: guests.filter(isDeclined).length, awaiting: guests.filter(isAwaitingPrimary).length, invited: invited.length };
  const spent = (st.empty ? [] : FIXTURE_BUDGET).reduce((s, i) => s + (i.actual_amount || 0), 0);
  return (
    <HomeScreen
      firstName={FIXTURE_WEDDING.couple1Name}
      coupleName={`${FIXTURE_WEDDING.couple1Name} & ${FIXTURE_WEDDING.couple2Name}`}
      weddingDate={FIXTURE_WEDDING.weddingDate}
      daysToGo={daysUntilWedding(FIXTURE_WEDDING.weddingDate)}
      heroImage={heroImage}
      nextAction={{ label: 'See who is yet to reply', onClick: () => navigate(`${base}/guests?filter=awaiting`) }}
      tasks={tasks}
      rsvp={rsvp}
      budget={{ spent, total: st.empty ? 0 : FIXTURE_WEDDING.budget.total, symbol: 'A$' }}
      onOpenTasks={() => navigate(`${base}/plan`)}
      onOpenGuests={() => navigate(`${base}/guests`)}
      onOpenBudget={() => navigate(`${base}/plan?segment=budget`)}
      onCompleteTask={() => {}}
      onAddGuest={() => navigate(`${base}/guests?add=1`)}
      onAddTask={() => navigate(`${base}/plan?add=1`)}
      onAddExpense={() => navigate(`${base}/plan?segment=budget&add=1`)}
      onViewSite={() => navigate(`${base}/site`)}
      loading={st.loading}
      error={st.error}
      onRetry={() => navigate(base)}
    />
  );
}

function PreviewGuests() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { base } = useContext(ShellContext);
  const [params] = useSearchParams();
  const st = useStateParam();
  const [guests, setGuests] = useState(FIXTURE_GUESTS);
  const [filter, setFilter] = useState(params.get('filter') || 'all');
  const [sheet, setSheet] = useState({ open: params.get('add') === '1', guest: null });
  const current = id ? guests.find((g) => g.id === id) : null;
  const save = async (fields) => {
    if (sheet.guest) setGuests((l) => l.map((g) => (g.id === sheet.guest.id ? { ...g, ...fields } : g)));
    else setGuests((l) => [{ id: `g${Date.now()}`, invite_sent_at: null, ...fields }, ...l]);
  };
  return (
    <>
      {id ? (
        <GuestDetailScreen guest={current} back={`${base}/guests`} onEdit={() => setSheet({ open: true, guest: current })} onDelete={() => { setGuests((l) => l.filter((g) => g.id !== id)); navigate(`${base}/guests`); }} />
      ) : (
        <GuestsScreen guests={st.empty ? [] : guests} filter={filter} onFilter={setFilter} onOpenGuest={(g) => navigate(`${base}/guests/${g.id}`)} onAdd={() => setSheet({ open: true, guest: null })} loading={st.loading} error={st.error} onRetry={() => navigate(`${base}/guests`)} />
      )}
      <GuestFormSheet open={sheet.open} guest={sheet.guest} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSave={save} />
    </>
  );
}

function PreviewPlan() {
  const navigate = useNavigate();
  const { category } = useParams();
  const { base } = useContext(ShellContext);
  const [params] = useSearchParams();
  const st = useStateParam();
  const [segment, setSegment] = useState(params.get('segment') || 'checklist');
  const [tasks, setTasks] = useState(FIXTURE_TASKS);
  const [items, setItems] = useState(FIXTURE_BUDGET);
  const [taskSheet, setTaskSheet] = useState(params.get('add') === '1' && (params.get('segment') || 'checklist') !== 'budget');
  const [expenseSheet, setExpenseSheet] = useState({ open: params.get('add') === '1' && params.get('segment') === 'budget', item: null });
  const plan = st.empty ? null : FIXTURE_WEDDING.budget;
  const common = { loading: st.loading, error: st.error, onRetry: () => navigate(`${base}/plan`) };
  const shownItems = st.empty ? [] : items;
  return (
    <>
      {category ? (
        <BudgetCategoryScreen category={category} items={shownItems} plan={plan} symbol="A$" back={`${base}/plan?segment=budget`} onAdd={() => setExpenseSheet({ open: true, item: null })} onEdit={(item) => setExpenseSheet({ open: true, item })} />
      ) : (
        <PlanScreen
          segment={segment}
          onSegment={setSegment}
          checklist={{ ...common, tasks: st.empty ? [] : tasks, onToggle: (t) => setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x))), onAdd: () => setTaskSheet(true) }}
          budget={{ ...common, items: shownItems, plan, symbol: 'A$', onOpenCategory: (c) => navigate(`${base}/plan/budget/${c}`), onAdd: () => setExpenseSheet({ open: true, item: null }) }}
          timeline={{ ...common, items: st.empty ? [] : FIXTURE_SCHEDULE, onOpenDesktop: () => {} }}
          vendors={{ ...common, items: st.empty ? [] : FIXTURE_VENDORS, symbol: 'A$', onOpenDesktop: () => {} }}
          onSeating={() => {}}
        />
      )}
      <TaskFormSheet open={taskSheet} onClose={() => setTaskSheet(false)} onSave={async (f) => setTasks((l) => [{ id: `t${Date.now()}`, completed: false, ...f }, ...l])} />
      <ExpenseFormSheet open={expenseSheet.open} item={expenseSheet.item} defaultCategory={category || ''} symbol="A$" onClose={() => setExpenseSheet((s) => ({ ...s, open: false }))} onSave={async (f) => setItems((l) => (expenseSheet.item ? l.map((x) => (x.id === expenseSheet.item.id ? { ...x, ...f } : x)) : [{ id: `b${Date.now()}`, ...f }, ...l]))} />
    </>
  );
}

function PreviewSite() {
  const navigate = useNavigate();
  const st = useStateParam();
  const { base } = useContext(ShellContext);
  const universe = getUniverse(FIXTURE_WEDDING.activeUniverse);
  return (
    <SiteScreen
      universeName={universe?.name}
      isLive={!st.empty && FIXTURE_WEDDING.websiteEnabled}
      slug={st.empty ? '' : FIXTURE_WEDDING.slug}
      previewImage={heroImage}
      siteUrl={st.empty ? '' : `https://openinvite.com.au/w/${FIXTURE_WEDDING.slug}`}
      onView={() => {}}
      onShare={() => {}}
      onOpenDesktop={() => {}}
      loading={st.loading}
      error={st.error}
      onRetry={() => navigate(`${base}/site`)}
    />
  );
}

function PreviewAccount() {
  const [params] = useSearchParams();
  const native = params.get('native') === '1';
  return (
    <AccountScreen
      name={FIXTURE_USER.full_name}
      email={FIXTURE_USER.email}
      planLabel="Pro"
      planNote={null}
      trialDaysLeft={null}
      showPurchases={!native}
      onUpgrade={() => {}}
      onDetails={() => {}}
      onEventDetails={() => {}}
      onCollaborators={() => {}}
      onNotifications={() => {}}
      onHelp={() => {}}
      onContact={() => {}}
      onLogout={() => {}}
      loading={false}
    />
  );
}

/** A static stand-in for the Ava pod so the preview makes no network calls. */
function PreviewAva() {
  const messages = useMemo(() => FIXTURE_AVA_MESSAGES, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1A1A1A', color: '#FFFFFF' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '84%', padding: '10px 14px', background: m.role === 'user' ? '#E03553' : 'rgba(255,255,255,0.08)', fontSize: 15, lineHeight: '22px' }}>
            {m.text}
          </div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input className="oi-m-input" placeholder="Ask Ava anything" readOnly style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }} />
      </div>
    </div>
  );
}
