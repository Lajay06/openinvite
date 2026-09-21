import React, { useContext, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CATEGORY_QUERIES } from '@/lib/vendorPlaces';
import { ShellContext } from '../../shell/MobileShell';
import { usePlanData, useEntity, useWeddingDetails } from '../../data/plan';
import { useTasks, useBudget, useGuests, useTaskWrites, useBudgetWrites } from '../../data/wedding';
import { useApi, useSymbol } from '../../data/api';
import useLoad from '../../data/useLoad';
import { hapticLight } from '../../native';
import { openDesktop } from '../../lib/links';
import { featureByKey } from '../../features/registry';
import { DETAILS, ENTITIES } from '../../features/schemas';
import DetailsScreen from '../../features/DetailsScreen';
import EntityListScreen from '../../features/EntityListScreen';
import PlanHubScreen, { planProgress } from './PlanHubScreen';
import ChecklistScreen from './ChecklistScreen';
import BudgetScreen, { BudgetCategoryScreen } from './BudgetScreen';
import MessagesScreen, { ThreadScreen } from './MessagesScreen';
import SeatingScreen from './SeatingScreen';
import PollsScreen from './PollsScreen';
import MusicScreen from './MusicScreen';
import RegistryScreen from './RegistryScreen';
import { QnaScreen, GoodToKnowScreen, PlacesScreen, SuiteScheduleScreen, WeddingPartyScreen, MarketplaceScreen, DesktopFeatureScreen } from './SuiteScreens';

const genId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** /m/plan: the hub. */
export function PlanHubContainer() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const symbol = useSymbol();
  const data = usePlanData();
  const open = (f) => {
    if (f.path.startsWith('../')) return navigate(`${base}/${f.path.slice(3)}`);
    return navigate(`${base}/plan/${f.path}`);
  };
  return <PlanHubScreen data={data.data} symbol={symbol} progress={planProgress(data.data)} onOpen={open} onSearch={() => navigate(`${base}/search`)} loading={data.loading} error={data.error} onRetry={data.reload} />;
}

/** /m/plan/:feature and deeper. */
export default function PlanFeatureContainer() {
  const { feature, id } = useParams();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const back = `${base}/plan`;
  const f = featureByKey(feature);
  if (!f) return <DesktopFeatureScreen title="Not here yet" body="This part of the planner is not in the app yet." back={back} onDesktop={() => navigate(back)} />;

  if (f.kind === 'details') return <DetailsContainer f={f} back={back} />;
  if (f.kind === 'entity') return <EntityContainer f={f} back={back} />;
  if (f.kind === 'desktop') return <DesktopFeatureScreen title={f.label} body={desktopBody(f.key)} stat="" back={back} onDesktop={() => openDesktop(navigate, f.desktop)} />;
  switch (f.key) {
    case 'checklist': return <ChecklistContainer back={back} />;
    case 'budget': return id ? <BudgetCategoryContainer category={id} back={`${base}/plan/budget`} /> : <BudgetContainer back={back} />;
    case 'messages': return id ? <ThreadContainer id={id} back={`${base}/plan/messages`} /> : <MessagesContainer back={back} />;
    case 'seating': return <SeatingContainer back={back} />;
    case 'polls': case 'suite-polls': return <PollsContainer back={back} />;
    case 'music': return <MusicContainer back={back} />;
    case 'registry': case 'suite-registry': return <RegistryContainer back={back} />;
    case 'qna': return <QnaContainer back={back} />;
    case 'good-to-know': return <GoodToKnowContainer back={back} />;
    case 'suite-accommodation': return <PlacesContainer back={back} title="Accommodation" keyName="guestSuiteAccommodation" desktop="/GuestSuiteAccommodation" intro="Places guests can stay, shown on your site." />;
    case 'suite-transport': return <PlacesContainer back={back} title="Transport" keyName="guestSuiteTransport" desktop="/GuestSuiteTransport" intro="How guests get there and back, shown on your site." />;
    case 'experience': return <PlacesContainer back={back} title="Experience guide" keyName="experienceGuide" listKey="couplePicks" desktop="/GuestSuiteExperience" intro="Your picks around the venue: a coffee, a walk, a good dinner." />;
    case 'suite-schedule': return <SuiteScheduleContainer back={back} />;
    case 'wedding-party': return <WeddingPartyContainer back={back} />;
    case 'marketplace': return <MarketplaceContainer back={back} />;
    case 'studio': return <DesktopFeatureScreen title="Design studio" body="The website builder and Ava studio need a bigger screen." back={back} onDesktop={() => navigate(`${base}/site`)} />;
    default: return <DesktopFeatureScreen title={f.label} body="Best on desktop for now." back={back} onDesktop={() => openDesktop(navigate, f.desktop)} />;
  }
}

