import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getWeddingEvents, getGuestEventResponse } from '@/lib/weddingEvents';

const MEAL_OPTIONS = [
  { value: 'chicken', label: 'Chicken' },
  { value: 'beef', label: 'Beef' },
  { value: 'fish', label: 'Fish' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const F = { fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif" };

// ── Shared page shell ─────────────────────────────────────────────────────────
function PageShell({ coupleName, dateStr, venue, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', ...F }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', marginBottom: 48 }}>
          openinvite
        </p>
        {/* Wedding header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', letterSpacing: '0.12em', marginBottom: 8 }}>
            YOU'RE INVITED
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 10, margin: '0 0 10px' }}>
            {coupleName || 'A Wedding'}
          </h1>
          {dateStr && <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.55)', marginBottom: 3 }}>{dateStr}</p>}
          {venue && <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.55)', margin: 0 }}>{venue}</p>}
        </div>
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', marginBottom: 36 }} />
        {children}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(10,10,10,0.3)', marginTop: 48 }}>
          Powered by openinvite.com.au
        </p>
      </div>
    </div>
  );
}

// ── Poll voting card ──────────────────────────────────────────────────────────
function PollCard({ poll, selectedOptionId, onSelect }) {
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.09)', background: '#FFFFFF', padding: '20px 20px 16px', marginBottom: 16 }}>
      {poll.emoji && (
        <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>{poll.emoji}</span>
      )}
      <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', lineHeight: 1.4, ...F }}>
        {poll.title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {poll.options.map(opt => {
          const selected = selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(poll.id, selected ? null : opt.id)}
              style={{
                padding: '10px 18px',
                border: `1.5px solid ${selected ? '#E03553' : 'rgba(10,10,10,0.15)'}`,
                borderRadius: 999,
                background: selected ? '#E03553' : '#FFFFFF',
                color: selected ? '#FFFFFF' : '#0A0A0A',
                fontSize: 14, fontWeight: selected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                ...F,
              }}
            >
              {opt.emoji && `${opt.emoji} `}{opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Per-event RSVP card ────────────────────────────────────────────────────────
function EventCard({ event, value, onChange, hasPlusOne, mealChoices }) {
  const attending = value.status === 'yes';
  const dateStr = event.date
    ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.09)', background: '#FFFFFF', padding: '20px 20px 20px', marginBottom: 16 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', ...F }}>
        {event.name}
      </p>
      {(dateStr || event.startTime) && (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: '0 0 16px', ...F }}>
          {[dateStr, event.startTime].filter(Boolean).join(' · ')}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: attending ? 20 : 0 }}>
        {[
          { value: 'yes', label: 'Attending' },
          { value: 'no', label: "Can't make it" },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...value, status: opt.value })}
            style={{
              flex: 1, padding: '10px 14px', border: '1px solid',
              borderColor: value.status === opt.value ? '#E03553' : 'rgba(10,10,10,0.12)',
              background: value.status === opt.value ? '#FFF0F3' : '#FFFFFF',
              color: value.status === opt.value ? '#E03553' : '#0A0A0A',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 999,
              transition: 'all 0.15s ease', ...F,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {attending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              Meal preference
            </label>
            <select
              value={value.meal_choice || ''}
              onChange={e => onChange({ ...value, meal_choice: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 0, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF', ...F, outline: 'none' }}
            >
              <option value="">Select a meal</option>
              {mealChoices.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {hasPlusOne && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id={`plusone-${event.event_id}`}
                checked={!!value.plus_one_attending}
                onChange={e => onChange({ ...value, plus_one_attending: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#E03553' }}
              />
              <label htmlFor={`plusone-${event.event_id}`} style={{ fontSize: 13, color: '#0A0A0A', cursor: 'pointer', ...F }}>
                I'm bringing a plus-one to this event
              </label>
            </div>
          )}

          {hasPlusOne && value.plus_one_attending && (
            <input
              type="text"
              value={value.plus_one_name || ''}
              onChange={e => onChange({ ...value, plus_one_name: e.target.value })}
              placeholder="Plus-one's name"
              style={{ width: '100%', padding: '9px 10px', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 0, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF', ...F, outline: 'none', boxSizing: 'border-box' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RSVPPage() {
  const { token } = useParams();
  const [guest, setGuest] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // steps: 'rsvp' | 'polls' | 'done'
  const [step, setStep] = useState('rsvp');
  const [submitting, setSubmitting] = useState(false);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  // { [pollId]: optionId } — guest's current poll selections
  const [guestVotes, setGuestVotes] = useState({});

  // Wedding-level fields — render once, not per event. Dietary restrictions
  // are constant across events per SMART_RSVP_MODEL.md (not per-event, unlike
  // meal_choice which does vary by event's menu).
  const [songRequest, setSongRequest] = useState('');
  const [rsvpNote, setRsvpNote] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');

  // Per-event form state: { [event_id]: { status, meal_choice, plus_one_attending, plus_one_name } }
  const [eventForm, setEventForm] = useState({});

  // Derive active polls from loaded wedding data
  const activePolls = useMemo(
    () => (wedding?.polls || []).filter(p => p.isActive),
    [wedding]
  );

  // The events this guest is actually invited to — never shown a blank form
  // if they have no event_responses yet (pre-existing guests default to
  // invited for main events, see getGuestEventResponse).
  const invitedEvents = useMemo(() => {
    if (!wedding) return [];
    return getWeddingEvents(wedding).filter(ev => getGuestEventResponse(guest, ev).invited);
  }, [wedding, guest]);

  useEffect(() => {
    const load = async () => {
      try {
        const guests = await base44.entities.Guest.filter({ rsvp_link_id: token });
        if (guests.length === 0) { setNotFound(true); setLoading(false); return; }
        const g = guests[0];
        // Scope the wedding lookup to the SAME owner as the matched guest —
        // never the app-wide most-recently-created WeddingDetails record.
        const weddings = await base44.entities.WeddingDetails.filter({ created_by_id: g.created_by_id });
        const realWeddings = weddings.filter(w => !w.is_test);
        const wd = realWeddings.length > 0
          ? realWeddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
          : null;
        setGuest(g);
        setWedding(wd);
        // Pre-populate any previous poll votes
        setGuestVotes(g.poll_votes || {});
        setSongRequest(g.song_request || '');
        setRsvpNote(g.rsvp_note || '');
        setDietaryRestrictions(g.dietary_restrictions || '');

        // Seed per-event form state from existing event_responses (or sane defaults)
        const events = wd ? getWeddingEvents(wd) : [];
        const seeded = {};
        for (const ev of events) {
          const r = getGuestEventResponse(g, ev);
          if (!r.invited) continue;
          seeded[ev.event_id] = {
            status: r.status === 'pending' ? '' : r.status,
            meal_choice: r.meal_choice || '',
            plus_one_attending: (r.plus_ones || 0) > 0,
            plus_one_name: (r.plus_one_names || [])[0] || '',
          };
        }
        setEventForm(seeded);

        // Decide initial step for returning guests — "responded" means every
        // invited event has a non-pending status.
        const invitedIds = events.filter(ev => getGuestEventResponse(g, ev).invited).map(ev => ev.event_id);
        const allResponded = invitedIds.length > 0 && invitedIds.every(id => seeded[id]?.status);
        if (allResponded) {
          const polls = wd?.polls || [];
          const activePollsList = polls.filter(p => p.isActive);
          const existingVotes = g.poll_votes || {};
          const hasUnvotedPolls = activePollsList.length > 0 &&
            activePollsList.some(p => !existingVotes[p.id]);
          setStep(hasUnvotedPolls ? 'polls' : 'done');
        }
        // else step stays 'rsvp' (default)
      } catch (e) {
        console.error('RSVP load error', e);
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const updateEvent = (eventId, value) => {
    setEventForm(prev => ({ ...prev, [eventId]: value }));
  };

  const allEventsAnswered = invitedEvents.length > 0 &&
    invitedEvents.every(ev => eventForm[ev.event_id]?.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allEventsAnswered) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const existingResponses = guest.event_responses || [];
      const updatedByEventId = new Map(existingResponses.map(r => [r.event_id, r]));

      for (const ev of invitedEvents) {
        const form = eventForm[ev.event_id];
        updatedByEventId.set(ev.event_id, {
          event_id: ev.event_id,
          invited: true,
          status: form.status,
          meal_choice: form.status === 'yes' ? (form.meal_choice || null) : null,
          plus_ones: (form.status === 'yes' && form.plus_one_attending) ? 1 : 0,
          plus_one_names: (form.status === 'yes' && form.plus_one_attending && form.plus_one_name)
            ? [form.plus_one_name] : [],
          responded_at: now,
        });
      }

      const nextEventResponses = Array.from(updatedByEventId.values());

      // Derive the overall rsvp_status from the per-event responses so every
      // existing couple-facing surface (RSVPChart, InvitationsTab, GuestList)
      // that only reads this legacy field — not event_responses — still
      // reflects reality. "attending" wins if any invited event is a yes;
      // "declined" only if every invited event is a no; otherwise "pending".
      const invitedResponses = nextEventResponses.filter(r => r.invited);
      const anyYes = invitedResponses.some(r => r.status === 'yes');
      const allNo = invitedResponses.length > 0 && invitedResponses.every(r => r.status === 'no');
      const derivedRsvpStatus = anyYes ? 'attending' : allNo ? 'declined' : 'pending';

      await base44.entities.Guest.update(guest.id, {
        event_responses: nextEventResponses,
        rsvp_status: derivedRsvpStatus,
        song_request: songRequest,
        rsvp_note: rsvpNote,
        dietary_restrictions: dietaryRestrictions,
        rsvp_date: now.split('T')[0],
      });
      setGuest(prev => ({ ...prev, event_responses: nextEventResponses, rsvp_status: derivedRsvpStatus, song_request: songRequest, rsvp_note: rsvpNote, dietary_restrictions: dietaryRestrictions }));
      // Advance to polls if any active, otherwise straight to done
      setStep(activePolls.length > 0 ? 'polls' : 'done');
    } catch (err) {
      console.error('RSVP submit error', err);
      alert('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const handleSubmitPolls = async () => {
    setPollSubmitting(true);
    try {
      const currentPolls = wedding?.polls || [];
      const existingVotes = guest?.poll_votes || {};
      const mergedVotes = { ...existingVotes, ...guestVotes };

      // Build updated polls array — adjust vote counts for changed votes only
      const updatedPolls = currentPolls.map(poll => {
        const newVote = guestVotes[poll.id];
        const oldVote = existingVotes[poll.id];
        // No selection made for this poll, or no change
        if (!newVote || newVote === oldVote) return poll;
        return {
          ...poll,
          options: poll.options.map(opt => {
            if (opt.id === newVote) return { ...opt, votes: (opt.votes || 0) + 1 };
            if (opt.id === oldVote) return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
            return opt;
          }),
        };
      });

      const hasNewVotes = Object.entries(guestVotes).some(
        ([pollId, optId]) => optId && existingVotes[pollId] !== optId
      );

      if (hasNewVotes && wedding?.id) {
        await Promise.all([
          base44.entities.WeddingDetails.update(wedding.id, { polls: updatedPolls }),
          base44.entities.Guest.update(guest.id, { poll_votes: mergedVotes }),
        ]);
        setWedding(prev => ({ ...prev, polls: updatedPolls }));
        setGuest(prev => ({ ...prev, poll_votes: mergedVotes }));
      }
      setStep('done');
    } catch (e) {
      console.error('Poll submit error', e);
      setStep('done'); // Advance even on error — RSVP is already saved
    }
    setPollSubmitting(false);
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const c1 = wedding?.couple1Name || '';
  const c2 = wedding?.couple2Name || '';
  const coupleName = c1 && c2 ? `${c1} & ${c2}` : c1 || c2 || '';
  const weddingDate = wedding?.weddingDate || '';
  const venue = wedding?.mainCeremony?.venueName || '';

  const dateStr = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const firstName = guest?.name ? guest.name.split(' ')[0] : '';
  // For the "done" screen icon/copy — attending overall if any invited event is a yes.
  const anyAttending = Object.values(eventForm).some(v => v.status === 'yes');
  const hasMealOptions = wedding?.mealOptions && wedding.mealOptions.length > 0;
  const mealChoices = hasMealOptions ? wedding.mealOptions : MEAL_OPTIONS;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', ...F }}>
        <div style={{ width: 28, height: 28, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: '24px', ...F }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 12 }}>INVITATION NOT FOUND</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', marginBottom: 12, letterSpacing: '-0.02em' }}>This link has expired or is invalid</h1>
          <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6 }}>Please contact the couple directly for a new invitation link.</p>
        </div>
      </div>
    );
  }

  // ── Done / thank you ───────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <PageShell coupleName={coupleName} dateStr={dateStr} venue={venue}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: anyAttending ? '#F0FDF4' : '#F5F5F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>
            {anyAttending ? '✓' : '♥'}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 10, ...F }}>
            {anyAttending ? 'SEE YOU THERE' : 'RESPONSE RECEIVED'}
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0A0A0A', marginBottom: 14, letterSpacing: '-0.02em', ...F }}>
            {anyAttending ? `We can't wait to celebrate with you!` : 'Thank you for letting us know'}
          </h2>
          {anyAttending && dateStr && (
            <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6, ...F }}>
              Mark your calendar — {dateStr}.{venue ? ` We'll see you at ${venue}.` : ''}
            </p>
          )}
          {!anyAttending && (
            <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6, ...F }}>
              You'll be missed. Thank you for taking the time to respond.
            </p>
          )}
          <button
            onClick={() => setStep('rsvp')}
            style={{ marginTop: 24, background: 'none', border: 'none', fontSize: 13, color: 'rgba(10,10,10,0.4)', cursor: 'pointer', ...F, textDecoration: 'underline' }}
          >
            Change my response
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Polls step ─────────────────────────────────────────────────────────────
  if (step === 'polls') {
    return (
      <PageShell coupleName={coupleName} dateStr={dateStr} venue={venue}>
        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', letterSpacing: '0.12em', marginBottom: 8, ...F }}>
            ONE MORE THING…
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8, ...F }}>
            {coupleName ? `A few questions from ${coupleName}` : 'A few questions'}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', lineHeight: 1.6, margin: 0, ...F }}>
            Help them plan your experience — takes less than a minute.
          </p>
        </div>

        {/* Poll cards */}
        {activePolls.map(poll => (
          <PollCard
            key={poll.id}
            poll={poll}
            selectedOptionId={guestVotes[poll.id] || null}
            onSelect={(pollId, optionId) =>
              setGuestVotes(prev => ({ ...prev, [pollId]: optionId || undefined }))
            }
          />
        ))}

        {/* Actions */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleSubmitPolls}
            disabled={pollSubmitting}
            style={{
              width: '100%', padding: '14px 24px', background: '#E03553', color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: pollSubmitting ? 0.6 : 1, transition: 'opacity 0.15s ease', ...F,
            }}
          >
            {pollSubmitting ? 'Saving…' : 'Submit responses'}
          </button>
          <button
            onClick={() => setStep('done')}
            disabled={pollSubmitting}
            style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(10,10,10,0.4)', cursor: 'pointer', ...F, textAlign: 'center', padding: '4px 0' }}
          >
            Skip
          </button>
        </div>
      </PageShell>
    );
  }

  // ── RSVP form (step === 'rsvp') — one card per invited event ───────────────
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', ...F }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Logo */}
        <p style={{ fontSize: 13, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', marginBottom: 48 }}>openinvite</p>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', letterSpacing: '0.12em', marginBottom: 10 }}>YOU'RE INVITED</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12 }}>
            {coupleName || 'A Wedding'}
          </h1>
          {dateStr && <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', marginBottom: 4 }}>{dateStr}</p>}
          {venue && <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)' }}>{venue}</p>}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', marginBottom: 40 }} />

        {/* Greeting */}
        {firstName && (
          <p style={{ fontSize: 16, color: '#0A0A0A', marginBottom: 8 }}>Hi {firstName},</p>
        )}
        <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.65)', lineHeight: 1.7, marginBottom: 28 }}>
          {coupleName || 'We'} would love to know if you can join {coupleName ? 'them' : 'us'} to celebrate. Please respond for each event below.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {invitedEvents.length === 0 ? (
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', marginBottom: 28 }}>
              No events found for this invitation yet — please check back soon or contact the couple.
            </p>
          ) : (
            invitedEvents.map(ev => (
              <EventCard
                key={ev.event_id}
                event={ev}
                value={eventForm[ev.event_id] || { status: '', meal_choice: '', plus_one_attending: false, plus_one_name: '' }}
                onChange={(value) => updateEvent(ev.event_id, value)}
                hasPlusOne={!!guest?.plus_one}
                mealChoices={mealChoices}
              />
            ))
          )}

          {/* Wedding-level fields — render once, not per event */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              Dietary restrictions
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.4)', marginLeft: 6 }}>optional</span>
            </label>
            <input
              type="text"
              value={dietaryRestrictions}
              onChange={e => setDietaryRestrictions(e.target.value)}
              placeholder="e.g. gluten free, nut allergy"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 0, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF', ...F, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              Song request
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.4)', marginLeft: 6 }}>optional</span>
            </label>
            <input
              type="text"
              value={songRequest}
              onChange={e => setSongRequest(e.target.value)}
              placeholder="What song will get you on the dance floor?"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 0, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF', ...F, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              Message for the couple
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.4)', marginLeft: 6 }}>optional</span>
            </label>
            <textarea
              value={rsvpNote}
              onChange={e => setRsvpNote(e.target.value)}
              placeholder="We're so excited to celebrate with you!"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 0, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF', ...F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!allEventsAnswered || submitting}
            style={{
              width: '100%', padding: '14px 24px', background: '#E03553', color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: (!allEventsAnswered || submitting) ? 0.5 : 1, transition: 'opacity 0.15s ease', ...F,
            }}
          >
            {submitting ? 'Sending…' : 'Submit RSVP'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(10,10,10,0.3)', marginTop: 48 }}>
          Powered by openinvite.com.au
        </p>
      </div>
    </div>
  );
}
