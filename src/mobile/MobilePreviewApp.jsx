import React, { useContext, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MobileShell, { ShellContext } from './shell/MobileShell';
import HomeScreen from './screens/home/HomeScreen';
import GuestsScreen from './screens/guests/GuestsScreen';
import GuestDetailScreen from './screens/guests/GuestDetailScreen';
import GuestFormSheet from './screens/guests/GuestFormSheet';
import PlanHubScreen, { planProgress } from './screens/plan/PlanHubScreen';
import ChecklistScreen from './screens/plan/ChecklistScreen';
import BudgetScreen, { BudgetCategoryScreen, summariseBudget } from './screens/plan/BudgetScreen';
import MessagesScreen, { ThreadScreen } from './screens/plan/MessagesScreen';
import SeatingScreen from './screens/plan/SeatingScreen';
import PollsScreen from './screens/plan/PollsScreen';
import MusicScreen from './screens/plan/MusicScreen';
import RegistryScreen from './screens/plan/RegistryScreen';
import { QnaScreen, GoodToKnowScreen, PlacesScreen, SuiteScheduleScreen, WeddingPartyScreen, MarketplaceScreen, DesktopFeatureScreen } from './screens/plan/SuiteScreens';
import DetailsScreen from './features/DetailsScreen';
import EntityListScreen from './features/EntityListScreen';
import { DETAILS, ENTITIES } from './features/schemas';
import { featureByKey, leastTouched } from './features/registry';
import SiteScreen from './screens/site/SiteScreen';
import AccountScreen from './screens/account/AccountScreen';
import SearchScreenPage from './screens/search/SearchScreenPage';
import NotificationsScreen from './notifications/NotificationsScreen';
import NotificationSettingsScreen from './notifications/NotificationSettingsScreen';
import PushPreview from './notifications/PushPreview';
import ImageGalleryScreen from './screens/preview/ImageGalleryScreen';
import WelcomeScreen from './screens/firstrun/WelcomeScreen';
import LoginScreen from './screens/firstrun/LoginScreen';
import PrimingScreen from './screens/firstrun/PrimingScreen';
import { buildFeed } from './notifications/feed';
import { defaultSettings } from './notifications/store';
import { isAttending, isDeclined, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { getUniverse } from '@/lib/universeCatalog';
import { coupleImages } from './lib/images';
import { dateLong } from './lib/format';
import {
  FIXTURE_USER, FIXTURE_WEDDING, FIXTURE_GUESTS, FIXTURE_TASKS, FIXTURE_BUDGET, FIXTURE_SCHEDULE, FIXTURE_VENDORS, FIXTURE_AVA_MESSAGES,
  FIXTURE_MESSAGES, FIXTURE_SONG_REQUESTS, FIXTURE_MUSIC, FIXTURE_POLLS, FIXTURE_POLL_VOTES, FIXTURE_GIFTS, FIXTURE_REGISTRY, FIXTURE_VOWS, FIXTURE_MOODBOARD, FIXTURE_TABLES, FIXTURE_NOTIFICATION_ENTITY,
} from './fixtures';

export const PREVIEW_BASE = '/m/preview';
const SYMBOL = 'A$';
const NOW = new Date('2026-09-21T09:00:00+10:00').getTime();

/**
 * /m/preview/* in development only: the same shell and every presentational
 * screen, fed from src/mobile/fixtures. No network calls. Writes update
 * local state so the sheets can be exercised.
 *
 * `?state=loading|empty|error` on any screen shows that state. `?banner=1`
 * on Home shows the in-app notification banner. /m/preview/push is the lock
 * screen mock.
 */
export default function MobilePreviewApp() {
  const [params] = useSearchParams();
  const notifications = usePreviewNotifications(params.get('banner') === '1');
  if (!import.meta.env.DEV) return <Navigate to="/m" replace />;
  return (
    <Routes>
      <Route path="push" element={<PushPreview />} />
      <Route path="welcome" element={<div className="oi-mobile-root"><WelcomeScreen onStart={() => {}} onLogin={() => {}} /></div>} />
      <Route path="login" element={<div className="oi-mobile-root"><LoginScreen onSubmit={() => {}} providers={[{ key: 'google', label: 'Continue with Google' }, { key: 'apple', label: 'Continue with Apple' }]} onForgot={() => {}} onSignUp={() => {}} onBack={() => {}} error={params.get('state') === 'error' ? 'That email and password did not match. Try again.' : ''} /></div>} />
      <Route path="priming" element={<div className="oi-mobile-root"><PrimingScreen onTurnOn={() => {}} onNotNow={() => {}} recorded={params.get('state') === 'recorded'} /></div>} />
      <Route element={<MobileShell base={PREVIEW_BASE} renderAva={() => <PreviewAva />} notifications={notifications} forcedOffline={params.get('offline') === '1'} forcedLock={params.get('lock') === '1'} lockPhoto={coupleImages(FIXTURE_WEDDING)[0]} />}>
        <Route index element={<PreviewHome />} />
        <Route path="guests" element={<PreviewGuests />} />
        <Route path="guests/:id" element={<PreviewGuests />} />
        <Route path="plan" element={<PreviewPlanHub />} />
        <Route path="plan/:feature" element={<PreviewFeature />} />
        <Route path="plan/:feature/:id" element={<PreviewFeature />} />
        <Route path="site" element={<PreviewSite />} />
        <Route path="account" element={<PreviewAccount />} />
        <Route path="search" element={<PreviewSearch />} />
        <Route path="notifications" element={<PreviewNotifications />} />
        <Route path="notifications/settings" element={<PreviewNotificationSettings />} />
        <Route path="images" element={<ImageGalleryScreen back={PREVIEW_BASE} />} />
        <Route path="*" element={<Navigate to={PREVIEW_BASE} replace />} />
      </Route>
    </Routes>
  );
}

/* ── Shared fixture state ────────────────────────────────────────────── */

function useStateParam() {
  const [params] = useSearchParams();
  const s = params.get('state');
  return { loading: s === 'loading', error: s === 'error' ? new Error('preview') : null, empty: s === 'empty' };
}

const PLAN_DATA = {
  details: FIXTURE_WEDDING, guests: FIXTURE_GUESTS, tasks: FIXTURE_TASKS, budget: FIXTURE_BUDGET, schedule: FIXTURE_SCHEDULE, vendors: FIXTURE_VENDORS,
  messages: FIXTURE_MESSAGES, registryItems: FIXTURE_REGISTRY.links, registryProducts: FIXTURE_REGISTRY.products, customGifts: FIXTURE_REGISTRY.funds,
  gifts: FIXTURE_GIFTS, music: FIXTURE_MUSIC, songRequests: FIXTURE_SONG_REQUESTS, vows: FIXTURE_VOWS, moodboard: FIXTURE_MOODBOARD, tables: FIXTURE_TABLES, guestbook: [],
};
const EMPTY_DATA = { details: { ...FIXTURE_WEDDING, polls: [], qna: [], weddingParty: {}, weddingPolicies: {} }, guests: [], tasks: [], budget: [], schedule: [], vendors: [], messages: [], registryItems: [], registryProducts: [], customGifts: [], gifts: [], music: [], songRequests: [], vows: [], moodboard: [], tables: [], guestbook: [] };

function usePreviewNotifications(banner) {
  const [seenAt, setSeenAt] = useState(0);
  const [dismissed, setDismissed] = useState([]);
  const [settings, setSettings] = useState(defaultSettings());
  const [bannerSeen, setBannerSeen] = useState([]);
  return useMemo(() => {
    const items = buildFeed({ entity: FIXTURE_NOTIFICATION_ENTITY, guests: FIXTURE_GUESTS, messages: FIXTURE_MESSAGES, songRequests: FIXTURE_SONG_REQUESTS, pollVotes: FIXTURE_POLL_VOTES, polls: FIXTURE_POLLS, gifts: FIXTURE_GIFTS, tasks: FIXTURE_TASKS, budget: FIXTURE_BUDGET, briefing: { days: daysUntilWedding(FIXTURE_WEDDING.weddingDate, new Date(NOW)), sentence: '7 open tasks and 21 guests still to reply. The florist deposit is due Friday.' }, now: NOW, symbol: SYMBOL, base: PREVIEW_BASE })
      .map((it) => ({ ...it, unread: it.readOnServer != null ? !it.readOnServer && it.ts > seenAt : it.ts > seenAt && !dismissed.includes(it.id) }));
    const latestUnseen = banner ? items.find((i) => i.unread && !bannerSeen.includes(i.id)) || null : null;
    return {
      items, unread: items.filter((i) => i.unread).length, loading: false, error: null, reload: async () => {},
      markAllRead: async () => setSeenAt(NOW + 1), markRead: async (it) => setDismissed((d) => [...d, it.id]), settings, setSettings: async (s) => setSettings(s),
      latestUnseen, bannerShown: async (it) => setBannerSeen((b) => [...b, it.id]),
    };
  }, [seenAt, dismissed, settings, bannerSeen, banner]);
}

/* ── Screens ─────────────────────────────────────────────────────────── */

function PreviewHome() {
  const navigate = useNavigate();
  const { base, notifications, openAva } = useContext(ShellContext);
  const st = useStateParam();
  const d = st.empty ? EMPTY_DATA : PLAN_DATA;
  const guests = d.guests;
  const rsvp = { attending: guests.filter(isAttending).length, declined: guests.filter(isDeclined).length, awaiting: guests.filter(isAwaitingPrimary).length, invited: guests.filter((g) => !!g.invite_sent_at).length };
  const b = summariseBudget(d.budget, st.empty ? null : FIXTURE_WEDDING.budget);
  const openFeature = (key) => { if (key === 'site') return navigate(`${base}/site`); const f = featureByKey(key); if (!f) return navigate(`${base}/plan`); navigate(f.path.startsWith('../') ? `${base}/${f.path.slice(3)}` : `${base}/plan/${f.path}`); };
  return (
    <HomeScreen
      firstName={FIXTURE_WEDDING.couple1Name}
      coupleName={`${FIXTURE_WEDDING.couple1Name} & ${FIXTURE_WEDDING.couple2Name}`}
      weddingDate={FIXTURE_WEDDING.weddingDate}
      daysToGo={daysUntilWedding(FIXTURE_WEDDING.weddingDate, new Date(NOW))}
      images={coupleImages(FIXTURE_WEDDING)}
      siteUrl={st.empty ? '' : `https://openinvite.com.au/w/${FIXTURE_WEDDING.slug}`}
      rsvp={rsvp}
      budget={{ spent: b.spent, total: b.total, symbol: SYMBOL }}
      tasks={d.tasks.filter((t) => !t.completed)}
      payments={b.duePayments}
      keepPlanning={leastTouched(d, 6).map((f) => ({ key: f.key, label: f.label, image: f.image, line: f.stat(d, SYMBOL) }))}
      briefing={st.empty ? null : notifications.items.find((i) => i.type === 'briefing')?.body}
      latest={st.empty ? [] : notifications.items.filter((i) => i.type !== 'briefing').slice(0, 3)}
      onOpenGuests={() => navigate(`${base}/guests?filter=awaiting`)}
      onOpenBudget={() => navigate(`${base}/plan/budget`)}
      onOpenTasks={() => navigate(`${base}/plan/checklist`)}
      onCompleteTask={() => {}}
      onOpenFeature={openFeature}
      onOpenAva={openAva}
      onShare={() => {}}
      onSearch={() => navigate(`${base}/search`)}
      onOpenLatest={(it) => navigate(it.link)}
      onOpenNotifications={() => navigate(`${base}/notifications`)}
      loading={st.loading}
      error={st.error}
      onRetry={() => navigate(base)}
      onRefresh={async () => {}}
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
  const save = async (fields) => { if (sheet.guest) setGuests((l) => l.map((g) => (g.id === sheet.guest.id ? { ...g, ...fields } : g))); else setGuests((l) => [{ id: `g${Date.now()}`, invite_sent_at: null, ...fields }, ...l]); };
  return (
    <>
      {id ? (
        <GuestDetailScreen guest={current} back={`${base}/guests`} onEdit={() => setSheet({ open: true, guest: current })} onDelete={() => { setGuests((l) => l.filter((g) => g.id !== id)); navigate(`${base}/guests`); }} />
      ) : (
        <GuestsScreen guests={st.empty ? [] : guests} filter={filter} onFilter={setFilter} onOpenGuest={(g) => navigate(`${base}/guests/${g.id}`)} onAdd={() => setSheet({ open: true, guest: null })} onRemove={(g) => setGuests((l) => l.filter((x) => x.id !== g.id))} loading={st.loading} error={st.error} onRetry={() => navigate(`${base}/guests`)} onRefresh={async () => {}} />
      )}
      <GuestFormSheet open={sheet.open} guest={sheet.guest} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSave={save} />
    </>
  );
}

function PreviewPlanHub() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const st = useStateParam();
  const d = st.empty ? EMPTY_DATA : PLAN_DATA;
  return <PlanHubScreen data={d} symbol={SYMBOL} progress={planProgress(d)} onOpen={(f) => navigate(f.path.startsWith('../') ? `${base}/${f.path.slice(3)}` : `${base}/plan/${f.path}`)} onSearch={() => navigate(`${base}/search`)} loading={st.loading} error={st.error} onRetry={() => navigate(`${base}/plan`)} />;
}

/** Local state for one entity list in the preview. */
function useLocalList(initial) {
  const [items, setItems] = useState(initial);
  return {
    items, loading: false, error: null, reload: async () => {},
    create: async (v) => setItems((l) => [{ id: `x${Date.now()}`, created_date: new Date().toISOString(), ...v }, ...l]),
    update: async (id, v) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...v } : x))),
    remove: async (id) => setItems((l) => l.filter((x) => x.id !== id)),
  };
}

