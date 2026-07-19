import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, Edit2, CheckCircle2, Circle, Package, PackageCheck,
  PackageX, X, Search, Sparkles, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const ReceivedGift = base44.entities.ReceivedGift;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const selectStyle = {
  borderBottom: '1px solid rgba(10,10,10,0.18)', border: 'none',
  borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, fontWeight: 500, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  width: '100%',
};

const DELIVERY_CONFIG = {
  expected:     { label: 'Expected',     color: '#803D81', bg: 'rgba(128,61,129,0.08)', Icon: Package },
  received:     { label: 'Received',     color: '#6b7700', bg: 'rgba(107,119,0,0.08)',  Icon: PackageCheck },
  not_received: { label: 'Not received', color: '#E03553', bg: 'rgba(224,53,83,0.08)',  Icon: PackageX },
};

const EMPTY_FORM = {
  item_name: '', giver_guest_id: '', giver_name: '', giver_email: '',
  delivery_status: 'expected', received_date: '', thank_you_sent: false,
  thank_you_date: '', thank_you_note: '', estimated_value: '', category: 'physical', notes: ''
};

function FilterPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      border: active ? '1.5px solid #0A0A0A' : '1px solid rgba(10,10,10,0.15)',
      background: active ? '#0A0A0A' : 'transparent',
      color: active ? '#FFFFFF' : '#444444',
      borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