function desktopBody(key) {
  return {
    'send-invites': 'Sending invitations picks guests, an email design and a preview side by side. That works best on a laptop.',
    invitations: 'Designing the invitation uses the full builder. Open it on desktop and the result shows on your site.',
    considerations: 'Considerations is a long read tailored to your ceremony and traditions. It reads best on a bigger screen.',
  }[key] || 'Best on desktop for now.';
}

/* ── Generic ─────────────────────────────────────────────────────────── */

function DetailsContainer({ f, back }) {
  const wd = useWeddingDetails();
  const schema = DETAILS[f.key];
  return <DetailsScreen schema={schema} details={wd.details} onSave={wd.save} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />;
}

function EntityContainer({ f, back }) {
  const schema = ENTITIES[f.key];
  const e = useEntity(schema.entity, schema.sort);
  const wrap = (fn, ok) => async (...a) => { const r = await fn(...a); toast.success(ok); return r; };
  return <EntityListScreen schema={schema} items={e.data || []} onCreate={wrap(e.create, 'Added')} onUpdate={wrap(e.update, 'Saved')} onDelete={wrap(e.remove, 'Removed')} loading={e.loading} error={e.error} onRetry={e.reload} back={back} onRefresh={e.reload} />;
}

/* ── Checklist and budget ────────────────────────────────────────────── */

function ChecklistContainer({ back }) {
  const [params] = useSearchParams();
  const tasks = useTasks();
  const taskWrites = useTaskWrites();
  const toggle = async (t) => {
    if (!t.completed) hapticLight();
    try {
      await tasks.optimistic((list) => (list || []).map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)), () => taskWrites.toggle(t), () => toast.error('Could not save that. Put back the way it was.'));
    } catch { /* rolled back */ }
  };
  const add = async (fields) => { await taskWrites.create(fields); toast.success('Task added'); tasks.reload(); };
  const remove = async (t) => { if (!window.confirm('Remove this task?')) return; try { await taskWrites.remove(t.id); toast.success('Task removed'); tasks.reload(); } catch { toast.error('Could not remove that task.'); } };
  return <ChecklistScreen tasks={tasks.data || []} onToggle={toggle} onAdd={add} onRemove={remove} loading={tasks.loading} error={tasks.error} onRetry={tasks.reload} back={back} openAdd={params.get('add') === '1'} onRefresh={tasks.reload} />;
}

function BudgetContainer({ back }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const symbol = useSymbol();
  const budget = useBudget();
  const budgetWrites = useBudgetWrites();
  const save = async (fields, existing) => {
    if (existing) { await budgetWrites.update(existing.id, fields); toast.success('Expense updated'); } else { await budgetWrites.create(fields); toast.success('Expense added'); }
    budget.reload();
  };
  const markPaid = async (i) => {
    try {
      await budget.optimistic((d) => ({ ...d, items: (d?.items || []).map((x) => (x.id === i.id ? { ...x, paid: true } : x)) }), () => budgetWrites.update(i.id, { paid: true }), () => toast.error('Could not save that. Put back the way it was.'));
      hapticLight();
    } catch { /* rolled back */ }
  };
  return <BudgetScreen items={budget.data?.items || []} plan={budget.data?.plan || null} symbol={symbol} onOpenCategory={(c) => navigate(`${base}/plan/budget/${c}`)} onAdd={save} onMarkPaid={markPaid} loading={budget.loading} error={budget.error} onRetry={budget.reload} back={back} openAdd={params.get('add') === '1'} onRefresh={budget.reload} />;
}

function BudgetCategoryContainer({ category, back }) {
  const symbol = useSymbol();
  const budget = useBudget();
  const budgetWrites = useBudgetWrites();
  const save = async (fields, existing) => {
    if (existing) { await budgetWrites.update(existing.id, fields); toast.success('Expense updated'); } else { await budgetWrites.create(fields); toast.success('Expense added'); }
    budget.reload();
  };
  return <BudgetCategoryScreen category={category} items={budget.data?.items || []} plan={budget.data?.plan || null} symbol={symbol} onSave={save} back={back} />;
}

/* ── Messages ────────────────────────────────────────────────────────── */

