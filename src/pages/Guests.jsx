import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyGuestsWithRsvp, getMyRecords } from "@/lib/resolveMyWedding";
import { hasPlusOne, plusOneRsvpStatus } from "@/lib/plusOne";
import { assignGuestToTableByName, unassignGuestFromTables, DEFAULT_TABLE_CAPACITY } from "@/lib/tableAssignment";
import { useCollaboratorContext } from "@/lib/collaboratorContext";
import { useAvaFocus } from "@/hooks/useAvaFocus";
import { tallyAttendees, isAttending, isDeclined, isPending, isAwaitingPrimary } from "@/lib/guestRsvpTally";
import { resolveAttendees } from "@/lib/attendees";
const Guest = base44.entities.Guest;
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Send, Copy, CalendarCheck } from "lucide-react";
import toast from 'react-hot-toast';
import { useAuth } from "@/lib/AuthContext";

import GuestForm from "../components/guests/GuestForm";
import GuestList from "../components/guests/GuestList";
import ImportGuestModal from "../components/guests/ImportGuestModal";
import PendingImportsPanel from "../components/guests/PendingImportsPanel";
import BulkActionBar from "../components/guests/BulkActionBar";
import SendInvitesModal from "../components/guests/SendInvitesModal";
import SetEventsModal from "../components/guests/SetEventsModal";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import EmailTemplates from "../components/guests/EmailTemplates";
import PageConsiderations from '../components/shared/PageConsiderations';
import { getWeddingEvents, defaultEventResponses, getGuestEventResponse, effectiveMealChoice, mealOptionLabel } from '@/lib/weddingEvents';
import CountUp from "@/components/shared/CountUp";

const RSVP_BASE = `${window.location.origin}/rsvp/`;


function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`filter-pill${active ? ' active' : ''}`}
    >
      {label}
    </button>
  );
}

const statLabelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700,
  color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif",
  lineHeight: 1, margin: 0,
};

