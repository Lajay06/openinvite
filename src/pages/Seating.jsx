import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Guest } from '@/entities/Guest';
import { Table } from '@/entities/Table';
import { VenueAsset } from '@/entities/VenueAsset';
import { base44 } from '@/api/base44Client';
import { Search, Sparkles, Trash2, ZoomIn, ZoomOut, RotateCcw, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

import VisualTable from '../components/seating/VisualTable';
import VisualAsset from '../components/seating/VisualAsset';
import VenueAssetLibrary from '../components/seating/VenueAssetLibrary';
import AddTableModal from '../components/seating/AddTableModal';
import AISeatingGenerator from '../components/seating/AISeatingGenerator';
import AIWeddingAssistant from '../components/shared/AIWeddingAssistant';

/* ── CountUp ── */
function CountUp({ to, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}{suffix}</>;
}

/* ── Filter pill ── */
function Pill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '4px 10px', borderRadius: 999,
        border: active ? '1px solid #0A0A0A' : '1px solid rgba(10,10,10,0.15)',
        background: active ? '#0A0A0A' : hov ? 'rgba(10,10,10,0.04)' : 'transparent',
        color: active ? '#FFFFFF' : '#444444', cursor: 'pointer', transition: 'all 0.13s', whiteSpace: 'nowrap',
      }}
    >{label}</button>
  );
}

const statLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 10 };
const statValue = { fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 };

const CANVAS_W = 1400;
const CANVAS_H = 900;

