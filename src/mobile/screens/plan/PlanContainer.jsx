import React, { useContext, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CATEGORY_QUERIES } from '@/lib/vendorPlaces';
import { ShellContext } from '../../shell/MobileShell';
import { usePlanData, useEntity, useWeddingDetails } from '../../data/plan';
import { useTasks, useBudget, useGuests, useTaskWrites, useBudgetWrites } from '../../data/wedding';
import { useApi, useSymbol } from '../../data/api';
import useLoad from '../../data/useLoad';
import { hapticLight, shareLink, openExternal, prefGet, prefSet } from '../../native';
import { openDesktop, siteUrlFor, siteOrigin } from '../../lib/links';
import { resolveRecipients } from '@/lib/questionnaireRecipients';
import { getWeddingEvents, RECEPTION_EVENT_ID } from '@/lib/weddingEvents';
import { validatePlanAssignments } from '@/lib/tableAssignment';
import { featureByKey } from '../../features/registry';
import { DETAILS, ENTITIES } from '../../features/schemas';
import DetailsScreen from '../../features/DetailsScreen';
import EntityListScreen from '../../features/EntityListScreen';
import PlanHubScreen, { planProgress } from './PlanHubScreen';
import EventDetailsScreen, { InvitePromptSheet } from './EventDetailsScreen';
import ScheduleScreen from './ScheduleScreen';
import MoodboardScreen from './MoodboardScreen';
import VowsScreen from './VowsScreen';
import SendInvitesScreen from '../guests/SendInvitesScreen';
import ChecklistScreen from './ChecklistScreen';
import BudgetScreen, { BudgetCategoryScreen } from './BudgetScreen';
import MessagesScreen, { ThreadScreen, WhatsAppComposeSheet } from './MessagesScreen';
import { countryFromWedding } from '@/lib/countryFromVenue';
import { DEFAULT_COUNTRY } from '@/lib/phoneE164';
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

  if (f.key === 'event-details') return <EventDetailsContainer back={back} />;
  if (f.key === 'schedule') return <ScheduleContainer back={back} />;
  if (f.key === 'send-invites') return <SendInvitesContainer back={`${base}/guests`} />;
  if (f.key === 'moodboard') return <MoodboardContainer back={back} />;
  if (f.key === 'vows') return <VowsContainer back={back} />;
  if (f.key === 'invitations') return <InvitationsContainer back={back} />;
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

/* ── Event details ───────────────────────────────────────────────────── */

function EventDetailsContainer({ back }) {
  const api = useApi();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const wd = useWeddingDetails();
  const [prompt, setPrompt] = useState(null);
  const changeAddress = async (newSlug) => {
    let body;
    try {
      body = await api.json('/api/change-address', { method: 'POST', body: JSON.stringify({ weddingId: wd.details?.id || api.wedding.id(), newSlug }) });
    } catch (e) {
      const said = { taken: 'That address belongs to another wedding, or redirects to one. Try another.', reserved: 'That address is reserved. Try another.', 'not-an-address': 'That is not an address. Letters, numbers and hyphens.', forbidden: 'That is not your wedding to rename.' }[e?.body?.error];
      throw new Error(said || 'The address could not be changed. Nothing was saved.');
    }
    if (body?.unchanged) { toast('That is already your address.'); return; }
    // The client writes with its own token, so the update meets the record's owner-scoped RLS (ChangeAddressDialog.jsx).
    await wd.save(null, { slug: body.slug, previousSlugs: body.previousSlugs }, false);
    toast.success(`Your address is now openinvite.com.au/w/${body.slug}`);
  };
  return (
    <>
      <EventDetailsScreen details={wd.details} onSave={(key, value) => wd.save(key, value, false)} onChangeAddress={changeAddress} onInvitePrompt={setPrompt} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />
      <InvitePromptSheet event={prompt} onClose={() => setPrompt(null)} onEveryone={() => navigate(`${base}/guests?inviteAll=${encodeURIComponent(prompt.event_id)}&eventName=${encodeURIComponent(prompt.name)}`)} onChoose={() => navigate(`${base}/guests?setEvents=${encodeURIComponent(prompt.event_id)}`)} />
    </>
  );
}

