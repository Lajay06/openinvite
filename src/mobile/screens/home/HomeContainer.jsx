import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { isAttending, isDeclined, isAwaitingPrimary, guestCounts } from '@/lib/guestRsvpTally';
import { resolveDayState } from '@/lib/dayState';
import { buildAvaPrompt, unwrapLlmReply } from '@/lib/avaRequest';
import { buildWeddingContext } from '@/lib/avaContext';
import { TRACKING_REQUEST, validateTracking, authoredTracking, parseTrackingBlocks } from '@/lib/avaTracking';
import { countdownLabel } from '@/lib/weddingCountdown';
import { formatSourceList } from '@/lib/dashboardSources';
import HomeScreen from './HomeScreen';
import { ShellContext } from '../../shell/MobileShell';
import { usePlanData } from '../../data/plan';
import { useTaskWrites } from '../../data/wedding';
import { useApi, useSymbol } from '../../data/api';
import { hapticLight, shareLink } from '../../native';
import { siteUrlFor } from '../../lib/links';
import { homeHeroImages, imageUrl } from '../../lib/images';
import { leastTouched, featureByKey } from '../../features/registry';
import { summariseBudget } from '../plan/BudgetScreen';

/** Home, from the same loaders the Plan hub uses, plus the notification feed for "Latest". */
export default function HomeContainer() {
  const api = useApi();
  const { user } = api;
  const symbol = useSymbol();
  const taskWrites = useTaskWrites();
  const navigate = useNavigate();
  const { base, notifications, openAva } = useContext(ShellContext);
  const plan = usePlanData();
  const d = plan.data || {};
  const details = d.details;

  const firstName = (details?.couple1Name || user?.full_name || '').split(' ')[0];
  const coupleName = details?.couple1Name && details?.couple2Name ? `${details.couple1Name} & ${details.couple2Name}` : details?.couple1Name || details?.couple2Name || '';
  const daysToGo = details?.weddingDate ? daysUntilWedding(details.weddingDate) : null;
  // The couple's own photos take priority here and on the Guest suite preview; with
  // none, the hero draws from the app/ folder (goal 4, phase 1), never from
  // the universe's sample content.
  // Hero i draws the couple's own photo i (cover, then Our Story), and the
  // decorative slot for that position when they have fewer: a photo is never
  // repeated across the four heroes to fill a gap.
  const images = useMemo(() => { const own = homeHeroImages(details); return [imageUrl('heroDays'), imageUrl('heroReplies'), imageUrl('heroAva'), imageUrl('heroShare')].map((u, i) => own[i] || u); }, [details]);
  const siteUrl = siteUrlFor(details);

  const rsvp = useMemo(() => {
    const list = d.guests || [];
    return { attending: list.filter(isAttending).length, declined: list.filter(isDeclined).length, awaiting: list.filter(isAwaitingPrimary).length, invited: list.filter((g) => !!g.invite_sent_at).length };
  }, [d.guests]);
  const budgetSum = useMemo(() => summariseBudget(d.budget || [], details?.budget || null), [d.budget, details?.budget]);
  const openTasks = (d.tasks || []).filter((t) => !t.completed).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const keepPlanning = useMemo(() => leastTouched(d, 6).map((f) => ({ key: f.key, label: f.label, line: f.stat(d, symbol) })), [d, symbol]);
  // DailyUpdate.jsx's day state: the This week lines and the badge, from the same stores.
  const failed = d.failed || [];
  const day = useMemo(() => (plan.loading ? null : resolveDayState({ tasks: d.tasks || [], schedule: d.schedule || [], guests: d.guests || [], budget: d.budget || [], vendors: d.vendors || [], unseen: failed, daysOut: daysToGo })), [plan.loading, d, failed, daysToGo]);
  const thisWeek = useMemo(() => (day?.lines || []).map((l) => ({ text: l.text, to: { '/TodoList': `${base}/plan/checklist`, '/Guests': `${base}/guests`, '/Schedule': `${base}/plan/schedule`, '/Budget': `${base}/plan/budget`, '/Vendors': `${base}/plan/vendors` }[l.to] || `${base}/plan`, label: { '/TodoList': 'Open to do', '/Guests': 'Open guest list', '/Schedule': 'Open schedule', '/Budget': 'Open budget', '/Vendors': 'Open vendors' }[l.to] || 'Open' })), [day, base]);
  // DailyUpdate.jsx's six numbers: replies per invitation, attendance per person (guestCounts).
  const numbers = useMemo(() => {
    const c = guestCounts(d.guests || []);
    const totalBudget = (d.budget || []).reduce((n, b) => n + (b.budgeted_amount || 0), 0);
    const spent = (d.budget || []).reduce((n, b) => n + (b.actual_amount || 0), 0);
    return [
      ['Guests coming', String(c.people.attending)], ['People invited', String(c.people.total)], ['Invitations pending', String(c.invitations.pending)],
      ['Budget used', `${totalBudget ? Math.round((spent / totalBudget) * 100) : 0}%`], ['Events planned', String((d.schedule || []).length)], ['Vendors booked', `${(d.vendors || []).filter((v) => v.status === 'booked').length}/${(d.vendors || []).length}`],
    ];
  }, [d]);
  // Ava's briefing, as DailyUpdate.jsx writes it: the model reads the wedding
  // (buildAvaPrompt + TRACKING_REQUEST), an authored paragraph stands in when
  // there is nothing to read or the reply fails validateTracking.
  const [briefing, setBriefing] = useState(null);
  useEffect(() => {
    if (plan.loading || !plan.data) return undefined;
    let alive = true;
    const data = plan.data;
    const c = guestCounts(data.guests || []);
    const facts = { countdown: countdownLabel(daysUntilWedding(data.details?.weddingDate)), invitationsPending: c.invitations.pending, invitations: c.invitations.total, peopleAttending: c.people.attending, overdue: resolveDayState({ tasks: data.tasks || [] }).counts.overdue, unseen: data.failed || [] };
    const nothingToRead = !facts.invitations && !(data.budget || []).length && !(data.vendors || []).length && !(data.schedule || []).length && !(data.tasks || []).length;
    const done = (text) => { if (alive) setBriefing(parseTrackingBlocks(text)); };
    if (nothingToRead) { done(authoredTracking(facts)); return undefined; }
    (async () => {
      try {
        const weddingContext = api.mode === 'preview' ? 'preview' : await buildWeddingContext();
        if (!weddingContext) throw new Error('no context');
        const reply = unwrapLlmReply(await api.llm(buildAvaPrompt({ weddingContext, page: '/DailyUpdate', mirror: [], userText: TRACKING_REQUEST }), { model: 'claude_sonnet_4_6' }), '');
        done(validateTracking(reply).ok ? reply.trim() : authoredTracking(facts));
      } catch { done(authoredTracking(facts)); }
    })();
    return () => { alive = false; };
  }, [plan.loading, plan.data, api]);
  const latest = (notifications?.items || []).filter((i) => i.type !== 'briefing').slice(0, 3);

  const openFeature = (key) => {
    if (key === 'site') return navigate(`${base}/site`);
    const f = featureByKey(key);
    if (!f) return navigate(`${base}/plan`);
    if (f.path.startsWith('../')) return navigate(`${base}/${f.path.slice(3)}`);
    return navigate(`${base}/plan/${f.path}`);
  };
  const completeTask = async (t) => {
    hapticLight();
    try {
      await plan.optimistic((d) => ({ ...d, tasks: (d?.tasks || []).map((x) => (x.id === t.id ? { ...x, completed: true } : x)) }), () => taskWrites.toggle(t), () => toast.error('Could not save that. Put back the way it was.'));
      toast.success('Done');
    } catch { /* rolled back */ }
  };
  const share = async () => {
    const r = await shareLink({ title: coupleName ? `${coupleName}'s wedding` : 'Our wedding', text: 'Here is our guest suite.', url: siteUrl });
    if (r === 'copied') toast.success('Link copied');
    if (r === 'failed') toast.error('Could not share the link.');
  };

  return (
    <HomeScreen
      firstName={firstName}
      coupleName={coupleName}
      weddingDate={details?.weddingDate}
      daysToGo={daysToGo}
      images={images}
      siteUrl={siteUrl}
      rsvp={rsvp}
      budget={{ spent: budgetSum.spent, total: budgetSum.total, symbol }}
      tasks={openTasks}
      payments={budgetSum.duePayments}
      keepPlanning={keepPlanning}
      briefing={briefing}
      badge={day?.badge || null}
      thisWeek={thisWeek}
      numbers={numbers}
      failedSources={failed.length ? formatSourceList(failed) : ''}
      latest={latest}
      onOpenGuests={() => navigate(`${base}/guests?filter=awaiting`)}
      onOpenBudget={() => navigate(`${base}/plan/budget`)}
      onOpenTasks={() => navigate(`${base}/plan/checklist`)}
      onCompleteTask={completeTask}
      onOpenFeature={openFeature}
      onOpenAva={openAva}
      onShare={share}
      onSearch={() => navigate(`${base}/search`)}
      onOpenLatest={(it) => { notifications?.markRead?.(it); navigate(it.link); }}
      onOpenNotifications={() => navigate(`${base}/notifications`)}
      onOpenLink={(to) => navigate(to)}
      loading={plan.loading}
      error={plan.error}
      onRetry={plan.reload}
      onRefresh={async () => { hapticLight(); await plan.reload(); await notifications?.reload?.(); }}
    />
  );
}
