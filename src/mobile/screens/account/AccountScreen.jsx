import React from 'react';
import { UserRound, Users, CreditCard, Bell, LifeBuoy, MessageSquare, LogOut, CalendarDays, ArrowUpRight } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, Block, PillButton, Skeleton } from '../../ui';
import { initials } from '../../lib/format';

/**
 * Account: stacked rows. `showPurchases` is false inside the native shell,
 * so no upgrade, checkout or billing-portal call to action renders there.
 */
export default function AccountScreen({ name, email, planLabel, planNote, trialDaysLeft, showPurchases, onUpgrade, onDetails, onEventDetails, onCollaborators, onNotifications, onHelp, onContact, onLogout, loading }) {
  return (
    <Screen title="Account">
      <div className="oi-m-stack oi-m-stack--16">
        <Block>
          {loading ? (
            <Skeleton kind="title" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="oi-m-row__tile oi-m-row__tile--primary" style={{ width: 48, height: 48, fontSize: 16, fontWeight: 600 }}>{initials(name || email)}</span>
              <div style={{ minWidth: 0 }}>
                <p className="oi-m-body oi-m-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Your account'}</p>
                <p className="oi-m-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
            </div>
          )}
        </Block>

        <div className="oi-m-block oi-m-block--flush">
          <Row icon={UserRound} label="Account details" sub="Name, email, password" onClick={onDetails} />
          <Row icon={CalendarDays} label="Wedding details" sub="Names, date, venues" onClick={onEventDetails} />
          {onCollaborators && <Row icon={Users} label="Collaborators" sub="Share the planning" onClick={onCollaborators} />}
          <Row icon={CreditCard} label="Plan" value={planLabel} onClick={showPurchases ? onUpgrade : undefined} chevron={!!showPurchases} />
          <Row icon={Bell} label="Notifications" onClick={onNotifications} />
        </div>

        {planNote && (
          <Block>
            <p className="oi-m-meta">{planNote}</p>
            {showPurchases && trialDaysLeft != null && (
              <PillButton variant="primary" icon={ArrowUpRight} onClick={onUpgrade} style={{ marginTop: 12 }}>See plans</PillButton>
            )}
          </Block>
        )}

        <div className="oi-m-block oi-m-block--flush">
          <Row icon={LifeBuoy} label="Help center" onClick={onHelp} />
          <Row icon={MessageSquare} label="Contact support" onClick={onContact} />
        </div>

        <div className="oi-m-block oi-m-block--flush">
          <Row icon={LogOut} label="Log out" onClick={onLogout} chevron={false} />
        </div>
      </div>
    </Screen>
  );
}
