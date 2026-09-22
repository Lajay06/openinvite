import React from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import PillButton from './PillButton';
import { useOnline } from '../shell/OfflineBanner';

/**
 * WHY THE CONNECTION IS NOT BLAMED BY DEFAULT.
 *
 * Every failed load said "Check your connection and try again", on a phone
 * with four bars. It is the one explanation the app can actually check, and
 * checking it is free: `useOnline()` already tracks connectivity for the
 * offline banner. Telling someone to check a working connection sends them
 * to fix the wrong thing and makes the next honest message harder to
 * believe.
 *
 * So: the connection is named only when the device is genuinely offline.
 * Online, the app says the request failed, names what failed where the
 * caller knows (`what`), and keeps the retry either way — offline included,
 * because connectivity can come back between the render and the tap.
 *
 * `what` is a noun phrase in the couple's terms, lower case, no article
 * needed: "your wedding", "your guest list", "your budget".
 */
export default function ErrorState({ text, what = '', timedOut = false, onRetry }) {
  const online = useOnline();
  const copy = text || (
    !online
      ? `You are offline, so ${what || 'this'} could not be loaded. It will load when you are back on a connection.`
      : timedOut
        ? `${what ? `${cap(what)} is` : 'This is'} taking longer than usual.`
        : `${what ? cap(what) : 'This'} could not be loaded.`
  );
  const Icon = online ? AlertCircle : WifiOff;
  return (
    <div className="oi-m-empty" role="alert">
      <span className="oi-m-empty__icon"><Icon size={24} strokeWidth={1.5} /></span>
      <p className="oi-m-body" style={{ color: 'var(--m-text-2)', maxWidth: 280 }}>{copy}</p>
      {onRetry && <PillButton variant="secondary" size="sm" onClick={onRetry}>Try again</PillButton>}
    </div>
  );
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
