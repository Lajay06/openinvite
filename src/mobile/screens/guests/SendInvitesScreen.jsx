import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Mail, Eye, FlaskConical, Send, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { FilterPills, RowGroup, Row, Checkbox, PillButton, TextField, TextAreaField, BottomSheet, SkeletonRows, ErrorState, EmptyState, StatusPill, PlanLock } from '../../ui';
import PillChoice from '../../ui/PillChoice';
import { initials, GUEST_CATEGORY_LABEL, OPTED_OUT_LABEL } from '../../lib/format';
import { formatAppDateWritten } from '../../lib/dates';
import { useApi } from '../../data/api';
import { isAttending, isDeclined, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { coupleDisplayName } from '@/lib/coupleNames';
import { getWeddingEvents, getGuestEventResponse, getEventVenueAndDate } from '@/lib/weddingEvents';
import { renderInvitationEmail, getTypeComposeDefaults, getBannerImageUrl, getDefaultBannerChoice, buildGuestCtaUrl } from '@/lib/emailTemplate';
import { siteOrigin } from '../../lib/links';
import { invitationsFor } from '@/lib/household';
import { newSendEntry } from '@/lib/sendHistory';
import { sentGuestIds, guestsActuallySent } from '@/lib/sentRecipients';
import { publishState, PUBLISH_STATE, PUBLISH_SENTENCE } from '@/lib/publishState';
import { isBounced, bouncedSkippedSentence, BOUNCE_ROW_LABEL } from '@/components/guests/emailBounce';
import { InvitationPreviewSheet } from '../plan/InvitationPreview';

/* SendInvitesModal.jsx's types, default filters and filter tabs, verbatim. */
export const TYPE_LABELS = { save_the_date: 'Save the date', invite: 'Invitation', reminder: 'Reminder', update: 'Event update', thank_you_attending: 'Thank you (attending)', thank_you_declined: 'Thank you (declined)' };
const TYPE_DEFAULT_FILTER = { save_the_date: 'all', invite: 'not_invited', reminder: 'awaiting', update: 'all', thank_you_attending: 'attending', thank_you_declined: 'declined' };
const FILTER_TABS = [{ key: 'not_invited', label: 'Not yet invited' }, { key: 'awaiting', label: 'Awaiting reply' }, { key: 'attending', label: 'Attending' }, { key: 'declined', label: 'Declined' }, { key: 'all', label: 'All guests' }];
const STEPS = ['Select guests', 'Compose', 'Channel', 'Review and send'];
/** The desktop's guest categories, offered as groups to choose at once (GuestForm's category list). */
const GROUP_CATEGORIES = ['family', 'friends', 'colleagues', 'partners_family', 'partners_friends'];
// The public origin, never the shell's (capacitor://localhost is not a link a guest can open): lib/links.js.
const RSVP_BASE = `${siteOrigin()}/rsvp/`;

const buildRsvpUrl = (token) => { if (!token) throw new Error('Refusing to build an RSVP link from an empty token.'); return RSVP_BASE + token; };
// THE WHATSAPP CHANNEL IS GONE, as on the web since #924
// (SendInvitesModal.jsx). A wa.me chat is sent from the couple's own account,
// so it bypassed the server's stop-emails check (#951): a guest who opted out
// could still be messaged. Email through /api/send-invites is the only way
// guests receive the site. The Messages screen keeps its per-guest WhatsApp
// reply, as the web's Messages page does, for a guest who has written in.
function replaceMergeTags(str, guestName, coupleName, dateStr) {
  const firstName = guestName ? guestName.split(' ')[0] : '[Guest name]';
  return String(str || '').replace(/\[Guest name\]/gi, firstName).replace(/\[Wedding date\]/gi, dateStr || '[Wedding date]').replace(/\[Couple names\]/gi, coupleName || 'the couple').replace(/\[RSVP link\]/gi, '[RSVP link]');
}

/**
 * Send invites: the desktop's four steps on one full-screen flow. The same
 * types, filters, compose defaults, merge tags, banner choice, rendered
 * preview (the exact renderInvitationEmail the server uses), test send,
 * channel (email only), review, send through /api/send-invites, and the same
 * tracking writes (invite_sent_at and invite_channel for
 * invitations, reminder_sent_at for reminders). Ultra only, as on desktop.
 *
 * Goal 8 (item 6), beyond the desktop: groups (a category or a tag chooses
 * everyone in it at once), the invitation preview beside the email preview,
 * a confirmation sheet before anything sends (the exact count, the channel,
 * the invitations by name, "Send 30 emails"), and a result screen with each
 * recipient's status (sent, skipped, failed) and Send again for the failed.
 * Nothing sends on a single tap. Scheduling a send is not on the desktop
 * and needs a server job, so it is not offered (MOBILE_PARITY.md).
 *
 * In a demo build the preview api answers /api/send-invites without sending
 * (fixtures/previewApi.js); a real build posts to the same endpoint the
 * desktop does.
 *
 * props: guests, wedding, invitation, user, initialSelectedIds,
 * restrictEventIds, initialType, canSend, onSent, back, loading, error,
 * onRetry
 */
export default function SendInvitesScreen({ guests = [], wedding, invitation = null, user, initialSelectedIds = [], restrictEventIds = null, initialType = 'invite', canSend = true, onSent, back, loading, error, onRetry }) {
  const api = useApi();
  const [step, setStep] = useState(1);
  const [type, setType] = useState(initialType);
  const [filter, setFilter] = useState(initialSelectedIds.length ? 'all' : TYPE_DEFAULT_FILTER[initialType] || 'all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds));
  const skipAuto = useRef(initialSelectedIds.length > 0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [subjectEdited, setSubjectEdited] = useState(false);
  const [bodyEdited, setBodyEdited] = useState(false);
  const [bannerChoice, setBannerChoice] = useState('none');
  const [bannerTouched, setBannerTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [invPreview, setInvPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null); // { rows: [{ guest, status: 'sent'|'skipped'|'failed', why }], channelStr }
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const coupleName = coupleDisplayName(wedding);
  const weddingDate = wedding?.weddingDate || '';
  const venue = wedding?.mainCeremony?.venueName || '';
  const siteUrl = wedding?.slug ? `${siteOrigin()}/w/${wedding.slug}` : '';
  const dateStr = weddingDate ? formatAppDateWritten(weddingDate) : '';
  const universeId = wedding?.activeUniverse;
  const weddingEvents = useMemo(() => (wedding ? getWeddingEvents(wedding).map((ev) => ({ ...ev, ...getEventVenueAndDate(wedding, ev) })) : []), [wedding]);
  const buildGuestEvents = (g) => weddingEvents.filter((ev) => getGuestEventResponse(g, ev).invited).filter((ev) => !restrictEventIds || restrictEventIds.includes(ev.event_id)).map((ev) => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }));

  useEffect(() => { if (bannerTouched || !wedding) return; setBannerChoice(getDefaultBannerChoice({ coverPhoto: wedding.coverPhoto, venuePhotoUrl: wedding.mainCeremony?.photoUrl })); }, [wedding, bannerTouched]);
  useEffect(() => { const d = getTypeComposeDefaults(type); if (!subjectEdited) setSubject(d.subject); if (!bodyEdited) setBody(d.body); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = guests;
    if (filter === 'not_invited') list = guests.filter((g) => !g.invite_sent_at);
    else if (filter === 'awaiting') list = guests.filter(isAwaitingPrimary);
    else if (filter === 'attending') list = guests.filter(isAttending);
    else if (filter === 'declined') list = guests.filter(isDeclined);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((g) => g.name?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q));
    return list;
  }, [guests, filter, search]);
  // A filter change selects everyone it shows, as the desktop does, except when a preselection arrived with the page.
  useEffect(() => { if (skipAuto.current) { skipAuto.current = false; return; } setSelected(new Set(filtered.map((g) => g.id))); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeType = (t) => { setType(t); setFilter(TYPE_DEFAULT_FILTER[t] || 'all'); };
  const selectedGuests = useMemo(() => guests.filter((g) => selected.has(g.id)), [guests, selected]);
  // ONE EMAIL PER INVITATION, ADDRESSED TO THE LEAD, from src/lib/household.js
  // as SendInvitesModal.jsx counts it: a household of four is one email, so
  // every email count on this screen is a count of invitations. A guest who
  // asked not to be emailed, or whose address bounced, is filtered out first
  // (src/components/guests/emailBounce.js holds the server's predicate);
  // api/send-invites.js skips both from the database, which is the guarantee.
  const optedOutSelected = selectedGuests.filter((g) => g.email_opt_out);
  const bouncedSelected = selectedGuests.filter((g) => !g.email_opt_out && isBounced(g));
  const sendableGuests = selectedGuests.filter((g) => !g.email_opt_out && !isBounced(g));
  const sendableInvitations = useMemo(() => invitationsFor(sendableGuests), [sendableGuests]);
  const invitationsWithEmail = sendableInvitations.filter((i) => i.email);
  const invitationsNoEmail = sendableInvitations.filter((i) => !i.email);
  const nEmails = invitationsWithEmail.length;
  const plural = (n) => (n === 1 ? '' : 's');
  const emailsCovering = `${nEmails} email${plural(nEmails)} covering ${sendableGuests.length} guest${plural(sendableGuests.length)}`;
  // THE PUBLISH RULE, from src/lib/publishState.js (lane A's #1029): live is an
  // address AND the switch on, the rule SendInvitesModal.handleSend and
  // api/send-invites.js also hold. Every link in these emails opens the
  // couple's Guest Suite, and one that is not live answers each guest with
  // "this invitation does not work", so the send is refused, not warned. The
  // state is named in the module's own sentence.
  const pubState = publishState(wedding);
  const unpublished = pubState === PUBLISH_STATE.NO_ADDRESS
    ? `${PUBLISH_SENTENCE[pubState]}, so these links would not work. Choose an address in the studio on desktop, then send.`
    : pubState === PUBLISH_STATE.HIDDEN
      ? `${PUBLISH_SENTENCE[pubState]}, so these links would not work. Make it live on the Guest Suite tab, then send.`
      : '';
  // Groups: every category in use and every tag in use, each choosing its guests at once.
  const groups = useMemo(() => {
    const cats = GROUP_CATEGORIES.filter((c) => guests.some((g) => g.category === c)).map((c) => ({ key: `cat:${c}`, label: GUEST_CATEGORY_LABEL[c] || c, test: (g) => g.category === c }));
    const tags = [...new Set(guests.flatMap((g) => g.tags || []))].sort().map((t) => ({ key: `tag:${t}`, label: t, test: (g) => (g.tags || []).includes(t) }));
    return [...cats, ...tags].map((gr) => ({ ...gr, ids: guests.filter(gr.test).map((g) => g.id) }));
  }, [guests]);
  const groupOn = (gr) => gr.ids.length > 0 && gr.ids.every((id) => selected.has(id));
  const toggleGroup = (gr) => setSelected((s) => { const n = new Set(s); if (groupOn(gr)) gr.ids.forEach((id) => n.delete(id)); else gr.ids.forEach((id) => n.add(id)); return n; });

  const hasWeddingPhoto = !!wedding?.coverPhoto;
  const hasVenuePhoto = !!wedding?.mainCeremony?.photoUrl;
  const bannerImageUrl = getBannerImageUrl({ coverPhoto: wedding?.coverPhoto, venuePhotoUrl: wedding?.mainCeremony?.photoUrl }, bannerChoice);
  const previewGuest = selectedGuests[0] || null;
  const previewEvents = previewGuest ? buildGuestEvents(previewGuest) : weddingEvents.map((ev) => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }));
  const previewRsvpUrl = previewGuest?.rsvp_link_id ? buildRsvpUrl(previewGuest.rsvp_link_id) : `${RSVP_BASE}preview-token`;
  const previewHtml = useMemo(() => {
    try { return renderInvitationEmail({ universeId, type, coupleNames: coupleName, siteUrl, weddingDate, events: previewEvents, personalMessage: replaceMergeTags(body, previewGuest?.name, coupleName, dateStr), rsvpUrl: previewRsvpUrl, rsvpToken: previewGuest?.rsvp_link_id || '', bannerImageUrl }).html; } catch { return ''; }
  }, [universeId, type, coupleName, siteUrl, weddingDate, body, previewGuest, bannerImageUrl, previewRsvpUrl, dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureTokens = async (list) => {
    const map = await api.guestLinks(list.map((g) => g.id), { includePlusOne: true, throwOnFailure: true });
    const withTokens = list.map((g) => { const l = map[g.id]; return l ? { ...g, rsvp_link_id: l.token || g.rsvp_link_id, ...(l.plusOneToken ? { plus_one_rsvp_link_id: l.plusOneToken } : {}) } : g; });
    const missingPrimary = withTokens.filter((g) => !g.rsvp_link_id);
    const missingPlusOne = withTokens.filter((g) => g.plus_one_email && !g.plus_one_rsvp_link_id);
    const missing = missingPrimary.length + missingPlusOne.length;
    if (missing > 0) { const names = [...missingPrimary, ...missingPlusOne].slice(0, 3).map((g) => g.name || 'a guest').join(', '); throw new Error(`${missing} invitation link${missing === 1 ? '' : 's'} could not be created (${names}${missing > 3 ? ', and more' : ''}). Nothing was sent.`); }
    return withTokens;
  };
  // slug and websiteEnabled travel as on the web: the server derives the site
  // link from the slug and refuses the send when websiteEnabled is not true.
  const weddingPayload = { coupleName, weddingDate, venue, siteUrl, slug: wedding?.slug, websiteEnabled: wedding?.websiteEnabled, coverPhoto: wedding?.coverPhoto, venuePhotoUrl: wedding?.mainCeremony?.photoUrl };

  // SENDABLE ONLY, as SendInvitesModal.jsx (#951, mobile parity 8). A guest who
  // asked not to be emailed is not minted a token, not sent to and not stamped
  // as invited; api/send-invites.js skips them from the database anyway, which
  // is the guarantee. This is the sentence, and the true result row.
  const send = async (list = selectedGuests) => {
    setConfirming(false);
    if (unpublished) { toast.error(unpublished); return; }
    const optedOut = list.filter((g) => g.email_opt_out);
    const bounced = list.filter((g) => !g.email_opt_out && isBounced(g));
    const sendable = list.filter((g) => !g.email_opt_out && !isBounced(g));
    const notSent = [
      ...optedOut.map((g) => ({ guest: g, status: 'skipped', why: OPTED_OUT_LABEL })),
      ...bounced.map((g) => ({ guest: g, status: 'skipped', why: BOUNCE_ROW_LABEL })),
    ];
    setSending(true);
    const tid = toast.loading(`Sending ${TYPE_LABELS[type].toLowerCase()}s`);
    // 'email', a literal, as on the web: there is one channel.
    const channelStr = 'email';
    try {
      const withTokens = await ensureTokens(sendable);
      // Grouped from withTokens, as on the web, so the lead carries the link
      // just ensured; the events are the lead's (household.js's entriesForNewMember).
      const invitations = invitationsFor(withTokens);
      const emailList = invitations.filter((i) => i.email && i.lead?.rsvp_link_id);
      const plusOneList = withTokens.filter((g) => g.plus_one_email && g.plus_one_rsvp_link_id);
      {
        const recipients = [
          ...emailList.map((i) => ({ email: i.email, name: i.name, rsvpUrl: buildRsvpUrl(i.lead.rsvp_link_id), rsvpToken: i.lead.rsvp_link_id, events: buildGuestEvents(i.lead) })),
          ...plusOneList.map((g) => ({ email: g.plus_one_email, name: g.plus_one_name || 'Guest', rsvpUrl: buildRsvpUrl(g.plus_one_rsvp_link_id), rsvpToken: g.plus_one_rsvp_link_id, events: buildGuestEvents(g) })),
        ];
        if (recipients.length) await api.json('/api/send-invites', { method: 'POST', body: JSON.stringify({ type, universeId, bannerChoice, guests: recipients, wedding: weddingPayload, customSubject: subject, customBody: body }) });
      }
      // WHO WAS ACTUALLY SENT TO, from src/lib/sentRecipients.js, as
      // SendInvitesModal.jsx asks it (owner rulings 2026-10-12): every member of
      // an invitation that was emailed, and a guest whose plus-one was; a guest
      // alone on an invitation with no address gets neither the stamp nor the
      // history entry. Both writes take this one set.
      const sentIds = sentGuestIds({ emailedInvitations: emailList, plusOneGuests: plusOneList });
      const sentGuests = guestsActuallySent(withTokens, sentIds);
      // Only invite and reminder have a tracking field on Guest; save the date must not write invite_sent_at (SendInvitesModal.jsx).
      // AND THE HISTORY, APPENDED, as SendInvitesModal.jsx writes it: one entry
      // per guest the send reached, built by src/lib/sendHistory.js's
      // newSendEntry (type and sent_at, never the address), spread onto
      // the guest's existing array and never rewritten. Every type is
      // recorded; only invite and reminder also carry a stamp. One sentAt for
      // the stamp and the entry, as on the web.
      const sentAt = new Date().toISOString();
      const historyById = new Map(await Promise.all(sentGuests.map(async (g) => [g.id, await newSendEntry(type, g.email, new Date(sentAt))])));
      const appended = (g) => ({ send_history: [...(Array.isArray(g.send_history) ? g.send_history : []), historyById.get(g.id)] });
      const track = (g) => api.update('Guest', g.id, type === 'invite' || type === 'reminder'
        ? { ...(type === 'reminder' ? { reminder_sent_at: sentAt } : { invite_sent_at: sentAt, invite_channel: channelStr }), ...appended(g) }
        : appended(g));
      // Each guest's status is the same set: sent when the send reached them,
      // otherwise skipped for no email. A member is named as reached through
      // the lead's email, which is how the web counts them.
      const rows = [
        ...invitations.flatMap((i) => i.members.map((g) => {
          const went = sentIds.has(g.id);
          const viaLead = !!(i.email && i.lead?.rsvp_link_id) && g !== i.lead;
          return { guest: g, status: went ? 'sent' : 'skipped', why: !went ? 'No email' : viaLead ? `In the email to ${i.lead.name || i.email}` : '' };
        })),
        ...notSent,
      ];
      await Promise.all(sentGuests.map(track));
      // SendInvitesModal.jsx's sentence, word for word: emails are invitations,
      // the guests they cover are people, and the skipped say why.
      const sent = emailList.length;
      toast.success(`${TYPE_LABELS[type]} sent, ${sent} email${plural(sent)} covering ${sendable.length} guest${plural(sendable.length)}`
        + (optedOut.length > 0 ? `, ${optedOut.length} skipped who asked not to be emailed` : '')
        + (bounced.length > 0 ? `, ${bouncedSkippedSentence(bounced.length)}` : ''), { id: tid });
      setSending(false);
      setResult({ rows, channelStr });
    } catch (e) {
      toast.error(e?.message || 'Failed to send', { id: tid });
      setSending(false);
      // Nothing went out (the endpoint refuses a batch whole, and a missing link aborts before it): every recipient failed, and can be sent again.
      setResult({ rows: [...sendable.map((g) => ({ guest: g, status: 'failed', why: e?.message || 'Failed to send' })), ...notSent], channelStr });
    }
  };
  const failed = result ? result.rows.filter((r) => r.status === 'failed').map((r) => r.guest) : [];
  const resend = () => { if (!failed.length) return; setResult(null); send(failed); };
  const sendTest = async () => {
    if (!user?.email) { toast.error('No email on your account to send a test to.'); return; }
    // The server refuses a test from an unpublished Guest Suite too; say why here, in the shell's words.
    if (unpublished) { toast.error(unpublished); return; }
    setSendingTest(true);
    const tid = toast.loading('Sending a test to you');
    try {
      await api.json('/api/send-invites', { method: 'POST', body: JSON.stringify({ type, universeId, bannerChoice, isTest: true, guests: [{ email: user.email, name: 'Test guest', rsvpUrl: previewRsvpUrl, events: previewEvents }], wedding: weddingPayload, customSubject: subject, customBody: body }) });
      toast.success(`Test email sent to ${user.email}`, { id: tid });
    } catch (e) { toast.error(e?.message || 'Failed to send the test', { id: tid }); } finally { setSendingTest(false); }
  };

  if (!canSend) {
    return (
      <Screen title="Send invites" back={back}>
        <div className="oi-m-stack oi-m-stack--24">
          <PlanLock about="Emailing your guests from here." />
        </div>
      </Screen>
    );
  }

  const footer = (
    <div style={{ display: 'flex', gap: 8, padding: '12px var(--m-gutter)', background: 'var(--m-card)', borderTop: '1px solid var(--m-line)' }}>
      {step > 1 && <PillButton variant="secondary" onClick={() => setStep(step - 1)} disabled={sending}>Back</PillButton>}
      {step < 4 && <PillButton variant="primary" style={{ flex: 1 }} disabled={(step === 1 && selected.size === 0) || (step === 2 && !subject.trim())} onClick={() => setStep(step + 1)}>Next</PillButton>}
      {step === 4 && <PillButton variant="primary" style={{ flex: 1 }} icon={Send} disabled={sending || !!unpublished || nEmails === 0} onClick={() => setConfirming(true)}>{sending ? 'Sending' : `Send ${TYPE_LABELS[type].toLowerCase()}${nEmails === 1 ? '' : 's'}`}</PillButton>}
    </div>
  );
  const resultFooter = result && (
    <div style={{ display: 'flex', gap: 8, padding: '12px var(--m-gutter)', background: 'var(--m-card)', borderTop: '1px solid var(--m-line)' }}>
      {failed.length > 0 && <PillButton variant="secondary" icon={RotateCcw} onClick={resend} disabled={sending}>Send again to {failed.length}</PillButton>}
      <PillButton variant="primary" style={{ flex: 1 }} icon={Check} onClick={() => onSent?.()}>Done</PillButton>
    </div>
  );

  // The result: every recipient with what happened to them.
  if (result) {
    const sentRows = result.rows.filter((r) => r.status === 'sent');
    const STATUS = { sent: ['ok', 'Sent'], skipped: ['neutral', 'Skipped'], failed: ['no', 'Failed'], pending: ['warn', 'Waiting'] };
    return (
      <Screen title={failed.length && !sentRows.length ? 'Not sent' : 'Sent'} subtitle={`${TYPE_LABELS[type]} by email`} back={() => onSent?.()} footer={resultFooter}>
        <div className="oi-m-stack oi-m-stack--24">
          <div className="oi-m-stats" style={{ margin: 0 }}>
            {[['sent', 'Sent'], ['skipped', 'Skipped'], ['failed', 'Failed']].map(([k, label]) => { const n = result.rows.filter((r) => r.status === k).length; return n || k === 'sent' ? <div key={k} className="oi-m-stat-btn" style={{ minHeight: 0 }}><span className="oi-m-num" style={{ fontSize: 28, lineHeight: '34px' }}>{n}</span><span className="oi-m-meta">{label}</span></div> : null; })}
          </div>
          {failed.length > 0 && <div className="oi-m-card"><p className="oi-m-body">{result.rows.find((r) => r.status === 'failed')?.why}</p></div>}
          <RowGroup>
            {result.rows.map(({ guest: g, status, why }) => { const [tone, label] = STATUS[status] || STATUS.skipped; return <Row key={g.id} initials={initials(g.name)} label={g.name} sub={why || g.email || ''} trailing={<StatusPill tone={tone}>{label}</StatusPill>} chevron={false} />; })}
          </RowGroup>
          {type === 'invite' && sentRows.length > 0 && <p className="oi-m-meta">Each guest sent to is now marked as invited.</p>}
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Send invites" subtitle={`Step ${step} of 4, ${STEPS[step - 1]}`} back={back} footer={footer}>
      <div className="oi-m-steps" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={`oi-m-steps__dot${i < step ? ' oi-m-steps__dot--on' : ''}`} />)}</div>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : (
          <>
            {step === 1 && (
              <>
                <PillChoice label="What are you sending" options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} value={type} onChange={(t) => t && changeType(t)} />
                <div>
                  <FilterPills options={FILTER_TABS} value={filter} onChange={setFilter} className="oi-m-filters" />
                  <div style={{ position: 'relative', marginTop: 12 }}>
                    <Search size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
                    <input className="oi-m-input" style={{ paddingLeft: 42 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" />
                  </div>
                </div>
                {groups.length > 0 && (
                  <div>
                    <div className="oi-m-meta" style={{ marginBottom: 8 }}>Or choose a group</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {groups.map((gr) => <button key={gr.key} type="button" className={`oi-m-filter${groupOn(gr) ? ' oi-m-filter--on' : ''}`} aria-pressed={groupOn(gr)} onClick={() => toggleGroup(gr)}>{gr.label} ({gr.ids.length})</button>)}
                    </div>
                  </div>
                )}
                <div className="oi-m-section-head">
                  <h2 className="oi-m-section">{selected.size} chosen</h2>
                  <button type="button" className="oi-m-block__link" onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((g) => g.id)))}>{selected.size === filtered.length && filtered.length ? 'Clear' : 'Select all shown'}</button>
                </div>
                {filtered.length === 0 ? <EmptyState icon={Mail} text="No guests match this filter." /> : (
                  <RowGroup>
                    {filtered.map((g) => (
                      <div key={g.id} className="oi-m-row">
                        <Checkbox checked={selected.has(g.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })} label={g.name} />
                        <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={() => setSelected((s) => { const n = new Set(s); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}>
                          <div className="oi-m-row__label">{g.name}</div>
                          <div className="oi-m-row__sub">{[g.email || 'No email', g.phone, GUEST_CATEGORY_LABEL[g.category]].filter(Boolean).join(', ')}</div>
                        </button>
                        {isAttending(g) ? <StatusPill tone="ok">Attending</StatusPill> : g.invite_sent_at ? <StatusPill tone="ok">Invited</StatusPill> : null}
                        <span className="oi-m-row__tile" style={{ fontSize: 12, fontWeight: 600 }}>{initials(g.name)}</span>
                      </div>
                    ))}
                  </RowGroup>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <TextField label="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setSubjectEdited(true); }} />
                  <TextAreaField label="Your message" value={body} onChange={(e) => { setBody(e.target.value); setBodyEdited(true); }} rows={7} />
                  <p className="oi-m-meta">Merge tags: [Guest name], [Wedding date], [Couple names], [RSVP link]. The RSVP button is always added.</p>
                  <PillChoice label="Banner photo" options={[{ value: 'none', label: 'No banner' }, ...(hasWeddingPhoto ? [{ value: 'wedding', label: 'Your wedding photo' }] : []), ...(hasVenuePhoto ? [{ value: 'venue', label: 'The venue' }] : [])]} value={bannerChoice} onChange={(v) => { if (v) { setBannerChoice(v); setBannerTouched(true); } }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <PillButton variant="secondary" icon={Eye} onClick={() => setPreview(true)}>Preview the email</PillButton>
                  {invitation && <PillButton variant="secondary" icon={ImageIcon} onClick={() => setInvPreview(true)}>Preview the invitation</PillButton>}
                  <PillButton variant="secondary" icon={FlaskConical} onClick={sendTest} disabled={sendingTest}>{sendingTest ? 'Sending' : 'Send a test to me'}</PillButton>
                </div>
                <div className="oi-m-card">
                  <div className="oi-m-meta">As {previewGuest?.name?.split(' ')[0] || 'a guest'} will read it</div>
                  <div className="oi-m-body oi-m-strong" style={{ marginTop: 4 }}>{replaceMergeTags(subject, previewGuest?.name, coupleName, dateStr)}</div>
                  <p className="oi-m-body" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{replaceMergeTags(body, previewGuest?.name, coupleName, dateStr)}</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="oi-m-body">By email, one to each invitation, addressed to its lead. A household is one email.</p>
                <RowGroup>
                  <div className="oi-m-row">
                    <span className="oi-m-row__tile oi-m-row__tile--primary"><Mail size={19} strokeWidth={1.75} /></span>
                    <div className="oi-m-row__body"><div className="oi-m-row__label">Email</div><div className="oi-m-row__sub">{emailsCovering}</div></div>
                  </div>
                </RowGroup>
              </>
            )}

            {step === 4 && (
              <>
                {unpublished && <div className="oi-m-card" data-unpublished><p className="oi-m-body">{unpublished}</p></div>}
                <div className="oi-m-card oi-m-card--flush">
                  {[['Sending', TYPE_LABELS[type]], ['To', emailsCovering], ['By', 'Email'], ['Subject', subject], ['Banner', bannerChoice === 'none' ? 'None' : bannerChoice === 'wedding' ? 'Your wedding photo' : 'The venue']].map(([k, v]) => <div key={k} className="oi-m-kv"><div className="oi-m-kv__k">{k}</div><div className="oi-m-kv__v">{v}</div></div>)}
                </div>
                {invitationsNoEmail.length > 0 && <div className="oi-m-card"><p className="oi-m-body">{invitationsNoEmail.length} invitation{plural(invitationsNoEmail.length)} {invitationsNoEmail.length === 1 ? 'has' : 'have'} no email and will not be sent: {invitationsNoEmail.slice(0, 4).map((i) => i.name).join(', ')}{invitationsNoEmail.length > 4 ? ', and more' : ''}.</p></div>}
                {(optedOutSelected.length > 0 || bouncedSelected.length > 0) && <div className="oi-m-card"><p className="oi-m-body">{[optedOutSelected.length > 0 ? `${optedOutSelected.length} skipped who asked not to be emailed.` : '', bouncedSelected.length > 0 ? bouncedSkippedSentence(bouncedSelected.length) : ''].filter(Boolean).join(' ')}</p></div>}
                <section>
                  <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Recipients</h2>
                  <RowGroup>
                    {invitationsWithEmail.map((i) => <Row key={i.lead?.id || i.email} initials={initials(i.name)} label={i.name} sub={i.members.length > 1 ? `${i.email}, ${i.members.length} guests` : i.email} chevron={false} />)}
                  </RowGroup>
                </section>
                {type === 'invite' && <p className="oi-m-meta">Each guest is marked as invited once this sends. Save the dates never mark anyone invited.</p>}
                <p className="oi-m-meta">Nothing sends until you confirm on the next sheet.</p>
              </>
            )}
          </>
        )}
      </div>
      {/* The confirmation before anything sends: the exact number, the channel, the first names. */}
      <BottomSheet open={confirming} onClose={() => setConfirming(false)} title="Ready to send?" footer={(
        <>
          <PillButton variant="secondary" onClick={() => setConfirming(false)}>Not yet</PillButton>
          <PillButton variant="primary" style={{ flex: 1 }} icon={Send} onClick={() => send()} disabled={sending || !!unpublished}>Send {nEmails} email{plural(nEmails)}</PillButton>
        </>
      )}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="oi-m-card oi-m-card--flush">
            {[['Sending', TYPE_LABELS[type]], ['To', emailsCovering], ['By', 'Email']].map(([k, v]) => <div key={k} className="oi-m-kv"><div className="oi-m-kv__k">{k}</div><div className="oi-m-kv__v">{v}</div></div>)}
          </div>
          <p className="oi-m-body">{invitationsWithEmail.slice(0, 4).map((i) => i.name || 'a guest').join(', ')}{nEmails > 4 ? ` and ${nEmails - 4} more` : ''}.</p>
          {invitationsNoEmail.length > 0 && <p className="oi-m-meta">{invitationsNoEmail.length} without an email will be skipped.</p>}
        </div>
      </BottomSheet>
      <InvitationPreviewSheet invitation={invitation} details={wedding} open={invPreview} onClose={() => setInvPreview(false)} />
      <BottomSheet open={preview} onClose={() => setPreview(false)} title="Email preview" full flush>
        {previewHtml ? <iframe title="Email preview" srcDoc={previewHtml} sandbox="" style={{ width: '100%', height: '100%', minHeight: 600, border: 0, background: '#FFFFFF' }} /> : <p className="oi-m-meta" style={{ padding: 16 }}>The preview could not be built.</p>}
      </BottomSheet>
    </Screen>
  );
}