function MessagesContainer({ back }) {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const m = useEntity('GuestMessage', '-created_date');
  const markRead = async (msg) => {
    try {
      await m.optimistic((list) => (list || []).map((x) => (x.id === msg.id ? { ...x, read: !msg.read } : x)), () => m.updateQuiet(msg.id, { ...msg, read: !msg.read }), () => toast.error('Could not save that. Put back the way it was.'));
    } catch { /* rolled back */ }
  };
  return <MessagesScreen messages={m.data || []} onOpen={(msg) => navigate(`${base}/plan/messages/${msg.id}`)} onMarkRead={markRead} loading={m.loading} error={m.error} onRetry={m.reload} back={back} onRefresh={m.reload} />;
}

function ThreadContainer({ id, back }) {
  const api = useApi();
  const m = useEntity('GuestMessage', '-created_date');
  const wd = useWeddingDetails();
  const [sending, setSending] = useState(false);
  const message = (m.data || []).find((x) => x.id === id);
  // Opening a thread marks it read, as Messages.jsx does when a message is expanded.
  const marked = React.useRef(false);
  React.useEffect(() => {
    if (message && !message.read && !marked.current) { marked.current = true; m.update(message.id, { ...message, read: true }).catch(() => {}); }
  }, [message, m]);
  const reply = async (replyText) => {
    setSending(true);
    const tid = toast.loading('Sending reply');
    try {
      const coupleNames = wd.details?.couple1Name && wd.details?.couple2Name ? `${wd.details.couple1Name} & ${wd.details.couple2Name}` : (wd.details?.couple1Name || '');
      await api.json('/api/send-guest-reply', { method: 'POST', body: JSON.stringify({ guestEmail: message.guest_email, guestName: message.guest_name, originalMessage: message.message, replyText, coupleNames }) });
      await m.update(message.id, { ...message, reply: replyText, replied: true, reply_sent_at: new Date().toISOString() });
      toast.success('Reply sent', { id: tid });
    } catch (e) {
      toast.error(e?.message || 'Could not send the reply.', { id: tid });
    } finally { setSending(false); }
  };
  return <ThreadScreen message={message} onReply={reply} sending={sending} back={back} />;
}

/* ── Seating ─────────────────────────────────────────────────────────── */

function SeatingContainer({ back }) {
  const navigate = useNavigate();
  const api = useApi();
  const tables = useEntity('Table', '-created_date');
  const guests = useGuests();
  const move = async (guestId, tableName) => {
    try {
      if (tableName) await api.seating.assignByName({ guestId, tableName, tables: tables.data || [] });
      else await api.seating.unassign({ guestId, tables: tables.data || [] });
      hapticLight();
      toast.success(tableName ? `Moved to ${tableName}` : 'Taken off the table');
      tables.reload();
    } catch (e) { toast.error(e?.message || 'Could not move that guest.'); throw e; }
  };
  return <SeatingScreen tables={tables.data || []} guests={guests.data || []} onMove={move} loading={tables.loading || guests.loading} error={tables.error || guests.error} onRetry={() => { tables.reload(); guests.reload(); }} back={back} onDesktop={() => openDesktop(navigate, '/Seating')} />;
}

/* ── Polls: WeddingDetails.polls, as Polls.jsx persists them ─────────── */

function PollsContainer({ back }) {
  const api = useApi();
  const wd = useWeddingDetails();
  const votes = useLoad(() => api.list('PollVote', '-created_date').catch(() => []), []);
  const polls = wd.details?.polls || [];
  const persist = async (next) => { await wd.save('polls', next, false); };
  const create = async ({ title, options }) => {
    const poll = { id: genId(), title, category: 'custom', emoji: '', options: options.map((label) => ({ id: genId(), label, votes: 0 })), allowComments: true, comments: [], isActive: true, createdAt: new Date().toISOString(), avaInsight: null, expiresAt: null };
    await persist([...polls, poll]);
    toast.success('Poll created');
  };
  const end = async (p) => { await persist(polls.map((x) => (x.id === p.id ? { ...x, isActive: false } : x))); toast.success('Poll ended'); };
  return <PollsScreen polls={polls} votes={votes.data || []} onCreate={create} onEnd={end} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />;
}

/* ── Music ───────────────────────────────────────────────────────────── */

