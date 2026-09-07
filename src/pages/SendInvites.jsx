import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import SendInvitesModal from '@/components/guests/SendInvitesModal';
import { getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';

/**
 * SEND INVITES — its own page.
 *
 * Owner ruling 2026-09-07: "replace the half-width side panel with its own
 * route/page (full width), same steps and layout logic."
 *
 * THE FLOW IS NOT REBUILT. This page loads the guests and hands them to the
 * same component, with `asPage` swapping the sheet for a full-width frame.
 * Rebuilding it would have meant two answers to "who are we sending to, and
 * what goes out" — the one question a send flow must not have two of. Nothing
 * about what is sent, or to whom, changes here.
 *
 * WHAT THE PAGE ADDS is what a panel could not have: the couple's selection
 * survives arriving here (through router state, so a bookmarked
 * /send-invites is simply the whole list), and the footer is a page footer
 * rather than a strip pinned over the guest list.
 */
export default function SendInvites() {
  const navigate = useNavigate();
  const location = useLocation();
  const [guests, setGuests] = useState(null);

  // The caller's selection, if it came from the guest list. A direct visit has
  // none, which is a valid state: it means "everyone".
  const config = location.state || {};

  useEffect(() => {
    let alive = true;
    getMyGuestsWithRsvp()
      .then((rows) => { if (alive) setGuests(rows || []); })
      .catch(() => { if (alive) setGuests([]); });
    return () => { alive = false; };
  }, []);

  const back = () => navigate('/Guests');

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Send invites" subtitle="Choose who to write to, then what to say" />
      {guests === null ? (
        <div style={{ padding: '32px' }}>
          <div data-skeleton="guests" style={{ height: 14, width: '40%', background: 'rgba(10,10,10,0.06)', marginBottom: 10 }} />
          <div data-skeleton="guests" style={{ height: 14, width: '55%', background: 'rgba(10,10,10,0.06)' }} />
        </div>
      ) : (
        <SendInvitesModal
          asPage
          guests={guests}
          defaultFilter={config.defaultFilter}
          initialSelectedIds={config.initialSelectedIds}
          initialType={config.type || 'invite'}
          restrictEventIds={config.restrictEventIds}
          onClose={back}
          onSent={back}
        />
      )}
    </div>
  );
}
