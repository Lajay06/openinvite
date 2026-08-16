import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords, getMyGuestsWithRsvp, getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { getGuestTableName, propagateTableRename, assignGuestToSeat, unassignSeat, applyEventSeatingPlan, validatePlanAssignments } from '@/lib/tableAssignment';
import { getWeddingEvents, getGuestEventResponse, RECEPTION_EVENT_ID } from '@/lib/weddingEvents';
import { EventChip, DietaryCell } from '@/components/guests/GuestList';
import GuestAvatar from '@/components/shared/GuestAvatar';
const Table = base44.entities.Table;
const VenueAsset = base44.entities.VenueAsset;
import { Search, Trash2, ZoomIn, ZoomOut, RotateCcw, Users, Pencil, Monitor, Plus, Copy, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { validateUploadFile } from '@/lib/uploadValidation';
import { interactiveDivProps } from '@/lib/a11y';

import { buildTablesWithGuests } from '@/lib/seatingChart';
import { resolveAttendees } from '@/lib/attendees';
import VisualTable, { LABEL_FORMS, labelForName, availableLabelPx } from '../components/seating/VisualTable';
import VisualAsset from '../components/seating/VisualAsset';
import VenueAssetLibrary from '../components/seating/VenueAssetLibrary';
import AddTableModal from '../components/seating/AddTableModal';
import AISeatingGenerator from '../components/seating/AISeatingGenerator';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
import CountUp from "@/components/shared/CountUp";

const PJS = "'Plus Jakarta Sans', sans-serif";

/* ── CountUp ── */

/* ── Filter pill ── */
function Pill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: PJS, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
        border: active ? '1px solid #0A0A0A' : '1px solid rgba(10,10,10,0.15)',
        background: active ? '#0A0A0A' : hov ? 'rgba(10,10,10,0.04)' : 'transparent',
        color: active ? '#FFFFFF' : '#444444', cursor: 'pointer', transition: 'all 0.13s', whiteSpace: 'nowrap',
      }}
    >{label}</button>
  );
}

// Compact tag pills for guest rows while seating — same colour language as
// GuestList's TagsDisplay, sized down for the narrow seating side panel.
function MiniTags({ tags }) {
  const items = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (items.length === 0) return null;
  const first2 = items.slice(0, 2);
  const rest = items.length - first2.length;
  const pillStyle = {
    display: 'inline-block', fontFamily: PJS,
    fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
    whiteSpace: 'nowrap', background: 'rgba(128,61,129,0.08)', color: '#803D81',
    border: '1px solid rgba(128,61,129,0.25)',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }} title={items.join(', ')}>
      {first2.map(t => <span key={t} style={pillStyle}>{t}</span>)}
      {rest > 0 && <span style={{ ...pillStyle, background: 'rgba(10,10,10,0.06)', color: '#444444', border: 'none' }}>+{rest}</span>}
    </span>
  );
}

// Plus-ones for THIS event, from the guest's per-event response — not the
// wedding-level guest.plus_one/plus_one_name (an event can grant a +1 the
// couple didn't grant elsewhere, or vice versa).
function PlusOnesLine({ response }) {
  const count = response?.plus_ones || 0;
  if (count === 0) return null;
  const names = (response.plus_one_names || []).filter(Boolean);
  return (
    <p style={{ fontSize: 9, color: '#444444', fontFamily: PJS, margin: '1px 0 0' }}>
      +{count}{names.length > 0 ? ` (${names.join(', ')})` : ''}
    </p>
  );
}

const statLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS };
const statValue = { fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1, margin: 0 };

const CANVAS_W = 1400;
const CANVAS_H = 900;