function MusicContainer({ back }) {
  const api = useApi();
  const tracks = useEntity('Music', '-created_date');
  const requests = useLoad(() => api.songRequests.list(), []);
  const wd = useWeddingDetails();
  const playlistUrl = (wd.details?.music?.playlists || [])[0]?.playlistUrl || '';
  const review = async (r, action) => {
    try { await api.songRequests.review(r.id, action); toast.success(action === 'add' ? 'Added to the playlist' : 'Declined'); requests.reload(); tracks.reload(); } catch (e) { toast.error(e?.message || 'Could not update that request.'); }
  };
  const wrap = (fn, ok) => async (...a) => { const r = await fn(...a); toast.success(ok); return r; };
  return <MusicScreen tracks={tracks.data || []} requests={requests.data || []} playlistUrl={playlistUrl} onCreate={wrap(tracks.create, 'Track added')} onUpdate={wrap(tracks.update, 'Saved')} onDelete={wrap(tracks.remove, 'Removed')} onReview={review} loading={tracks.loading} error={tracks.error} onRetry={() => { tracks.reload(); requests.reload(); }} back={back} />;
}

/* ── Registry ────────────────────────────────────────────────────────── */

function RegistryContainer({ back }) {
  const symbol = useSymbol();
  const links = useEntity('RegistryItem');
  const products = useEntity('RegistryProduct');
  const funds = useEntity('CustomGift');
  const received = useEntity('ReceivedGift');
  const wrap = (e) => ({ items: e.data || [], loading: e.loading, error: e.error, reload: e.reload, create: async (v) => { await e.create(v); toast.success('Added'); }, update: async (id, v) => { await e.update(id, v); toast.success('Saved'); }, remove: async (id) => { await e.remove(id); toast.success('Removed'); } });
  return <RegistryScreen lists={{ links: wrap(links), products: wrap(products), funds: wrap(funds), received: wrap(received) }} symbol={symbol} back={back} />;
}

/* ── Guest suite editors on WeddingDetails ───────────────────────────── */

function QnaContainer({ back }) {
  const wd = useWeddingDetails();
  return <QnaScreen qna={wd.details?.qna || []} onSave={async (next) => { await wd.save('qna', next, false); toast.success('Saved'); }} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />;
}

function GoodToKnowContainer({ back }) {
  const wd = useWeddingDetails();
  return <GoodToKnowScreen policies={wd.details?.weddingPolicies || {}} onSave={async (next) => { await wd.save('weddingPolicies', next, false); }} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />;
}

function PlacesContainer({ back, title, keyName, listKey = 'places', desktop, intro }) {
  const navigate = useNavigate();
  const wd = useWeddingDetails();
  const obj = wd.details?.[keyName] || {};
  const places = obj[listKey] || [];
  const save = async (next) => { await wd.save(keyName, { ...obj, [listKey]: next }, false); toast.success('Saved'); };
  return <PlacesScreen title={title} places={places} onSave={save} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} intro={intro} onDesktop={() => openDesktop(navigate, desktop)} />;
}

function SuiteScheduleContainer({ back }) {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const s = useEntity('Schedule', 'start_time');
  return <SuiteScheduleScreen items={s.data || []} loading={s.loading} error={s.error} onRetry={s.reload} back={back} onEdit={() => navigate(`${base}/plan/schedule`)} />;
}

function WeddingPartyContainer({ back }) {
  const wd = useWeddingDetails();
  return <WeddingPartyScreen party={wd.details?.weddingParty || {}} onSave={async (next) => { await wd.save('weddingParty', next, false); toast.success('Saved'); }} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />;
}

/* ── Marketplace ─────────────────────────────────────────────────────── */

const MARKET_LABEL = { photography: 'Photography', videography: 'Videography', catering: 'Catering', florals: 'Florals', styling: 'Styling', beauty: 'Hair & makeup', music: 'Music & DJ', venue: 'Venues', cake: 'Cake', transport: 'Transport' };

function MarketplaceContainer({ back }) {
  const api = useApi();
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const saved = useLoad(() => api.vendors.savedPlaceIds().catch(() => new Set()), []);
  const savedIds = useMemo(() => new Set(saved.data || []), [saved.data]);
  const search = async ({ category, location }) => {
    setSearching(true); setError('');
    try {
      const places = await api.places.search({ q: CATEGORY_QUERIES[MARKET_LABEL[category]] || 'wedding vendor', location });
      setResults((places || []).map((p) => ({ id: p.place_id, place_id: p.place_id, placeId: p.place_id, name: p.name, category: MARKET_LABEL[category], rating: p.rating, address: p.formatted_address || p.vicinity, website: p.website })));
    } catch (e) { setError(e?.message || 'Search did not work.'); } finally { setSearching(false); }
  };
  const save = async (v) => {
    try { await api.vendors.saveFromPlaces(v, null); toast.success('Added to my vendors'); saved.reload(); } catch (e) { toast.error(e?.message || 'Could not add that vendor.'); }
  };
  return <MarketplaceScreen results={results} searching={searching} onSearch={search} onSave={save} savedIds={savedIds} back={back} error={error} />;
}