function PreviewFeature() {
  const { feature, id } = useParams();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const [params] = useSearchParams();
  const st = useStateParam();
  const back = `${base}/plan`;
  const [details, setDetails] = useState(FIXTURE_WEDDING);
  const saveDetails = async (key, value) => setDetails((d) => (key == null ? { ...d, ...value } : { ...d, [key]: value }));
  const tasks = useLocalList(FIXTURE_TASKS);
  const budget = useLocalList(FIXTURE_BUDGET);
  const schedule = useLocalList(FIXTURE_SCHEDULE);
  const vendors = useLocalList(FIXTURE_VENDORS);
  const moodboard = useLocalList(FIXTURE_MOODBOARD);
  const vows = useLocalList(FIXTURE_VOWS);
  const music = useLocalList(FIXTURE_MUSIC);
  const messages = useLocalList(FIXTURE_MESSAGES);
  const links = useLocalList(FIXTURE_REGISTRY.links);
  const products = useLocalList(FIXTURE_REGISTRY.products);
  const funds = useLocalList(FIXTURE_REGISTRY.funds);
  const received = useLocalList(FIXTURE_REGISTRY.received);
  const [requests, setRequests] = useState(FIXTURE_SONG_REQUESTS);
  const [tables, setTables] = useState(FIXTURE_TABLES);
  const common = { loading: st.loading, error: st.error, onRetry: () => navigate(`${base}/plan/${feature}`), back };
  const f = featureByKey(feature);
  if (!f) return <DesktopFeatureScreen title="Not here yet" body="This part of the planner is not in the app yet." back={back} onDesktop={() => navigate(back)} />;
  const lists = { schedule, vendors, moodboard, vows };
  const ent = (key) => { const l = lists[key]; return <EntityListScreen schema={ENTITIES[key]} items={st.empty ? [] : l.items} onCreate={l.create} onUpdate={l.update} onDelete={l.remove} {...common} />; };

  if (f.kind === 'details') return <DetailsScreen schema={DETAILS[f.key]} details={st.empty ? {} : details} onSave={saveDetails} {...common} />;
  if (f.kind === 'entity') return ent(f.key);
  if (f.kind === 'desktop') return <DesktopFeatureScreen title={f.label} body="This one is built for a bigger screen. Open it on desktop and the result shows here." stat={f.stat(PLAN_DATA, SYMBOL)} back={back} onDesktop={() => {}} />;
  switch (f.key) {
    case 'checklist': return <ChecklistScreen tasks={st.empty ? [] : tasks.items} onToggle={(t) => tasks.update(t.id, { completed: !t.completed })} onRemove={(t) => tasks.remove(t.id)} onAdd={async (v) => tasks.create({ completed: false, view_type: 'todo', ...v })} openAdd={params.get('add') === '1'} {...common} />;
    case 'budget': return id
      ? <BudgetCategoryScreen category={id} items={budget.items} plan={FIXTURE_WEDDING.budget} symbol={SYMBOL} onSave={async (v, ex) => (ex ? budget.update(ex.id, v) : budget.create(v))} back={`${base}/plan/budget`} />
      : <BudgetScreen items={st.empty ? [] : budget.items} plan={st.empty ? null : FIXTURE_WEDDING.budget} symbol={SYMBOL} onOpenCategory={(c) => navigate(`${base}/plan/budget/${c}`)} onAdd={async (v, ex) => (ex ? budget.update(ex.id, v) : budget.create(v))} onMarkPaid={(i) => budget.update(i.id, { paid: true })} openAdd={params.get('add') === '1'} {...common} />;
    case 'messages': return id
      ? <ThreadScreen message={messages.items.find((m) => m.id === id)} onReply={async (text) => messages.update(id, { reply: text, replied: true, reply_sent_at: new Date().toISOString(), read: true })} back={`${base}/plan/messages`} />
      : <MessagesScreen messages={st.empty ? [] : messages.items} onOpen={(m) => { messages.update(m.id, { read: true }); navigate(`${base}/plan/messages/${m.id}`); }} onMarkRead={(m) => messages.update(m.id, { read: !m.read })} {...common} />;
    case 'seating': return <SeatingScreen tables={st.empty ? [] : tables} guests={FIXTURE_GUESTS} onMove={async (guestId, tableName) => setTables((ts) => ts.map((t) => ({ ...t, assigned_guests: (t.assigned_guests || []).filter((a) => a.guest_id !== guestId).concat(t.name === tableName ? [{ guest_id: guestId, seat_index: (t.assigned_guests || []).length }] : []) })))} onDesktop={() => {}} {...common} />;
    case 'polls': case 'suite-polls': return <PollsScreen polls={st.empty ? [] : details.polls || []} votes={FIXTURE_POLL_VOTES} onCreate={async ({ title, options }) => saveDetails('polls', [...(details.polls || []), { id: `p${Date.now()}`, title, options: options.map((label, i) => ({ id: `o${Date.now()}${i}`, label, votes: 0 })), isActive: true }])} onEnd={async (p) => saveDetails('polls', (details.polls || []).map((x) => (x.id === p.id ? { ...x, isActive: false } : x)))} {...common} />;
    case 'music': return <MusicScreen tracks={st.empty ? [] : music.items} requests={st.empty ? [] : requests} playlistUrl={details.music?.playlists?.[0]?.playlistUrl} onCreate={music.create} onUpdate={music.update} onDelete={music.remove} onReview={async (r, action) => { setRequests((l) => l.map((x) => (x.id === r.id ? { ...x, status: action === 'add' ? 'added' : 'declined' } : x))); if (action === 'add') music.create({ song_title: r.title, artist: r.artist, category: 'party', guest_suggestion: true }); }} {...common} />;
    case 'registry': case 'suite-registry': return <RegistryScreen lists={{ links, products, funds, received }} symbol={SYMBOL} back={back} />;
    case 'qna': return <QnaScreen qna={st.empty ? [] : details.qna || []} onSave={async (next) => saveDetails('qna', next)} {...common} />;
    case 'good-to-know': return <GoodToKnowScreen policies={st.empty ? {} : details.weddingPolicies || {}} onSave={async (next) => saveDetails('weddingPolicies', next)} {...common} />;
    case 'suite-accommodation': return <PlacesScreen title="Accommodation" places={st.empty ? [] : details.guestSuiteAccommodation?.places || []} onSave={async (next) => saveDetails('guestSuiteAccommodation', { ...(details.guestSuiteAccommodation || {}), places: next })} intro="Places guests can stay, shown on your site." onDesktop={() => {}} {...common} />;
    case 'suite-transport': return <PlacesScreen title="Transport" places={st.empty ? [] : details.guestSuiteTransport?.places || []} onSave={async (next) => saveDetails('guestSuiteTransport', { ...(details.guestSuiteTransport || {}), places: next })} intro="How guests get there and back, shown on your site." onDesktop={() => {}} {...common} />;
    case 'experience': return <PlacesScreen title="Experience guide" places={st.empty ? [] : details.experienceGuide?.couplePicks || []} onSave={async (next) => saveDetails('experienceGuide', { ...(details.experienceGuide || {}), couplePicks: next })} intro="Your picks around the venue: a coffee, a walk, a good dinner." onDesktop={() => {}} {...common} />;
    case 'suite-schedule': return <SuiteScheduleScreen items={st.empty ? [] : schedule.items} onEdit={() => navigate(`${base}/plan/schedule`)} {...common} />;
    case 'wedding-party': return <WeddingPartyScreen party={st.empty ? {} : details.weddingParty || {}} onSave={async (next) => saveDetails('weddingParty', next)} {...common} />;
    case 'marketplace': return <MarketplaceScreen results={[]} searching={false} onSearch={() => {}} onSave={() => {}} back={back} />;
    case 'studio': return <DesktopFeatureScreen title="Design studio" body="The website builder and Ava studio need a bigger screen." back={back} onDesktop={() => navigate(`${base}/site`)} />;
    default: return <DesktopFeatureScreen title={f.label} body="Best on desktop for now." back={back} onDesktop={() => {}} />;
  }
}