export default function ReceivedGifts() {
  const [gifts, setGifts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTY, setFilterTY] = useState('all');
  const [generatingNote, setGeneratingNote] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  useEffect(() => {
    Promise.all([
      getMyRecords('ReceivedGift', '-created_date').then(setGifts),
      getMyRecords('Guest').then(setGuests),
    ]).finally(() => setLoading(false));
  }, []);

  const reload = () => getMyRecords('ReceivedGift', '-created_date').then(setGifts);

  const filteredGuests = useMemo(() =>
    guests.filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase())).slice(0, 8),
    [guests, guestSearch]
  );

  const selectGuest = (guest) => {
    setForm(f => ({ ...f, giver_guest_id: guest.id, giver_name: guest.name, giver_email: guest.email || '' }));
    setGuestSearch(guest.name);
    setShowGuestDropdown(false);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setGuestSearch(''); setEditingGift(null); setShowForm(true); };
  const openEdit = (gift) => {
    setForm({ ...EMPTY_FORM, ...gift, estimated_value: gift.estimated_value || '' });
    const g = guests.find(x => x.id === gift.giver_guest_id);
    setGuestSearch(g ? g.name : gift.giver_name || '');
    setEditingGift(gift); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.item_name.trim()) return toast.error('Gift item name is required');
    const data = { ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined };
    if (editingGift) {
      await ReceivedGift.update(editingGift.id, data);
      toast.success('Gift updated');
    } else {
      await ReceivedGift.create(data);
      toast.success('Gift added');
    }
    setShowForm(false); reload();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gift record?')) return;
    await ReceivedGift.delete(id); reload(); toast.success('Deleted');
  };

  const toggleThankYou = async (gift) => {
    const newVal = !gift.thank_you_sent;
    await ReceivedGift.update(gift.id, {
      thank_you_sent: newVal,
      thank_you_date: newVal ? new Date().toISOString().split('T')[0] : ''
    });
    reload();
  };

  const generateNote = async () => {
    setGeneratingNote(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a warm, personal thank-you note for a wedding gift.\nGift: "${form.item_name}". Giver: "${form.giver_name || 'our guest'}".\nKeep it 3-4 sentences, heartfelt and specific to the gift. Plain text only.`,
    });
    setForm(f => ({ ...f, thank_you_note: result }));
    setGeneratingNote(false);
  };

  const filtered = useMemo(() => gifts.filter(g => {
    const matchSearch = g.item_name.toLowerCase().includes(search.toLowerCase()) ||
      (g.giver_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.delivery_status === filterStatus;
    const matchTY = filterTY === 'all' || (filterTY === 'sent' ? g.thank_you_sent : !g.thank_you_sent);
    return matchSearch && matchStatus && matchTY;
  }), [gifts, search, filterStatus, filterTY]);

  const stats = useMemo(() => ({
    total: gifts.length,
    received: gifts.filter(g => g.delivery_status === 'received').length,
    pending: gifts.filter(g => g.delivery_status === 'received' && !g.thank_you_sent).length,
    totalValue: gifts.reduce((s, g) => s + (g.estimated_value || 0), 0),
  }), [gifts]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#444444', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats */}
      <div style={{ display: 'flex' }}>
        {[
          { label: 'Total gifts', value: stats.total },
          { label: 'Received', value: stats.received },
          { label: 'Thank-yous pending', value: stats.pending },
          { label: 'Total value', value: `$${stats.totalValue.toLocaleString()}`, last: true },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '20px 24px', border: '1px solid rgba(10,10,10,0.08)', borderRight: s.last ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 6 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gifts or givers…"
            style={{ paddingLeft: 20, borderBottom: '1px solid rgba(10,10,10,0.18)', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(10,10,10,0.18)', background: 'none', fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0 6px 20px', width: 200 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ['expected', 'Expected'], ['received', 'Received'], ['not_received', 'Not received']].map(([val, lbl]) => (
            <FilterPill key={val} active={filterStatus === val} onClick={() => setFilterStatus(val)}>{lbl}</FilterPill>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All thank-yous'], ['sent', 'Sent'], ['pending', 'Pending']].map(([val, lbl]) => (
            <FilterPill key={val} active={filterTY === val} onClick={() => setFilterTY(val)}>{lbl}</FilterPill>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={openAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Plus size={12} />Add gift
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24, background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {editingGift ? 'Edit gift' : 'Add received gift'}
            </span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Gift item</Label>
              <Input placeholder="e.g. KitchenAid stand mixer" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
            </div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Giver (from guest list)</Label>
              <Input placeholder="Search guest…" value={guestSearch}
                onChange={e => { setGuestSearch(e.target.value); setShowGuestDropdown(true); setForm(f => ({ ...f, giver_guest_id: '', giver_name: e.target.value })); }}
                onFocus={() => setShowGuestDropdown(true)} />
              {showGuestDropdown && filteredGuests.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)', zIndex: 20, maxHeight: 160, overflowY: 'auto' }}>
                  {filteredGuests.map(g => (
                    <button key={g.id} onClick={() => selectGuest(g)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(10,10,10,0.04)' }}>
                      {g.name}{g.email ? <span style={{ color: 'rgba(10,10,10,0.6)', marginLeft: 6 }}>· {g.email}</span> : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Giver email</Label>
              <Input placeholder="giver@email.com" value={form.giver_email} onChange={e => setForm(f => ({ ...f, giver_email: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Delivery status</Label>
              <select value={form.delivery_status} onChange={e => setForm(f => ({ ...f, delivery_status: e.target.value }))} style={selectStyle}>
                <option value="expected">Expected</option>
                <option value="received">Received</option>
                <option value="not_received">Not received</option>
              </select>
            </div>
            {form.delivery_status === 'received' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Received date</Label>
                <Input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Category</Label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={selectStyle}>
                {['physical', 'cash', 'experience', 'digital', 'other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Estimated value ($)</Label>
              <Input type="number" placeholder="0" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="ty_sent" checked={form.thank_you_sent} onChange={e => setForm(f => ({ ...f, thank_you_sent: e.target.checked }))} style={{ width: 14, height: 14, accentColor: '#0A0A0A', cursor: 'pointer' }} />
                <label htmlFor="ty_sent" style={{ fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}>Thank-you sent</label>
                {form.thank_you_sent && (
                  <Input type="date" value={form.thank_you_date} onChange={e => setForm(f => ({ ...f, thank_you_date: e.target.value }))} style={{ marginLeft: 'auto', width: 160 }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Label>Thank-you note</Label>
                  <button type="button" onClick={generateNote} disabled={generatingNote}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#803D81', fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'none', border: 'none', cursor: generatingNote ? 'not-allowed' : 'pointer' }}>
                    {generatingNote ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    AI draft
                  </button>
                </div>
                <Textarea value={form.thank_you_note} onChange={e => setForm(f => ({ ...f, thank_you_note: e.target.value }))} placeholder="Write or generate a thank-you note…" />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Notes</Label>
              <Input placeholder="Any additional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={handleSubmit} className="btn-primary" style={{ fontSize: 13 }}>Save gift</button>
            <button onClick={() => setShowForm(false)} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Gift list */}
      {filtered.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)', background: '#FAFAFA' }}>
          <Package size={32} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 }}>No gifts recorded yet</p>
          <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Click "Add gift" to start tracking</p>
        </div>
      ) : (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <th style={{ ...labelStyle, textAlign: 'left', padding: '10px 16px' }}>Gift</th>
                <th style={{ ...labelStyle, textAlign: 'left', padding: '10px 16px' }}>Giver</th>
                <th style={{ ...labelStyle, textAlign: 'left', padding: '10px 16px' }}>Status</th>
                <th style={{ ...labelStyle, textAlign: 'center', padding: '10px 16px' }}>Thank-you</th>
                <th style={{ ...labelStyle, textAlign: 'right', padding: '10px 16px' }}>Value</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((gift, i) => {
                const dc = DELIVERY_CONFIG[gift.delivery_status] || DELIVERY_CONFIG.expected;
                const DcIcon = dc.Icon;
                return (
                  <tr key={gift.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(10,10,10,0.05)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{gift.item_name}</p>
                      {gift.category && <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize', marginTop: 2 }}>{gift.category}</p>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{gift.giver_name || '—'}</p>
                      {gift.giver_email && <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{gift.giver_email}</p>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: dc.bg, color: dc.color, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <DcIcon size={11} />{dc.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => toggleThankYou(gift)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title={gift.thank_you_sent ? `Sent ${gift.thank_you_date || ''}` : 'Mark as sent'}>
                        {gift.thank_you_sent
                          ? <CheckCircle2 size={18} style={{ color: '#6b7700' }} />
                          : <Circle size={18} style={{ color: 'rgba(10,10,10,0.2)' }} />
                        }
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {gift.estimated_value ? `$${gift.estimated_value.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button onClick={() => openEdit(gift)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 4, display: 'flex' }}><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(gift.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 4, display: 'flex' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
