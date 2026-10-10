import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useApi } from '../../data/api';
import { isDemoBuild, isRealBuild } from '../../demo';
import { getTrialStatus } from '@/lib/trialStatus';
import CollaborateModal from '@/components/layout/CollaborateModal';
import AccountScreen from './AccountScreen';
import { AccountDetailsSheet, EmailPreferencesSheet } from './AccountSheets';
import { useCurrency } from '@/contexts/CurrencyContext';
import { isNative } from '../../native';
import { useAppLockSetting } from '../../shell/AppLock';
import { openDesktop } from '../../lib/links';
import { useWedding } from '../../data/wedding';
import { heroImageFor } from '../../lib/images';
import { dateLong } from '../../lib/format';
import { ShellContext } from '../../shell/MobileShell';
import { coupleDisplayName } from '@/lib/coupleNames';

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
  const [sheet, setSheet] = useState(null); // 'details' | 'email'
  const [, bump] = useState(0);
  const currency = useCurrency();
  const isPreview = api.mode === 'preview';
  const currencyCode = isPreview ? (user?.currency || 'AUD') : currency.currencyCode;
  // Account.jsx's Settings tab: name and tempUnit through updateMe, currency
  // through CurrencyContext (which writes updateMe itself), then refresh the user.
  const saveDetails = async ({ full_name, currency: code, tempUnit }) => {
    await api.updateMe({ full_name, tempUnit, ...(isPreview ? { currency: code } : {}) });
    if (!isPreview && code !== currency.currencyCode) await currency.updateCurrency(code);
    if (isPreview) bump((n) => n + 1); else await auth.checkAppState?.();
  };
  const savePrefs = async (next) => { await api.updateMe({ notification_prefs: next }); if (isPreview) bump((n) => n + 1); else await auth.checkAppState?.(); };
  const { base, showDailyUpdate } = useContext(ShellContext);
  const wedding = useWedding();
  const d = wedding.data;
  const coupleName = coupleDisplayName(d || {});
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
        subtitle={isDemoBuild ? 'Demo data' : isRealBuild ? 'Live' : undefined}
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
        onDetails={() => setSheet('details')}
        detailsSub={`Name, ${currencyCode}, °${user?.tempUnit || 'C'}`}
        onEventDetails={() => navigate(`${base}/plan/event-details`)}
        onCollaborators={() => setCollab(true)}
        onNotifications={() => setSheet('email')}
        onNotificationSettings={() => navigate(`${base}/notifications/settings`)}
        onHelp={() => openDesktop(navigate, '/help')}
        onContact={() => openDesktop(navigate, '/Contact')}
        onLogout={() => logout()}
        loading={isLoadingAuth}
        appLock={isNative() ? appLock : null}
        // Review builds only (goal 7): a long press on the title brings the daily update back whatever the day's answer.
        onTitleLongPress={isDemoBuild || import.meta.env.DEV ? showDailyUpdate : undefined}
        // Review builds only (goal 7): the priming screen, the system prompt, then three real notifications on the lock screen.
        onTestNotification={isDemoBuild || import.meta.env.DEV ? () => navigate(`${base}/priming?test=1`) : undefined}
      />
      {collab && <CollaborateModal onClose={() => setCollab(false)} />}
      <AccountDetailsSheet open={sheet === 'details'} user={user} currencyCode={currencyCode} onClose={() => setSheet(null)} onSave={saveDetails} onDesktop={() => { setSheet(null); openDesktop(navigate, '/account'); }} />
      <EmailPreferencesSheet open={sheet === 'email'} user={user} onClose={() => setSheet(null)} onSave={savePrefs} />
    </>
  );
}
