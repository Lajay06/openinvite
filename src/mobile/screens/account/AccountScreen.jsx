import React from 'react';
import { UserRound, Users, CreditCard, Bell, LifeBuoy, MessageSquare, LogOut, CalendarDays, ArrowUpRight, BellRing } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, PillButton, Skeleton, SmartImage, PanelCard } from '../../ui';
import { initials } from '../../lib/format';

/**
 * Account: a profile card with the couple's photo and names, then stacked
 * rows. `showPurchases` is false inside the native shell, so no upgrade,
 * checkout or billing-portal call to action renders there.
 */
export default function AccountScreen({ name, email, coupleName, weddingDate, photo, planLabel, planNote, trialDaysLeft, showPurchases, onUpgrade, onDetails, onEventDetails, onCollaborators, onNotifications, onNotificationSettings, onHelp, onContact, onLogout, loading }) {
  return (
    <Screen title="Account" bell>
      <div className="oi-m-stack oi-m-stack--24">
        {loading ? <Skeleton kind="block" style={{ height: 200 }} /> : (
          <div className="oi-m-card oi-m-card--flush">
            <div style={{ position: 'relative', aspectRatio: '16 / 9', background: 'var(--m-ink)' }}>
              <SmartImage src={photo} alt="" width={360} ratio="16/9" square eager tone="ink" />
              <div className="oi-m-hero__scrim" />
              <div style={{ position: 'absolute', left: 16, bottom: 14, color: '#FFFFFF' }}>
                <div className="oi-m-hero__title" style={{ fontSize: 24, lineHeight: '30px' }}>{coupleName || name || 'Your wedding'}</div>
                {weddingDate && <div className="oi-m-hero__label">{weddingDate}</div>}
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="oi-m-row__tile oi-m-row__tile--blush" style={{ width: 48, height: 48, fontSize: 16 }}>{initials(name || email)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="oi-m-body oi-m-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Your account'}</p>
                <p className="oi-m-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
              <span className="oi-m-status oi-m-status--neutral">{planLabel}</span>
            </div>
          </div>
        )}

        <RowGroup>
          <Row icon={UserRound} tile="sand" label="Account details" sub="Name, email, password" onClick={onDetails} />
          <Row icon={CalendarDays} tile="sand" label="Wedding details" sub="Names, date, venues" onClick={onEventDetails} />
          {onCollaborators && <Row icon={Users} tile="sand" label="Collaborators" sub="Share the planning" onClick={onCollaborators} />}
          <Row icon={CreditCard} tile="sand" label="Plan" value={planLabel} onClick={showPurchases ? onUpgrade : undefined} chevron={!!showPurchases} />
          <Row icon={BellRing} tile="sand" label="Notifications" sub="What you hear about, and when" onClick={onNotificationSettings} />
          <Row icon={Bell} tile="sand" label="Email notifications" onClick={onNotifications} />
        </RowGroup>

        {planNote && (
          <PanelCard tone={trialDaysLeft != null && trialDaysLeft <= 3 ? 'wine' : 'sand'} label="Your plan" body={planNote}>
            {showPurchases && trialDaysLeft != null && <PillButton variant="light" size="sm" icon={ArrowUpRight} onClick={onUpgrade} style={{ alignSelf: 'flex-start', marginTop: 8 }}>See plans</PillButton>}
          </PanelCard>
        )}

        <RowGroup>
          <Row icon={LifeBuoy} tile="sand" label="Help center" onClick={onHelp} />
          <Row icon={MessageSquare} tile="sand" label="Contact support" onClick={onContact} />
        </RowGroup>

        <RowGroup>
          <Row icon={LogOut} label="Log out" onClick={onLogout} chevron={false} />
        </RowGroup>
      </div>
    </Screen>
  );
}
