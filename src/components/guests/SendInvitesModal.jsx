import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { coupleDisplayName } from '@/lib/coupleNames';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { getWeddingEvents, getGuestEventResponse, getEventVenueAndDate } from '@/lib/weddingEvents';
import {
  renderInvitationEmail, EMAIL_TYPES, getTypeComposeDefaults, getBannerImageUrl, getDefaultBannerChoice,
} from '@/lib/emailTemplate';
import { X, Mail, Check, Loader2, Search, ArrowLeft, ArrowRight, Send, AlertCircle, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import GuestAvatar from '@/components/shared/GuestAvatar';
import { isAttending, isDeclined, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { interactiveDivProps } from '@/lib/a11y';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { fetchGuestLinks } from '@/lib/guestLinks';
import { invitationsFor } from '@/lib/household';
import { invitationGreetingName } from '@/lib/guestGreeting';

// Guarded on the pattern already used by src/lib/app-params.js: read the
// environment at module load only when there IS one. Browser behavior is
// byte-identical; outside a browser this is a relative path rather than a throw,
// which is what lets this module be loaded in a test at all.
const RSVP_BASE = typeof window === 'undefined' ? '/rsvp/' : `${window.location.origin}/rsvp/`;

// Belt to ensureTokens' braces. A falsy token concatenates to the string
// "undefined" and yields a URL that resolves to "Invitation not found" — a
// dead link, emailed, unrecallable. The caller must never reach here with one;
// if it does, fail loudly rather than build it. handleSend's catch turns this
// into a visible toast and nothing is sent.
function buildRsvpUrl(token) {
  if (!token) throw new Error('Refusing to build an RSVP link from an empty token.');
  return RSVP_BASE + token;
}

// ── THE WHATSAPP CHANNEL IS GONE ────────────────────────────────────────────
//
// Item 12 of goals/2026-10-08-site-fixes-batch-1.md, part 12b: "Email from the
// studio is the only way guests receive the site." Three things lived here and
// all three are removed: buildWhatsAppMessage, buildWhatsAppUrl and the
// WhatsAppPreview bubble, along with the channel step's WhatsApp and
// "Email + WhatsApp" options and the branch of handleSend that opened a tab
// per guest.
//
// TWO DECISIONS DIE WITH IT, and they are recorded rather than deleted,
// because both were right about the problem they solved and whoever revisits
// this channel will hit the same two problems again:
//
//   RUN 6 U1 — ONE DOORWAY. WhatsApp used to be the only channel carrying the
//   guest's token as /rsvp/<token>, which resolves and then redirects into the
//   site, while email opened the site directly as that guest. The ruling made
//   both land in the same place: one destination to reason about, and the
//   guest sees the couple's site rather than a redirect on the way to it.
//   Email keeps that destination; it is built by buildGuestCtaUrl and nothing
//   about it changes here.
//
//   A NUMBER NOBODY CAN READ IS NOT A NUMBER. The URL builder stripped
//   non-digits and sent what was left, so "0412 345 678" went out as
//   wa.me/0412345678 and WhatsApp answered that the number is not on WhatsApp,
//   correctly. src/lib/phoneE164.js exists because of that report and is still
//   used by the Messages page, which opens a chat with a guest who has already
//   written in. This file no longer needs it.

function replaceMergeTags(str, guestName, coupleName, dateStr) {
  // IN STEP WITH api/send-invites.js's copy, because the preview pane is
  // documented as byte-for-byte what gets sent: a preview that greets two
  // people where the email greets one would be worse than no preview.
  const greetName = guestName ? invitationGreetingName(guestName) : '[Guest name]';
  return str
    .replace(/\[Guest name\]/gi, greetName)
    .replace(/\[Wedding date\]/gi, dateStr || '[Wedding date]')
    // A TAG THE COUPLE TYPED THEMSELVES IS NOT A TEMPLATE DEFAULT — they asked
    // for that value by name, so rendering it as nothing is the one case where
    // the empty state is not a kindness. Floors to the same words the email
    // body already uses when it has no names.
    .replace(/\[Couple names\]/gi, coupleName || 'the couple')
    .replace(/\[RSVP link\]/gi, '[RSVP link]');
}

const STEP_LABELS = ['Event', 'Select guests', 'Compose', 'Channel', 'Review & send'];
const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export const TYPE_LABELS = {
  // SAVE THE DATE WAS ALREADY IN THE LIST AND HAD NO NAME (Run 5 T14). It is
  // the first key of TYPE_CONFIG, so EMAIL_TYPES has always carried it and the
  // drawer has always drawn a pill for it — an EMPTY one, because this map had
  // no entry, and `TYPE_LABELS[type].toLowerCase()` (used in the drawer title,
  // the toast and the send button) throws on undefined. So the type the owner
  // reported as missing was worse than missing: it was an unlabelled chip that
  // broke the drawer if pressed.
  save_the_date: 'Save the date',
  invite: 'Invitation',
  reminder: 'Reminder',
  update: 'Event update',
  thank_you_attending: 'Thank you (attending)',
  thank_you_declined: 'Thank you (declined)',
};

// Each type's sensible default guest filter — reminder targets guests who've
// been invited but haven't answered yet, thank-you targets guests who have.
const TYPE_DEFAULT_FILTER = {
  // EVERYONE, because a save-the-date precedes invitation status entirely:
  // it is the announcement, and filtering it to "not yet invited" would be
  // reasoning about a state that has not happened yet.
  save_the_date: 'all',
  invite: 'not_invited',
  reminder: 'awaiting',
  update: 'all',
  thank_you_attending: 'attending',
  thank_you_declined: 'declined',
};

const FILTER_TABS = [
  { val: 'not_invited', label: 'Not yet invited' },
  { val: 'awaiting', label: 'Awaiting reply' },
  { val: 'attending', label: 'Attending' },
  { val: 'declined', label: 'Declined' },
  { val: 'all', label: 'All guests' },
];

// ── Step progress indicator ──────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '20px 32px 0' }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <React.Fragment key={num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#22C55E' : active ? '#E03553' : 'rgba(10,10,10,0.08)',
                color: done || active ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
                fontSize: 12, fontWeight: 700, transition: 'all 0.2s ease',
              }}>
                {done ? <Check size={13} /> : num}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? '#0A0A0A' : done ? '#22C55E' : 'rgba(10,10,10,0.6)',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s ease',
              }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: 1, height: 1, background: done ? '#22C55E' : 'rgba(10,10,10,0.1)',
                margin: '0 6px', marginBottom: 20, transition: 'background 0.2s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * The flow's frame: a full-width PAGE, or the side sheet it used to be.
 *
 * Both render the same children. The page keeps the sheet's column layout
 * (`flex flex-col`) so every step inside it lays out identically — the owner's
 * "same steps and layout logic" is not a promise, it is the same subtree.
 */
