import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useApi } from '../../data/api';
import { isDemoBuild } from '../../demo';
import { getTrialStatus } from '@/lib/trialStatus';
import CollaborateModal from '@/components/layout/CollaborateModal';
import AccountScreen from './AccountScreen';
import { isNative } from '../../native';
import { useAppLockSetting } from '../../shell/AppLock';
import { openDesktop } from '../../lib/links';
import { useWedding } from '../../data/wedding';
import { heroImageFor } from '../../lib/images';
import { dateLong } from '../../lib/format';
import { ShellContext } from '../../shell/MobileShell';

const PLAN_LABELS = { free: 'Free trial', pro: 'Pro', ultra: 'Ultra' };

/**
 * Reads the user from AuthContext, as Account.jsx does. Purchases: every
 * upgrade / checkout / billing-portal call to action is hidden when the app
 * runs natively (see MOBILE_APP.md, "Needs a decision").
 */
export default function AccountContainer() {
  const auth = useAuth();
  const api = useApi();
  const user = api.mode === 'preview' ? api.user : auth.user;
  const isLoadingAuth = api.mode === 'preview' ? false : auth.isLoadingAuth;
  const logout = api.mode === 'preview' ? () => {} : auth.logout;
  const navigate = useNavigate();
  const [collab, setCollab] = useState(false);
  const { base } = useContext(ShellContext);
  const wedding = useWedding();
  const d = wedding.data;
  const coupleName = d?.couple1Name && d?.couple2Name ? `${d.couple1Name} & ${d.couple2Name}` : d?.couple1Name || '';
  const trial = getTrialStatus(user);
  const planLabel = PLAN_LABELS[trial.plan] || 'Free trial';
  const showPurchases = !isNative();
  const appLock = useAppLockSetting();

  const planNote = trial.isPaid
    ? null
    : trial.trialExpired
      ? 'Your free trial has ended. Your work is safe and yours. Upgrade on the website to keep planning.'
      : `${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left on your free trial.`;

  return (
    <>
      <AccountScreen
        subtitle={isDemoBuild ? 'Demo data' : undefined}
        name={user?.full_name}
        email={user?.email}
        coupleName={coupleName}
        weddingDate={d?.weddingDate ? dateLong(d.weddingDate) : ''}
        photo={heroImageFor(d)}
        planLabel={planLabel}
        planNote={planNote}
        trialDaysLeft={trial.isPaid ? null : trial.daysLeft}
        showPurchases={showPurchases}
        onUpgrade={() => openDesktop(navigate, '/pricing')}
        onDetails={() => openDesktop(navigate, '/account')}
        onEventDetails={() => navigate(`${base}/plan/event-details`)}
        onCollaborators={() => setCollab(true)}
        onNotifications={() => openDesktop(navigate, '/account')}
        onNotificationSettings={() => navigate(`${base}/notifications/settings`)}
        onHelp={() => openDesktop(navigate, '/help')}
        onContact={() => openDesktop(navigate, '/Contact')}
        onLogout={() => logout()}
        loading={isLoadingAuth}
        appLock={isNative() ? appLock : null}
      />
      {collab && <CollaborateModal onClose={() => setCollab(false)} />}
    </>
  );
}