/* ── Schedule ────────────────────────────────────────────────────────── */

function ScheduleContainer({ back }) {
  const api = useApi();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const [params] = useSearchParams();
  const s = useEntity('Schedule', 'start_time');
  // The timeline's other sources, as ScheduleHub.jsx loads them, each failing soft.
  const extra = useLoad(async () => {
    const soft = (p) => p.catch(() => []);
    const [vendors, invitation, wd, todos, customPages, liveStreams] = await Promise.all([
      soft(api.list('Vendor')), api.wedding.invitation().catch(() => null), api.wedding.get().catch(() => null), soft(api.list('Note')), soft(api.list('CustomEventPage')), soft(api.list('LiveStream')),
    ]);
    return { vendors, invitation, wd, weddingDate: wd?.weddingDate || null, todos, customPages, liveStreams };
  }, []);
  const feed = useLoad(() => api.json('/api/schedule-feed-url').then((d) => d.url || null).catch(() => null), []);
  const wrap = (fn, ok) => async (...a) => { const r = await fn(...a); toast.success(ok); return r; };
  const openHome = (kind, url) => {
    if (kind === 'google-calendar') { const webcal = String(url).replace(/^https?:/, 'webcal:'); return openExternal(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`); }
    if (kind === 'webcal') return openExternal(String(url).replace(/^https?:/, 'webcal:'));
    const to = { todo: 'checklist', vendor: 'vendors', deadline: 'event-details', music: 'music', wd: 'event-details', livestream: 'event-details', custom: 'event-details' }[kind];
    if (to) navigate(`${base}/plan/${to}`);
  };
  return <ScheduleScreen items={s.data || []} sources={extra.data || {}} feedUrl={feed.data} feedState={feed.loading ? 'loading' : feed.data ? 'ready' : 'unavailable'} onCreate={wrap(s.create, 'Event added')} onUpdate={wrap(s.update, 'Event updated')} onDelete={wrap(s.remove, 'Event deleted')} onOpenHome={openHome} loading={s.loading} error={s.error} onRetry={() => { s.reload(); extra.reload(); }} back={back} openAdd={params.get('add') === '1'} onRefresh={async () => { s.reload(); extra.reload(); }} />;
}

/* ── Send invites ────────────────────────────────────────────────────── */

function SendInvitesContainer({ back }) {
  const api = useApi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const guests = useGuests();
  const wd = useWeddingDetails();
  const ids = (params.get('ids') || '').split(',').filter(Boolean);
  const events = (params.get('events') || '').split(',').filter(Boolean);
  // Ultra only, as Guests.jsx gates it: a Pro plan cannot send.
  const isPro = (api.user?.plan || 'free') !== 'pro';
  return <SendInvitesScreen guests={guests.data || []} wedding={wd.details} user={api.user} initialSelectedIds={ids} restrictEventIds={events.length ? events : null} initialType={params.get('type') || 'invite'} isPro={isPro} onSent={() => navigate(back)} back={back} loading={guests.loading || wd.loading} error={guests.error} onRetry={guests.reload} />;
}

/* ── Moodboard ───────────────────────────────────────────────────────── */

function MoodboardContainer({ back }) {
  const [params] = useSearchParams();
  const e = useEntity('MoodboardItem', '-created_date');
  const wd = useWeddingDetails();
  const wrap = (fn, ok) => async (...a) => { const r = await fn(...a); toast.success(ok); return r; };
  return <MoodboardScreen items={e.data || []} coverPhoto={wd.details?.coverPhoto} onCreate={wrap(e.create, 'Pinned')} onUpdate={wrap(e.update, 'Saved')} onDelete={wrap(e.remove, 'Removed')} loading={e.loading} error={e.error} onRetry={e.reload} back={back} onRefresh={e.reload} openAdd={params.get('add') === '1'} />;
}

/* ── Vows & speeches ─────────────────────────────────────────────────── */

function VowsContainer({ back }) {
  const api = useApi();
  const e = useEntity('VowSpeech', '-created_date');
  const [revealed, setRevealed] = useState(() => new Set());
  const [tick, setTick] = useState(0);
  const reveal = (id) => { setRevealed((s) => new Set([...s, id])); setTick((t) => t + 1); };
  const wrap = (fn, ok) => async (...a) => { const r = await fn(...a); toast.success(ok); return r; };
  return <VowsScreen items={e.data || []} revealed={revealed} revealTick={tick} onCreate={wrap(e.create, 'Saved')} onUpdate={wrap(e.update, 'Saved')} onDelete={wrap(e.remove, 'Deleted')}
    onSetPin={async (it, pin) => { const r = await api.vows.setPin(it.id, pin); if (r.ok) { reveal(it.id); e.reload(); } return r; }}
    onUnlock={async (it, pin) => { const r = await api.vows.unlock(it.id, pin); if (r.ok) reveal(it.id); return r; }}
    onClearPin={async (it) => { const r = await api.vows.clearPin(it.id); if (r.ok) { reveal(it.id); e.reload(); } return r; }}
    onAsk={(prompt) => api.llm(prompt)} loading={e.loading} error={e.error} onRetry={e.reload} back={back} onRefresh={e.reload} />;
}

/* ── Invitations: the builder is a canvas and stays on desktop; the hand-off names what exists ── */

function InvitationsContainer({ back }) {
  const api = useApi();
  const navigate = useNavigate();
  const inv = useLoad(() => api.wedding.invitation().catch(() => null), []);
  const saved = inv.data?.updated_date || inv.data?.created_date;
  const stat = inv.loading ? '' : inv.data ? `Saved ${new Date(saved).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : 'No invitation yet';
  return <DesktopFeatureScreen title="Invitations" body={inv.data ? `Your invitation for ${inv.data.couple_names || 'your wedding'} is designed in the builder on desktop. Sending it is here, under Send invites.` : 'Designing the invitation uses the full builder. Open it on desktop, and sending it is here, under Send invites.'} stat={stat} back={back} onDesktop={() => openDesktop(navigate, '/Invitations')} />;
}

/* ── Generic ─────────────────────────────────────────────────────────── */

function DetailsContainer({ f, back }) {
  const api = useApi();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const wd = useWeddingDetails();
  const schema = DETAILS[f.key];
  return <DetailsScreen schema={schema} details={wd.details} onSave={wd.save} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} user={api.user} onOpenVendors={(category, id) => navigate(`${base}/plan/vendors${id ? `/${id}` : `?category=${category}`}`)} />;
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
    try {
      await tasks.optimistic((list) => (list || []).map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)), () => taskWrites.toggle(t), () => toast.error('Could not save that. Put back the way it was.'));
    } catch { /* rolled back */ }
  };
  const add = async (fields) => { await taskWrites.create(fields); toast.success('Task added'); tasks.reload(); };
  const update = async (id, fields) => { await taskWrites.update(id, fields); toast.success('Saved'); tasks.reload(); };
  const remove = async (t) => { try { await taskWrites.remove(t.id); toast.success('Task removed'); tasks.reload(); } catch { toast.error('Could not remove that task.'); } };
  return <ChecklistScreen tasks={tasks.data || []} onToggle={toggle} onAdd={add} onUpdate={update} onRemove={remove} loading={tasks.loading} error={tasks.error} onRetry={tasks.reload} back={back} openAdd={params.get('add') === '1'} onRefresh={tasks.reload} />;
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

const WHATSAPP_PHONE_KEY = 'whatsapp_phone';

function useWhatsappPhone() {
  const [phone, setPhone] = useState('');
  React.useEffect(() => { prefGet(WHATSAPP_PHONE_KEY).then((v) => setPhone(v || '')); }, []);
  const save = async (v) => { setPhone(v); await prefSet(WHATSAPP_PHONE_KEY, v || ''); };
  return [phone, save];
}

function MessagesContainer({ back }) {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const m = useEntity('GuestMessage', '-created_date');
  const wd = useWeddingDetails();
  const [phone, savePhone] = useWhatsappPhone();
  const markRead = async (msg) => {
    try {
      await m.optimistic((list) => (list || []).map((x) => (x.id === msg.id ? { ...x, read: !msg.read } : x)), () => m.updateQuiet(msg.id, { ...msg, read: !msg.read }), () => toast.error('Could not save that. Put back the way it was.'));
    } catch { /* rolled back */ }
  };
  return <MessagesScreen messages={m.data || []} onOpen={(msg) => navigate(`${base}/plan/messages/${msg.id}`)} onMarkRead={markRead} whatsappPhone={phone} onWhatsappPhone={savePhone} country={countryFromWedding(wd.details) || DEFAULT_COUNTRY} loading={m.loading} error={m.error} onRetry={m.reload} back={back} onRefresh={m.reload} />;
}

function ThreadContainer({ id, back }) {
  const api = useApi();
  const m = useEntity('GuestMessage', '-created_date');
  const wd = useWeddingDetails();
  const guests = useGuests();
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState(false);
  const [vars, setVars] = useState({ state: 'loading', variables: {} });
  const message = (m.data || []).find((x) => x.id === id);
  const guest = useMemo(() => (message ? (guests.data || []).find((g) => g.email && message.guest_email && g.email.toLowerCase() === message.guest_email.toLowerCase()) || null : null), [guests.data, message]);
  // Opening a thread marks it read, as Messages.jsx does when a message is expanded.
  const marked = React.useRef(false);
  React.useEffect(() => {
    if (message && !message.read && !marked.current) { marked.current = true; m.update(message.id, { ...message, read: true }).catch(() => {}); }
  }, [message, m]);
  // WhatsAppCompose's variables: the invitation's names and date, this guest's RSVP link, the venues from the wedding details.
  React.useEffect(() => {
    if (!compose) return;
    let alive = true;
    (async () => {
      let rsvpLink = '';
      try { if (guest?.id) { const map = await api.guestLinks([guest.id], { throwOnFailure: true }); rsvpLink = map[guest.id]?.rsvpUrl || ''; } } catch { /* unavailable */ }
      const inv = await api.wedding.invitation().catch(() => null);
      const d = wd.details || {};
      if (!alive) return;
      setVars({ state: rsvpLink ? 'ready' : 'unavailable', variables: { couple_names: inv?.couple_names || [d.couple1Name, d.couple2Name].filter(Boolean).join(' & '), wedding_date: inv?.wedding_date || d.weddingDate || '', rsvp_link: rsvpLink, venue: d.mainCeremony?.venueName || 'venue TBD', ceremony_time: d.mainCeremony?.startTime || 'TBD', ceremony_venue: d.mainCeremony?.venueName || 'TBD', reception_time: d.reception?.startTime || 'TBD', reception_venue: d.reception?.venueName || 'TBD' } });
    })();
    return () => { alive = false; };
  }, [compose, guest, api, wd.details]);
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
  const toggleRead = async () => { try { await m.update(message.id, { ...message, read: !message.read }); toast.success(message.read ? 'Marked unread' : 'Marked read'); } catch { toast.error('Could not save that.'); } };
  return (
    <>
      <ThreadScreen message={message} onReply={reply} sending={sending} back={back} onToggleRead={message ? toggleRead : undefined} onWhatsApp={message ? () => setCompose(true) : undefined} />
      <WhatsAppComposeSheet open={compose} onClose={() => setCompose(false)} guest={{ id: guest?.id, name: message?.guest_name }} phone={guest?.phone || ''} variables={vars.variables} linkState={vars.state} country={countryFromWedding(wd.details) || DEFAULT_COUNTRY} />
    </>
  );
}

/* ── Seating ─────────────────────────────────────────────────────────── */

function SeatingContainer({ back }) {
  const navigate = useNavigate();
  const api = useApi();
  const tables = useEntity('Table', '-created_date');
  const guests = useGuests();
  const wd = useWeddingDetails();
  const [activeEventId, setActiveEventId] = useState(RECEPTION_EVENT_ID);
  const [manualEvents, setManualEvents] = useState([]);
  const weddingEvents = useMemo(() => getWeddingEvents(wd.details), [wd.details]);
  const all = tables.data || [];
  const addTable = async (cfg) => { await tables.create({ ...cfg, x: 100 + Math.random() * 200, y: 100 + Math.random() * 200, assigned_guests: [] }); toast.success('Table added'); };
  const updateTable = async (t, v) => {
    await tables.update(t.id, v);
    if (v.name && v.name !== t.name) await api.seating.rename({ tableId: t.id, newName: v.name, tables: all });
    toast.success('Table saved');
  };
  const deleteTable = async (t) => {
    // Unseat everyone first so their table cache clears, as the desktop's delete does through unassignSeat.
    for (const a of t.assigned_guests || []) await api.seating.unassignSeat({ guestId: a.guest_id, tableId: t.id, seatIndex: a.seat_index, tables: all }).catch(() => {});
    await tables.remove(t.id); toast.success('Table deleted');
  };
  const seat = async ({ guestId, tableId, seatIndex }) => { const r = await api.seating.assignSeat({ guestId, tableId, seatIndex, tables: all, eventId: activeEventId }); if (r?.ok !== false) { hapticLight(); tables.reload(); } return r; };
  const unseat = async ({ guestId, tableId, seatIndex }) => { await api.seating.unassignSeat({ guestId, tableId, seatIndex, tables: all, eventId: activeEventId }); tables.reload(); toast.success('Unseated'); };
  // AISeatingGenerator's prompt and schema, with tokens in place of ids so the model never sees or invents one.
  const avaPlan = async (attendees, eventTables) => {
    const tokenOf = new Map(attendees.map((a, i) => [a.id, `g${i + 1}`]));
    const idOf = new Map(attendees.map((a, i) => [`g${i + 1}`, a.id]));
    const hosts = new Map((guests.data || []).map((g) => [g.id, g]));
    const guestData = attendees.map((a) => (a.isPlusOne
      ? { id: tokenOf.get(a.id), name: a.name, isPlusOne: true, plusOneOf: tokenOf.get(a.hostGuestId), dietary_restrictions: a.dietary_restrictions }
      : { id: tokenOf.get(a.id), name: a.name, isPlusOne: false, plusOneOf: null, category: hosts.get(a.id)?.category, tags: hosts.get(a.id)?.tags || [], seating_preferences: hosts.get(a.id)?.seating_preferences || [], seating_avoid: hosts.get(a.id)?.seating_avoid || [], dietary_restrictions: a.dietary_restrictions, special_requests: hosts.get(a.id)?.special_requests }));
    const tableData = eventTables.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity, shape: t.shape, currentlyAssigned: (t.assigned_guests || []).length }));
    const response = await api.llm(`You are an expert wedding planner specialising in optimal seating arrangements.

Analyze these ${guestData.length} wedding attendees and ${tableData.length} tables to create the perfect seating chart.

GUESTS: ${JSON.stringify(guestData)}

TABLES: ${JSON.stringify(tableData)}

INSTRUCTIONS:
1. PRIORITISE TAGS: group guests with matching tags together (e.g. all "College Friends" at one table)
2. Secondary grouping by relationship category (family, friends, colleagues)
3. Every person listed needs their own seat, including plus-ones. A plus-one has isPlusOne: true and plusOneOf giving their host's id — seat them at the same table as their host. Respect seating preferences.
4. Balance table sizes evenly; consider dietary restrictions
5. In your output, refer to each guest ONLY by their exact "id" value from the GUESTS list above (e.g. "g1", "g2") — never their name, and never invent an id.
6. For "reasoning", write one plain, specific sentence naming the actual tag, relationship, or preference that drove the grouping — no vague or generic language like "for synergy," "for balance," or "for cohesion."

Return assignments[], unassigned[], and summary.`, { add_context_from_internet: false, response_json_schema: { type: 'object', properties: { assignments: { type: 'array', items: { type: 'object', properties: { tableId: { type: 'string' }, tableName: { type: 'string' }, guests: { type: 'array', items: { type: 'string' } }, reasoning: { type: 'string' } } } }, unassigned: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } } } });
    return { ...response, assignments: (response?.assignments || []).map((a) => ({ ...a, guests: (a.guests || []).map((t) => idOf.get(t)).filter(Boolean) })), unassigned: (response?.unassigned || []).map((t) => idOf.get(t)).filter(Boolean) };
  };
  const applyPlan = async (plan) => {
    const tid = toast.loading("Applying Ava's seating plan");
    try {
      const eventTables = all.filter((t) => (t.event_id || RECEPTION_EVENT_ID) === activeEventId);
      const valid = new Set(plan.assignments.flatMap((a) => a.guests));
      const { ok, err } = await api.seating.applyPlan({ assignments: validatePlanAssignments(plan.assignments, valid), tables: eventTables, eventId: activeEventId });
      tables.reload();
      toast.success(`${ok} seated${err > 0 ? `, ${err} could not be` : ''}`, { id: tid });
    } catch { toast.error('Could not apply the plan', { id: tid }); }
  };
  return <SeatingScreen tables={all} guests={guests.data || []} weddingEvents={weddingEvents} activeEventId={activeEventId} onEvent={setActiveEventId} manualEvents={manualEvents} onAddEventTab={(id) => { setManualEvents((m) => [...m, id]); setActiveEventId(id); }} onAddTable={addTable} onUpdateTable={updateTable} onDeleteTable={deleteTable} onSeat={seat} onUnseat={unseat} onAvaPlan={avaPlan} onApplyPlan={applyPlan} loading={tables.loading || guests.loading} error={tables.error || guests.error} onRetry={() => { tables.reload(); guests.reload(); }} back={back} onDesktop={() => openDesktop(navigate, '/Seating')} onRefresh={async () => { tables.reload(); guests.reload(); }} />;
}