export default function SeatingPage() {
  const [guests, setGuests] = useState([]);
  const [tables, setTables] = useState([]);
  const [venueAssets, setVenueAssets] = useState([]);
  const [weddingEvents, setWeddingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [draggingItem, setDraggingItem] = useState(null);
  const dragMovedRef = useRef(false);
  const tablesRef = useRef(tables);
  const venueAssetsRef = useRef(venueAssets);
  useEffect(() => { tablesRef.current = tables; }, [tables]);
  useEffect(() => { venueAssetsRef.current = venueAssets; }, [venueAssets]);

  const canvasRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  // Delete button visibility — deliberately lags hoveredId by a short delay
  // (below) so a quick mouse pass-through while reaching for the drag
  // handle doesn't pop a destructive control on every hover.
  const [deleteHoverId, setDeleteHoverId] = useState(null);
  const deleteHoverTimer = useRef(null);
  const [renamingTableId, setRenamingTableId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const handleItemHoverStart = (id) => {
    setHoveredId(id);
    clearTimeout(deleteHoverTimer.current);
    deleteHoverTimer.current = setTimeout(() => setDeleteHoverId(id), 250);
  };
  const handleItemHoverEnd = () => {
    setHoveredId(null);
    clearTimeout(deleteHoverTimer.current);
    setDeleteHoverId(null);
  };
  useEffect(() => () => clearTimeout(deleteHoverTimer.current), []);

  const [guestFilter, setGuestFilter] = useState('all');
  const [guestSearch, setGuestSearch] = useState('');

  const [showAddTable, setShowAddTable] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);
  const [tableGuestSearch, setTableGuestSearch] = useState('');

  const [venueImageUrl, setVenueImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2;

  // ── Dot grid, derived from zoom ────────────────────────────────────────
  // Both grid layers are painted INSIDE the scaled canvas, so a fixed pitch
  // and dot radius shrink with it. At MIN_ZOOM 0.4 the 1.5px dot rendered at
  // 0.6 screen px on a 9.6px pitch — sub-pixel at 13% alpha, which is why
  // the grid appeared to disappear rather than merely thin out. Counter-
  // scaling the dot alone would have left a 9.6px pitch, which reads as
  // noise, so the pitch steps too: the on-screen band lands at 18-30px
  // across the whole 0.4-2.0 zoom range instead of collapsing.
  const gridDotPx = +(1.5 / zoom).toFixed(2);
  const gridPitchPx = 24 * (zoom < 0.75 ? 2 : zoom >= 1.5 ? 0.5 : 1);

  // Measured render scale of the canvas, including the zoom transform.
  // getBoundingClientRect is used rather than ResizeObserver's contentRect
  // because contentRect reports the pre-transform layout box — it would
  // report 1400 at every zoom level and the label tiers would never fire.
  // The observer is still wired up, for viewport changes that re-lay-out
  // the canvas without changing zoom.
  const [renderScale, setRenderScale] = useState(1);

  // ── Seat labels: initials or names (b) ─────────────────────────────────
  // localStorage, keyed per event, not the couple's record: this is a
  // per-viewer display preference, not wedding data, and putting it on
  // WeddingDetails would mean a cross-lane Base44 schema change for a UI
  // toggle. Accepted trade-off — the setting does NOT follow the user
  // between devices or browsers. Cheap to promote to the entity later if
  // that turns out to matter.
  const [labelMode, setLabelMode] = useState('initials');

  // ── Multi-event seating (PR6) ──────────────────────────────────────────
  // A tab is "visible" if it's Reception (always, undeletable — the
  // migrated original chart), or it has at least one Table/VenueAsset, or
  // the couple just added it via "+ Add event" this session (before
  // they've added a table yet).
  const [activeEventId, setActiveEventId] = useState(RECEPTION_EVENT_ID);
  const labelPrefKey = `oi_seating_labels:${activeEventId}`;

  // Load the saved preference whenever the active event changes — each
  // event tab keeps its own, so a densely-seated reception can stay on
  // initials while a small ceremony shows names.
  useEffect(() => {
    try {
      setLabelMode(localStorage.getItem(labelPrefKey) === 'names' ? 'names' : 'initials');
    } catch { setLabelMode('initials'); }
  }, [labelPrefKey]);

  const toggleLabelMode = () => {
    setLabelMode(prev => {
      const next = prev === 'names' ? 'initials' : 'names';
      try { localStorage.setItem(labelPrefKey, next); } catch { /* private mode — session-only, not fatal */ }
      return next;
    });
  };

  const [manuallyAddedEventIds, setManuallyAddedEventIds] = useState(new Set());
  const [showAddEventMenu, setShowAddEventMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [attendingOnly, setAttendingOnly] = useState(false);

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Always read-only while collaborating — the canvas (tables, assets,
  // seating layout) is fully visible, but drag, assign, delete, rename,
  // and auto-allocate are all disabled: the admin key 403s updating/
  // deleting an owner-scoped Table/Guest regardless of the 'edit' bit, so
  // there's no working write path to gate on yet (same reasoning as every
  // other newly-wired page — see BASE44_PLATFORM_NOTES.md).
  const readOnly = isCollaborating;

  useEffect(() => { loadData(); }, [isCollaborating]);

  // Escape clears the seat selection (leaves the table itself selected —
  // clicking empty canvas or the panel's "Deselect table" button is the
  // way to clear the table too).
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedSeatIndex(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Seating`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          setGuests(data.Guest || []);
          setTables((data.Table || []).map(t => ({ ...t, assigned_guests: t.assigned_guests || [] })));
          setVenueAssets(data.VenueAsset || []);
          setWeddingEvents(getWeddingEvents(data.WeddingDetails));
        }
        setLoading(false);
        return;
      }
      const [guestData, tableData, assetData, weddingDetails] = await Promise.all([
        getMyGuestsWithRsvp('-created_date', 500),
        getMyRecords('Table', '-created_date'),
        getMyRecords('VenueAsset', '-created_date'),
        getMyWeddingDetails().catch(() => null),
      ]);
      setGuests(guestData);
      setTables(tableData.map(t => ({ ...t, assigned_guests: t.assigned_guests || [] })));
      setVenueAssets(assetData);
      setWeddingEvents(getWeddingEvents(weddingDetails));
    } catch { toast.error('Failed to load seating data'); }
    setLoading(false);
  };

  /* ── Event tabs ──
     A Table/VenueAsset with no event_id at all is pre-migration data —
     treated as Reception everywhere, same fallback the migration script's
     own header documents as the real safety net for any account this
     session's migration run never touched. */
  const resolveEventId = (row) => row.event_id || RECEPTION_EVENT_ID;

  const eventIdsWithLayout = useMemo(() => {
    const ids = new Set();
    for (const t of tables) ids.add(resolveEventId(t));
    for (const a of venueAssets) ids.add(resolveEventId(a));
    return ids;
  }, [tables, venueAssets]);

  const visibleEventTabs = useMemo(() => {
    const reception = weddingEvents.find(e => e.event_id === RECEPTION_EVENT_ID)
      || { event_id: RECEPTION_EVENT_ID, name: 'Reception', isMain: true };
    const others = weddingEvents.filter(e =>
      e.event_id !== RECEPTION_EVENT_ID && (eventIdsWithLayout.has(e.event_id) || manuallyAddedEventIds.has(e.event_id))
    );
    return [reception, ...others];
  }, [weddingEvents, eventIdsWithLayout, manuallyAddedEventIds]);

  const addableEvents = useMemo(
    () => weddingEvents.filter(e => !visibleEventTabs.some(v => v.event_id === e.event_id)),
    [weddingEvents, visibleEventTabs]
  );

  const activeEvent = visibleEventTabs.find(e => e.event_id === activeEventId)
    || { event_id: RECEPTION_EVENT_ID, name: 'Reception', isMain: true };

  const switchEvent = (eventId) => {
    setActiveEventId(eventId);
    setSelectedTableId(null);
    setSelectedSeatIndex(null);
    setTableGuestSearch('');
    setShowAddEventMenu(false);
    setShowCopyMenu(false);
  };

  const handleAddEventTab = (eventId) => {
    setManuallyAddedEventIds(prev => new Set(prev).add(eventId));
    switchEvent(eventId);
  };

  /* ── This event's tables/assets — everything below the tab bar reads
     these, never the full unfiltered arrays. ── */
  const eventTables = useMemo(() => tables.filter(t => resolveEventId(t) === activeEventId), [tables, activeEventId]);

  // Re-measure on every commit (zoom changes re-render, and an ancestor
  // transform change fires no observer), guarded so it can't loop. The
  // ResizeObserver covers the other direction: a viewport resize that
  // relays out the canvas without re-rendering this component.
  React.useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const read = () => {
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      setRenderScale(prev => (Math.abs(prev - w / CANVAS_W) > 0.001 ? w / CANVAS_W : prev));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Least-informative form actually in use across the seats on screen — the
  // toggle has to describe what the couple is looking at, so if any seat has
  // fallen back to initials the label says so rather than claiming full
  // names are showing. Computed from the same per-name measurement the seats
  // themselves use, so the two can't disagree.
  const activeLabelForm = useMemo(() => {
    let worst = 0;
    for (const t of eventTables) {
      const avail = availableLabelPx(t.shape, t.capacity, renderScale);
      for (const a of (t.assigned_guests || [])) {
        // attendees: a seated plus-one's name has to be measured too, or the
        // label form is chosen for a subset of the names actually rendered.
        const g = eventAttendees.find(x => x.id === a.guest_id);
        if (!g) continue;
        const idx = LABEL_FORMS.indexOf(labelForName(g.name, avail).form);
        if (idx > worst) worst = idx;
        if (worst === LABEL_FORMS.length - 1) return LABEL_FORMS[worst];
      }
    }
    return LABEL_FORMS[worst];
  }, [eventTables, guests, renderScale]);
  const eventAssets = useMemo(() => venueAssets.filter(a => resolveEventId(a) === activeEventId), [venueAssets, activeEventId]);

  /* ── Copy layout — tables only, never guest assignments (decision #3).
     Only offered into an empty tab; never overwrites. ── */
  const copyableSources = useMemo(
    () => visibleEventTabs.filter(e => e.event_id !== activeEventId && tables.some(t => resolveEventId(t) === e.event_id)),
    [visibleEventTabs, activeEventId, tables]
  );
  const canCopyLayout = eventTables.length === 0 && copyableSources.length > 0;

  const handleCopyLayout = async (sourceEventId) => {
    setShowCopyMenu(false);
    const sourceTables = tables.filter(t => resolveEventId(t) === sourceEventId);
    if (sourceTables.length === 0) return;
    const tid = toast.loading('Copying layout…');
    try {
      const created = await Promise.all(sourceTables.map(t => Table.create({
        name: t.name, capacity: t.capacity, shape: t.shape,
        x: t.x, y: t.y, rotation: t.rotation || 0,
        assigned_guests: [], event_id: activeEventId,
      })));
      setTables(prev => [...prev, ...created.map(t => ({ ...t, assigned_guests: [] }))]);
      toast.success(`Copied ${created.length} table${created.length !== 1 ? 's' : ''} — add guests for ${activeEvent.name} from here`, { id: tid, duration: 5000 });
    } catch { toast.error('Failed to copy layout', { id: tid }); }
  };

  /* ── Guest pool for this event (decision #1) — invited AND (yes OR
     pending); declined and not-invited are excluded outright, not just
     filtered. "Attending only" narrows to yes, for late-stage cleanup. ── */
  const eventPool = useMemo(() => {
    return guests
      .map(g => ({ guest: g, response: getGuestEventResponse(g, activeEvent) }))
      .filter(({ response }) => response.invited && (response.status === 'yes' || response.status === 'pending'))
      .filter(({ response }) => !attendingOnly || response.status === 'yes');
  }, [guests, activeEvent, attendingOnly]);

  /**
   * Everyone who can hold a seat at THIS event, as attendees — the one
   * population the whole page counts, filters and seats from.
   *
   * Two sources, matching the precedence measured across the 202 live records:
   * the flat Guest fields are authoritative for whether a plus-one EXISTS
   * (resolveAttendees), and `event_responses[].plus_ones` is the per-event
   * GRANT. Model 2 was measured to be a strict subset of model 1 — it never
   * names someone the flat fields do not — so a plus-one appears here only at
   * the events they were actually granted, which is what the comment on
   * PlusOnesLine has always said: "an event can grant a +1 the couple didn't
   * grant elsewhere, or vice versa".
   */
  const eventAttendees = useMemo(() => {
    const out = [];
    for (const { guest, response } of eventPool) {
      const resolved = resolveAttendees([guest]);
      const primary = resolved.find(a => !a.isPlusOne);
      const plusOne = resolved.find(a => a.isPlusOne);
      if (primary) out.push(primary);
      if (plusOne && (response.plus_ones || 0) > 0) out.push(plusOne);
    }
    return out;
  }, [eventPool]);

  /* ── Stats — scoped to this event's tables and this event's pool ── */
  const assignedGuestIds = useMemo(
    () => new Set(eventTables.flatMap(t => (t.assigned_guests || []).map(g => g.guest_id))),
    [eventTables],
  );

  const stats = useMemo(() => {
    const totalSeats = eventTables.reduce((s, t) => s + (t.capacity || 0), 0);
    // ONE population for all four numbers. Previously `guests` counted
    // primaries + plus-ones while `assigned`, `unassigned` and `pct` counted
    // primaries only — so a couple could seat everyone, read 100% complete, and
    // still see the guest count exceed the assigned count. Plus-ones could not
    // be seated at all then; they can now, so the denominator is the whole
    // population.
    const total = eventAttendees.length;
    const assigned = eventAttendees.filter(a => assignedGuestIds.has(a.id)).length;
    const unassigned = Math.max(0, total - assigned);
    const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
    return { tables: eventTables.length, seats: totalSeats, guests: total, assigned, unassigned, pct };
  }, [eventTables, eventAttendees, assignedGuestIds]);

  /* ── Drag & drop canvas ── */
  const handleItemMouseDown = (e, id, type) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    dragMovedRef.current = false;
    const collection = type === 'table' ? tablesRef.current : venueAssetsRef.current;
    const item = collection.find(i => i.id === id);
    if (!item) return;
    setDraggingItem({ id, type, startX: item.x || 50, startY: item.y || 50, mouseX: e.clientX, mouseY: e.clientY });
  };

  const handleCanvasMouseMove = (e) => {
    if (!draggingItem) return;
    dragMovedRef.current = true;
    const dx = (e.clientX - draggingItem.mouseX) / zoom;
    const dy = (e.clientY - draggingItem.mouseY) / zoom;
    const newX = Math.max(0, Math.min(CANVAS_W - 100, draggingItem.startX + dx));
    const newY = Math.max(0, Math.min(CANVAS_H - 100, draggingItem.startY + dy));
    if (draggingItem.type === 'table') {
      setTables(prev => prev.map(t => t.id === draggingItem.id ? { ...t, x: newX, y: newY } : t));
    } else {
      setVenueAssets(prev => prev.map(a => a.id === draggingItem.id ? { ...a, x: newX, y: newY } : a));
    }
  };

  const handleCanvasMouseUp = async () => {
    if (!draggingItem) return;
    const { id, type } = draggingItem;
    const moved = dragMovedRef.current;

    if (moved) {
      const collection = type === 'table' ? tablesRef.current : venueAssetsRef.current;
      const item = collection.find(i => i.id === id);
      if (item) {
        try {
          if (type === 'table') await Table.update(id, { x: item.x, y: item.y });
          else await VenueAsset.update(id, { x: item.x, y: item.y });
        } catch {
          toast.error('Failed to save position. Please try again.');
        }
      }
    } else if (type === 'table') {
      // A table-body click (not a seat click) — no specific seat was
      // targeted, so any existing seat selection no longer applies.
      setSelectedTableId(prev => prev === id ? null : id);
      setSelectedSeatIndex(null);
    }
    setDraggingItem(null);
  };

  /* ── Table / asset CRUD — every new row tagged with the active event ── */
  const handleAddTable = async (cfg) => {
    try {
      const t = await Table.create({ ...cfg, x: 100 + Math.random() * 200, y: 100 + Math.random() * 200, assigned_guests: [], event_id: activeEventId });
      setTables(prev => [...prev, { ...t, assigned_guests: [] }]);
      setShowAddTable(false);
      toast.success('Table added');
    } catch { toast.error('Failed to add table'); }
  };

  const handleRenameTable = async (tableId, name) => {
    const trimmed = name.trim();
    if (!trimmed) { setRenamingTableId(null); return; }
    const prevName = tables.find(t => t.id === tableId)?.name;
    setRenamingTableId(null);
    if (trimmed === prevName) return;
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, name: trimmed } : t));
    try {
      await Table.update(tableId, { name: trimmed });
      // Keep every seated guest's cached table_assignment (what the guest
      // list's Table column reads) in step with the rename — Reception
      // only, see tableAssignment.js's file header.
      await propagateTableRename({ tableId, newName: trimmed, tables });
    } catch {
      toast.error('Failed to rename table');
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, name: prevName } : t)); // rollback
    }
  };

  const handleAddAsset = async (cfg) => {
    try {
      const a = await VenueAsset.create({ name: cfg.name, type: cfg.type, width: cfg.width, height: cfg.height, x: 200 + Math.random() * 300, y: 150 + Math.random() * 200, event_id: activeEventId });
      setVenueAssets(prev => [...prev, a]);
    } catch { toast.error('Failed to add asset'); }
  };

  const handleDeleteItem = async (id, type) => {
    let confirmMsg = `Delete this ${type}?`;
    if (type === 'table') {
      const table = tables.find(t => t.id === id);
      const seated = table?.assigned_guests?.length || 0;
      confirmMsg = seated > 0
        ? `Delete "${table.name}"? This will unassign ${seated} guest${seated === 1 ? '' : 's'} from their seat${seated === 1 ? '' : 's'}.`
        : `Delete "${table?.name || 'this table'}"?`;
    }
    if (!window.confirm(confirmMsg)) return;
    try {
      if (type === 'table') {
        await Table.delete(id);
        setTables(prev => prev.filter(t => t.id !== id));
        if (selectedTableId === id) { setSelectedTableId(null); setSelectedSeatIndex(null); }
      } else {
        await VenueAsset.delete(id);
        setVenueAssets(prev => prev.filter(a => a.id !== id));
      }
      toast.success(`${type === 'table' ? 'Table' : 'Asset'} deleted`);
    } catch { toast.error('Failed to delete'); }
  };

  /* ── Export layout (image) + name/table list, as one PDF ──
     Reuses the same html2canvas + jsPDF pattern already established by
     WeddingDayTimelineBuilder.jsx's "Print PDF" — no new export mechanism,
     just applied to the seating canvas. Zoom is reset to 100% for the
     capture (and restored after) so the exported image reflects the
     canvas's real layout, not whatever zoom level the couple happened to
     be looking at. */
  const handleExportSeating = async () => {
    if (!canvasRef.current || eventTables.length === 0) return;
    setIsExporting(true);
    const priorZoom = zoom;
    setZoom(1);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      await new Promise(r => setTimeout(r, 80));
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const eventLabel = activeEvent?.name || 'Seating chart';

      pdf.setFontSize(16); pdf.setTextColor(10, 10, 10);
      pdf.text(eventLabel, 10, 14);
      pdf.setFontSize(9); pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated ${new Date().toLocaleDateString()}`, 10, 20);
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      const y = 26;
      const ratio = imgH > pageH - y - 10 ? (pageH - y - 10) / imgH : 1;
      pdf.addImage(imgData, 'PNG', 10, y, imgW * ratio, imgH * ratio);

      // Page 2 — plain text list of names + table arrangement, so the
      // layout is usable without squinting at the floor-plan image.
      // ATTENDEES, not Guest records: this is page 2 of the exported PDF, the
      // plain-text table arrangement the venue actually works from. A seated
      // plus-one has a synthetic id with no Guest record, so passing `guests`
      // here would drop them from the printed chart silently.
      const tablesWithGuests = buildTablesWithGuests(eventTables, resolveAttendees(guests));
      pdf.addPage();
      pdf.setFontSize(16); pdf.setTextColor(10, 10, 10);
      pdf.text(`${eventLabel} — table arrangement`, 10, 14);
      let cursorY = 26;
      const lineH = 6;
      const pageBottom = pageH - 14;
      for (const t of tablesWithGuests) {
        if (cursorY > pageBottom - lineH) { pdf.addPage(); cursorY = 20; }
        pdf.setFontSize(12); pdf.setTextColor(10, 10, 10);
        pdf.text(t.name, 10, cursorY);
        cursorY += lineH;
        pdf.setFontSize(10); pdf.setTextColor(80, 80, 80);
        for (const g of t.guests) {
          if (cursorY > pageBottom) { pdf.addPage(); cursorY = 20; }
          pdf.text(`  •  ${g.name}`, 10, cursorY);
          cursorY += lineH - 1;
        }
        cursorY += 3;
      }
      if (tablesWithGuests.length === 0) {
        pdf.setFontSize(11); pdf.setTextColor(120, 120, 120);
        pdf.text('No guests assigned to a table yet.', 10, cursorY);
      }

      pdf.save(`seating-chart-${eventLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('Seating chart exported');
    } catch {
      toast.error('Failed to export seating chart');
    }
    setZoom(priorZoom);
    setIsExporting(false);
  };

  /* ── Import venue layout ── */
  const handleImportLayout = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type and size before uploading
    const validationError = validateUploadFile(file, 'image');
    if (validationError) {
      toast.error(validationError);
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const uploadFn = base44?.integrations?.Core?.UploadFile;
      if (!uploadFn) throw new Error('not_supported');
      const { file_url } = await uploadFn({ file });
      setVenueImageUrl(file_url);
      toast.success('Venue layout imported');
    } catch (err) {
      if (err?.message === 'not_supported') {
        toast.error('Image upload not supported yet');
      } else {
        toast.error('Failed to upload image');
      }
    }
    setUploadingImage(false);
  };

  /* ── Seat interactions ──
     Clicking a seat selects it (exactly one seat selected at a time —
     clicking another seat, even at a different table, moves the
     selection here). Assigning a guest from the right panel while a seat
     is selected fills that specific seat, not just "next empty seat". */
  const handleSeatClick = (tableId, seatIndex, guestId) => {
    setSelectedTableId(tableId);
    setSelectedSeatIndex(seatIndex);
    // Read-only: selecting a seat to see who's there is still fine (pure
    // view), but never offer to unassign — see handleSeatClickReadOnly.
    if (readOnly) return;
    if (guestId && window.confirm('Unassign this guest from their seat?')) {
      handleUnassignGuest(tableId, seatIndex, guestId);
    }
  };

  // Writes go through src/lib/tableAssignment.js — the single write path. The
  // Table.update/Guest.update pair, the Reception-only cache scoping and the
  // already-seated rule all live there now; this renders the outcome.
  const handleAssignGuest = async (tableId, seatIndex, guestId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    try {
      const res = await assignGuestToSeat({ guestId, tableId, seatIndex, tables });
      if (!res.ok) {
        // Same message as before the consolidation, from the lib's result.
        if (res.reason === 'already-seated-in-event') {
          const g = eventAttendees.find(x => x.id === guestId);
          toast.error(`${g ? g.name : 'Guest'} is already at ${res.tableName} for ${activeEvent.name}`);
        }
        return;
      }
      await loadData();
      toast.success('Guest assigned');
    } catch { toast.error('Failed to assign guest'); }
  };

  const handleUnassignGuest = async (tableId, seatIndex, guestId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    try {
      await unassignSeat({ guestId, tableId, seatIndex, tables });
      await loadData();
      toast.success('Guest unassigned');
    } catch { toast.error('Failed to unassign guest'); }
  };

  /* ── Right panel guest click ── */
  // Takes an ATTENDEE. Everything below reads only .id and .name, which a
  // plus-one has, and the two conflict checks were already pure id comparisons
  // — so clicking a plus-one seats them with no further change.
  const handleGuestPanelClick = async (attendee) => {
    const guest = attendee;
    if (!selectedTableId) { toast.error('Select a table first'); return; }
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;

    const atThisTable = (table.assigned_guests || []).find(a => a.guest_id === guest.id);
    if (atThisTable) {
      if (window.confirm(`Unassign ${guest.name} from ${table.name}?`)) {
        await handleUnassignGuest(selectedTableId, atThisTable.seat_index, guest.id);
      }
      return;
    }

    // Check if assigned elsewhere WITHIN THIS EVENT — a guest can be at a
    // different table for a different event, that's not a conflict, only
    // two seats at once for the SAME event is.
    const allAssignments = eventTables.flatMap(t => (t.assigned_guests || []).map(a => ({ ...a, tableId: t.id, tableName: t.name })));
    const elsewhere = allAssignments.find(a => a.guest_id === guest.id && a.tableId !== selectedTableId);
    if (elsewhere) { toast.error(`${guest.name} is already at ${elsewhere.tableName} for ${activeEvent.name}`); return; }

    // Prefer the specifically selected seat, if one is selected and still
    // empty — assigning from the panel with a seat selected fills that
    // seat. Otherwise (no seat selected, or it filled up in the meantime)
    // fall back to the first empty seat.
    const usedSeats = new Set((table.assigned_guests || []).map(a => a.seat_index));
    let seatToFill = null;
    if (selectedSeatIndex !== null && selectedSeatIndex < table.capacity && !usedSeats.has(selectedSeatIndex)) {
      seatToFill = selectedSeatIndex;
    } else {
      for (let i = 0; i < table.capacity; i++) { if (!usedSeats.has(i)) { seatToFill = i; break; } }
    }
    if (seatToFill === null) { toast.error(`${table.name} is full`); return; }

    await handleAssignGuest(selectedTableId, seatToFill, guest.id);
  };

  /* ── AI seating apply — scoped to this event's tables and guest pool ── */
  const handleApplyAISeating = async (plan) => {
    const tid = toast.loading("Applying Ava's seating plan…");
    try {
      // Filtering to the event pool stays here: it is a policy about which
      // guests this page may seat, not about how a seat is written.
      // ATTENDEE ids, so a synthetic plus-one id in the plan survives
      // validation. Built from eventAttendees rather than eventPool: with Guest
      // ids only, every plus-one the AI placed was filtered out here — silently,
      // before reaching the write path — and applying a plan left them unseated.
      //
      // This stays a whitelist. The AI is not trusted to invent ids; it can only
      // seat people who are actually in this event's population.
      const validGuestIds = new Set(eventAttendees.map(a => a.id));
      const { ok, err } = await applyEventSeatingPlan({
        assignments: validatePlanAssignments(plan.assignments, validGuestIds),
        tables: eventTables,
        eventId: activeEventId,
      });
      await loadData();
      toast.success(`${ok} guests assigned${err > 0 ? `, ${err} errors` : ''}`, { id: tid, duration: 5000 });
    } catch { toast.error('Failed to apply plan', { id: tid }); throw new Error(); }
  };

  /* ── Right panel filtered list — drawn from this event's pool, not the whole guest list ── */
  /**
   * The panel list, one row per ATTENDEE. Each row carries:
   *   attendee — who the row is for, and the id written into
   *              Table.assigned_guests when they are seated
   *   guest    — the source Guest RECORD, which for a plus-one is their HOST's.
   *              Host-level context only (avatar, tags, event chip); never the
   *              plus-one's own name or dietary, which come off the attendee.
   *   response — the host's per-event response, for the event chip
   */
  const filteredGuests = useMemo(() => {
    const byHostId = new Map(eventPool.map(p => [p.guest.id, p]));
    let list = eventAttendees.map(a => {
      const src = byHostId.get(a.isPlusOne ? a.hostGuestId : a.id);
      return { attendee: a, guest: src ? src.guest : null, response: src ? src.response : null };
    }).filter(r => r.guest);
    if (guestFilter === 'unassigned') list = list.filter(({ attendee }) => !assignedGuestIds.has(attendee.id));
    if (guestFilter === 'assigned') list = list.filter(({ attendee }) => assignedGuestIds.has(attendee.id));
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      list = list.filter(({ attendee }) => attendee.name?.toLowerCase().includes(q)
        || attendee.dietary_restrictions?.toLowerCase().includes(q));
    }
    return list;
  }, [eventAttendees, eventPool, guestFilter, guestSearch, assignedGuestIds]);

  /**
   * The same attendee+host rows the right-hand panel uses, unfiltered — the
   * selected-table panel has its own search and assigned filter and applies
   * them itself. Shared so the two clickable lists can never disagree about
   * who exists.
   */
  const filteredForTablePanel = useMemo(() => {
    const byHostId = new Map(eventPool.map(p => [p.guest.id, p]));
    return eventAttendees.map(a => {
      const src = byHostId.get(a.isPlusOne ? a.hostGuestId : a.id);
      return { attendee: a, guest: src ? src.guest : null, response: src ? src.response : null };
    }).filter(r => r.guest);
  }, [eventAttendees, eventPool]);

  const selectedTable = eventTables.find(t => t.id === selectedTableId);

  const STAT_CARDS = [
    { label: 'Tables',     value: stats.tables },
    { label: 'Total seats',value: stats.seats },
    { label: 'Guests',     value: stats.guests },
    { label: 'Assigned',   value: stats.assigned },
    { label: 'Unassigned', value: stats.unassigned },
    { label: 'Complete',   value: stats.pct, suffix: '%' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Seating" subtitle="Design your venue layout and assign guests to tables" />

      {/* AUDIT_2026-07.md S19: the layout canvas + side panels need far more
          width than a phone provides — this is a notice, not a redesign. */}
      <div className="lg:hidden flex" style={{ alignItems: 'center', gap: 10, padding: '14px 24px', background: 'rgba(224,53,83,0.05)', borderBottom: '1px solid rgba(224,53,83,0.15)' }}>
        <Monitor size={16} style={{ color: '#E03553', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', fontFamily: PJS }}>
          Seating is best viewed on a larger screen — the layout tools need more room than a phone provides.
        </span>
      </div>

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={statLabel}>{s.label}</p>
            {loading
              ? <div style={{ width: 48, height: 28, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValue}><CountUp to={s.value} suffix={s.suffix || ''} /></p>
            }
          </div>
        ))}
      </div>

      {/* Event tabs (PR6) — Reception is always first and can't be removed;
          other tabs appear once they have layout, or once added below. */}
      {visibleEventTabs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '0 32px', position: 'relative' }}>
          {visibleEventTabs.map(ev => (
            <button
              key={ev.event_id}
              onClick={() => switchEvent(ev.event_id)}
              style={{
                padding: '13px 0', marginRight: 28, fontSize: 13, fontWeight: 600,
                fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
                color: activeEventId === ev.event_id ? '#E03553' : '#444444',
                borderBottom: activeEventId === ev.event_id ? '2px solid #E03553' : '2px solid transparent',
                transition: 'color 0.12s',
              }}
            >
              {ev.name}
            </button>
          ))}
          {/* No marginBottom here. The strip is alignItems:'center' and the
              tab buttons are padding:'13px 0' with a 2px bottom border, so
              the button centers itself against the labels; the 8px bottom
              margin this used to carry was what lifted it off that line.
              Measured shift was 4px, not 8 — flex centering absorbs half the
              margin, so the visible error is half what the value suggests. */}
          {!readOnly && addableEvents.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAddEventMenu(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#444444', fontFamily: PJS, background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, padding: '4px 10px', cursor: 'pointer' }}
              >
                <Plus size={11} /> Add event
              </button>
              {showAddEventMenu && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.12)', boxShadow: '0 8px 24px rgba(10,10,10,0.12)', zIndex: 50, minWidth: 180 }}>
                  {addableEvents.map(ev => (
                    <button
                      key={ev.event_id}
                      onClick={() => handleAddEventTab(ev.event_id)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {ev.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ava button + copy layout */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <AvaButton label="Ask Ava to arrange your seating plan" onClick={() => setAvaOpen(true)} />
        {!readOnly && (
          <div style={{ position: 'relative' }} title={!canCopyLayout && eventTables.length > 0 ? `${activeEvent.name} already has tables — copy layout is only offered into an empty event` : undefined}>
            <button
              onClick={() => canCopyLayout && setShowCopyMenu(v => !v)}
              disabled={!canCopyLayout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, fontFamily: PJS,
                color: canCopyLayout ? '#0A0A0A' : 'rgba(10,10,10,0.3)',
                background: 'transparent', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999,
                padding: '6px 14px', cursor: canCopyLayout ? 'pointer' : 'not-allowed',
              }}
            >
              <Copy size={12} /> Copy layout from…
            </button>
            {showCopyMenu && canCopyLayout && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.12)', boxShadow: '0 8px 24px rgba(10,10,10,0.12)', zIndex: 50, minWidth: 180 }}>
                {copyableSources.map(ev => (
                  <button
                    key={ev.event_id}
                    onClick={() => handleCopyLayout(ev.event_id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {ev.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px 48px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: zoom <= MIN_ZOOM ? 0.4 : 1 }}
            >
              <ZoomOut size={12} style={{ color: '#0A0A0A' }} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#444444', fontFamily: PJS, minWidth: 36, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: zoom >= MAX_ZOOM ? 0.4 : 1 }}
            >
              <ZoomIn size={12} style={{ color: '#0A0A0A' }} />
            </button>
            <button
              onClick={() => setZoom(1)}
              style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#444444' }}
            >
              <RotateCcw size={10} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: PJS }}>Reset</span>
            </button>

            {/* Seat labels toggle. When names are on but the measured space
                per seat has degraded them, the label says which tier is
                actually showing — a couple who switched names on and sees
                initials needs to know that is the zoom, not a broken
                setting. */}
            <button
              onClick={toggleLabelMode}
              aria-pressed={labelMode === 'names'}
              title={labelMode === 'names'
                ? 'Showing guest names on seats. Hover a seat for the full name at any zoom.'
                : 'Showing initials on seats. Hover a seat for the full name.'}
              style={{
                marginLeft: 10, display: 'flex', alignItems: 'center', gap: 5,
                borderRadius: 999, padding: '4px 12px', cursor: 'pointer', fontFamily: PJS,
                fontSize: 11, fontWeight: 600,
                border: '1px solid rgba(10,10,10,0.15)',
                background: labelMode === 'names' ? 'rgba(224,53,83,0.08)' : 'transparent',
                color: labelMode === 'names' ? '#E03553' : '#444444',
              }}
            >
              <Users size={11} />
              {labelMode === 'names'
                ? (activeLabelForm.key === 'full'
                    ? 'Names'
                    : `Names · ${activeLabelForm.label} at this zoom`)
                : 'Initials'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleExportSeating}
              disabled={isExporting || eventTables.length === 0}
              className="btn-editorial-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: eventTables.length === 0 ? 0.4 : 1 }}
            >
              <Download size={13} />
              {isExporting ? 'Exporting…' : 'Export'}
            </button>
            {/* btn-primary, not a hand-rolled copy of it. The inline style
                this replaces was already #E03553 on white — it was trying to
                be the primary button and missed on every axis: 8px/16px
                padding against the standard 6px/14px, 14px type against 12px,
                and weight 500 against 600, so it sat oversized AND lighter
                than Export beside it. The class also restores the hover
                state it never had. */}
            {!readOnly && (
              <button onClick={() => setShowAIGenerator(true)} className="btn-primary">
                Auto-allocate seats
              </button>
            )}
          </div>
        </div>

        {/* ── Three-panel layout ── */}
        <div style={{ display: 'flex', border: '1px solid rgba(10,10,10,0.08)', height: 650 }}>

          {/* Left: Layout items */}
          <div style={{ width: 200, borderRight: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
            <VenueAssetLibrary
              onAddTable={() => setShowAddTable(true)}
              onAddAsset={handleAddAsset}
              onImportLayout={handleImportLayout}
              uploadingImage={uploadingImage}
              readOnly={readOnly}
            />
          </div>

          {/* Centre: Canvas */}
          <div
            style={{ flex: 1, position: 'relative', overflow: 'auto', cursor: draggingItem ? 'grabbing' : 'default' }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transformOrigin: 'top left',
                transform: `scale(${zoom})`,
                position: 'relative',
                ...(venueImageUrl
                  ? { backgroundImage: `url(${venueImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { backgroundImage: `radial-gradient(circle, rgba(10,10,10,0.13) ${gridDotPx}px, transparent ${gridDotPx}px)`, backgroundSize: `${gridPitchPx}px ${gridPitchPx}px`, backgroundColor: '#FAFAFA' }
                ),
              }}
              onClick={(e) => { if (e.target === e.currentTarget) { setSelectedTableId(null); setSelectedSeatIndex(null); } }}
            >
              {/* Semi-transparent overlay when venue image loaded */}
              {venueImageUrl && (
                /* Same zoom derivation as the no-image grid above. This
                   overlay is the easier of the two to miss and the worse
                   of the two when missed: a 1px dot at 8% alpha rendered
                   at 0.4 screen px was invisible well before the other. */
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, rgba(10,10,10,0.08) ${+(1 / zoom).toFixed(2)}px, transparent ${+(1 / zoom).toFixed(2)}px)`, backgroundSize: `${gridPitchPx}px ${gridPitchPx}px`, pointerEvents: 'none' }} />
              )}

              {/* Tables — this event's only */}
              {eventTables.map(table => (
                <div
                  key={`t-${table.id}`}
                  style={{ position: 'absolute', left: table.x || 50, top: table.y || 50, cursor: draggingItem?.id === table.id ? 'grabbing' : 'grab', userSelect: 'none' }}
                  onMouseDown={e => handleItemMouseDown(e, table.id, 'table')}
                  onMouseEnter={() => handleItemHoverStart(`t-${table.id}`)}
                  onMouseLeave={handleItemHoverEnd}
                >
                  <VisualTable
                    table={table}
                    /* ATTENDEES: VisualTable resolves each seat by
                       assigned_guests[].guest_id, and a plus-one's synthetic id
                       has no Guest record to match. */
                    guests={eventAttendees}
                    onSeatClick={handleSeatClick}
                    selected={selectedTableId === table.id}
                    selectedSeatIndex={selectedTableId === table.id ? selectedSeatIndex : null}
                    labelMode={labelMode}
                    renderScale={renderScale}
                  />
                  {/* Delete button — outside the table's own footprint (matches the
                      asset delete button below) and only appears after a brief hover
                      delay, so reaching for the drag handle doesn't pop a destructive
                      control on every stray hover. */}
                  {!readOnly && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteItem(table.id, 'table'); }}
                      aria-label="Delete table"
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#E03553', border: '2px solid #FFFFFF', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10,
                        opacity: deleteHoverId === `t-${table.id}` ? 1 : 0,
                        pointerEvents: deleteHoverId === `t-${table.id}` ? 'auto' : 'none',
                        transition: 'opacity 0.12s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      }}
                    >
                      <Trash2 size={10} style={{ color: '#FFFFFF' }} />
                    </button>
                  )}
                </div>
              ))}

              {/* Assets — this event's only */}
              {eventAssets.map(asset => (
                <div
                  key={`a-${asset.id}`}
                  style={{ position: 'absolute', left: asset.x || 50, top: asset.y || 50, cursor: draggingItem?.id === asset.id ? 'grabbing' : 'grab', userSelect: 'none' }}
                  onMouseDown={e => handleItemMouseDown(e, asset.id, 'asset')}
                  onMouseEnter={() => handleItemHoverStart(`a-${asset.id}`)}
                  onMouseLeave={handleItemHoverEnd}
                >
                  <VisualAsset asset={asset} />
                  {!readOnly && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteItem(asset.id, 'asset'); }}
                      aria-label="Delete item"
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#E03553', border: '2px solid #FFFFFF', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10,
                        opacity: deleteHoverId === `a-${asset.id}` ? 1 : 0,
                        pointerEvents: deleteHoverId === `a-${asset.id}` ? 'auto' : 'none',
                        transition: 'opacity 0.12s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      }}
                    >
                      <Trash2 size={10} style={{ color: '#FFFFFF' }} />
                    </button>
                  )}
                </div>
              ))}

              {/* Empty state */}
              {eventTables.length === 0 && eventAssets.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px dashed rgba(10,10,10,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Users size={20} style={{ color: 'rgba(10,10,10,0.2)' }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>Add tables from the left panel</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.2)', fontFamily: PJS, margin: '4px 0 0' }}>
                    {canCopyLayout ? 'Or copy a layout from another event, above' : 'Drag tables and assets to arrange your venue'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Guest panel */}
          <div style={{ width: 260, borderLeft: '1px solid rgba(10,10,10,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {selectedTable ? (
              /* ── TABLE DETAIL MODE ── */
              <>
                {/* Table header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                    {readOnly ? (
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedTable.name}
                      </span>
                    ) : renamingTableId === selectedTable.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameTable(selectedTable.id, renameValue)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleRenameTable(selectedTable.id, renameValue); }
                          if (e.key === 'Escape') setRenamingTableId(null);
                        }}
                        style={{
                          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#0A0A0A',
                          fontFamily: PJS, border: 'none',
                          borderBottom: '1.5px solid #E03553', background: 'transparent', outline: 'none', padding: '0 0 1px',
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => { setRenamingTableId(selectedTable.id); setRenameValue(selectedTable.name); }}
                        title="Click to rename"
                        style={{
                          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, textAlign: 'left',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', margin: '-2px -4px',
                          borderRadius: 3,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedTable.name}
                        </span>
                        <Pencil size={11} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />
                      </button>
                    )}
                    <button onClick={() => { setSelectedTableId(null); setSelectedSeatIndex(null); }}
                      style={{ fontSize: 10, fontWeight: 600, color: '#444444', fontFamily: PJS, border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 999, background: 'rgba(10,10,10,0.06)' }}>
                      ← Back
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#444444', fontFamily: PJS, margin: 0 }}>
                    {(selectedTable.assigned_guests || []).length}/{selectedTable.capacity} seats used — {activeEvent.name}
                  </p>
                  {/* Capacity bar */}
                  <div style={{ height: 3, background: 'rgba(10,10,10,0.08)', marginTop: 8 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, ((selectedTable.assigned_guests || []).length / (selectedTable.capacity || 1)) * 100)}%`, background: 'linear-gradient(90deg, #E03553, #803D81)', transition: 'width 0.3s' }} />
                  </div>
                  {/* Explicit canvas ↔ panel connection while a seat is selected —
                      assigning a guest below fills this exact seat. */}
                  {selectedSeatIndex !== null && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: '8px 0 0' }}>
                      Assigning seat {selectedSeatIndex + 1} of {selectedTable.capacity} — {selectedTable.name}
                    </p>
                  )}
                </div>

                {/* Assigned guests list */}
                <div style={{ flexShrink: 0, maxHeight: 200, overflowY: 'auto', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                  <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                      Assigned ({(selectedTable.assigned_guests || []).length})
                    </span>
                  </div>
                  {(selectedTable.assigned_guests || []).length === 0 ? (
                    <p style={{ fontSize: 11, color: '#444444', fontFamily: PJS, padding: '4px 16px 10px', margin: 0 }}>No guests yet</p>
                  ) : (
                    (selectedTable.assigned_guests || []).map(a => {
                      const g = eventAttendees.find(x => x.id === a.guest_id);
                      if (!g) return null;
                      // Host-level context; null for a plus-one, whose own name,
                      // dietary and seat come off the attendee.
                      const host = g.isPlusOne ? guests.find(x => x.id === g.hostGuestId) : g;
                      const response = host ? getGuestEventResponse(host, activeEvent) : null;
                      return (
                        <div key={a.guest_id} title={((host && host.tags) || []).join(', ')} style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid rgba(10,10,10,0.04)', gap: 8 }}>
                          <GuestAvatar name={g.name} email={g.email} profilePictureUrl={g.isPlusOne ? null : (host && host.profile_picture_url)} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.name}
                            </span>
                            {g.isPlusOne ? (
                              <p style={{ fontSize: 9, color: '#444444', fontFamily: PJS, margin: '1px 0 0' }}>
                                plus one of {host ? host.name : 'a guest'}
                              </p>
                            ) : (
                              <>
                                <PlusOnesLine response={response} />
                                <MiniTags tags={host ? host.tags : []} />
                              </>
                            )}
                          </div>
                          {!readOnly && (
                            <button
                              onClick={() => handleUnassignGuest(selectedTableId, a.seat_index, a.guest_id)}
                              style={{ fontSize: 9, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontWeight: 700, flexShrink: 0, padding: '2px 4px' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add guest search — collaborator view-only never gets an
                    "add to seat" affordance at all, not just a disabled one */}
                {!readOnly && (
                  <>
                    <div style={{ flexShrink: 0, padding: '8px 12px 4px', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 6 }}>
                        Add guest
                      </span>
                      <div style={{ position: 'relative' }}>
                        <Search size={11} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                        <Input
                          placeholder="Search unassigned…"
                          value={tableGuestSearch}
                          onChange={e => setTableGuestSearch(e.target.value)}
                          style={{ paddingLeft: 18, fontSize: 11, height: 28 }}
                        />
                      </div>
                    </div>

                    {/* Unassigned guest list for adding — this event's pool only */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {/* ATTENDEES, so a plus-one can be added to the selected
                          table from here too — this is the second of the two
                          lists a couple can click to seat someone. */}
                      {filteredForTablePanel
                        .filter(({ attendee }) => !assignedGuestIds.has(attendee.id))
                        .filter(({ attendee }) => !tableGuestSearch || attendee.name?.toLowerCase().includes(tableGuestSearch.toLowerCase()))
                        .map(({ attendee, guest, response }) => (
                          <div key={attendee.id}
                            onClick={() => handleGuestPanelClick(attendee)}
                            {...interactiveDivProps(() => handleGuestPanelClick(attendee))}
                            style={{ display: 'flex', alignItems: 'center', padding: '7px 16px', borderBottom: '1px solid rgba(10,10,10,0.04)', cursor: 'pointer', transition: 'background 0.12s', gap: 8 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <GuestAvatar name={attendee.name} email={attendee.isPlusOne ? attendee.email : guest.email} profilePictureUrl={attendee.isPlusOne ? null : guest.profile_picture_url} size={22} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {attendee.name}
                              </p>
                              {attendee.isPlusOne ? (
                                <p style={{ fontSize: 9, color: '#444444', fontFamily: PJS, margin: '1px 0 0' }}>
                                  plus one of {guest.name}
                                </p>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <EventChip event={activeEvent} response={response} />
                                  </div>
                                  <PlusOnesLine response={response} />
                                </>
                              )}
                              {attendee.dietary_restrictions && (
                                <div style={{ marginTop: 2 }}><DietaryCell value={attendee.dietary_restrictions} /></div>
                              )}
                              {!attendee.isPlusOne && <MiniTags tags={guest.tags} />}
                            </div>
                            <span style={{ fontSize: 10, color: '#E03553', fontWeight: 700, fontFamily: PJS, flexShrink: 0 }}>+</span>
                          </div>
                        ))
                      }
                      {filteredForTablePanel.filter(({ attendee }) => !assignedGuestIds.has(attendee.id)).length === 0 && (
                        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                          <p style={{ fontSize: 11, color: '#444444', fontFamily: PJS, margin: 0 }}>All of {activeEvent.name}'s guests are seated</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* ── ALL GUESTS MODE ── */
              <>
                {/* Filter pills */}
                <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {['all', 'unassigned', 'assigned'].map(f => (
                      <Pill key={f} label={f} active={guestFilter === f} onClick={() => setGuestFilter(f)} />
                    ))}
                    <Pill label="attending only" active={attendingOnly} onClick={() => setAttendingOnly(v => !v)} />
                  </div>
                </div>

                {/* Hint */}
                <div style={{ padding: '6px 16px', background: '#F5F5F5', borderBottom: '1px solid rgba(10,10,10,0.06)', flexShrink: 0 }}>
                  <p style={{ fontSize: 10, color: '#444444', fontFamily: PJS, margin: 0 }}>
                    Click a table on the canvas to assign guests — showing {activeEvent.name}'s guests
                  </p>
                </div>

                {/* Search */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(10,10,10,0.06)', flexShrink: 0, position: 'relative' }}>
                  <Search size={11} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                  <Input
                    placeholder="Search guests…"
                    value={guestSearch}
                    onChange={e => setGuestSearch(e.target.value)}
                    style={{ paddingLeft: 22, fontSize: 11, height: 28 }}
                  />
                </div>

                {/* Guest list: Unassigned section then Assigned section */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#444444', fontFamily: PJS, margin: 0 }}>Loading…</p>
                    </div>
                  ) : (() => {
                    const unassigned = filteredGuests.filter(({ attendee }) => !assignedGuestIds.has(attendee.id));
                    const assigned = filteredGuests.filter(({ attendee }) => assignedGuestIds.has(attendee.id));
                    const showUnassigned = guestFilter !== 'assigned';
                    const showAssigned = guestFilter !== 'unassigned';

                    const GuestRow = ({ attendee, guest, response, isAssigned: isAsgn }) => {
                      const isPO = attendee.isPlusOne;
                      const tableName = isAsgn ? getGuestTableName(attendee.id, tables, activeEventId) : null;
                      return (
                        <div
                          key={attendee.id}
                          style={{
                            display: 'flex', alignItems: 'center', padding: '7px 16px', gap: 8,
                            borderBottom: '1px solid rgba(10,10,10,0.04)',
                          }}
                        >
                          <GuestAvatar name={attendee.name} email={isPO ? attendee.email : guest.email} profilePictureUrl={isPO ? null : guest.profile_picture_url} size={24} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {attendee.name}
                            </p>
                            {/* Whose plus-one this is, so a couple can tell at a
                                glance. The event chip and the +N line are
                                host-level facts and stay on the host's row. */}
                            {isPO ? (
                              <p style={{ fontSize: 9, color: '#444444', fontFamily: PJS, margin: '1px 0 0' }}>
                                plus one of {guest.name}
                              </p>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                                  <EventChip event={activeEvent} response={response} />
                                </div>
                                <PlusOnesLine response={response} />
                              </>
                            )}
                            {tableName && (
                              <p style={{ fontSize: 9, color: '#444444', fontFamily: PJS, margin: '1px 0 0' }}>{tableName}</p>
                            )}
                            {attendee.dietary_restrictions && (
                              <div style={{ marginTop: 1 }}><DietaryCell value={attendee.dietary_restrictions} /></div>
                            )}
                            {!isPO && <MiniTags tags={guest.tags} />}
                          </div>
                          {isAsgn && (
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: '#0A1930', fontFamily: PJS, background: '#DDF762', padding: '1px 5px', borderRadius: 999, flexShrink: 0 }}>
                              seated
                            </span>
                          )}
                        </div>
                      );
                    };

                    return (
                      <>
                        {showUnassigned && (
                          <>
                            <div style={{ padding: '8px 16px 4px', background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                                Unassigned ({unassigned.length})
                              </span>
                            </div>
                            {unassigned.length === 0
                              ? <p style={{ fontSize: 11, color: '#444444', fontFamily: PJS, padding: '10px 16px', margin: 0 }}>All guests seated</p>
                              : unassigned.map(({ attendee, guest, response }) => <GuestRow key={attendee.id} attendee={attendee} guest={guest} response={response} isAssigned={false} />)
                            }
                          </>
                        )}
                        {showAssigned && (
                          <>
                            <div style={{ padding: '8px 16px 4px', background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                                Assigned ({assigned.length})
                              </span>
                            </div>
                            {assigned.length === 0
                              ? <p style={{ fontSize: 11, color: '#444444', fontFamily: PJS, padding: '10px 16px', margin: 0 }}>None yet</p>
                              : assigned.map(({ attendee, guest, response }) => <GuestRow key={attendee.id} attendee={attendee} guest={guest} response={response} isAssigned={true} />)
                            }
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

        </div>{/* end three-panel */}
      </div>

      {/* Modals */}
      {showAddTable && (
        <AddTableModal onAdd={handleAddTable} onClose={() => setShowAddTable(false)} />
      )}

      {showAIGenerator && (
        <AISeatingGenerator
          guests={eventPool.map(({ guest }) => guest)}
          tables={eventTables}
          onApplySeating={handleApplyAISeating}
          onClose={() => setShowAIGenerator(false)}
        />
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Seating arrangement specialist"
        systemPrompt="You are Ava, a seating arrangement specialist. Help couples arrange tables, handle family dynamics, and optimise their seating plan."
        quickActions={["Suggest a seating arrangement", "How do I handle divorced parents?", "What table shapes work best?", "Help me group my guests"]}
      />
    </div>
  );
}
