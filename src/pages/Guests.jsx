import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyGuestsWithRsvp, getMyRecords } from "@/lib/resolveMyWedding";
import { assignGuestToTableByName, unassignGuestFromTables, DEFAULT_TABLE_CAPACITY } from "@/lib/tableAssignment";
import { useCollaboratorContext } from "@/lib/collaboratorContext";
import { tallyGuestRsvp, isAttending, isDeclined, isAwaitingPrimary } from "@/lib/guestRsvpTally";
const Guest = base44.entities.Guest;
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Send, Copy, CalendarCheck } from "lucide-react";
import toast from 'react-hot-toast';
import { useAuth } from "@/lib/AuthContext";

import GuestForm from "../components/guests/GuestForm";
import GuestList from "../components/guests/GuestList";
import ImportGuestModal from "../components/guests/ImportGuestModal";
import BulkActionBar from "../components/guests/BulkActionBar";
import SendInvitesModal from "../components/guests/SendInvitesModal";
import SetEventsModal from "../components/guests/SetEventsModal";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import EmailTemplates from "../components/guests/EmailTemplates";
import PageConsiderations from '../components/shared/PageConsiderations';
import { getWeddingEvents, defaultEventResponses } from '@/lib/weddingEvents';

const RSVP_BASE = `${window.location.origin}/rsvp/`;

function CountUp({ to, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}{suffix}</>;
}

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

  const [guests, setGuests] = useState([]);
  const [tables, setTables] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("guests");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [weddingParty, setWeddingParty] = useState({});
  const [weddingEvents, setWeddingEvents] = useState([]);

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
    }).catch(() => {});
  }, [isCollaborating]);

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
    const total = guests.length;
    const invited = guests.filter(g => g.invite_sent_at).length;
    const plusOnes = guests.filter(g => g.plus_one).length;

    // A plus-one with their own identity (plus_one_email) has their own
    // rsvp_status, distinct from the primary guest's — counted in addition
    // to the primary guest via includePlusOnes. A plus-one with no email
    // has no separate status to count (current behaviour: the primary
    // answers for both), so they're intentionally left out of these
    // counts, same as before this feature.
    const { attending, declined, awaiting } = tallyGuestRsvp(guests, { includePlusOnes: true });
    return { total, invited, attending, declined, awaiting, plusOnes };
  }, [guests]);

  const FILTERS = [
    { val: 'all',         label: `All (${stats.total})` },
    { val: 'not_invited', label: 'Not yet invited' },
    { val: 'awaiting',    label: 'Awaiting reply' },
    { val: 'attending',   label: 'Attending' },
    { val: 'declined',    label: 'Declined' },
  ];

  const STAT_CARDS = [
    { label: 'Total guests',   value: stats.total + stats.plusOnes, sub: stats.plusOnes > 0 ? `${stats.total} guest${stats.total !== 1 ? 's' : ''} · ${stats.plusOnes} plus one${stats.plusOnes !== 1 ? 's' : ''}` : null },
    { label: 'Invited',        value: stats.invited },
    { label: 'Attending',      value: stats.attending },
    { label: 'Awaiting reply', value: stats.awaiting },
  ];

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'not_invited') return !guest.invite_sent_at;
    if (activeFilter === 'awaiting') return isAwaitingPrimary(guest);
    if (activeFilter === 'attending') return isAttending(guest);
    if (activeFilter === 'declined') return isDeclined(guest);
    return true;
  });

  const exportGuestList = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Category', 'RSVP Status', 'Meal Choice', 'Table Assignment', 'Plus One', 'Plus One Name', 'Dietary Restrictions'].join(','),
      ...guests.map(g => [
        g.name, g.email || '', g.phone || '', g.category || '',
        g.rsvp_status || '', g.meal_choice || '', g.table_assignment || '',
        g.plus_one ? 'Yes' : 'No', g.plus_one_name || '', g.dietary_restrictions || ''
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
    add(asMember(wp.maidOfHonour), 'Maid of honour');
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
              <button onClick={() => { setEditingGuest(null); setShowForm(true); setActiveTab('guests'); }} className="btn-editorial-secondary">
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
        systemPrompt="You are Ava, helping manage a wedding guest list. Help with RSVPs, dietary requirements, plus ones, and seating considerations."
        quickActions={["How should I handle plus ones?", "Draft an RSVP reminder message", "What dietary options should I offer?", "Help me organise my guest groups"]}
      />

      {showImport && (
        <ImportGuestModal
          onClose={() => setShowImport(false)}
          onImported={loadGuests}
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