/* ── Polls and games: WeddingDetails.polls as Polls.jsx persists them; Questionnaire records ── */

function PollsContainer({ back }) {
  const api = useApi();
  const wd = useWeddingDetails();
  const votes = useLoad(() => api.list('PollVote', '-created_date').catch(() => []), []);
  const comments = useLoad(() => api.list('PollComment', '-created_date').then((l) => l.filter((c) => !c.is_test)).catch(() => []), []);
  const games = useEntity('Questionnaire', '-created_date');
  const guests = useGuests();
  const responses = useLoad(() => api.json('/api/questionnaire-responses-for-owner', { method: 'POST' }).then((d) => d.responses || []).catch(() => []), []);
  const polls = wd.details?.polls || [];
  const siteUrl = siteUrlFor(wd.details);
  const persist = async (next) => { await wd.save('polls', next, false); };
  const create = async ({ title, options, allowComments, category }) => {
    const poll = { id: genId(), title, category: category || 'Custom', emoji: '', options: options.map((o) => ({ id: genId(), label: o.label || o, votes: 0 })), allowComments: allowComments !== false, comments: [], isActive: true, createdAt: new Date().toISOString(), avaInsight: null, expiresAt: null };
    await persist([...polls, poll]);
    toast.success('Poll created');
  };
  const update = async (p, { title, options, allowComments }) => {
    // Existing option ids are kept so votes stay attached; new options get ids.
    await persist(polls.map((x) => (x.id === p.id ? { ...x, title, allowComments, options: options.map((o) => ({ id: String(o.id).startsWith('new-') ? genId() : o.id, label: o.label, votes: o.votes || 0 })) } : x)));
    toast.success('Poll saved');
  };
  const end = async (p) => { await persist(polls.map((x) => (x.id === p.id ? { ...x, isActive: false } : x))); toast.success('Poll ended'); };
  const reopen = async (p) => { await persist(polls.map((x) => (x.id === p.id ? { ...x, isActive: true } : x))); toast.success('Poll reopened'); };
  const remove = async (p) => { await persist(polls.filter((x) => x.id !== p.id)); toast.success('Poll deleted'); };
  const share = async (p) => {
    const url = siteUrl ? `${siteUrl}/polls` : '';
    if (!url) { toast.error('Your site has no address yet, so there is no link to share.'); return; }
    const r = await shareLink({ title: p.title, text: 'Have your say on our wedding site.', url });
    if (r === 'copied') toast.success('Link copied'); if (r === 'failed') toast.error('Could not share the link.');
  };
  const createGame = async (data) => { await games.create(data); toast.success('Game created'); };
  const toggleGame = async (g) => { await games.update(g.id, { is_active: g.is_active === false }); toast.success(g.is_active === false ? 'Game reopened' : 'Game closed'); };
  const deleteGame = async (g) => { await games.remove(g.id); toast.success('Game deleted'); };
  const copyGameLinks = async (g) => {
    const recipients = resolveRecipients(g, guests.data || []);
    if (!recipients.length) { toast.error('No guests match this game yet.'); return; }
    const tid = toast.loading('Getting the links');
    try {
      const map = await api.guestLinks(recipients.map((x) => x.id));
      const base = `${siteOrigin()}/games/`;
      const lines = recipients.filter((x) => map[x.id]?.token).map((x) => `${x.name}: ${base}${map[x.id].token}/${g.id}`);
      if (!lines.length) throw new Error('Could not generate game links');
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success(`${lines.length} game link${lines.length === 1 ? '' : 's'} copied`, { id: tid });
    } catch (e) { toast.error(e?.message || 'Could not get the links', { id: tid }); }
  };
  return <PollsScreen polls={polls} votes={votes.data || []} comments={comments.data || []} games={games.data || []} responses={responses.data || []} guests={guests.data || []} siteUrl={siteUrl} onCreate={create} onUpdate={update} onEnd={end} onReopen={reopen} onDelete={remove} onShare={share} onCreateGame={createGame} onToggleGame={toggleGame} onDeleteGame={deleteGame} onCopyGameLinks={copyGameLinks} loading={wd.loading} error={wd.error} onRetry={() => { wd.reload(); votes.reload(); games.reload(); responses.reload(); }} back={back} onRefresh={async () => { wd.reload(); votes.reload(); comments.reload(); games.reload(); responses.reload(); }} />;
}