function PreviewSite() {
  const navigate = useNavigate();
  const st = useStateParam();
  const { base } = useContext(ShellContext);
  const universe = getUniverse(FIXTURE_WEDDING.activeUniverse);
  return <SiteScreen universeName={universe?.name} isLive={!st.empty && FIXTURE_WEDDING.websiteEnabled} previewImage={coupleImages(FIXTURE_WEDDING)[0]} coupleName={`${FIXTURE_WEDDING.couple1Name} & ${FIXTURE_WEDDING.couple2Name}`} siteUrl={st.empty ? '' : `https://openinvite.com.au/w/${FIXTURE_WEDDING.slug}`} onView={() => {}} onShare={() => {}} onOpen={(key) => navigate(`${base}/plan/${key}`)} onOpenDesktop={() => {}} loading={st.loading} error={st.error} onRetry={() => navigate(`${base}/site`)} />;
}

function PreviewAccount() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const [params] = useSearchParams();
  const native = params.get('native') === '1';
  return <AccountScreen name={FIXTURE_USER.full_name} email={FIXTURE_USER.email} coupleName={`${FIXTURE_WEDDING.couple1Name} & ${FIXTURE_WEDDING.couple2Name}`} weddingDate={dateLong(FIXTURE_WEDDING.weddingDate)} photo={coupleImages(FIXTURE_WEDDING)[0]} planLabel="Pro" planNote={null} trialDaysLeft={null} showPurchases={!native} onUpgrade={() => {}} onDetails={() => {}} onEventDetails={() => navigate(`${base}/plan/event-details`)} onCollaborators={() => {}} onNotifications={() => {}} onNotificationSettings={() => navigate(`${base}/notifications/settings`)} onHelp={() => {}} onContact={() => {}} onLogout={() => {}} loading={false} />;
}

