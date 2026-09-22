import React from 'react';
import { UserCheck, MessageCircle, Receipt, Sparkles } from 'lucide-react';
import { PillButton, SmartImage, RowGroup, Row } from '../../ui';
import { imageUrl } from '../../images';

/**
 * Notification priming: what the couple will hear about, and two honest
 * buttons. Both record the choice and close the screen; "Turn on" asks the
 * system first. Shown once, the first time a reply really is in.
 */
export default function PrimingScreen({ onTurnOn, onNotNow, recorded = false, busy = false }) {
  return (
    <div className="oi-m-login">
      <div className="oi-m-login__top">
        <SmartImage src={imageUrl('priming')} alt="" width={390} ratio="3/2" square eager tone="ink" style={{ position: 'absolute', inset: 0, height: '100%', aspectRatio: 'auto' }} />
        <div className="oi-m-hero__scrim" />
        <div className="oi-m-login__title">
          <h1 className="oi-m-title oi-m-on-dark">Your first reply is in</h1>
          <p className="oi-m-body oi-m-on-dark-2">Want to hear about the next ones as they land?</p>
        </div>
      </div>
      <div className="oi-m-login__form">
        <RowGroup>
          <Row icon={UserCheck} tile="ok" label="Replies" sub="When a guest says yes, no or maybe" />
          <Row icon={MessageCircle} tile="primary" label="Messages" sub="Questions from guests, as they arrive" />
          <Row icon={Receipt} tile="warn" label="Due dates" sub="A payment or a task that is coming up" />
          <Row icon={Sparkles} tile="ink" label="A morning note from Ava" sub="One line, once a day, never more" />
        </RowGroup>
        <p className="oi-m-meta">You can change any of these later under Account. Nothing is sent to your guests.</p>
        {recorded ? (
          <p className="oi-m-body oi-m-strong" style={{ textAlign: 'center' }}>Noted. Notifications are coming soon and this phone is first in line.</p>
        ) : (
          <>
            <PillButton variant="primary" block onClick={onTurnOn} disabled={busy}>Turn on notifications</PillButton>
            <PillButton variant="ghost" block onClick={onNotNow} disabled={busy}>Not now</PillButton>
          </>
        )}
      </div>
    </div>
  );
}