/* ── Music ───────────────────────────────────────────────────────────── */

function MusicContainer({ back }) {
  const api = useApi();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const tracks = useEntity('Music', '-created_date');
  const requests = useLoad(() => api.songRequests.list(), []);
  const wd = useWeddingDetails();
  const music = wd.details?.music || {};
  const stored = (music.playlists || [])[0] || null;
  const playlistUrl = stored?.playlistUrl || '';
  const shareUrl = wd.details?.slug ? `${siteOrigin()}/w/${wd.details.slug}/music` : '';
  const saveMusic = async (patch, opts) => { await wd.save('music', { ...music, ...patch }, false); if (!opts?.quiet) toast.success('Saved'); };
  // Music.jsx's savePlaylistUrl: one primary row, cleared when the link is emptied.
  const savePlaylistUrl = async (next) => { const row = { ...(stored || { id: 'primary', name: 'Wedding playlist', enabled: true }), playlistUrl: next }; await saveMusic({ playlists: next ? [row] : [] }); };
  const review = async (r, action) => {
    try { await api.songRequests.review(r.id, action); toast.success(action === 'add' ? 'Added to the playlist' : action === 'approve' ? 'Approved' : 'Declined'); requests.reload(); tracks.reload(); } catch (e) { toast.error(e?.message || 'Could not update that request.'); }
  };
  const wrap = (fn, ok) => async (...a) => { const r = await fn(...a); toast.success(ok); return r; };
  return <MusicScreen tracks={tracks.data || []} requests={requests.data || []} settings={music} playlistUrl={playlistUrl} shareUrl={shareUrl} onPlaylistUrl={savePlaylistUrl} onSettings={saveMusic} onCreate={wrap(tracks.create, 'Track added')} onUpdate={wrap(tracks.update, 'Saved')} onDelete={wrap(tracks.remove, 'Removed')} onReview={review} onOpenVendors={(c) => navigate(`${base}/plan/vendors?category=${c}`)} loading={tracks.loading || wd.loading} error={tracks.error} onRetry={() => { tracks.reload(); requests.reload(); wd.reload(); }} back={back} onRefresh={async () => { tracks.reload(); requests.reload(); }} />;
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
  return <WeddingPartyScreen party={wd.details?.weddingParty || {}} onSave={async (next, opts) => { await wd.save('weddingParty', next, false); if (!opts?.quiet) toast.success('Saved'); }} loading={wd.loading} error={wd.error} onRetry={wd.reload} back={back} />;
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