export default function SeatingPage() {
  const [guests, setGuests] = useState([]);
  const [tables, setTables] = useState([]);
  const [venueAssets, setVenueAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [draggingItem, setDraggingItem] = useState(null);
  const dragMovedRef = useRef(false);
  const tablesRef = useRef(tables);
  const venueAssetsRef = useRef(venueAssets);
  useEffect(() => { tablesRef.current = tables; }, [tables]);
  useEffect(() => { venueAssetsRef.current = venueAssets; }, [venueAssets]);

  const [selectedTableId, setSelectedTableId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const [guestFilter, setGuestFilter] = useState('all');
  const [guestSearch, setGuestSearch] = useState('');

  const [showAddTable, setShowAddTable] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const [venueImageUrl, setVenueImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [guestData, tableData, assetData] = await Promise.all([
        Guest.list('-created_date', 500),
        Table.list('-created_date'),
        VenueAsset.list('-created_date'),
      ]);
      setGuests(guestData.filter(g => g.rsvp_status === 'attending'));
      setTables(tableData.map(t => ({ ...t, assigned_guests: t.assigned_guests || [] })));
      setVenueAssets(assetData);
    } catch { toast.error('Failed to load seating data'); }
    setLoading(false);
  };

  /* ── Stats ── */
  const assignedGuestIds = useMemo(
    () => new Set(tables.flatMap(t => (t.assigned_guests || []).map(g => g.guest_id))),
    [tables],
  );

  const stats = useMemo(() => {
    const totalSeats = tables.reduce((s, t) => s + (t.capacity || 0), 0);
    const pct = guests.length > 0 ? Math.round((assignedGuestIds.size / guests.length) * 100) : 0;
    return { tables: tables.length, seats: totalSeats, guests: guests.length, assigned: assignedGuestIds.size, pct };
  }, [tables, guests, assignedGuestIds]);

  /* ── Drag & drop canvas ── */
  const handleItemMouseDown = (e, id, type) => {
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
        } catch {}
      }
    } else if (type === 'table') {
      setSelectedTableId(prev => prev === id ? null : id);
    }
    setDraggingItem(null);
  };

  /* ── Table / asset CRUD ── */
  const handleAddTable = async (cfg) => {
    try {
      const t = await Table.create({ ...cfg, x: 100 + Math.random() * 200, y: 100 + Math.random() * 200, assigned_guests: [] });
      setTables(prev => [...prev, { ...t, assigned_guests: [] }]);
      setShowAddTable(false);
      toast.success('Table added');
    } catch { toast.error('Failed to add table'); }
  };

  const handleAddAsset = async (cfg) => {
    try {
      const a = await VenueAsset.create({ name: cfg.name, type: cfg.type, width: cfg.width, height: cfg.height, x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 });
      setVenueAssets(prev => [...prev, a]);
    } catch { toast.error('Failed to add asset'); }
  };

  const handleDeleteItem = async (id, type) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'table') {
        await Table.delete(id);
        setTables(prev => prev.filter(t => t.id !== id));
        if (selectedTableId === id) setSelectedTableId(null);
      } else {
        await VenueAsset.delete(id);
        setVenueAssets(prev => prev.filter(a => a.id !== id));
      }
      toast.success(`${type === 'table' ? 'Table' : 'Asset'} deleted`);
    } catch { toast.error('Failed to delete'); }
  };

  /* ── Import venue layout ── */
  const handleImportLayout = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVenueImageUrl(file_url);
      toast.success('Venue layout imported');
    } catch { toast.error('Failed to upload image'); }
    setUploadingImage(false);
  };

  /* ── Seat interactions ── */
  const handleSeatClick = (tableId, seatIndex, guestId) => {
    setSelectedTableId(tableId);
    if (guestId && window.confirm('Unassign this guest from their seat?')) {
      handleUnassignGuest(tableId, seatIndex, guestId);
    }
  };

  const handleAssignGuest = async (tableId, seatIndex, guestId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    try {
      const current = table.assigned_guests || [];
      const updated = [...current.filter(g => g.seat_index !== seatIndex), { guest_id: guestId, seat_index: seatIndex }];
      await Table.update(tableId, { assigned_guests: updated });
      await Guest.update(guestId, { table_assignment: table.name });
      await loadData();
      toast.success('Guest assigned');
    } catch { toast.error('Failed to assign guest'); }
  };

  const handleUnassignGuest = async (tableId, seatIndex, guestId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    try {
      const updated = (table.assigned_guests || []).filter(g => g.seat_index !== seatIndex);
      await Table.update(tableId, { assigned_guests: updated });
      await Guest.update(guestId, { table_assignment: '' });
      await loadData();
      toast.success('Guest unassigned');
    } catch { toast.error('Failed to unassign guest'); }
  };

  /* ── Right panel guest click ── */
  const handleGuestPanelClick = async (guest) => {
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

    // check if assigned elsewhere
    const allAssignments = tables.flatMap(t => (t.assigned_guests || []).map(a => ({ ...a, tableId: t.id, tableName: t.name })));
    const elsewhere = allAssignments.find(a => a.guest_id === guest.id && a.tableId !== selectedTableId);
    if (elsewhere) { toast.error(`${guest.name} is already at ${elsewhere.tableName}`); return; }

    // find next empty seat
    const usedSeats = new Set((table.assigned_guests || []).map(a => a.seat_index));
    let nextSeat = null;
    for (let i = 0; i < table.capacity; i++) { if (!usedSeats.has(i)) { nextSeat = i; break; } }
    if (nextSeat === null) { toast.error(`${table.name} is full`); return; }

    await handleAssignGuest(selectedTableId, nextSeat, guest.id);
  };

  /* ── AI seating apply ── */
  const handleApplyAISeating = async (plan) => {
    const tid = toast.loading('Applying Ava's seating plan…');
    try {
      const validGuestIds = new Set(guests.map(g => g.id));
      await Promise.all(tables.map(t => Table.update(t.id, { assigned_guests: [] })));
      let ok = 0, err = 0;
      for (const a of plan.assignments) {
        const table = tables.find(t => t.id === a.tableId);
        if (!table) { err++; continue; }
        const valid = (a.guests || []).filter(id => validGuestIds.has(id));
        if (valid.length === 0) continue;
        const assigned_guests = valid.map((id, i) => ({ guest_id: id, seat_index: i }));
        try {
          await Table.update(a.tableId, { assigned_guests });
          for (const id of valid) { try { await Guest.update(id, { table_assignment: table.name }); ok++; } catch { err++; } }
        } catch { err++; }
      }
      await loadData();
      toast.success(`${ok} guests assigned${err > 0 ? `, ${err} errors` : ''}`, { id: tid, duration: 5000 });
    } catch { toast.error('Failed to apply plan', { id: tid }); throw new Error(); }
  };

  /* ── Right panel filtered list ── */
  const filteredGuests = useMemo(() => {
    let list = guests;
    if (guestFilter === 'unassigned') list = list.filter(g => !assignedGuestIds.has(g.id));
    if (guestFilter === 'assigned') list = list.filter(g => assignedGuestIds.has(g.id));
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      list = list.filter(g => g.name?.toLowerCase().includes(q) || g.dietary_restrictions?.toLowerCase().includes(q));
    }
    return list;
  }, [guests, guestFilter, guestSearch, assignedGuestIds]);

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const guestsAtSelectedTable = selectedTable
    ? new Set((selectedTable.assigned_guests || []).map(a => a.guest_id))
    : new Set();

  const getGuestTableName = (guestId) => {
    for (const t of tables) {
      if ((t.assigned_guests || []).some(a => a.guest_id === guestId)) return t.name;
    }
    return null;
  };

  const STAT_CARDS = [
    { label: 'Tables',     value: stats.tables },
    { label: 'Total seats',value: stats.seats },
    { label: 'Guests',     value: stats.guests },
    { label: 'Assigned',   value: stats.assigned },
    { label: 'Complete',   value: stats.pct, suffix: '%' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      {/* Sub-header */}
      <div style={{ height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Seating</span>
      </div>

      {/* Descriptor strip */}
      <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Design your venue layout and assign guests to tables
        </span>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '20px 24px', borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={statLabel}>{s.label}</p>
            {loading
              ? <div style={{ width: 48, height: 28, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValue}><CountUp to={s.value} suffix={s.suffix || ''} /></p>
            }
          </div>
        ))}
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
              style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: zoom <= MIN_ZOOM ? 0.4 : 1 }}
            >
              <ZoomOut size={12} style={{ color: '#0A0A0A' }} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 36, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= MAX_ZOOM}
              style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: zoom >= MAX_ZOOM ? 0.4 : 1 }}
            >
              <ZoomIn size={12} style={{ color: '#0A0A0A' }} />
            </button>
            <button
              onClick={() => setZoom(1)}
              style={{ height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.07em' }}
            >
              <RotateCcw size={10} />Reset
            </button>
          </div>

          {/* Ask Ava */}
          <button
            onClick={() => setShowAIGenerator(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              borderRadius: 999, background: '#0A0A0A', color: '#FFFFFF', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Sparkles size={14} />
            Ask Ava — allocate seats
          </button>
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
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transformOrigin: 'top left',
                transform: `scale(${zoom})`,
                position: 'relative',
                ...(venueImageUrl
                  ? { backgroundImage: `url(${venueImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { backgroundImage: 'radial-gradient(circle, rgba(10,10,10,0.13) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px', backgroundColor: '#FAFAFA' }
                ),
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedTableId(null); }}
            >
              {/* Semi-transparent overlay when venue image loaded */}
              {venueImageUrl && (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(10,10,10,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
              )}

              {/* Tables */}
              {tables.map(table => (
                <div
                  key={`t-${table.id}`}
                  style={{ position: 'absolute', left: table.x || 50, top: table.y || 50, cursor: draggingItem?.id === table.id ? 'grabbing' : 'grab', userSelect: 'none' }}
                  onMouseDown={e => handleItemMouseDown(e, table.id, 'table')}
                  onMouseEnter={() => setHoveredId(`t-${table.id}`)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <VisualTable
                    table={table}
                    guests={guests}
                    onSeatClick={handleSeatClick}
                    selected={selectedTableId === table.id}
                  />
                  {/* Delete button on hover */}
                  {hoveredId === `t-${table.id}` && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteItem(table.id, 'table'); }}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#E03553', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <Trash2 size={10} style={{ color: '#FFFFFF' }} />
                    </button>
                  )}
                </div>
              ))}

              {/* Assets */}
              {venueAssets.map(asset => (
                <div
                  key={`a-${asset.id}`}
                  style={{ position: 'absolute', left: asset.x || 50, top: asset.y || 50, cursor: draggingItem?.id === asset.id ? 'grabbing' : 'grab', userSelect: 'none' }}
                  onMouseDown={e => handleItemMouseDown(e, asset.id, 'asset')}
                  onMouseEnter={() => setHoveredId(`a-${asset.id}`)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <VisualAsset asset={asset} />
                  {hoveredId === `a-${asset.id}` && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteItem(asset.id, 'asset'); }}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#E03553', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <Trash2 size={10} style={{ color: '#FFFFFF' }} />
                    </button>
                  )}
                </div>
              ))}

              {/* Empty state */}
              {tables.length === 0 && venueAssets.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px dashed rgba(10,10,10,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Users size={20} style={{ color: 'rgba(10,10,10,0.2)' }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Add tables from the left panel</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.2)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0' }}>Drag tables and assets to arrange your venue</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Guest list panel */}
          <div style={{ width: 260, borderLeft: '1px solid rgba(10,10,10,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Panel header */}
            <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 8px' }}>Guests</p>
              <div style={{ display: 'flex', gap: 5 }}>
                {['all', 'unassigned', 'assigned'].map(f => (
                  <Pill key={f} label={f} active={guestFilter === f} onClick={() => setGuestFilter(f)} />
                ))}
              </div>
            </div>

            {/* Selected table banner */}
            {selectedTable && (
              <div style={{ padding: '8px 16px', background: 'rgba(224,53,83,0.05)', borderBottom: '1px solid rgba(224,53,83,0.12)', flexShrink: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                  Assigning to: {selectedTable.name}
                </p>
                <p style={{ fontSize: 10, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>
                  {(selectedTable.assigned_guests || []).length}/{selectedTable.capacity} seats · click guest to assign
                </p>
              </div>
            )}

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

            {/* Guest list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Loading…</p>
                </div>
              ) : filteredGuests.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Users size={20} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No guests found</p>
                </div>
              ) : (
                filteredGuests.map(guest => {
                  const isAtSelected = guestsAtSelectedTable.has(guest.id);
                  const isAssigned = assignedGuestIds.has(guest.id);
                  const tableName = isAssigned ? getGuestTableName(guest.id) : null;
                  const isClickable = !!selectedTableId;

                  return (
                    <div
                      key={guest.id}
                      onClick={() => isClickable && handleGuestPanelClick(guest)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '8px 16px',
                        borderBottom: '1px solid rgba(10,10,10,0.05)',
                        background: isAtSelected ? 'rgba(224,53,83,0.04)' : 'transparent',
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (isClickable) e.currentTarget.style.background = isAtSelected ? 'rgba(224,53,83,0.08)' : 'rgba(10,10,10,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isAtSelected ? 'rgba(224,53,83,0.04)' : 'transparent'; }}
                    >
                      {/* Avatar initial */}
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: isAtSelected ? '#E03553' : isAssigned ? '#0A1930' : 'rgba(10,10,10,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: 10,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: isAtSelected || isAssigned ? '#FFFFFF' : '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {guest.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {guest.name}
                          {guest.plus_one ? <span style={{ color: '#444444', fontWeight: 400 }}> +1</span> : null}
                        </p>
                        {tableName && (
                          <p style={{ fontSize: 9, color: isAtSelected ? '#E03553' : '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '1px 0 0', fontWeight: isAtSelected ? 700 : 400 }}>
                            {tableName}
                          </p>
                        )}
                        {guest.dietary_restrictions && (
                          <p style={{ fontSize: 9, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {guest.dietary_restrictions}
                          </p>
                        )}
                      </div>

                      {/* Status dot */}
                      {isAtSelected && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E03553', flexShrink: 0, marginLeft: 6 }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>{/* end three-panel */}
      </div>

      {/* Modals */}
      {showAddTable && (
        <AddTableModal onAdd={handleAddTable} onClose={() => setShowAddTable(false)} />
      )}

      {showAIGenerator && (
        <AISeatingGenerator
          guests={guests}
          tables={tables}
          onApplySeating={handleApplyAISeating}
          onClose={() => setShowAIGenerator(false)}
        />
      )}

      <AIWeddingAssistant />
    </div>
  );
}
