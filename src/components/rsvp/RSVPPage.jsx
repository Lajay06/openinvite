import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { getWeddingEvents, getGuestEventResponse, getEventVenueAndDate } from '@/lib/weddingEvents';
import { resolveColors, resolveTypography, resolveUniverseConfig, isMotionEnabled } from '@/lib/universeStyling';
import { formSurfaces } from '@/lib/surfaceTint';
import { loadFontFamilies, familiesFromGoogleSpec } from '@/lib/selfHostedFonts';
import SectionReveal from '@/components/guest-website/SectionReveal';
import { formatWeddingDate } from '@/lib/guestDate';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Matches this page's original, pre-universe hardcoded look exactly — used
// when a wedding has no active universe, per BUILDER_UNIVERSE_AUDIT.md item
// 1's "graceful fallback" requirement. Deliberately NOT resolveColors()'s own
// internal default (which falls back to the London palette) — a wedding that
// never chose a universe should see OpenInvite's own brand look, not a
// phantom London theme it never selected.
const DIETARY_OTHER = 'Something else';
const DIETARY_OPTIONS = [
  'No restrictions', 'Vegetarian', 'Vegan', 'Gluten free',
  'Dairy free', 'Nut allergy', 'Halal', 'Kosher', DIETARY_OTHER,
];

const FALLBACK_THEME = {
  darkBg: '#FAFAFA', lightBg: '#FAFAFA', darkText: '#0A0A0A', lightText: '#0A0A0A',
  accent: '#E03553', accentSecondary: '#E03553', navBg: '#FAFAFA',
};
const FALLBACK_TYPOGRAPHY = {
  headingFont: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
  bodyFont: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
  headingWeight: 800, bodyWeight: 400, headingStyle: 'normal', googleFonts: '',
};

// ── Shared page shell ─────────────────────────────────────────────────────────
/**
 * The chrome around the form.
 *
 * `embedded` is the whole difference between the standalone /rsvp/:token page
 * and the RSVP tab inside the couple's site. Standalone, this owns the viewport:
 * full height, its own background, the Openinvite wordmark, the couple's names
 * and date, and a "Powered by" footer — because it IS the page.
 *
 * Embedded, the site already provides every one of those. The nav is above, the
 * universe background is behind, the couple's names are in the masthead, and the
 * footer is the site's. Repeating them would render the wedding's name twice on
 * one screen and stack two footers. So embedded mode contributes NOTHING but the
 * form itself, and inherits the section rhythm around it.
 *
 * The form body below is identical in both. That is deliberate: a guest filling
 * this in from an emailed link and a guest filling it in from the site tab are
 * answering the same questions, and one implementation means they cannot drift.
 */
function PageShell({ coupleName, dateStr, venue, theme, typography, universeConfig, wedding, embedded, children }) {
  const F = { fontFamily: typography.bodyFont };

  if (embedded) {
    return <div style={{ ...F }}>{children}</div>;
  }

  return (
    <div style={{ minHeight: '100dvh', background: theme.lightBg, ...F }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: theme.lightText, letterSpacing: '-0.02em', marginBottom: 48 }}>
          openinvite
        </p>
        {/* Wedding header */}
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(wedding)}>
          <div style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.12em', marginBottom: 8, ...F }}>
              YOU'RE INVITED
            </p>
            <h1 style={{
              fontSize: 28, fontWeight: typography.headingWeight, fontStyle: typography.headingStyle,
              color: theme.lightText, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 10px',
              fontFamily: typography.headingFont,
            }}>
              {coupleName || 'A Wedding'}
            </h1>
            {dateStr && <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', marginBottom: 3, ...F }}>{dateStr}</p>}
            {venue && <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>{venue}</p>}
          </div>
        </SectionReveal>
        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.12)', marginBottom: 36 }} />
        {children}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(10,10,10,0.6)', marginTop: 48, ...F }}>
          Powered by openinvite.com.au
        </p>
      </div>
    </div>
  );
}