function Shell({ mounted, asPage, onClose, type, children }) {
  if (asPage) {
    return (
      <div
        aria-label="Send invites"
        style={{
          display: 'flex', flexDirection: 'column',
          // 48px top bar; the flow owns everything below it.
          minHeight: 'calc(100vh - 48px)', background: '#FFFFFF', ...F,
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <Sheet open={mounted} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        hideClose
        title={`Send ${TYPE_LABELS[type].toLowerCase()}`}
        aria-label="Send invites"
        className="p-0 gap-0 flex flex-col"
        style={{ width: 'min(94vw, 1240px)', maxWidth: 'min(94vw, 1240px)', ...F }}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

export default function SendInvitesModal({
  guests, onClose, onSent, initialType = 'invite', defaultFilter, initialSelectedIds, restrictEventIds,
  // ── asPage ────────────────────────────────────────────────────────────
  // Owner ruling 2026-09-07: send invites is its own page, full width, not a
  // half-width panel over the guest list. The FLOW is unchanged — same four
  // steps, same selection, same preview, same send — so this swaps the CHROME
  // and nothing else. A second component would have been a second answer to
  // "who are we sending to", and that is the one question this must not have
  // two of.
  asPage = false,
}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  // null means every event, which is what this drawer did before the step
  // existed, so an unchanged choice is an unchanged send.
  const [sendEventId, setSendEventId] = useState(null);
  const [wedding, setWedding] = useState(null);

  // Step 1
  const [type, setType] = useState(initialType);
  const [filter, setFilter] = useState(defaultFilter || TYPE_DEFAULT_FILTER[initialType] || 'all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() =>
    initialSelectedIds?.length ? new Set(initialSelectedIds) : new Set()
  );
  // When guests are preloaded (e.g. from a hub's checkbox selection), skip the
  // filter-driven auto-select exactly once on mount so it doesn't clobber the
  // caller's explicit selection — subsequent user-driven filter/type changes
  // inside the modal still auto-select as normal.
  const skipNextAutoSelect = useRef(!!initialSelectedIds?.length);

  // Step 2 — subject/body default per type until the user actually edits one
  // this session, at which point their edit carries over across type
  // switches (it does not reset back to a default, even for a different type).
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [subjectEdited, setSubjectEdited] = useState(false);
  const [bodyEdited, setBodyEdited] = useState(false);
  const [bannerChoice, setBannerChoice] = useState('none');
  const [bannerChoiceTouched, setBannerChoiceTouched] = useState(false);

  // Step 3
  // NO CHANNEL STATE. 12b leaves one channel, so there is nothing to hold:
  // every place that used to branch on `channel` now reads as the email path,
  // and the record is written with the literal 'email' below. A state variable
  // that can only take one value is a decision waiting to be re-added by
  // accident.

  // Step 4
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const isReminder = type === 'reminder'; // only affects Guest.update tracking below

  // Load wedding details
  useEffect(() => {
    setTimeout(() => setMounted(true), 10);
    getMyWeddingDetails().then(w => setWedding(w)).catch(() => {});
  }, []);

  // Banner defaults to whichever source the wedding actually has, once it
  // loads — unless the user has already touched the control this session.
  useEffect(() => {
    if (bannerChoiceTouched || !wedding) return;
    setBannerChoice(getDefaultBannerChoice({ coverPhoto: wedding.coverPhoto, venuePhotoUrl: wedding.mainCeremony?.photoUrl }));
  }, [wedding, bannerChoiceTouched]);

  // Subject/body default per type — only overwritten when the user hasn't
  // edited that field yet this session, so switching type never clobbers a
  // real edit, but does swap in the right default the moment nothing has
  // been typed.
  useEffect(() => {
    const defaults = getTypeComposeDefaults(type);
    if (!subjectEdited) setSubject(defaults.subject);
    if (!bodyEdited) setMessageBody(defaults.body);
  }, [type]);

  // THE FIELD NAMES HERE WERE WRONG AND NOTHING COULD SAY SO. WeddingDetails
  // has `coupleNames` (plural) and keeps the venue on `mainCeremony`; it has
  // no `coupleName`, no `couple_name`, no `venueName`, no `venue_name` and no
  // top-level `venue`. Every one of those reads was `undefined`, `|| ''` turned
  // it into an empty string, and seven well-written fallbacks downstream then
  // rendered a sensible default — so every invitation this product has sent
  // went out from "Openinvite" with the headline "The Wedding", and looked
  // fine. An unvalidated property read cannot fail; the empty default at the
  // point of read destroyed the only evidence that the read was wrong.
  //
  // AND THE GUARD THAT OWNS THIS COULD NOT SEE IT. test-couple-names-owner.mjs
  // forbids raw reads with `/\.coupleNames\b/` — the CORRECT spelling — so a
  // misspelling of the very field it watches was invisible to it. It fired
  // immediately once the spelling was fixed, and told us to call the owner.
  // Which is the right answer: `coupleDisplayName` prefers couple1Name/
  // couple2Name, falls back to a legacy `coupleNames`, trims, and handles one
  // name being blank — none of which a hand-rolled join gets right.
  //
  // `weddingDate` was correct and is left alone.
  const coupleName = coupleDisplayName(wedding);
  const weddingDate = wedding?.weddingDate || '';
  const venue = wedding?.mainCeremony?.venueName || '';
  // The invitation's button opens the couple's site rather than jumping to the
  // RSVP form. Empty when no address has been claimed yet, in which case the
  // template falls back to the RSVP link so an invitation is never buttonless.
  const siteUrl = wedding?.slug
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/w/${wedding.slug}`
    : '';
  const dateStr = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const universeId = wedding?.activeUniverse;

  // Events the wedding has set up, enriched with venue/date (getWeddingEvents
  // alone strips those — see getEventVenueAndDate's doc comment).
  const weddingEvents = useMemo(() => {
    if (!wedding) return [];
    return getWeddingEvents(wedding).map(ev => ({ ...ev, ...getEventVenueAndDate(wedding, ev) }));
  }, [wedding]);

  // The events THIS guest is invited to — same shape the email template and
  // /api/send-invites expect (name, date, startTime, venue). When
  // restrictEventIds is set (e.g. "send invite for the new events" after an
  // events edit), narrows to just those — intersected with actually-invited
  // events as a safety net, never events the guest isn't invited to.
  const buildGuestEvents = (guest) => weddingEvents
    .filter(ev => getGuestEventResponse(guest, ev).invited)
    .filter(ev => !restrictEventIds || restrictEventIds.includes(ev.event_id))
    .map(ev => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }));

  const bannerImageUrl = getBannerImageUrl({ coverPhoto: wedding?.coverPhoto, venuePhotoUrl: wedding?.mainCeremony?.photoUrl }, bannerChoice);
  const hasWeddingPhoto = !!wedding?.coverPhoto;
  const hasVenuePhoto = !!wedding?.mainCeremony?.photoUrl;

  // Filtered guest list for the Select guests step.
  //
  // THE EVENT NARROWS IT FIRST. "Only guests invited to it will be on the
  // list" is the promise the step above makes, so it is applied before the
  // status filters rather than alongside them: a reminder for the welcome
  // drinks should chase the people invited to the welcome drinks, not everyone
  // who has not replied to anything.
  const filteredGuests = useMemo(() => {
    const sendEvent = sendEventId ? weddingEvents.find((e) => e.event_id === sendEventId) : null;
    let list = sendEvent ? guests.filter((g) => getGuestEventResponse(g, sendEvent).invited) : guests;
    // FROM `list`, NOT FROM `guests`. These used to restart from the full
    // guest list, which was harmless while nothing narrowed it first and would
    // have silently thrown the event choice away the moment one did.
    if (filter === 'not_invited') list = list.filter(g => !g.invite_sent_at);
    else if (filter === 'awaiting') list = list.filter(isAwaitingPrimary);
    else if (filter === 'attending') list = list.filter(isAttending);
    else if (filter === 'declined') list = list.filter(isDeclined);
    // 'all' — no filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [guests, filter, search, sendEventId, weddingEvents]);

  // Auto-select when filter changes
  useEffect(() => {
    if (skipNextAutoSelect.current) { skipNextAutoSelect.current = false; return; }
    setSelected(new Set(filteredGuests.map(g => g.id)));
  }, [filter]);

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setFilter(TYPE_DEFAULT_FILTER[nextType] || 'all');
  };

  // Derive the working selected list from ALL guests (persists across filter changes)
  const selectedGuests = useMemo(() => guests.filter(g => selected.has(g.id)), [guests, selected]);
  // ── THE SELECTION IS PEOPLE; THE EMAIL SEND IS INVITATIONS ──────────────
  //
  // Item 4 of the households goal. Three people on one card get one email, to
  // the lead, so every email count in this modal is a count of invitations and
  // not of guests. A MEMBER WITHOUT AN EMAIL IS NOT A MISSING-EMAIL PROBLEM
  // when the lead has one: they were never going to be written to, any more
  // than the second name on a paper envelope needs its own stamp. What is a
  // problem is an invitation with nobody to send it to, and that is counted
  // and named below.
  //
  // THE OTHER HALF OF THIS NOTE WAS ABOUT WHATSAPP, which stayed per person
  // because it opened a chat with a phone number and a household does not
  // have one. With 12b there is one channel and it is addressed to an
  // invitation, so the count on screen is invitations throughout.
  const selectedInvitations = useMemo(() => invitationsFor(selectedGuests), [selectedGuests]);
  // ── GUESTS WHO ASKED NOT TO BE EMAILED ────────────────────────────────
  //
  // Item 6 of goals/2026-10-09-reply-lifecycle.md. Filtered out of the send
  // and counted, so the couple sees the number BEFORE they press send rather
  // than reading it in a result they cannot undo.
  //
  // THIS IS THE COURTESY, NOT THE RULE. api/send-invites.js reads the flag
  // from the database and skips independently, because a client-side filter
  // is editable by whoever is running the client. Both exist on purpose: the
  // server one is the guarantee, this one is the sentence.
  const optedOutSelected = selectedGuests.filter(g => g.email_opt_out);
  const sendableGuests = selectedGuests.filter(g => !g.email_opt_out);
  const invitationsWithEmail = invitationsFor(sendableGuests).filter(i => i.email);
  const invitationsNoEmail = selectedInvitations.filter(i => !i.email);

  const allFilteredSelected = filteredGuests.length > 0 && filteredGuests.every(g => selected.has(g.id));

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredGuests.forEach(g => next.delete(g.id));
      } else {
        filteredGuests.forEach(g => next.add(g.id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 280);
  };

  // Live preview — subject/body with merge tags resolved for the first
  // selected guest (or a placeholder if none selected yet).
  const previewSubject = replaceMergeTags(subject, selectedGuests[0]?.name, coupleName, dateStr);
  const previewBody = replaceMergeTags(messageBody, selectedGuests[0]?.name, coupleName, dateStr);

  // Real rendered email HTML — the exact same renderInvitationEmail() call
  // /api/send-invites makes server-side, so this preview is byte-for-byte
  // what gets sent (same template, same universe style, same type).
  const previewGuest = selectedGuests[0] || null;
  const previewEvents = previewGuest
    ? buildGuestEvents(previewGuest)
    : weddingEvents.map(ev => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }));
  // A PREVIEW, deliberately not a real link. It already falls back to a
  // placeholder for any guest without a token, and from E3 — when the
  // plaintext column is nulled — every guest takes that branch. That is the
  // right outcome for a preview: rendering a live capability into a sample
  // email the couple is only looking at would hand out a real RSVP link for
  // no reason. Real links are fetched at send time, in ensureTokens.
  const previewRsvpUrl = previewGuest?.rsvp_link_id ? buildRsvpUrl(previewGuest.rsvp_link_id) : `${RSVP_BASE}preview-token`;
  const previewEmailHtml = renderInvitationEmail({
    universeId,
    type,
    coupleNames: coupleName,
    siteUrl,
    weddingDate,
    events: previewEvents,
    personalMessage: previewBody,
    rsvpUrl: previewRsvpUrl,
    rsvpToken: previewGuest?.rsvp_link_id || '',
    bannerImageUrl,
  }).html;

  // Ensure tokens and return guest list with tokens — also ensures a
  // separate plus_one_rsvp_link_id whenever plus_one_email is set, so the
  // plus-one gets their own invite/RSVP link distinct from the primary
  // guest's (feat/plus-one-identity).
  //
  // Track E: minting moved server-side (api/my-guest-links.js) because the
  // stored token becomes an HMAC + ciphertext in E2 and the browser holds no
  // key. The returned shape is deliberately unchanged — the same
  // rsvp_link_id / plus_one_rsvp_link_id fields, attached to the same guest
  // objects — so every downstream consumer below keeps working untouched.
  //
  // INVITE-URL-UNDEFINED: this used to swallow a failed fetch. fetchGuestLinks
  // returned {} on any error and logged to console only; `if (!l) return g`
  // then kept the guest's stripped, undefined rsvp_link_id (#539 removed the
  // token columns from /api/my-guests), and every recipient was emailed
  // ".../rsvp/undefined". An invitation cannot be unsent, so a partial or
  // failed link fetch ABORTS the send: throwOnFailure:true throws on transport
  // failure, and any guest still missing a link after a successful fetch is
  // counted and named in the error. Nothing downstream constructs an email.
  const ensureTokens = async (list) => {
    const linkMap = await fetchGuestLinks(list.map(g => g.id), { includePlusOne: true, throwOnFailure: true });
    const withTokens = list.map(g => {
      const l = linkMap[g.id];
      if (!l) return g;
      return {
        ...g,
        rsvp_link_id: l.token || g.rsvp_link_id,
        ...(l.plusOneToken ? { plus_one_rsvp_link_id: l.plusOneToken } : {}),
      };
    });

    // A plus-one with an email needs its OWN link; without one it is silently
    // dropped from the recipient list further down, which is the same silent
    // failure wearing different clothes. Counted here so it aborts too.
    const missingPrimary = withTokens.filter(g => !g.rsvp_link_id);
    const missingPlusOne = withTokens.filter(g => g.plus_one_email && !g.plus_one_rsvp_link_id);
    const missing = missingPrimary.length + missingPlusOne.length;
    if (missing > 0) {
      const names = [...missingPrimary, ...missingPlusOne].slice(0, 3)
        .map(g => g.name || 'a guest').join(', ');
      throw new Error(
        `${missing} invitation link${missing === 1 ? '' : 's'} could not be created (${names}${missing > 3 ? ', …' : ''}). Nothing was sent.`
      );
    }
    return withTokens;
  };

  const handleSend = async () => {
    // REFUSED, NOT WARNED. Every link in these emails opens the couple's
    // site, and an unpublished site answers each one with "this invitation
    // does not work". A dialog the couple can click past would still spend
    // the one arrival each guest gets, so this stops and says where to go.
    if (!wedding?.slug) {
      toast.error('Claim your website address first — Design studio, then Share.');
      return;
    }
    if (wedding?.websiteEnabled !== true) {
      toast.error('Your website is not published yet, so these links would not work. Publish it in Design studio, then send.');
      return;
    }
    setSending(true);
    const tid = toast.loading(`Sending ${TYPE_LABELS[type].toLowerCase()}s…`);
    try {
      // SENDABLE ONLY. An opted-out guest is not minted a token and not sent
      // to; the server would refuse them anyway, and asking it to is how a
      // token gets issued for someone who asked to be left alone.
      const withTokens = await ensureTokens(sendableGuests);
      const sentAt = new Date().toISOString();
      // ONE EMAIL PER INVITATION, ADDRESSED TO THE LEAD. Grouped from
      // withTokens rather than from selectedGuests so the lead carries the
      // token that was just ensured, and `events` comes from the lead
      // because every member's stored entries are copies of the lead's
      // (household.js's entriesForNewMember).
      const emailList = invitationsFor(withTokens).filter(i => i.email && i.lead?.rsvp_link_id);
      // A plus-one with their own email gets their own invite too — same
      // events as the primary guest (they're invited to whatever the
      // primary is), their own rsvp_link (plus_one_rsvp_link_id, ensured
      // above), independent of whether the primary guest has an email at
      // all (feat/plus-one-identity).
      const plusOneEmailList = withTokens.filter(g => g.plus_one_email && g.plus_one_rsvp_link_id);
      const recipients = [
        // rsvpToken travels beside rsvpUrl so the email's button can open the
        // couple's SITE as this guest (?rsvp=<token>) rather than as a
        // stranger. A plus-one has a token of their own; sending the primary
        // guest's would put two people behind one identity.
        // `name` is the salutation for a household ("Priya and Dev") and the
        // guest's own name for everyone else; the email greets it whole
        // through src/lib/guestGreeting.js's invitationGreetingName.
        ...emailList.map(i => ({
          email: i.email, name: i.name, rsvpUrl: buildRsvpUrl(i.lead.rsvp_link_id),
          rsvpToken: i.lead.rsvp_link_id,
          events: buildGuestEvents(i.lead),
        })),
        ...plusOneEmailList.map(g => ({
          email: g.plus_one_email, name: g.plus_one_name || 'Guest', rsvpUrl: buildRsvpUrl(g.plus_one_rsvp_link_id),
          rsvpToken: g.plus_one_rsvp_link_id,
          events: buildGuestEvents(g),
        })),
      ];
      if (recipients.length > 0) {
        const payload = {
          type,
          universeId,
          bannerChoice,
          guests: recipients,
          wedding: { coupleName, weddingDate, venue, siteUrl, slug: wedding?.slug, websiteEnabled: wedding?.websiteEnabled, coverPhoto: wedding?.coverPhoto, venuePhotoUrl: wedding?.mainCeremony?.photoUrl },
          customSubject: subject,
          customBody: messageBody,
        };
        const res = await fetch('/api/send-invites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Send failed');
      }

      // 'email', NOT A COMPUTED STRING. invite_channel used to be the join of
      // whichever channels ran; there is one, and a literal says so where a
      // reader can see it. Existing records that read 'whatsapp' or
      // 'email+whatsapp' are history and are left alone: they are a true
      // statement about how that guest was invited at the time.
      const channelStr = 'email';
      // Only invite/reminder have a dedicated tracking field on Guest — update,
      // save-the-date and thank-you types don't write anything back (no schema
      // field for "last update sent" / "save-the-date sent" / "thank-you sent",
      // and inventing untracked data is worse than tracking nothing).
      //
      // SAVE THE DATE MUST NOT WRITE invite_sent_at, and this is the reason it
      // is spelled out rather than left to the condition above: the invitation
      // send defaults to the "Not yet invited" filter, which reads exactly that
      // field. Marking a guest invited for an announcement that says "the full
      // invitation will follow" would hide them from the send that follows it —
      // the couple would post save-the-dates and silently never invite anyone.
      if (type === 'invite' || type === 'reminder') {
        await Promise.all(
          withTokens.map(g =>
            base44.entities.Guest.update(g.id, isReminder
              ? { reminder_sent_at: sentAt }
              : { invite_sent_at: sentAt, invite_channel: channelStr }
            )
          )
        );
      }

      // THE EMAIL COUNT IS INVITATIONS, THE WHATSAPP COUNT IS PEOPLE, and the
      // sentence says which is which rather than leaving the couple to work out
      // why two numbers on one line disagree.
      const nEmails = invitationsWithEmail.length;
      const nPeople = sendableGuests.length;
      const plural = (n) => (n === 1 ? '' : 's');
      // THE SKIPPED COUNT IS PART OF THE SENTENCE, not a footnote. A couple
      // who selected forty and reached thirty-eight needs to know why, and
      // "asked not to be emailed" is the only answer that stops them
      // re-sending to chase the gap.
      const nSkipped = optedOutSelected.length;
      const msg = `${TYPE_LABELS[type]} sent, ${nEmails} email${plural(nEmails)} covering ${nPeople} guest${plural(nPeople)}`
        + (nSkipped > 0 ? `, ${nSkipped} skipped who asked not to be emailed` : '');

      toast.success(msg, { id: tid });
      onSent?.();
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send', { id: tid });
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!user?.email) { toast.error('No email on your account'); return; }
    setSendingTest(true);
    const tid = toast.loading('Sending test email…');
    try {
      const payload = {
        type,
        universeId,
        bannerChoice,
        isTest: true,
        guests: [{ email: user.email, name: 'Test guest', rsvpUrl: previewRsvpUrl, events: previewEvents }],
        wedding: { coupleName, weddingDate, venue, siteUrl, slug: wedding?.slug, websiteEnabled: wedding?.websiteEnabled, coverPhoto: wedding?.coverPhoto, venuePhotoUrl: wedding?.mainCeremony?.photoUrl },
        customSubject: subject,
        customBody: messageBody,
      };
      const res = await fetch('/api/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test send failed');
      toast.success(`Test email sent to ${user.email}`, { id: tid });
    } catch (err) {
      toast.error(err.message || 'Failed to send test', { id: tid });
    } finally {
      setSendingTest(false);
    }
  };

  const canProceedStep2 = selected.size > 0;
  const canProceedStep3 = subject.trim().length > 0;

  // ── Preview pane — shared across every step ──────────────────────────────
  const previewPane = (
    <div style={{
      width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid rgba(10,10,10,0.12)', background: '#FAFAFA',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', margin: '0 0 4px', ...F }}>
          Live preview
        </p>
        {/* THE SUBJECT IS ALWAYS SHOWN NOW. It was hidden on the WhatsApp
            channel, which had no subject; there is one channel and it has
            one. The preview below is likewise always the email, at full
            height rather than the 380px it shrank to beside the WhatsApp
            bubble. */}
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>
          {/* "No subject yet", not an em dash. The dash was here before and
              would have stayed, except that unwrapping the WhatsApp
              conditional rewrote this line, which makes it a new string under
              the 2026-09-28 ruling. It also reads better: a lone dash beside
              a label is a shrug. */}
          <strong style={{ color: '#0A0A0A' }}>Subject:</strong> {previewSubject || 'No subject yet'}
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <iframe
          title="Email preview"
          srcDoc={previewEmailHtml}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#FFFFFF' }}
        />
      </div>

      <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', padding: '0 20px', margin: '10px 0', ...F }}>
        {previewGuest ? `Showing: ${previewGuest.name}` : 'Select a guest to preview their exact events — showing all wedding events for now.'}
      </p>

      {/* THE AVA CORNER IS RESERVED. As a full-width page this pane runs to
          the bottom-right of the viewport, which is where the floating Ava
          button sits — the same collision that hid "Next" in the panel. */}
      <div className="oi-ava-safe" style={{ padding: '14px 20px', borderTop: '1px solid rgba(10,10,10,0.12)' }}>
        <button
          onClick={handleSendTest}
          disabled={sendingTest}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', border: '1px solid rgba(10,10,10,0.15)', background: '#FFFFFF',
            color: '#0A0A0A', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...F,
            opacity: sendingTest ? 0.6 : 1,
          }}
        >
          {sendingTest ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FlaskConical size={14} />}
          {sendingTest ? 'Sending test…' : 'Send test email to me'}
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  // Radix Sheet — same slide-in-from-right drawer, now with a real focus
  // trap and Escape-to-close from the shared primitive instead of the
  // hand-rolled useModalFocusTrap. `mounted` still drives open/close so the
  // parent's onClose only fires after the exit transition finishes, exactly
  // as before.
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <Shell mounted={mounted} asPage={asPage} onClose={handleClose} type={type}>

        {/* Top bar */}
        <div style={{
          padding: '20px 32px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A', margin: '0 0 2px' }}>
              Send {TYPE_LABELS[type].toLowerCase()}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: 0 }}>
              Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
            </p>
          </div>
          {/* A PAGE LEAVES, A PANEL CLOSES. An × on a full-width page reads
              as a modal that has forgotten it is a page. */}
          {asPage ? (
            <button onClick={handleClose} style={{ background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, cursor: 'pointer', color: 'rgba(10,10,10,0.6)', padding: '6px 14px', fontSize: 12, fontWeight: 600, ...F }}>
              Back to guest list
            </button>
          ) : (
            <button onClick={handleClose} aria-label="Close send invites modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', padding: 4, marginTop: -4 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Divider */}
        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.12)', margin: '16px 0 0', flexShrink: 0 }} />

        {/* Split pane body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: step content (scrollable) */}
          <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px', minWidth: 0 }}>

            {/* ── STEP 1: Which event ────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px' }}>
                  Which event is this about?
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '0 0 20px' }}>
                  Only guests invited to it will be on the list.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[{ event_id: null, name: 'All events' }, ...weddingEvents].map((ev) => {
                    const on = sendEventId === ev.event_id;
                    const count = ev.event_id === null
                      ? guests.length
                      : guests.filter((g) => getGuestEventResponse(g, ev).invited).length;
                    return (
                      <button
                        key={ev.event_id || 'all'}
                        type="button"
                        data-send-event={ev.event_id || 'all'}
                        aria-pressed={on}
                        onClick={() => setSendEventId(ev.event_id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                          background: on ? 'rgba(224,53,83,0.06)' : '#FFFFFF',
                          border: `1px solid ${on ? '#E03553' : 'rgba(10,10,10,0.12)'}`,
                          ...F,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: on ? 700 : 600, color: '#0A0A0A' }}>{ev.name}</span>
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>
                          {count} guest{count === 1 ? '' : 's'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 2: Select guests ──────────────────────────────────── */}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px' }}>
                  Who are you sending to?
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '0 0 20px' }}>
                  Choose the email type, then select guests.
                </p>

                {/* Type selector */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {EMAIL_TYPES.map(t => (
                    <button key={t} onClick={() => handleTypeChange(t)} style={{
                      padding: '7px 16px', border: '1px solid',
                      borderColor: type === t ? '#E03553' : 'rgba(10,10,10,0.12)',
                      background: type === t ? '#FFF0F3' : '#FFFFFF',
                      color: type === t ? '#E03553' : 'rgba(10,10,10,0.6)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 999, ...F,
                    }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', borderBottom: '1px solid rgba(10,10,10,0.12)', marginBottom: 16 }}>
                  {FILTER_TABS.map(opt => (
                    <button key={opt.val} onClick={() => setFilter(opt.val)} style={{
                      padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: filter === opt.val ? 700 : 500,
                      color: filter === opt.val ? '#0A0A0A' : 'rgba(10,10,10,0.45)',
                      borderBottom: `2px solid ${filter === opt.val ? '#E03553' : 'transparent'}`,
                      marginBottom: -1, ...F,
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.3)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px 9px 34px', border: '1px solid rgba(10,10,10,0.12)',
                      borderRadius: 8, fontSize: 13, color: '#0A0A0A', background: '#FAFAFA',
                      outline: 'none', boxSizing: 'border-box', ...F,
                    }}
                  />
                </div>

                {/* Select all row */}
                {filteredGuests.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(10,10,10,0.06)', marginBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E03553', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.45)' }}>
                      {allFilteredSelected ? 'Deselect all' : 'Select all'} ({filteredGuests.length})
                    </span>
                  </div>
                )}

                {/* Guest list */}
                {filteredGuests.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)' }}>No guests match this filter.</p>
                  </div>
                ) : (
                  filteredGuests.map(g => (
                    <div
                      key={g.id}
                      onClick={() => toggleOne(g.id)}
                      {...interactiveDivProps(() => toggleOne(g.id))}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderBottom: '1px solid rgba(10,10,10,0.04)', cursor: 'pointer', borderRadius: 6, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(g.id)}
                        onChange={() => toggleOne(g.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E03553', flexShrink: 0 }}
                      />
                      <GuestAvatar name={g.name} email={g.email} profilePictureUrl={g.profile_picture_url} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.email || <span style={{ color: '#E03553' }}>No email</span>}
                          {g.phone && <span style={{ marginLeft: 8 }}>· {g.phone}</span>}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {g.invite_sent_at && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: '#F0FDF4', padding: '2px 7px', borderRadius: 999 }}>Invited</span>
                        )}
                        {isAttending(g) && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 7px', borderRadius: 999 }}>Attending</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── STEP 2: Compose ────────────────────────────────────────── */}
            {step === 3 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px' }}>
                  Compose your message
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '0 0 24px' }}>
                  Personalize the message — the preview on the right updates as you type.
                </p>

                {/* Merge tag hints */}
                <div style={{ background: '#F7F7F7', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)', marginRight: 4 }}>Merge tags:</span>
                  {['[Guest name]', '[Wedding date]', '[Couple names]', '[RSVP link]'].map(tag => (
                    <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: '#E03553', background: '#FFF0F3', padding: '2px 7px', borderRadius: 999 }}>{tag}</span>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.6)', marginBottom: 6 }}>Subject line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setSubjectEdited(true); }}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                      borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                      ...F, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.6)', marginBottom: 6 }}>Message body</label>
                  <textarea
                    value={messageBody}
                    onChange={e => { setMessageBody(e.target.value); setBodyEdited(true); }}
                    rows={12}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                      borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                      ...F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Banner image control */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.6)', marginBottom: 6 }}>Banner image</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { val: 'wedding', label: 'Wedding photo', disabled: !hasWeddingPhoto },
                      { val: 'venue', label: 'Venue photo', disabled: !hasVenuePhoto },
                      { val: 'none', label: 'No banner', disabled: false },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => { setBannerChoice(opt.val); setBannerChoiceTouched(true); }}
                        title={opt.disabled ? 'No photo available for this source' : undefined}
                        style={{
                          padding: '7px 14px', border: '1px solid',
                          borderColor: bannerChoice === opt.val ? '#E03553' : 'rgba(10,10,10,0.12)',
                          background: bannerChoice === opt.val ? '#FFF0F3' : '#FFFFFF',
                          color: opt.disabled ? 'rgba(10,10,10,0.25)' : bannerChoice === opt.val ? '#E03553' : 'rgba(10,10,10,0.6)',
                          fontSize: 12, fontWeight: 600, cursor: opt.disabled ? 'not-allowed' : 'pointer', borderRadius: 999, ...F,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: How it goes out ────────────────────────────────── */}
            {/* THERE IS NOTHING TO CHOOSE, AND THE STEP STAYS.
                12b leaves one channel, so the three cards (Email, WhatsApp,
                "Email + WhatsApp", the last of them marked Recommended) are
                one card and it is not a control. The ruling says the channel
                step offers email only, and the step is still worth its place:
                the counts on it are the answer to "how many of these people
                can actually be reached", which is the question the couple has
                at this point and the only place it gets answered. The heading
                says what happens instead of asking a question with one
                answer. */}
            {step === 4 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px' }}>
                  How this goes out
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '0 0 28px' }}>
                  By email, to one address per invitation.
                </p>

                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    padding: '16px 20px', border: '2px solid #E03553', background: '#FFF8F9',
                    borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: '#E03553',
                    }}>
                      <Mail size={20} color="#FFFFFF" strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', ...F }}>Email</p>
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 4px', ...F }}>Send directly to their inbox</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#E03553', margin: 0, ...F }}>
                        {invitationsWithEmail.length} invitation{invitationsWithEmail.length !== 1 ? 's' : ''} with an email
                      </p>
                    </div>
                    {invitationsNoEmail.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <AlertCircle size={13} color="#F59E0B" />
                        <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, ...F }}>
                          {invitationsNoEmail.length} with no email yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Review & send ──────────────────────────────────── */}
            {step === 5 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px' }}>
                  Ready to send?
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '0 0 24px' }}>
                  Review the details before sending.
                </p>

                {/* Summary card */}
                <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
                  <div style={{ padding: '16px 20px', background: '#F7F7F7', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                      // INVITATIONS AND THE PEOPLE THEY COVER, which are two
                      // different numbers and both worth seeing before a send:
                      // an email goes to a household once, so six people can be
                      // four invitations.
                      //
                      // THE MIDDLE TILE USED TO SAY "CHANNEL". With one channel
                      // it would read "Email" on every send forever, which is a
                      // tile spent on a constant. The number it replaces is the
                      // one the WhatsApp tile used to carry, and the comment
                      // that used to sit here explained why the first tile
                      // changed between channels; now nothing does.
                      { label: 'Invitations', value: `${selectedInvitations.length}` },
                      { label: 'People', value: `${selectedGuests.length}` },
                      { label: 'Type', value: TYPE_LABELS[type] },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', margin: '0 0 2px', ...F }}>{s.value}</p>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>{s.label.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>

                  {/* Guest list */}
                  <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(10,10,10,0.12)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', margin: '0 0 8px', ...F }}>Sending to</p>
                    {/* ONE LIST, GROUPED THE WAY THE SEND IS. There were two:
                        WhatsApp showed people with phone numbers, because one
                        chat opened per guest, and email showed invitations.
                        With one channel the list matches the button. */}
                    <div style={{ maxHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {invitationsWithEmail.map(i => (
                        <div key={i.householdId || i.lead?.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <GuestAvatar name={i.lead?.name} email={i.email} profilePictureUrl={i.lead?.profile_picture_url} size={28} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, ...F }}>{i.name}</p>
                            <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>
                              {i.email}{i.members.length > 1 ? ` \u00b7 ${i.members.length} people, one email` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* ── AN INVITATION WITH NOBODY TO SEND IT TO ──────────────────
                        Named, not counted away. One line per household, so the
                        couple can see whose address to find rather than being told
                        that two of something are missing. */}
                    {invitationsNoEmail.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', margin: '0 0 8px', ...F }}>No email yet</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {invitationsNoEmail.map(i => (
                            <div key={i.householdId || i.lead?.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AlertCircle size={13} color="#F59E0B" style={{ flexShrink: 0 }} />
                              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>
                                {i.name}{i.members.length > 1 ? ` \u00b7 ${i.members.length} people, one invitation` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* What happens next */}
                <div style={{ background: '#F7F7F7', borderRadius: 10, padding: '16px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.6)', margin: '0 0 12px', ...F }}>What happens next</p>
                  {[
                    'Each guest gets a unique personal RSVP link',
                    'RSVPs will appear in your guest list automatically',
                    'You can see who has responded at a glance',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Check size={11} color="#FFFFFF" strokeWidth={2.5} />
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', margin: 0, lineHeight: 1.4, ...F }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right: permanent live preview pane */}
          {previewPane}
        </div>

        {/* A GOOD EMPTY STATE THE AUTHOR CANNOT SEE IS INDISTINGUISHABLE FROM
            CORRECT BEHAVIOR. The from-name has always fallen back to
            "Openinvite" when the couple has no names — a sensible floor that
            nobody could tell was in use, which is most of why a wrong field
            name survived unnoticed for the life of the feature. The send is
            NOT blocked: some sends are deliberate tests, and blocking the
            product's central action over something fixable in ten seconds is
            disproportionate. It is simply said out loud, before sending. */}
        {!coupleName && (
          <div style={{
            padding: '12px 32px', borderTop: '1px solid rgba(10,10,10,0.12)',
            background: '#FFFFFF', flexShrink: 0,
          }}>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>
              This will be sent from <strong style={{ color: '#0A0A0A', fontWeight: 600 }}>Openinvite</strong> because
              you haven&rsquo;t added your names yet. Add them in <strong style={{ color: '#0A0A0A', fontWeight: 600 }}>Event details</strong> and
              guests will see your own names as the sender.
            </p>
          </div>
        )}

        {/* Footer navigation.
            THE AVA CORNER IS RESERVED. This panel is half-width and anchored
            right, so its "Next" sat directly under the floating Ava button and
            could not be clicked — the owner found it. The right padding clears
            the button's 44px + 32px inset; the class carries the bottom. */}
        <div className="oi-ava-safe" style={{
          padding: '16px 96px 16px 32px', borderTop: '1px solid rgba(10,10,10,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: '#FFFFFF',
        }}>
          {/* Left: selected count or back button */}
          <div>
            {step === 1 ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>
                {selected.size > 0
                  ? <><strong style={{ color: '#0A0A0A' }}>{selected.size}</strong> guest{selected.size !== 1 ? 's' : ''} selected</>
                  : 'Select at least one guest'
                }
              </p>
            ) : (
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={sending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                  border: '1px solid rgba(10,10,10,0.15)', background: '#FFFFFF', color: '#0A0A0A',
                  borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', ...F,
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>

          {/* Right: next or send button */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step < 5 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
                  background: '#E03553', color: '#FFFFFF',
                  border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F,
                  opacity: ((step === 2 && !canProceedStep2) || (step === 3 && !canProceedStep3)) ? 0.45 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={sending || selectedGuests.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                  background: '#E03553', color: '#FFFFFF',
                  border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', ...F,
                  opacity: (sending || selectedGuests.length === 0) ? 0.5 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {sending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                {sending ? 'Sending…' : `Send to ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </Shell>
    </>
  );
}
