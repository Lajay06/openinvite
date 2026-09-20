import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { isAttending, isDeclined, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { getUniverse } from '@/lib/universeCatalog';
import { getSampleWedding } from '@/lib/sampleContent';
import HomeScreen from './HomeScreen';
import { ShellContext } from '../../shell/MobileShell';
import { useWedding, useGuests, useTasks, useBudget, taskWrites } from '../../data/wedding';
import { hapticLight, openExternal } from '../../native';
import { siteUrlFor } from '../../lib/links';

/** Loads Home from the same helpers DailyUpdate, Guests and Budget use. */
export default function HomeContainer() {
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const wedding = useWedding();
  const guests = useGuests();
  const tasks = useTasks();
  const budget = useBudget();

  const details = wedding.data;
  const firstName = (details?.couple1Name || user?.full_name || '').split(' ')[0];
  const coupleName = details?.couple1Name && details?.couple2Name
    ? `${details.couple1Name} & ${details.couple2Name}`
    : details?.couple1Name || details?.couple2Name || '';
  const daysToGo = details?.weddingDate ? daysUntilWedding(details.weddingDate) : null;
  const universeId = details?.activeUniverse || 'london';
  const heroImage = details?.coverPhoto || getSampleWedding(universeId)?.coverPhoto || getUniverse(universeId)?.imageUrl || '';

  const rsvp = useMemo(() => {
    const list = guests.data || [];
    const invited = list.filter((g) => !!g.invite_sent_at);
    return {
      attending: list.filter(isAttending).length,
      declined: list.filter(isDeclined).length,
      awaiting: list.filter(isAwaitingPrimary).length,
      invited: invited.length,
    };
  }, [guests.data]);

  const budgetSnap = useMemo(() => {
    const items = budget.data?.items || [];
    const spent = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
    const planned = budget.data?.plan?.total ? Number(budget.data.plan.total) : items.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
    return { spent, total: planned, symbol };
  }, [budget.data, symbol]);

  const openTasks = (tasks.data || []).filter((t) => !t.completed);
  const siteUrl = siteUrlFor(details);

  const nextAction = !guests.loading && (guests.data || []).length === 0
    ? { label: 'Add your first guest', onClick: () => navigate(`${base}/guests?add=1`) }
    : rsvp.awaiting > 0
      ? { label: 'See who is yet to reply', onClick: () => navigate(`${base}/guests?filter=awaiting`) }
      : openTasks.length > 0
        ? { label: 'Open your tasks', onClick: () => navigate(`${base}/plan`) }
        : siteUrl
          ? { label: 'View your site', onClick: () => openExternal(siteUrl) }
          : null;

  const completeTask = async (t) => {
    try {
      await taskWrites.toggle(t);
      hapticLight();
      toast.success('Done');
      tasks.reload();
    } catch {
      toast.error('Could not update that task. Try again.');
    }
  };

  const loading = wedding.loading || guests.loading || tasks.loading || budget.loading;
  const error = wedding.error || guests.error || tasks.error || budget.error;

  return (
    <HomeScreen
      firstName={firstName}
      coupleName={coupleName}
      weddingDate={details?.weddingDate}
      daysToGo={daysToGo}
      heroImage={heroImage}
      nextAction={nextAction}
      tasks={openTasks}
      rsvp={rsvp}
      budget={budgetSnap}
      onOpenTasks={() => navigate(`${base}/plan`)}
      onOpenGuests={() => navigate(`${base}/guests`)}
      onOpenBudget={() => navigate(`${base}/plan?segment=budget`)}
      onCompleteTask={completeTask}
      onAddGuest={() => navigate(`${base}/guests?add=1`)}
      onAddTask={() => navigate(`${base}/plan?add=1`)}
      onAddExpense={() => navigate(`${base}/plan?segment=budget&add=1`)}
      onViewSite={() => (siteUrl ? openExternal(siteUrl) : navigate(`${base}/site`))}
      loading={loading}
      error={error}
      onRetry={() => { wedding.reload(); guests.reload(); tasks.reload(); budget.reload(); }}
    />
  );
}