// ── Poll voting card ──────────────────────────────────────────────────────────
function PollCard({ poll, selectedOptionId, onSelect, theme, typography }) {
  const S = formSurfaces(theme);
  const F = { fontFamily: typography.bodyFont };
  return (
    <div style={{ border: `1px solid ${S.border}`, background: S.surface, padding: '20px 20px 16px', marginBottom: 16 }}>
      {poll.emoji && (
        <span style={{ fontSize: 22, display: 'block', marginBottom: 8 }}>{poll.emoji}</span>
      )}
      <p style={{ fontSize: 15, fontWeight: 700, color: theme.lightText, margin: '0 0 16px', lineHeight: 1.4, ...F }}>
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
                border: `1.5px solid ${selected ? theme.accent : 'rgba(10,10,10,0.15)'}`,
                borderRadius: 999,
                background: selected ? theme.accent : '#FFFFFF',
                color: selected ? '#FFFFFF' : theme.lightText,
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
function EventCard({ event, value, onChange, hasPlusOne, mealChoices, hasMealOptions, theme, typography, wedding }) {
  const F = { fontFamily: typography.bodyFont };
  // F-D: solid fills mixed from the couple's palette. See src/lib/surfaceTint.js
  // — an alpha fill composites over the universe's texture, so its final colour
  // is unknowable and its contrast unprovable.
  const S = formSurfaces(theme);
  const attending = value.status === 'yes';
  // F-F: main events carry no venue of their own — ceremony/reception venue
  // lives on the wedding record — so look it back up rather than showing a
  // card a guest cannot act on.
  const { venue, address, mapsUrl, date: lookedUpDate } = getEventVenueAndDate(wedding, event);
  const effectiveDate = event.date || lookedUpDate;
  // formatWeddingDate returns '' for anything unparseable rather than the
  // string "Invalid Date" — effectiveDate falls back to the wedding record's
  // date, which is a full ISO timestamp, not the date-only shape 'T00:00:00'
  // was being appended to.
  const dateStr = formatWeddingDate(effectiveDate, 'en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ border: `1px solid ${S.border}`, background: S.surface, padding: '20px 20px 20px', marginBottom: 16 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: theme.lightText, margin: '0 0 4px', ...F }}>
        {event.name}
      </p>
      {(dateStr || event.startTime) && (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 2px', ...F }}>
          {[dateStr, event.startTime].filter(Boolean).join(' · ')}
        </p>
      )}
      {(venue || address) && (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 2px', lineHeight: 1.5, ...F }}>
          {venue && <span style={{ fontWeight: 600 }}>{venue}</span>}
          {venue && address ? ' · ' : ''}
          {address}
        </p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 13, color: theme.accent, textDecoration: 'underline', textUnderlineOffset: '3px', ...F }}
        >
          View on map
        </a>
      )}
      <div style={{ height: 14 }} />

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
              borderColor: value.status === opt.value ? S.borderSelected : S.border,
              background: value.status === opt.value ? S.surfaceSelected : '#FFFFFF',
              color: value.status === opt.value ? theme.accent : theme.lightText,
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
          {/* Meal preference is OPT-IN: the couple's own menu is the switch.
              This used to render unconditionally, populated from
              DEFAULT_MEAL_OPTIONS, so a couple who had configured nothing had
              their guests asked to choose from six options WE invented —
              presented on the couple's wedding site as the couple's menu. */}
          {hasMealOptions && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.lightText, marginBottom: 8, ...F }}>
              Meal preference
            </label>
            <select
              value={value.meal_choice || ''}
              onChange={e => onChange({ ...value, meal_choice: e.target.value })}
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${S.border}`, borderRadius: 0, fontSize: 14, color: theme.lightText, background: S.surface, ...F, outline: 'none' }}
            >
              <option value="">Select a meal</option>
              {mealChoices.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          )}

          {hasPlusOne && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id={`plusone-${event.event_id}`}
                checked={!!value.plus_one_attending}
                onChange={e => onChange({ ...value, plus_one_attending: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: theme.accent }}
              />
              <label htmlFor={`plusone-${event.event_id}`} style={{ fontSize: 13, color: theme.lightText, cursor: 'pointer', ...F }}>
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
              style={{ width: '100%', padding: '9px 10px', border: `1px solid ${S.border}`, borderRadius: 0, fontSize: 14, color: theme.lightText, background: S.surface, ...F, outline: 'none', boxSizing: 'border-box' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {string} [props.token]    the guest's RSVP token. Omitted on the
 *   standalone route, where it comes from the URL instead.
 * @param {boolean} [props.embedded] render as a section inside the guest site
 *   rather than as a standalone page.
 */
export default function RSVPPage({ token: tokenProp, embedded = false }) {
  // The standalone route supplies the token in the URL; the embedded tab passes
  // it as a prop from the site's recognition state. useParams() is safe in both:
  // outside a matching route it simply yields no token.
  // Embedded mode collapses the page chrome. Four branches render their own
  // container -- loading, not-found, the main form, and PageShell -- because the
  // main form predates PageShell and duplicates its header inline rather than
  // using it. That duplication is pre-existing drift, left alone here: this PR
  // is about where the form RENDERS, and rewriting the header at the same time
  // would put a layout change inside a routing change.
  const shellOuter = (t) => (embedded ? {} : { minHeight: '100dvh', background: t.lightBg });
  const shellInner = (embedded
    ? { maxWidth: 520, margin: '0 auto' }
    : { maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' });
  const navigate = useNavigate();
  const { token: tokenFromUrl } = useParams();
  const token = tokenProp || tokenFromUrl;


  const [guest, setGuest] = useState(null);
  const [wedding, setWedding] = useState(null);

  // REDIRECT INTO THE SITE — enabled only now that the tab renders a real form.
  //
  // A guest arriving from an emailed /rsvp/<token> link belongs inside the
  // couple's site, not on a standalone page outside it: the site IS the
  // invitation, and replying should not eject them from it. The slug comes from
  // the lookup this component already performs, so no extra request is made.
  //
  // ORDERING IS LOAD-BEARING. Until WeddingRSVPPage embedded the form, this
  // redirect would have sent every guest holding a link from a working form to
  // a page offering only an email box. That is why it lands here and not in the
  // transport PR.
  //
  // `replace` rather than `push`: the token URL must not sit in history where a
  // back button returns to it. The token travels once as ?rsvp= and is stripped
  // by the site on arrival.
  const [redirected, setRedirected] = useState(false);
  useEffect(() => {
    if (embedded || redirected) return;
    const slug = wedding?.slug;
    if (!slug || !token) return;
    setRedirected(true);
    navigate(`/w/${slug}/rsvp?rsvp=${encodeURIComponent(token)}`, { replace: true });
  }, [embedded, redirected, wedding, token, navigate]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // steps: 'rsvp' | 'polls' | 'done'
  const [step, setStep] = useState('rsvp');

  // TWO STEPS, and the primary answer WRITES IMMEDIATELY.
  //
  // 'ask'      — the only question that matters: can you come?
  // 'details'  — refinement, after the answer is already recorded
  // 'declined' — the short path; a decline is complete at the tap
  //
  // Committing on the primary tap rather than at the end of a form is the point:
  // a guest who taps yes and then closes the tab is still counted, which is what
  // the couple actually needs. RsvpResponse is append-only with latest-wins, so
  // the details write refines the first without conflicting with it -- the model
  // was built for exactly this.
  // Dietary is PICKED, then serialised back to the single free string the
  // schema already stores. `dietaryRestrictions` stays the source of truth on
  // the wire; these two drive the pills only.
  const [dietaryPicked, setDietaryPicked] = useState([]);
  const [dietaryOther, setDietaryOther] = useState('');
  const toggleDietary = (opt) => {
    setDietaryPicked(prev => {
      // "No restrictions" is exclusive: it cannot coexist with a restriction.
      if (opt === 'No restrictions') return prev.includes(opt) ? [] : [opt];
      const without = prev.filter(o => o !== 'No restrictions');
      return without.includes(opt) ? without.filter(o => o !== opt) : [...without, opt];
    });
  };

  const [phase, setPhase] = useState('ask');
  const [primarySaving, setPrimarySaving] = useState(false);
  const [primaryError, setPrimaryError] = useState('');
  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');
  const [submitting, setSubmitting] = useState(false);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  // { [pollId]: optionId } — guest's current poll selections
  const [guestVotes, setGuestVotes] = useState({});

  // Who's coming (round 7 ask #16) — fetched from a separate, server-gated
  // endpoint once the guest reaches the thank-you step; never derived from
  // `wedding` or anything else already in the browser, since the gate has
  // to be re-checked server-side regardless of what the client thinks the
  // toggle state is.
  const [attendees, setAttendees] = useState([]);
  const [circle, setCircle] = useState([]);

  // Wedding-level fields — render once, not per event. Dietary restrictions
  // are constant across events per SMART_RSVP_MODEL.md (not per-event, unlike
  // meal_choice which does vary by event's menu).
  const [songRequest, setSongRequest] = useState('');
  const [rsvpNote, setRsvpNote] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [email, setEmail] = useState('');
  // F-C. The couple already holds an address for most guests — it is how the
  // invitation reached them — so asking again is a field the guest does not
  // need to fill and a chance to mistype what we already have. Shown ONLY when
  // we hold nothing: guests added by name alone, and the never-emailed case.
  //
  // Depends on F-A: before mergeGuestPii ran at resolveGuestByToken, g.email
  // was the nulled plaintext column for every guest, so this flag would have
  // read "no email on file" universally and the field would always have shown.
  const [hasEmailOnFile, setHasEmailOnFile] = useState(false);

  // Per-event form state: { [event_id]: { status, meal_choice, plus_one_attending, plus_one_name } }
  const [eventForm, setEventForm] = useState({});

  // A wedding with no active universe (or an unrecognised one) falls back to
  // OpenInvite's own brand look rather than silently borrowing resolveColors'/
  // resolveTypography's own internal default (the London palette) — see
  // FALLBACK_THEME's comment.
  const universeConfig = wedding ? resolveUniverseConfig(wedding) : null;
  const theme = universeConfig ? resolveColors(wedding) : FALLBACK_THEME;
  const typography = universeConfig ? resolveTypography(wedding) : FALLBACK_TYPOGRAPHY;
  const S = formSurfaces(theme);

  // This route is a standalone page (src/App.jsx), entirely outside
  // MultiPageWeddingWebsite.jsx's render tree, so it must inject its own
  // Google Fonts stylesheet for the resolved typography — same mechanism
  // MultiPageWeddingWebsite.jsx uses (one swappable <link>, display=swap).
  // Self-hosted (L1b) -- same reasoning as MultiPageWeddingWebsite: our own
  // origin, lazy per family, and no preconnect to Google.
  useEffect(() => {
    loadFontFamilies(familiesFromGoogleSpec(typography?.googleFonts));
  }, [typography]);

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
        const res = await fetch(`/api/rsvp-lookup?token=${encodeURIComponent(token)}`);
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        const { guest: g, wedding: wd } = await res.json();
        setGuest(g);
        setWedding(wd);
        // Pre-populate any previous poll votes
        setGuestVotes(g.poll_votes || {});
        setSongRequest(g.song_request || '');
        setRsvpNote(g.rsvp_note || '');
        setDietaryRestrictions(g.dietary_restrictions || '');
        setEmail(g.email || '');
        setHasEmailOnFile(!!g.email);

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

  // Fetched once the guest reaches the thank-you step — not before, since
  // there's no reason to make this call until they've actually responded.
  // Renders nothing if both arrays come back empty (toggles off, or no
  // matches), which is exactly what the server returns when the owner has
  // both settings off — no separate "is this feature even on" check needed
  // client-side.
  useEffect(() => {
    if (step !== 'done' || !token) return;
    fetch(`/api/wedding-attendees?token=${encodeURIComponent(token)}`)
      .then(res => res.ok ? res.json() : { attendees: [], circle: [] })
      .then(data => {
        setAttendees(data.attendees || []);
        setCircle(data.circle || []);
      })
      .catch(() => {});
  }, [step, token]);

  const updateEvent = (eventId, value) => {
    setEventForm(prev => ({ ...prev, [eventId]: value }));
  };

  const allEventsAnswered = invitedEvents.length > 0 &&
    invitedEvents.every(ev => eventForm[ev.event_id]?.status);

  /**
   * Write a set of event responses. Shared by the primary tap and the details
   * submit so the two cannot drift: same endpoint, same shape, same merge.
   */
  const writeResponses = async (responses, extra = {}) => {
    const res = await fetch('/api/rsvp-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, event_responses: responses, ...extra }),
    });
    if (!res.ok) throw new Error('RSVP submit failed');
    return res;
  };

  /**
   * THE PRIMARY ANSWER. One tap, applied across every invited event, written
   * straight away.
   *
   * A guest invited to several events gets that answer as their DEFAULT for all
   * of them, and refines per event on the next screen if they need to. A guest
   * invited to one event is simply finished answering.
   */
  const answerPrimary = async (yes) => {
    if (primarySaving) return;
    setPrimaryError('');
    setPrimarySaving(true);
    const status = yes ? 'yes' : 'no';
    const now = new Date().toISOString();
    try {
      await writeResponses(invitedEvents.map(ev => ({
        event_id: ev.event_id,
        status,
        meal_choice: null,
        plus_ones: 0,
        plus_one_names: [],
        responded_at: now,
      })));
      // Seed the details form from the primary answer so the per-event list
      // opens already reflecting what was just recorded.
      setEventForm(prev => {
        const next = { ...prev };
        for (const ev of invitedEvents) next[ev.event_id] = { ...(next[ev.event_id] || {}), status };
        return next;
      });
      setPhase(yes ? 'details' : 'declined');
    } catch {
      setPrimaryError('That did not save. Please try again.');
    } finally {
      setPrimarySaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allEventsAnswered) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Just this submission's newly-answered events — the server merges
      // these onto the guest's existing event_responses (resolved fresh
      // from the token) and derives the overall rsvp_status itself, so the
      // exact same merge/derive logic can't drift between client and
      // server copies.
      const submittedResponses = invitedEvents.map(ev => {
        const form = eventForm[ev.event_id];
        return {
          event_id: ev.event_id,
          status: form.status,
          meal_choice: form.status === 'yes' ? (form.meal_choice || null) : null,
          plus_ones: (form.status === 'yes' && form.plus_one_attending) ? 1 : 0,
          plus_one_names: (form.status === 'yes' && form.plus_one_attending && form.plus_one_name)
            ? [form.plus_one_name] : [],
          responded_at: now,
        };
      });

      const res = await fetch('/api/rsvp-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          event_responses: submittedResponses,
          song_request: songRequest,
          rsvp_note: rsvpNote,
          // Pills serialise back into the one free string the schema stores.
          // "Something else" contributes its typed text, not the label.
          dietary_restrictions: dietaryPicked.length
            ? dietaryPicked
                .map(o => (o === DIETARY_OTHER ? dietaryOther.trim() : o))
                .filter(Boolean)
                .join(', ')
            : dietaryRestrictions,
          email,
        }),
      });
      if (!res.ok) throw new Error('RSVP submit failed');

      // Optimistic local merge for the "done"/anyAttending display below —
      // the server is the source of truth for what actually persisted.
      const existingByEventId = new Map((guest.event_responses || []).map(r => [r.event_id, r]));
      for (const r of submittedResponses) existingByEventId.set(r.event_id, { ...r, invited: true });
      setGuest(prev => ({
        ...prev,
        event_responses: Array.from(existingByEventId.values()),
        song_request: songRequest,
        rsvp_note: rsvpNote,
        dietary_restrictions: dietaryRestrictions,
        email,
      }));
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
      const existingVotes = guest?.poll_votes || {};
      const mergedVotes = { ...existingVotes, ...guestVotes };
      const hasNewVotes = Object.entries(guestVotes).some(
        ([pollId, optId]) => optId && existingVotes[pollId] !== optId
      );

      if (hasNewVotes) {
        const turnstileToken = tsTokenRef.current;
        if (!turnstileToken) throw new Error('Security check still loading');
        // Server re-fetches the wedding/guest fresh and computes the vote-count
        // deltas itself — never trusts a client-cached polls array, which
        // could be stale relative to other guests voting concurrently.
        const res = await fetch('/api/rsvp-poll-vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, votes: guestVotes, turnstileToken }),
        });
        if (!res.ok) throw new Error('Poll vote failed');
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
  // The couple's menu is the ONLY source of choices. DEFAULT_MEAL_OPTIONS is
  // no longer read here: it survives as a label resolver for values already
  // stored against historical answers (mealOptionLabel), never as a source of
  // options to offer. Our defaults must not impersonate the couple's choices.
  const hasMealOptions = Array.isArray(wedding?.mealOptions) && wedding.mealOptions.length > 0;
  const mealChoices = hasMealOptions ? wedding.mealOptions : [];

  const F = { fontFamily: typography.bodyFont };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...shellOuter(theme), minHeight: embedded ? 220 : '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F }}>
        <div style={{ width: 28, height: 28, border: '2px solid #EEE', borderTopColor: theme.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ ...shellOuter(theme), minHeight: embedded ? 220 : '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', ...F }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: theme.accent, letterSpacing: '0.1em', marginBottom: 12 }}>Invitation not found</p>
          <h1 style={{ fontSize: 24, fontWeight: typography.headingWeight, fontFamily: typography.headingFont, color: theme.lightText, marginBottom: 12, letterSpacing: '-0.02em' }}>This link has expired or is invalid</h1>
          <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6 }}>Please contact the couple directly for a new invitation link.</p>
        </div>
      </div>
    );
  }

  // ── Done / thank you ───────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <PageShell embedded={embedded} coupleName={coupleName} dateStr={dateStr} venue={venue} theme={theme} typography={typography} universeConfig={universeConfig} wedding={wedding}>
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(wedding)}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: theme.accent, letterSpacing: '0.1em', marginBottom: 10, ...F }}>
              {anyAttending ? 'SEE YOU THERE' : 'RESPONSE RECEIVED'}
            </p>
            <h2 style={{ fontSize: 26, fontWeight: typography.headingWeight, color: theme.lightText, marginBottom: 14, letterSpacing: '-0.02em', fontFamily: typography.headingFont }}>
              {anyAttending ? `We can't wait to celebrate with you!` : 'Thank you for letting us know'}
            </h2>
            {anyAttending && dateStr && (
              <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, ...F }}>
                Mark your calendar — {dateStr}.{venue ? ` We'll see you at ${venue}.` : ''}
              </p>
            )}
            {!anyAttending && (
              <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, ...F }}>
                You'll be missed. Thank you for taking the time to respond.
              </p>
            )}
            {(attendees.length > 0 || circle.length > 0) && (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${theme.accent}22` }}>
                {circle.length > 0 && (
                  <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.7)', lineHeight: 1.6, marginBottom: attendees.length > 0 ? 10 : 0, ...F }}>
                    From your circle: {circle.join(', ')}
                  </p>
                )}
                {attendees.length > 0 && (
                  <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, ...F }}>
                    Also attending: {attendees.join(', ')}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => setStep('rsvp')}
              style={{ marginTop: 24, background: 'none', border: 'none', fontSize: 13, color: 'rgba(10,10,10,0.6)', cursor: 'pointer', ...F, textDecoration: 'underline' }}
            >
              Change my response
            </button>
          </div>
        </SectionReveal>
      </PageShell>
    );
  }

  // ── Polls step ─────────────────────────────────────────────────────────────
  if (step === 'polls') {
    return (
      <PageShell embedded={embedded} coupleName={coupleName} dateStr={dateStr} venue={venue} theme={theme} typography={typography} universeConfig={universeConfig} wedding={wedding}>
        {/* Heading */}
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(wedding)}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.12em', marginBottom: 8, ...F }}>
              ONE MORE THING…
            </p>
            <h2 style={{ fontSize: 22, fontWeight: typography.headingWeight, color: theme.lightText, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8, fontFamily: typography.headingFont }}>
              {coupleName ? `A few questions from ${coupleName}` : 'A few questions'}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, margin: 0, ...F }}>
              Help them plan your experience — takes less than a minute.
            </p>
          </div>
        </SectionReveal>

        {/* Poll cards */}
        {activePolls.map(poll => (
          <PollCard
            key={poll.id}
            poll={poll}
            selectedOptionId={guestVotes[poll.id] || null}
            onSelect={(pollId, optionId) =>
              setGuestVotes(prev => ({ ...prev, [pollId]: optionId || undefined }))
            }
            theme={theme}
            typography={typography}
          />
        ))}

        {/* Actions */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleSubmitPolls}
            disabled={pollSubmitting}
            style={{
              width: '100%', padding: '14px 24px', background: theme.accent, color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: pollSubmitting ? 0.6 : 1, transition: 'opacity 0.15s ease', ...F,
            }}
          >
            {pollSubmitting ? 'Saving…' : 'Submit responses'}
          </button>
          <button
            onClick={() => setStep('done')}
            disabled={pollSubmitting}
            style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(10,10,10,0.6)', cursor: 'pointer', ...F, textAlign: 'center', padding: '4px 0' }}
          >
            Skip
          </button>
        </div>

        {/* Invisible Turnstile — execution="render" auto-generates a token on
            mount, same pattern as WeddingPollsPage.jsx. */}
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(t) => { tsTokenRef.current = t; }}
          onExpire={() => { tsTokenRef.current = ''; }}
          options={{ appearance: 'execute', execution: 'render' }}
        />
      </PageShell>
    );
  }

  // ── RSVP form (step === 'rsvp') — one card per invited event ───────────────
  return (
    <div className="wb-guest-root" style={{
      ...shellOuter(theme), ...F,
      '--wb-heading-font': typography.headingFont,
      '--wb-body-font': typography.bodyFont,
    }}>
      <div style={shellInner}>

        {/* Logo and wedding header: the standalone page owns these, the site
            already shows all three above the tab. Rendering them embedded put
            the couple's name on screen twice. */}
        {!embedded && (<>
        {/* Logo */}
        <p style={{ fontSize: 13, fontWeight: 800, color: theme.lightText, letterSpacing: '-0.02em', marginBottom: 48 }}>openinvite</p>

        {/* Header */}
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(wedding)}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: theme.accent, letterSpacing: '0.12em', marginBottom: 10 }}>YOU'RE INVITED</p>
            <h1 style={{ fontSize: 32, fontWeight: typography.headingWeight, fontFamily: typography.headingFont, color: theme.lightText, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12 }}>
              {coupleName || 'A Wedding'}
            </h1>
            {dateStr && <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', marginBottom: 4 }}>{dateStr}</p>}
            {venue && <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)' }}>{venue}</p>}
          </div>
        </SectionReveal>
        </>)}

        {/* Divider */}
        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.12)', marginBottom: 40 }} />

        {/* Greeting */}
        {firstName && (
          <p style={{ fontSize: 16, color: theme.lightText, marginBottom: 8 }}>Hi {firstName},</p>
        )}
        <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.65)', lineHeight: 1.7, marginBottom: 28 }}>
          {phase === 'ask'
            ? `${coupleName || 'We'} would love to know if you can join ${coupleName ? 'them' : 'us'} to celebrate.`
            : phase === 'declined'
              ? 'Thank you for letting us know.'
              : 'You are counted in. Everything below is refinement — nothing here is waiting to be submitted.'}
        </p>

        {/* ── THE PRIMARY QUESTION ──────────────────────────────────────────
            Two large buttons, first thing, above everything else. This is the
            only question the page exists to ask, and it COMMITS ON THE TAP: a
            guest who answers and then closes the tab is still counted, which is
            what the couple actually needs. Universe styling, because this is the
            most-looked-at control in the product and gray chrome would waste it.
            60px tall and full width -- sized for a thumb at 390, not a cursor. */}
        {phase === 'ask' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { yes: true, label: 'Yes, I will be there' },
                { yes: false, label: "Sorry, I can't make it" },
              ].map(opt => (
                <button
                  key={String(opt.yes)}
                  type="button"
                  disabled={primarySaving || invitedEvents.length === 0}
                  onClick={() => answerPrimary(opt.yes)}
                  style={{
                    width: '100%', minHeight: 60, padding: '18px 24px',
                    borderRadius: 999, cursor: primarySaving ? 'wait' : 'pointer',
                    border: opt.yes ? 'none' : `1px solid ${theme.accent}`,
                    background: opt.yes ? theme.accent : 'transparent',
                    color: opt.yes ? theme.lightBg : theme.accent,
                    fontFamily: typography.headingFont,
                    fontWeight: typography.headingWeight || 600,
                    fontSize: 19, letterSpacing: '-0.01em',
                    opacity: primarySaving ? 0.6 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {primaryError && (
              <p role="alert" style={{ fontSize: 13, color: '#E03553', marginTop: 12 }}>{primaryError}</p>
            )}
            {invitedEvents.length === 0 && (
              <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', marginTop: 16 }}>
                No events found for this invitation yet — please check back soon or contact the couple.
              </p>
            )}
          </div>
        )}

        {/* ── THE DECLINE PATH ──────────────────────────────────────────────
            Short, deliberately. The reply is already recorded; a note is
            optional and nothing else is asked. Marching someone who cannot come
            through a dietary form is exactly what this avoids. */}
        {phase === 'declined' && (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 15, color: theme.lightText, lineHeight: 1.7, marginBottom: 20 }}>
              Your reply is saved. If you would like to leave a note for
              {coupleName ? ` ${coupleName}` : ' the couple'}, you can do it here.
            </p>
            <textarea
              value={rsvpNote}
              onChange={e => setRsvpNote(e.target.value)}
              placeholder="Optional — anything you would like to say"
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', border: '1px solid rgba(10,10,10,0.12)',
                borderRadius: 0, fontSize: 15, fontFamily: typography.bodyFont,
                color: theme.lightText, background: S.surface, boxSizing: 'border-box', marginBottom: 20,
              }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', minHeight: 52, borderRadius: 999, border: 'none',
                background: theme.accent, color: theme.lightBg, cursor: 'pointer',
                fontFamily: typography.headingFont, fontWeight: typography.headingWeight || 600, fontSize: 16,
              }}
            >
              {submitting ? 'Saving…' : 'Send my note'}
            </button>
          </form>
        )}

        {/* Details — reached only once the primary answer is recorded */}
        {phase === 'details' && (
        <form onSubmit={handleSubmit}>

          {invitedEvents.length === 0 ? (
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', marginBottom: 28 }}>
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
                hasMealOptions={hasMealOptions}
                wedding={wedding}
                theme={theme}
                typography={typography}
              />
            ))
          )}

          {/* Wedding-level fields — render once, not per event */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: theme.lightText, marginBottom: 8 }}>
              Dietary restrictions
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.6)', marginLeft: 6 }}>optional</span>
            </label>
            {/* PILLS, not a text box. A guest should be recognising their
                  requirement, not composing it -- and a tapped option is a
                  thumb-sized target where a text field is a keyboard. Storage
                  stays a free STRING, as ruled: this is input, not schema, so
                  anything already saved keeps working and nothing migrates. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIETARY_OPTIONS.map(opt => {
                const on = dietaryPicked.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleDietary(opt)}
                    style={{
                      minHeight: 40, padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
                      border: `1px solid ${on ? theme.accent : 'rgba(10,10,10,0.15)'}`,
                      background: on ? S.surfaceSelected : '#FFFFFF',
                      color: on ? theme.accent : theme.lightText,
                      fontSize: 14, fontWeight: on ? 600 : 400, ...F,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {dietaryPicked.includes(DIETARY_OTHER) && (
              <input
                type="text"
                value={dietaryOther}
                onChange={e => setDietaryOther(e.target.value)}
                placeholder="What should they know?"
                style={{ width: '100%', marginTop: 10, padding: '10px 12px', border: `1px solid ${S.border}`, borderRadius: 0, fontSize: 14, color: theme.lightText, background: S.surface, boxSizing: 'border-box', ...F }}
              />
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: theme.lightText, marginBottom: 8 }}>
              Song request
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.6)', marginLeft: 6 }}>optional</span>
            </label>
            <input
              type="text"
              value={songRequest}
              onChange={e => setSongRequest(e.target.value)}
              placeholder="What song will get you on the dance floor?"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${S.border}`, borderRadius: 0, fontSize: 14, color: theme.lightText, background: S.surface, ...F, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: theme.lightText, marginBottom: 8 }}>
              Message for the couple
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.6)', marginLeft: 6 }}>optional</span>
            </label>
            <textarea
              value={rsvpNote}
              onChange={e => setRsvpNote(e.target.value)}
              placeholder="We're so excited to celebrate with you!"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${S.border}`, borderRadius: 0, fontSize: 14, color: theme.lightText, background: S.surface, ...F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          </div>

          {!hasEmailOnFile && (
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: theme.lightText, marginBottom: 8 }}>
              Your email
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.6)', marginLeft: 6 }}>optional — so the couple can reach you</span>
            </label>
            <input
              type="text"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${S.border}`, borderRadius: 0, fontSize: 14, color: theme.lightText, background: S.surface, ...F, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!allEventsAnswered || submitting}
            style={{
              width: '100%', padding: '14px 24px', background: theme.accent, color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: (!allEventsAnswered || submitting) ? 0.5 : 1, transition: 'opacity 0.15s ease', ...F,
            }}
          >
            {submitting ? 'Sending…' : 'Submit RSVP'}
          </button>
        </form>
        )}

        {/* Footer — standalone only. The site has its own; a second one inside
            the tab is the same duplication the header had. */}
        {!embedded && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(10,10,10,0.6)', marginTop: 48 }}>
            Powered by openinvite.com.au
          </p>
        )}
      </div>
    </div>
  );
}