function PreviewSearch() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  return <SearchScreenPage guests={FIXTURE_GUESTS} tasks={FIXTURE_TASKS} vendors={FIXTURE_VENDORS} base={base} onClose={() => navigate(-1)} />;
}

function PreviewNotifications() {
  const navigate = useNavigate();
  const { notifications, base } = useContext(ShellContext);
  const st = useStateParam();
  return <NotificationsScreen items={st.empty ? [] : notifications.items} loading={st.loading} error={st.error} onRetry={() => navigate(`${base}/notifications`)} onMarkAllRead={notifications.markAllRead} onOpen={(it) => notifications.markRead(it)} onSettings={() => navigate(`${base}/notifications/settings`)} back={base} now={NOW} />;
}

function PreviewNotificationSettings() {
  const { notifications, base } = useContext(ShellContext);
  return <NotificationSettingsScreen settings={notifications.settings} onChange={notifications.setSettings} back={`${base}/notifications`} />;
}

/** A static stand-in for the Ava pod so the preview makes no network calls. */
function PreviewAva() {
  const messages = useMemo(() => FIXTURE_AVA_MESSAGES, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1A1A1A', color: '#FFFFFF' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '84%', padding: '12px 16px', borderRadius: 20, background: m.role === 'user' ? '#E03553' : 'rgba(255,255,255,0.08)', fontSize: 15, lineHeight: '22px' }}>{m.text}</div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input className="oi-m-input" placeholder="Ask Ava anything" readOnly style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }} />
      </div>
    </div>
  );
}
