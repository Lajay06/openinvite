import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { isAttending, isDeclined, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import HomeScreen from './HomeScreen';
import { ShellContext } from '../../shell/MobileShell';
import { usePlanData } from '../../data/plan';
import { useTaskWrites } from '../../data/wedding';
import { useApi, useSymbol } from '../../data/api';
import { hapticLight, shareLink } from '../../native';
import { siteUrlFor } from '../../lib/links';
import { ownImages, imageUrl } from '../../lib/images';
import { leastTouched, featureByKey } from '../../features/registry';
import { summariseBudget } from '../plan/BudgetScreen';

/** Home, from the same loaders the Plan hub uses, plus the notification feed for "Latest". */
export default function HomeContainer() {
  const { user } = useApi();
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
  // The couple's own photos take priority here and on the Site preview; with
  // none, the hero draws from the app/ folder (goal 4, phase 1), never from
  // the universe's sample content.
  const images = useMemo(() => { const own = ownImages(details); return own.length ? own : [imageUrl('heroDays'), imageUrl('heroReplies'), imageUrl('heroAva'), imageUrl('heroShare')]; }, [details]);
  const siteUrl = siteUrlFor(details);

  const rsvp = useMemo(() => {
    const list = d.guests || [];
    return { attending: list.filter(isAttending).length, declined: list.filter(isDeclined).length, awaiting: list.filter(isAwaitingPrimary).length, invited: list.filter((g) => !!g.invite_sent_at).length };
  }, [d.guests]);
  const budgetSum = useMemo(() => summariseBudget(d.budget || [], details?.budget || null), [d.budget, details?.budget]);
  const openTasks = (d.tasks || []).filter((t) => !t.completed).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const keepPlanning = useMemo(() => leastTouched(d, 6).map((f) => ({ key: f.key, label: f.label, image: f.image, line: f.stat(d, symbol) })), [d, symbol]);
  const briefing = notifications?.items?.find((i) => i.type === 'briefing')?.body || (daysToGo != null ? `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} and ${rsvp.awaiting} guests still to reply.` : null);
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
    const r = await shareLink({ title: coupleName ? `${coupleName}'s wedding` : 'Our wedding', text: 'Here is our wedding site.', url: siteUrl });
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
      loading={plan.loading}
      error={plan.error}
      onRetry={plan.reload}
      onRefresh={async () => { hapticLight(); await plan.reload(); await notifications?.reload?.(); }}
    />
  );
}
