import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getTrialStatus } from '@/lib/trialStatus';
import CollaborateModal from '@/components/layout/CollaborateModal';
import AccountScreen from './AccountScreen';
import { isNative } from '../../native';
import { openDesktop } from '../../lib/links';

const PLAN_LABELS = { free: 'Free trial', pro: 'Pro', ultra: 'Ultra' };

/**
 * Reads the user from AuthContext, as Account.jsx does. Purchases: every
 * upgrade / checkout / billing-portal call to action is hidden when the app
 * runs natively (see MOBILE_APP.md, "Needs a decision").
 */
export default function AccountContainer() {
  const { user, isLoadingAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [collab, setCollab] = useState(false);
  const trial = getTrialStatus(user);
  const planLabel = PLAN_LABELS[trial.plan] || 'Free trial';
  const showPurchases = !isNative();

  const planNote = trial.isPaid
    ? null
    : trial.trialExpired
      ? 'Your free trial has ended. Your work is safe and yours. Upgrade on the website to keep planning.'
      : `${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left on your free trial.`;

  return (
    <>
      <AccountScreen
        name={user?.full_name}
        email={user?.email}
        planLabel={planLabel}
        planNote={planNote}
        trialDaysLeft={trial.isPaid ? null : trial.daysLeft}
        showPurchases={showPurchases}
        onUpgrade={() => openDesktop(navigate, '/pricing')}
        onDetails={() => openDesktop(navigate, '/account')}
        onEventDetails={() => openDesktop(navigate, '/event-details')}
        onCollaborators={() => setCollab(true)}
        onNotifications={() => openDesktop(navigate, '/account')}
        onHelp={() => openDesktop(navigate, '/help')}
        onContact={() => openDesktop(navigate, '/Contact')}
        onLogout={() => logout()}
        loading={isLoadingAuth}
      />
      {collab && <CollaborateModal onClose={() => setCollab(false)} />}
    </>
  );
}
