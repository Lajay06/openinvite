import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyGuestsWithRsvp } from "@/lib/resolveMyWedding";
const Guest = base44.entities.Guest;
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
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

  const [guests, setGuests] = useState([]);
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

  useEffect(() => { loadGuests(); }, []);
  useEffect(() => {
    getMyWeddingDetails().then(details => {
      const wd = details || {};
      setWeddingParty(wd.weddingParty || {});
      setWeddingEvents(getWeddingEvents(wd));
    }).catch(() => {});
  }, []);

  const loadGuests = async () => {
    try {
      const data = await getMyGuestsWithRsvp('-created_date');
      setGuests(data);
    } catch {
      toast.error("Failed to load guests");
    }
    setLoading(false);
  };

  const handleSubmit = async (guestData) => {
    setSaving(true);
    const tid = toast.loading(editingGuest ? 'Updating guest…' : 'Adding guest…');
    try {
      if (editingGuest) {
        await Guest.update(editingGuest.id, guestData);
        toast.success('Guest updated', { id: tid });
      } else {
        // New guests default to invited for main events (ceremony + reception) —
        // per SMART_RSVP_MODEL.md, custom events are opt-in via the couple's
        // per-guest event checkboxes.
        const payload = guestData.event_responses
          ? guestData
          : { ...guestData, event_responses: defaultEventResponses(weddingEvents) };
        await Guest.create(payload);
        toast.success('Guest added', { id: tid });
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
      await Guest.create({ name, event_responses: defaultEventResponses(weddingEvents) });
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
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined = guests.filter(g => g.rsvp_status === 'declined').length;
    const awaiting = guests.filter(g => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length;
    const plusOnes = guests.filter(g => g.plus_one).length;
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
    if (activeFilter === 'awaiting') return !!guest.invite_sent_at && (!guest.rsvp_status || guest.rsvp_status === 'pending');
    if (activeFilter === 'attending') return guest.rsvp_status === 'attending';
    if (activeFilter === 'declined') return guest.rsvp_status === 'declined';
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
        <AvaButton label="Ask Ava to help manage your guest list" onClick={() => setAvaOpen(true)} />
        <div className="flex flex-wrap items-center gap-[10px]">
          <button
            onClick={() => setShowImport(true)}
            className="btn-editorial-secondary"
          >
            Import CSV
          </button>
          <button
            onClick={exportGuestList}
            disabled={guests.length === 0}
            className="btn-editorial-secondary"
            style={{ opacity: guests.length === 0 ? 0.4 : 1 }}
          >
            Export CSV
          </button>
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
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="emails">Email templates</TabsTrigger>
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

            {showForm && (
              <GuestForm
                guest={editingGuest}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingGuest(null); }}
                saving={saving}
              />
            )}

            <GuestList
              guests={filteredGuests}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdate={handleInlineUpdate}
              onQuickAdd={handleQuickAdd}
              guestRoles={guestRoles}
              loading={loading}
              weddingEvents={weddingEvents}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onSetEventsAndSend={handleSetEventsAndSend}
              onEditEvents={handleEditEvents}
            />
          </TabsContent>

          <TabsContent value="emails" className="mt-8">
            <EmailTemplates guests={guests} onUseTemplate={(t) => setSendModalConfig({ type: t })} />
          </TabsContent>

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
