import React from 'react';
import { UserRound, Users, CreditCard, Bell, MessageSquare, LogOut, CalendarDays, BellRing, ScanFace, Smartphone, ShieldCheck, FileText, Trash2 } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, Skeleton, SmartImage, PanelCard, Switch } from '../../ui';
import { initials } from '../../lib/format';

/**
 * Account: a profile card with the couple's photo and names, then stacked
 * rows. The plan is a read-only label: no upgrade, checkout, billing portal
 * or pricing call to action renders anywhere in the app (App Store rule 3.1.1).
 */
export default function AccountScreen({ name, email, coupleName, weddingDate, photo, planLabel, planNote, trialDaysLeft, onDetails, onEventDetails, onCollaborators, onNotifications, onNotificationSettings, onContact, onPrivacy, onTerms, onLogout, onDeleteAccount, deletionRequested = false, loading, appLock = null, subtitle, detailsSub, onTitleLongPress, onTestNotification }) {
  return (
    <Screen title="Account" subtitle={subtitle} root onTitleLongPress={onTitleLongPress}>
      <div className="oi-m-stack oi-m-stack--24">
        {loading ? <Skeleton kind="block" style={{ height: 200 }} /> : (
          <div className="oi-m-card oi-m-card--flush">
            <div style={{ position: 'relative', aspectRatio: '16 / 9', background: 'var(--m-ink)' }}>
              <SmartImage src={photo} alt="" width={360} ratio="16/9" square eager tone="ink" />
              <div className="oi-m-hero__scrim" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.45) 55%, rgba(10,10,10,0.05) 100%)' }} />
              <div style={{ position: 'absolute', left: 16, bottom: 14, color: '#FFFFFF' }}>
                <div className="oi-m-hero__title" style={{ fontSize: 17, lineHeight: '22px' }}>{coupleName || name || 'Your wedding'}</div>
                {weddingDate && <div className="oi-m-hero__label">{weddingDate}</div>}
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="oi-m-row__tile oi-m-row__tile--tint" style={{ width: 48, height: 48, fontSize: 15 }}>{initials(name || email)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="oi-m-body oi-m-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Your account'}</p>
                <p className="oi-m-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
              <span className="oi-m-status oi-m-status--neutral">{planLabel}</span>
            </div>
          </div>
        )}

        <RowGroup>
          <Row icon={UserRound} tile="neutral" label="Account details" sub={detailsSub || 'Name, currency, temperature'} onClick={onDetails} />
          <Row icon={CalendarDays} tile="neutral" label="Wedding details" sub="Names, date, venues" onClick={onEventDetails} />
          {onCollaborators && <Row icon={Users} tile="neutral" label="Collaborators" sub="Share the planning" onClick={onCollaborators} />}
          <Row icon={CreditCard} tile="neutral" label="Plan" value={planLabel} />
          <Row icon={BellRing} tile="neutral" label="Notifications" sub="What you hear about, and when" onClick={onNotificationSettings} />
          <Row icon={Bell} tile="neutral" label="Email notifications" sub="Which emails you get" onClick={onNotifications} />
          {onTestNotification && <Row icon={Smartphone} tile="tint" label="Send a test notification" sub="Three on the lock screen, half a minute apart" onClick={onTestNotification} />}
          {appLock && (
            <div className="oi-m-row" style={{ minHeight: 68 }}>
              <span className="oi-m-row__tile oi-m-row__tile--neutral"><ScanFace size={19} strokeWidth={1.75} /></span>
              <div className="oi-m-row__body">
                <div className="oi-m-row__label">Require {appLock.kind || 'Face ID'} to open</div>
                <div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>{appLock.available ? 'Locks the app on open and after five minutes away' : `${appLock.kind || 'Biometrics'} is not set up on this phone`}</div>
              </div>
              <Switch on={appLock.on} onChange={appLock.set} label="Require Face ID to open" />
            </div>
          )}
        </RowGroup>

        {planNote && (
          <PanelCard tone={trialDaysLeft != null && trialDaysLeft <= 3 ? 'ink' : 'neutral'} label="Your plan" body={planNote} />
        )}

        <RowGroup>
          <Row icon={MessageSquare} tile="neutral" label="Contact support" onClick={onContact} />
          <Row icon={ShieldCheck} tile="neutral" label="Privacy policy" onClick={onPrivacy} />
          <Row icon={FileText} tile="neutral" label="Terms of service" onClick={onTerms} />
        </RowGroup>

        <RowGroup>
          <Row icon={LogOut} label="Log out" onClick={onLogout} chevron={false} />
        </RowGroup>

        <RowGroup>
          <div data-delete-account={deletionRequested ? 'requested' : 'offered'}>
            {deletionRequested
              ? <Row icon={Trash2} tile="neutral" label="Deletion requested" sub="We will confirm by email within 7 business days" wrap />
              : <Row icon={Trash2} tile="neutral" label="Delete account" sub="Your account and everything in it" onClick={onDeleteAccount} />}
          </div>
        </RowGroup>
      </div>
    </Screen>
  );
}