export default function Guests() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const isPro = plan === 'pro';
  const upgradeTooltip = 'Upgrade to Ultra to send invitations';

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Always read-only while collaborating, even if 'edit' was granted:
  // confirmed empirically that Guest's update/delete RLS is owner-scoped,
  // so the admin key 403s on a write regardless of permission (see
  // api/collaborator-guests.js's own header). Rendering editable UI that's
  // guaranteed to fail on submit would be exactly the dishonest affordance
  // this feature is supposed to avoid — so this stays true until that
  // backend limitation is actually fixed, not just when canEdit is false.
  const readOnly = isCollaborating;

  useAvaFocus();

  const [guests, setGuests] = useState([]);
  const [tables, setTables] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  // Round 8 ask #14: couples invite different sets to different events
  // (e.g. everyone to the ceremony, a smaller list to a recovery brunch) —
  // this is a separate axis from the status pills above, so it's its own
  // dropdown rather than another entry in FILTERS/activeFilter.
  const [eventFilter, setEventFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("guests");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [weddingParty, setWeddingParty] = useState({});
  const [weddingEvents, setWeddingEvents] = useState([]);
  const [weddingId, setWeddingId] = useState(null);
  const [weddingSlug, setWeddingSlug] = useState(null);
  // Menu Phase 1 (Ultra) — for mapping a stored meal_choice id back to a label
  const [mealOptions, setMealOptions] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [showPendingImports, setShowPendingImports] = useState(false);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [sendModalConfig, setSendModalConfig] = useState(null); // { initialSelectedIds } | { defaultFilter }
  const [setEventsGuests, setSetEventsGuests] = useState(null); // array of guests, or null
  const [autoSendAfterSetEvents, setAutoSendAfterSetEvents] = useState(null); // guestId
  const [editingEventsGuestId, setEditingEventsGuestId] = useState(null); // guestId, for the "edit events" (not auto-send) flow
  const [scrollToGuestId, setScrollToGuestId] = useState(null); // set right after a guest is added, so its row scrolls into view once it lands at the bottom
  const [highlightedGuestId, setHighlightedGuestId] = useState(null); // brief flash on the row a search result linked to

  const location = useLocation();
  const navigate = useNavigate();

  // Arriving from the top-bar search ("has Isla RSVP'd?" → click the guest
  // result) — scroll to and briefly highlight that row instead of landing
  // at the top of the page. Cleared from history state immediately so a
  // refresh/back-nav doesn't keep re-triggering it.
  useEffect(() => {
    const id = location.state?.highlightId;
    if (!id) return;
    setScrollToGuestId(id);
    setHighlightedGuestId(id);
    navigate(location.pathname, { replace: true, state: {} });
    const t = setTimeout(() => setHighlightedGuestId(null), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.highlightId]);

  useEffect(() => { loadGuests(); }, [isCollaborating]);
  useEffect(() => {
    // A collaborator has no WeddingDetails of their own to read — the
    // events matrix isn't part of the collaborator-guests.js response
    // (it belongs to the owner), so weddingEvents stays empty. GuestList
    // degrades honestly for that case (shows "—" instead of event chips)
    // rather than fabricating data we don't actually have.
    if (isCollaborating) return;
    getMyWeddingDetails().then(details => {
      const wd = details || {};
      setWeddingParty(wd.weddingParty || {});
      setWeddingEvents(getWeddingEvents(wd));
      setWeddingId(wd.id || null);
      setWeddingSlug(wd.slug || null);
      setMealOptions(wd.mealOptions || []);
    }).catch(() => {});
  }, [isCollaborating]);

  // Contact Collector (PR B3) — pending submissions from the public
  // /w/:slug/collect form. Collaborators never see this (no WeddingDetails
  // of their own to scope it to, same reasoning as weddingEvents above).
  // fix/guest-contact-submission-rls (PR 1b): fetched via the server
  // endpoint, not read directly off the entity — the content is now
  // encrypted at rest and only api/guest-contact-review.js can decrypt it.
  const loadPendingSubmissions = React.useCallback(() => {
    if (isCollaborating || !weddingId) return;
    fetch('/api/guest-contact-review', {
      headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
    })
      .then(res => (res.ok ? res.json() : { submissions: [] }))
      .then(data => setPendingSubmissions(data.submissions || []))
      .catch(() => {});
  }, [isCollaborating, weddingId]);
  useEffect(() => { loadPendingSubmissions(); }, [loadPendingSubmissions]);

  const loadGuests = async () => {
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-guests?ownerUserId=${encodeURIComponent(collab.ownerUserId)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) throw new Error('Failed to load guests');
        const data = await res.json();
        setGuests(data.guests || []);
        setTables([]); // table sync isn't part of the collaborator model — see handleTableAssignment's own guard
      } else {
        // Ascending — oldest first, newest last — so a newly added guest
        // lands at the bottom of the list instead of jumping to the top.
        // This is the *default* order; GuestList applies its own column sort
        // on top of it whenever one is active.
        const [guestData, tableData] = await Promise.all([
          getMyGuestsWithRsvp('created_date'),
          getMyRecords('Table', '-created_date'),
        ]);
        setGuests(guestData);
        setTables(tableData.map(t => ({ ...t, assigned_guests: t.assigned_guests || [] })));
      }
    } catch {
      toast.error("Failed to load guests");
    }
    setLoading(false);
  };

  /* ── Table assignment — routes through the shared Table.assigned_guests
     write path (src/lib/tableAssignment.js) instead of writing
     Guest.table_assignment directly, so the seating visualiser and the
     guest list's Table column can never drift apart. Empty value clears
     the guest's seat everywhere; a non-empty value resolves (or
     auto-creates, or grows) the named table. */
  const handleTableAssignment = async (guestId, rawValue) => {
    const value = (rawValue || '').trim();
    const prevName = guests.find(g => g.id === guestId)?.table_assignment || '';
    if (value === prevName) return;

    // Optimistic UI update
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_assignment: value } : g));

    try {
      if (!value) {
        await unassignGuestFromTables({ guestId, tables });
      } else {
        const { tableName, created, grewCapacityTo } = await assignGuestToTableByName({ guestId, tableName: value, tables });
        if (created) {
          toast.success(`Created table "${tableName}" (capacity ${DEFAULT_TABLE_CAPACITY}) and seated the guest`);
        } else if (grewCapacityTo) {
          toast(`${tableName} grew to ${grewCapacityTo} seats to fit everyone assigned`, { icon: '⚠️' });
        }
      }
      loadGuests();
    } catch (e) {
      toast.error(e?.message || 'Failed to update table assignment');
      loadGuests(); // rollback
    }
  };

  const handleSubmit = async (guestData) => {
    setSaving(true);
    const tid = toast.loading(editingGuest ? 'Updating guest…' : 'Adding guest…');
    // table_assignment goes through the shared write path below, once the
    // guest id is known — never as a plain field on the Guest record itself.
    const { table_assignment: tableAssignmentInput, ...restGuestData } = guestData;
    try {
      let guestId;
      if (editingGuest) {
        await Guest.update(editingGuest.id, restGuestData);
        guestId = editingGuest.id;
        toast.success('Guest updated', { id: tid });
      } else {
        // New guests default to invited for main events (ceremony + reception) —
        // per SMART_RSVP_MODEL.md, custom events are opt-in via the couple's
        // per-guest event checkboxes.
        const payload = restGuestData.event_responses
          ? restGuestData
          : { ...restGuestData, event_responses: defaultEventResponses(weddingEvents) };
        const created = await Guest.create(payload);
        guestId = created.id;
        toast.success('Guest added', { id: tid });
        setScrollToGuestId(created.id);
      }

      const prevTableAssignment = editingGuest?.table_assignment || '';
      const nextTableAssignment = (tableAssignmentInput || '').trim();
      if (nextTableAssignment !== prevTableAssignment) {
        if (nextTableAssignment) {
          await assignGuestToTableByName({ guestId, tableName: nextTableAssignment, tables });
        } else {
          await unassignGuestFromTables({ guestId, tables });
        }
      }

      setShowForm(false);
      setEditingGuest(null);
      loadGuests();
    } catch (e) {
      toast.error(e?.message || 'Failed to save guest', { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (guest) => { setEditingGuest(guest); setShowForm(true); };

  const handleDelete = async (guestId) => {
    if (!window.confirm("Delete this guest?")) return;
    const tid = toast.loading('Deleting…');
    try {
      await Guest.delete(guestId);
      toast.success('Guest deleted', { id: tid });
      setSelectedIds(prev => { const next = new Set(prev); next.delete(guestId); return next; });
      loadGuests();
    } catch (e) {
      toast.error(e?.message || 'Failed to delete guest', { id: tid });
    }
  };

  const handleInlineUpdate = async (guestId, updates) => {
    // table_assignment has its own write path (Table.assigned_guests is the
    // source of truth) — never write it as a plain field, or the guest list
    // and the seating visualiser drift apart again.
    if ('table_assignment' in updates) {
      await handleTableAssignment(guestId, updates.table_assignment);
      return;
    }
    // Optimistic update so the UI feels instant
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, ...updates } : g));
    try {
      await Guest.update(guestId, updates);
    } catch (e) {
      toast.error('Failed to update');
      loadGuests(); // Rollback on failure
    }
  };

  /* ── Quick add — the persistent bottom row in the editable table ────────
     Same defaults as the full "+ Add guest" form (main-event invites via
     defaultEventResponses), just skipping the modal for fast, repeated
     name-then-Enter entry. Category/tags/dietary are left blank — set
     afterwards via inline edit or bulk edit, same as an import. */
  const handleQuickAdd = async (name) => {
    try {
      const created = await Guest.create({ name, event_responses: defaultEventResponses(weddingEvents) });
      setScrollToGuestId(created.id);
      loadGuests();
    } catch (e) {
      toast.error(e?.message || 'Failed to add guest');
    }
  };

  /* ── Bulk edit — applies to every currently-selected guest ──────────────
     Category/dietary are a uniform SET (same value for everyone selected —
     "100 guests to friends" is one click here). Tags are additive/
     subtractive per guest instead, since different guests may already
     carry different tags of their own. */
  const handleBulkUpdate = async (updates) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setGuests(prev => prev.map(g => selectedIds.has(g.id) ? { ...g, ...updates } : g));
    try {
      await Promise.all(ids.map(id => Guest.update(id, updates)));
      toast.success(`Updated ${ids.length} guest${ids.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Some updates failed');
      loadGuests();
    }
  };

  const handleBulkAddTag = async (tag) => {
    const targets = selectedGuests.filter(g => !(Array.isArray(g.tags) ? g.tags : []).includes(tag));
    if (targets.length === 0) return;
    setGuests(prev => prev.map(g => selectedIds.has(g.id) && !g.tags?.includes(tag) ? { ...g, tags: [...(g.tags || []), tag] } : g));
    try {
      await Promise.all(targets.map(g => Guest.update(g.id, { tags: [...(g.tags || []), tag] })));
      toast.success(`Tagged ${targets.length} guest${targets.length !== 1 ? 's' : ''} "${tag}"`);
    } catch {
      toast.error('Failed to add tag to some guests');
      loadGuests();
    }
  };

  const handleBulkRemoveTag = async (tag) => {
    const targets = selectedGuests.filter(g => (Array.isArray(g.tags) ? g.tags : []).includes(tag));
    if (targets.length === 0) return;
    setGuests(prev => prev.map(g => selectedIds.has(g.id) ? { ...g, tags: (g.tags || []).filter(t => t !== tag) } : g));
    try {
      await Promise.all(targets.map(g => Guest.update(g.id, { tags: (g.tags || []).filter(t => t !== tag) })));
      toast.success(`Removed "${tag}" from ${targets.length} guest${targets.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to remove tag from some guests');
      loadGuests();
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} guest${ids.length !== 1 ? 's' : ''}? This can't be undone.`)) return;
    const tid = toast.loading(`Deleting ${ids.length} guest${ids.length !== 1 ? 's' : ''}…`);
    try {
      await Promise.all(ids.map(id => Guest.delete(id)));
      toast.success('Deleted', { id: tid });
      setSelectedIds(new Set());
      loadGuests();
    } catch {
      toast.error('Some deletions failed', { id: tid });
      loadGuests();
    }
  };

  const stats = React.useMemo(() => {
    // `total` stays a ROW count. It labels the "All (N)" filter pill, which
    // must match how many rows the table shows, and the Total guests card adds
    // plusOnes to it explicitly below.
    const total = guests.length;
    // invite_sent_at is guest-only — a plus-one has no invitation of their own.
    const invited = guests.filter(g => g.invite_sent_at).length;

    // One canonical attendee list, partitioned in a single pass. This replaces
    // two tallies plus a subtraction (`combined.attending - guestOnly.attending`)
    // and the includePlusOnes boolean, which would only ever have taken one
    // value once every caller passed attendees.
    //
    // `plusOnes` was `guests.filter(g => g.plus_one).length` — the bare
    // permission flag. It is accidentally right today, because no guest carries
    // `plus_one: true` without also naming someone; the first one who does
    // inflates that count by a head who does not exist. The resolver requires a
    // name or an email, so it is correct by construction rather than by luck.
    //
    // Round 8 ask #13b: "134 attending" with no indication it folds in
    // plus-ones read as wrong next to a 121/201-guest list, so each card keeps
    // its "X guests · Y plus-ones" breakdown.
    const attendees = resolveAttendees(guests);
    const { combined, primaries, plusOnes: poTally } = tallyAttendees(attendees);

    // Awaiting needs invite_sent_at, which an Attendee deliberately does not
    // carry, so it is derived here: a plus-one is "awaiting" when their HOST
    // was invited and the plus-one has not answered. Computed over the same
    // attendee list as everything else, so the halves cannot drift apart.
    const guestById = new Map(guests.filter(g => g?.id).map(g => [g.id, g]));
    const wasInvited = (a) => !!guestById.get(a.isPlusOne ? a.hostGuestId : a.id)?.invite_sent_at;
    const awaitingAll = attendees.filter(a => wasInvited(a) && isPending(a));

    return {
      total, invited,
      plusOnes: poTally.total,
      attending: combined.attending,
      declined: combined.declined,
      awaiting: awaitingAll.length,
      attendingGuestsOnly: primaries.attending,
      attendingPlusOnes: poTally.attending,
      awaitingGuestsOnly: awaitingAll.filter(a => !a.isPlusOne).length,
      awaitingPlusOnes: awaitingAll.filter(a => a.isPlusOne).length,
    };
  }, [guests]);

  // Row counts, not attendee counts — must match how many rows actually
  // show up when the pill is clicked (filteredGuests below uses these same
  // predicates), which differs from stats.attending/declined/awaiting
  // (those fold in plus-ones as separate attendees for the stat cards).
  const filterCounts = React.useMemo(() => ({
    not_invited: guests.filter(g => !g.invite_sent_at).length,
    awaiting: guests.filter(isAwaitingPrimary).length,
    attending: guests.filter(isAttending).length,
    declined: guests.filter(isDeclined).length,
  }), [guests]);

  const FILTERS = [
    { val: 'all',         label: `All (${stats.total})` },
    { val: 'not_invited', label: `Not yet invited (${filterCounts.not_invited})` },
    { val: 'awaiting',    label: `Awaiting reply (${filterCounts.awaiting})` },
    { val: 'attending',   label: `Attending (${filterCounts.attending})` },
    { val: 'declined',    label: `Declined (${filterCounts.declined})` },
  ];

  // Round 8 ask #14: per-event counts, computed from the same
  // getGuestEventResponse() the status chips already use — invited/yes/
  // no/pending FOR THIS EVENT, not the wedding-wide totals above.
  const activeEvent = eventFilter === 'all' ? null : weddingEvents.find(e => e.event_id === eventFilter) || null;
  const eventStats = React.useMemo(() => {
    if (!activeEvent) return null;
    let invited = 0, yes = 0, no = 0, pending = 0;
    for (const guest of guests) {
      const r = getGuestEventResponse(guest, activeEvent);
      if (!r.invited) continue;
      invited++;
      if (r.status === 'yes') yes++;
      else if (r.status === 'no') no++;
      else pending++;
    }
    return { invited, yes, no, pending };
  }, [guests, activeEvent]);

  const STAT_CARDS = activeEvent ? [
    { label: `Invited to ${activeEvent.name}`, value: eventStats.invited },
    { label: 'Yes',     value: eventStats.yes },
    { label: 'No',      value: eventStats.no },
    { label: 'Pending', value: eventStats.pending },
  ] : [
    { label: 'Total guests',   value: stats.total + stats.plusOnes, sub: stats.plusOnes > 0 ? `${stats.total} guest${stats.total !== 1 ? 's' : ''} · ${stats.plusOnes} plus one${stats.plusOnes !== 1 ? 's' : ''}` : null },
    { label: 'Invited',        value: stats.invited },
    { label: 'Attending',      value: stats.attending, sub: stats.attendingPlusOnes > 0 ? `${stats.attendingGuestsOnly} guest${stats.attendingGuestsOnly !== 1 ? 's' : ''} · ${stats.attendingPlusOnes} plus one${stats.attendingPlusOnes !== 1 ? 's' : ''}` : null },
    { label: 'Awaiting reply', value: stats.awaiting, sub: stats.awaitingPlusOnes > 0 ? `${stats.awaitingGuestsOnly} guest${stats.awaitingGuestsOnly !== 1 ? 's' : ''} · ${stats.awaitingPlusOnes} plus one${stats.awaitingPlusOnes !== 1 ? 's' : ''}` : null },
  ];

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeEvent && !getGuestEventResponse(guest, activeEvent).invited) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'not_invited') return !guest.invite_sent_at;
    if (activeFilter === 'awaiting') return isAwaitingPrimary(guest);
    if (activeFilter === 'attending') return isAttending(guest);
    if (activeFilter === 'declined') return isDeclined(guest);
    return true;
  });

  const exportGuestList = () => {
    const csvContent = [
      // Existing columns keep their names AND their order — a couple may
      // already have a sheet built on this file, so the three plus-one
      // columns are APPENDED. Before this, a plus-one's meal choice and
      // dietary requirements never left the system at all: 27 meal choices
      // and 5 dietary notes sat in the data with no route to a caterer.
      ['Name', 'Email', 'Phone', 'Category', 'RSVP Status', 'Meal Choice', 'Table Assignment', 'Plus One', 'Plus One Name', 'Dietary Restrictions', 'Plus One RSVP', 'Plus One Meal', 'Plus One Dietary'].join(','),
      // Meal Choice: fix/vestigial-meal-choice-reads — g.meal_choice is a
      // dead column (nothing writes it once a guest RSVPs; see
      // api/rsvp-submit.js). The live source is the per-event
      // event_responses overlay getMyGuestsWithRsvp already attaches.
      ...guests.map(g => [
        g.name, g.email || '', g.phone || '', g.category || '',
        g.rsvp_status || '', mealOptionLabel(effectiveMealChoice(g.event_responses), mealOptions) || '', g.table_assignment || '',
        g.plus_one ? 'Yes' : 'No', g.plus_one_name || '', g.dietary_restrictions || '',
        // Blank when there is no plus-one, rather than reporting a default
        // 'pending' for someone who does not exist.
        hasPlusOne(g) ? plusOneRsvpStatus(g) : '',
        hasPlusOne(g) ? (mealOptionLabel(effectiveMealChoice(g.plus_one_event_responses), mealOptions) || '') : '',
        hasPlusOne(g) ? (g.plus_one_dietary_restrictions || '') : ''
      ].map(f => `"${f}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'guest-list.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Guest list exported');
  };

  const guestRoles = useMemo(() => {
    const map = {};
    const wp = weddingParty;
    const asMember = (v) => (!v ? null : typeof v === 'string' ? { name: v, guestId: null } : v);
    const add = (m, role) => { if (m?.guestId) map[m.guestId] = role; };
    add(asMember(wp.maidOfHonour), 'Maid of honor');
    add(asMember(wp.bestMan), 'Best man');
    (wp.bridesmaids || []).forEach(m => add(m, 'Bridesmaid'));
    (wp.groomsmen   || []).forEach(m => add(m, 'Groomsman'));
    (wp.flowerGirls || []).forEach(m => add(m, 'Flower girl'));
    (wp.ringBearers || []).forEach(m => add(m, 'Ring bearer'));
    (wp.readers     || []).forEach(m => add(m, 'Reader'));
    (wp.ushers      || []).forEach(m => add(m, 'Usher'));
    (wp.other       || []).forEach(m => add(m, 'Wedding party'));
    return map;
  }, [weddingParty]);

  /* ── Selection ────────────────────────────────────────────────────────── */
  const toggleSelect = (guestId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(guestId) ? next.delete(guestId) : next.add(guestId);
      return next;
    });
  };

  const toggleSelectAll = (visibleIds) => {
    setSelectedIds(prev => {
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedGuests = guests.filter(g => selectedIds.has(g.id));

  /* ── Send invites ─────────────────────────────────────────────────────── */
  const openSendForSelection = () => {
    if (isPro) return;
    if (selectedIds.size > 0) {
      setSendModalConfig({ initialSelectedIds: Array.from(selectedIds) });
    } else {
      setSendModalConfig({ defaultFilter: 'not_invited' });
    }
  };

  const handleSent = () => {
    setSelectedIds(new Set());
    setSendModalConfig(null);
    loadGuests();
  };

  /* ── Copy links (bulk) ───────────────────────────────────────────────── */
  const handleCopyLinks = async () => {
    if (isPro || selectedGuests.length === 0) return;
    const withTokens = await Promise.all(selectedGuests.map(async g => {
      if (g.rsvp_link_id) return g.rsvp_link_id;
      const token = crypto.randomUUID();
      await Guest.update(g.id, { rsvp_link_id: token });
      return token;
    }));
    const links = withTokens.map(t => RSVP_BASE + t).join('\n');
    await navigator.clipboard.writeText(links);
    toast.success(`${withTokens.length} RSVP link${withTokens.length !== 1 ? 's' : ''} copied`);
    loadGuests();
  };

  /* ── Set events (bulk, from selection bar) ──────────────────────────── */
  const openSetEventsForSelection = () => {
    if (selectedGuests.length === 0) return;
    setAutoSendAfterSetEvents(null);
    setSetEventsGuests(selectedGuests);
  };

  /* ── Set events & send (per-row, for a single uninvited guest) ──────── */
  const handleSetEventsAndSend = (guest) => {
    setAutoSendAfterSetEvents(guest.id);
    setEditingEventsGuestId(null);
    setSetEventsGuests([guest]);
  };

  /* ── Edit events (chips area / expanded row, for an already-invited guest) ── */
  const handleEditEvents = (guest) => {
    setAutoSendAfterSetEvents(null);
    setEditingEventsGuestId(guest.id);
    setSetEventsGuests([guest]);
  };

  const handleSetEventsSaved = (newlyInvitedEventIds) => {
    if (autoSendAfterSetEvents && !isPro) {
      setSendModalConfig({ initialSelectedIds: [autoSendAfterSetEvents] });
    } else if (editingEventsGuestId && newlyInvitedEventIds?.length > 0 && !isPro) {
      const guestId = editingEventsGuestId;
      toast((t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {newlyInvitedEventIds.length} new event{newlyInvitedEventIds.length !== 1 ? 's' : ''} added.
          </span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setSendModalConfig({ initialSelectedIds: [guestId], restrictEventIds: newlyInvitedEventIds });
            }}
            className="btn-primary"
            style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
          >
            Send invite for the new events
          </button>
        </div>
      ), { duration: 10000 });
    }
    setAutoSendAfterSetEvents(null);
    setEditingEventsGuestId(null);
    loadGuests();
  };

  const selectionBarVisible = selectedIds.size > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Guests" subtitle="Manage your guest list, invitations and RSVPs" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none', borderRadius: 0, boxShadow: 'none' }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 60, height: 36, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValueStyle}><CountUp to={s.value} /></p>
            }
            {s.sub && !loading && (
              <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0' }}>{s.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Ava + toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {!isCollaborating && <AvaButton label="Ask Ava to help manage your guest list" onClick={() => setAvaOpen(true)} />}
        {isCollaborating && <div />}
        <div className="flex flex-wrap items-center gap-[10px]">
          {!isCollaborating && (
            <button
              onClick={() => setShowImport(true)}
              className="btn-editorial-secondary"
            >
              Import CSV
            </button>
          )}
          {!isCollaborating && weddingSlug && (
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/w/${weddingSlug}/collect`);
                toast.success('Collect link copied');
              }}
              className="btn-editorial-secondary"
            >
              Copy collect link
            </button>
          )}
          {!isCollaborating && pendingSubmissions.length > 0 && (
            <button
              onClick={() => setShowPendingImports(true)}
              className="btn-editorial-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Pending imports
              <span style={{ background: '#E03553', color: '#FFFFFF', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
                {pendingSubmissions.length}
              </span>
            </button>
          )}
          <button
            onClick={exportGuestList}
            disabled={guests.length === 0}
            className="btn-editorial-secondary"
            style={{ opacity: guests.length === 0 ? 0.4 : 1 }}
          >
            Export CSV
          </button>
          {!isCollaborating && (
            <>
              <button data-ava-focus="guests" onClick={() => { setEditingGuest(null); setShowForm(true); setActiveTab('guests'); }} className="btn-editorial-secondary">
                + Add guest
              </button>
              <span title={isPro ? upgradeTooltip : undefined} style={isPro ? { cursor: 'not-allowed', display: 'inline-flex' } : {}}>
                <button
                  onClick={openSendForSelection}
                  disabled={isPro}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, ...(isPro ? { opacity: 0.4, pointerEvents: 'none' } : {}) }}
                >
                  <Send size={13} />
                  Send invites
                </button>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="guests">Guests</TabsTrigger>
            {!isCollaborating && <TabsTrigger value="emails">Email templates</TabsTrigger>}
            <TabsTrigger value="considerations">Considerations</TabsTrigger>
          </TabsList>

          <TabsContent value="guests" className="mt-8 space-y-6">
            {/* Search + filter row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
                <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                <Input
                  placeholder="Search by name or email…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 20 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {FILTERS.map(f => (
                  <FilterPill key={f.val} label={f.label} active={activeFilter === f.val} onClick={() => setActiveFilter(f.val)} />
                ))}
              </div>
              {weddingEvents.length > 1 && (
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger
                    style={{ flexShrink: 0 }}
                    className="w-auto flex-none gap-1 rounded-full border border-[rgba(10,10,10,0.15)] px-2 py-[3px] text-[11px] font-semibold text-[rgba(10,10,10,0.6)] data-[placeholder]:text-[rgba(10,10,10,0.6)] data-[placeholder]:font-semibold hover:border-[rgba(10,10,10,0.45)] hover:text-[#0A0A0A] focus:border focus:border-[rgba(10,10,10,0.15)] focus:outline-none"
                  >
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {weddingEvents.map(event => (
                      <SelectItem key={event.event_id} value={event.event_id}>{event.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Selection bar */}
            {selectionBarVisible && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                border: '1px solid rgba(10,10,10,0.08)', background: 'rgba(224,53,83,0.03)',
                padding: '10px 16px',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {selectedIds.size} selected
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <BulkActionBar
                    count={selectedIds.size}
                    selectedGuests={selectedGuests}
                    onSetCategory={(category) => handleBulkUpdate({ category: category || null })}
                    onSetDietary={(dietary) => handleBulkUpdate({ dietary_restrictions: dietary || null })}
                    onAddTag={handleBulkAddTag}
                    onRemoveTag={handleBulkRemoveTag}
                    onDelete={handleBulkDelete}
                  />
                  <button onClick={openSetEventsForSelection} className="btn-editorial-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarCheck size={13} />
                    Set events
                  </button>
                  <span title={isPro ? upgradeTooltip : undefined} style={isPro ? { cursor: 'not-allowed', display: 'inline-flex' } : {}}>
                    <button
                      onClick={handleCopyLinks}
                      disabled={isPro}
                      className="btn-editorial-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, ...(isPro ? { opacity: 0.4, pointerEvents: 'none' } : {}) }}
                    >
                      <Copy size={13} />
                      Copy links
                    </button>
                  </span>
                  <span title={isPro ? upgradeTooltip : undefined} style={isPro ? { cursor: 'not-allowed', display: 'inline-flex' } : {}}>
                    <button
                      onClick={openSendForSelection}
                      disabled={isPro}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, ...(isPro ? { opacity: 0.4, pointerEvents: 'none' } : {}) }}
                    >
                      <Send size={13} />
                      Send invites to selected
                    </button>
                  </span>
                </div>
              </div>
            )}

            <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingGuest(null); } }}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingGuest ? 'Edit guest' : 'Add new guest'}</DialogTitle>
                </DialogHeader>
                <GuestForm
                  guest={editingGuest}
                  onSubmit={handleSubmit}
                  onCancel={() => { setShowForm(false); setEditingGuest(null); }}
                  saving={saving}
                />
              </DialogContent>
            </Dialog>

            <GuestList
              guests={filteredGuests}
              onEdit={readOnly ? undefined : handleEdit}
              onDelete={readOnly ? undefined : handleDelete}
              onUpdate={readOnly ? undefined : handleInlineUpdate}
              onQuickAdd={readOnly ? undefined : handleQuickAdd}
              guestRoles={guestRoles}
              loading={loading}
              weddingEvents={weddingEvents}
              mealOptions={mealOptions}
              filterEvent={activeEvent}
              selectedIds={selectedIds}
              onToggleSelect={readOnly ? undefined : toggleSelect}
              onToggleSelectAll={readOnly ? undefined : toggleSelectAll}
              onSetEventsAndSend={readOnly ? undefined : handleSetEventsAndSend}
              onEditEvents={readOnly ? undefined : handleEditEvents}
              scrollToGuestId={scrollToGuestId}
              highlightedGuestId={highlightedGuestId}
              readOnly={readOnly}
            />
          </TabsContent>

          {!isCollaborating && (
            <TabsContent value="emails" className="mt-8">
              <EmailTemplates guests={guests} onUseTemplate={(t) => setSendModalConfig({ type: t })} />
            </TabsContent>
          )}

          <TabsContent value="considerations" className="mt-8" style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="guests" />
          </TabsContent>
        </Tabs>
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Guest list management"
        systemPrompt="You are Ava, helping manage a wedding guest list. Help with RSVPs, dietary requirements, plus ones, and seating considerations. If the couple has selected cultures and traditions, factor culturally-specific seating/dietary norms into your advice where relevant."
        quickActions={["How should I handle plus ones?", "Draft an RSVP reminder message", "What dietary options should I offer?", "Help me organize my guest groups"]}
      />

      {showImport && (
        <ImportGuestModal
          onClose={() => setShowImport(false)}
          onImported={loadGuests}
        />
      )}

      {showPendingImports && (
        <PendingImportsPanel
          submissions={pendingSubmissions}
          guests={guests}
          onClose={() => setShowPendingImports(false)}
          onChanged={() => { loadGuests(); loadPendingSubmissions(); }}
        />
      )}

      {sendModalConfig && (
        <SendInvitesModal
          guests={guests}
          defaultFilter={sendModalConfig.defaultFilter}
          initialSelectedIds={sendModalConfig.initialSelectedIds}
          initialType={sendModalConfig.type}
          restrictEventIds={sendModalConfig.restrictEventIds}
          onClose={() => setSendModalConfig(null)}
          onSent={handleSent}
        />
      )}

      {setEventsGuests && (
        <SetEventsModal
          guests={setEventsGuests}
          weddingEvents={weddingEvents}
          onUpdate={handleInlineUpdate}
          onClose={() => { setSetEventsGuests(null); setAutoSendAfterSetEvents(null); }}
          onSaved={handleSetEventsSaved}
        />
      )}
    </div>
  );
}
