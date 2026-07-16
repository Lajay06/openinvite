import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Check, Loader2, Image } from 'lucide-react';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { validateUploadFile } from '@/lib/uploadValidation';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import UploadStatus from '@/components/shared/UploadStatus';

const WeddingDetails = base44.entities.WeddingDetails;

const ROLES = [
  'Bride', 'Groom', 'Partner 1', 'Partner 2',
  'Bridesmaid', 'Groomsman', 'Maid of honour', 'Best man',
  'Flower girl', 'Page boy',
  'Mother of the bride', 'Mother of the groom',
  'Father of the bride', 'Father of the groom',
  'Other',
];

const STATUSES = [
  'Not started', 'Researching', 'Ordered',
  'In alterations', 'Ready', 'Collected',
];

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS,
  marginBottom: 4, display: 'block',
};

const inputStyle = {
  border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0', width: '100%',
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical', minHeight: 72,
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Section heading with optional Add button ──────────────────────────────────
function SectionHead({ title, onAdd, addLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em' }}>
        {title}
      </span>
      {onAdd && (
        <button
          onClick={onAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: PJS, color: '#0A0A0A' }}
        >
          <Plus size={12} /> {addLabel}
        </button>
      )}
    </div>
  );
}

// ── Label + children wrapper ──────────────────────────────────────────────────
function Field({ lbl, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label style={labelStyle}>{lbl}</label>
      {children}
    </div>
  );
}

// ── Single outfit card ────────────────────────────────────────────────────────
function OutfitCard({ outfit, onUpdate, onRemove, uploadState, onPhotoUpload, onPhotoRetry, fileRefs }) {
  const status = uploadState?.status || 'idle';
  const uploading = status === 'uploading';

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 16 }}>

      {/* Row 1: role + name + remove */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 14 }}>
        <div style={{ width: 176, flexShrink: 0 }}>
          <label style={labelStyle}>Role</label>
          <Select
            value={outfit.role || ''}
            onValueChange={v => onUpdate(outfit.id, 'role', v)}
          >
            <SelectTrigger style={{ height: 32, fontSize: 13, borderRadius: 0 }}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div style={{ flex: 1 }}>
          <Field lbl="Name">
            <input
              value={outfit.name || ''}
              onChange={e => onUpdate(outfit.id, 'name', e.target.value)}
              style={inputStyle}
              placeholder="Person's name"
            />
          </Field>
        </div>

        <button
          onClick={() => onRemove(outfit.id)}
          title="Remove outfit"
          style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,10,10,0.4)', flexShrink: 0, marginBottom: 2 }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Other role — custom label */}
      {outfit.role === 'Other' && (
        <div style={{ marginBottom: 14 }}>
          <Field lbl="Custom role">
            <input
              value={outfit.roleCustom || ''}
              onChange={e => onUpdate(outfit.id, 'roleCustom', e.target.value)}
              style={inputStyle}
              placeholder="Describe the role"
            />
          </Field>
        </div>
      )}

      {/* Row 2: description (full width) */}
      <div style={{ marginBottom: 14 }}>
        <Field lbl="Description">
          <textarea
            value={outfit.description || ''}
            onChange={e => onUpdate(outfit.id, 'description', e.target.value)}
            style={textareaStyle}
            placeholder="Fabric, colour, style, silhouette"
          />
        </Field>
      </div>

      {/* Row 3: source + status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field lbl="Source / where it's from">
          <input
            value={outfit.source || ''}
            onChange={e => onUpdate(outfit.id, 'source', e.target.value)}
            style={inputStyle}
            placeholder="e.g. Jenny Yoo, ASOS, hired"
          />
        </Field>

        <div>
          <label style={labelStyle}>Status</label>
          <Select
            value={outfit.status || ''}
            onValueChange={v => onUpdate(outfit.id, 'status', v)}
          >
            <SelectTrigger style={{ height: 32, fontSize: 13, borderRadius: 0 }}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 4: measurements + cost */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field lbl="Measurements (optional)">
          <input
            value={outfit.measurements || ''}
            onChange={e => onUpdate(outfit.id, 'measurements', e.target.value)}
            style={inputStyle}
            placeholder="e.g. size 10, hip 38, chest 42"
          />
        </Field>

        <Field lbl="Cost (optional)">
          <input
            value={outfit.cost || ''}
            onChange={e => onUpdate(outfit.id, 'cost', e.target.value)}
            style={inputStyle}
            placeholder="e.g. $1,200"
          />
        </Field>
      </div>

      {/* Row 5: photo upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {outfit.photoUrl && !uploading ? (
          <>
            <img
              src={outfit.photoUrl}
              alt="Outfit"
              style={{ width: 64, height: 64, objectFit: 'cover', border: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}
            />
            <button
              onClick={() => fileRefs.current[outfit.id]?.click()}
              style={{ fontSize: 12, fontWeight: 600, color: '#E03553', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: PJS }}
            >
              Change photo
            </button>
            <button
              onClick={() => onUpdate(outfit.id, 'photoUrl', '')}
              style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: PJS }}
            >
              Remove
            </button>
          </>
        ) : status === 'uploading' || status === 'error' ? (
          <UploadStatus
            status={status}
            error={uploadState?.error}
            onRetry={() => onPhotoRetry(outfit.id)}
            height={64}
            style={{ flex: 1 }}
          />
        ) : (
          <button
            onClick={() => fileRefs.current[outfit.id]?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: PJS, color: '#0A0A0A' }}
          >
            <Image size={12} />
            Upload photo
          </button>
        )}

        <input
          type="file"
          style={{ display: 'none' }}
          accept="image/jpeg,image/png,image/webp,image/gif"
          ref={el => { fileRefs.current[outfit.id] = el; }}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onPhotoUpload(outfit.id, file);
          }}
        />
      </div>
    </div>
  );
}

// ── AttirePanel — main export ─────────────────────────────────────────────────
export default function AttirePanel() {
  const [attire, setAttire] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [uploadStates, setUploadStates] = useState({}); // { [outfitId]: { status, error } }

  const latestAttireRef = useRef({});
  const detailsIdRef = useRef(null);
  const savedOkTimer = useRef(null);
  const fileRefs = useRef({});
  const lastFileByOutfitRef = useRef({});

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await getMyWeddingDetails();
      if (data) {
        const a = data.attire || {};
        setAttire(a);
        latestAttireRef.current = a;
        detailsIdRef.current = data.id;
      }
    } catch (e) {
      console.error('[AttirePanel] load error:', e);
    }
    setLoading(false);
  }

  // Every mutation goes through mutate — keeps ref + state in sync
  function mutate(next) {
    latestAttireRef.current = next;
    setAttire(next);
    setDirty(true);
    if (savedOkTimer.current) clearTimeout(savedOkTimer.current);
    setSavedOk(false);
  }

  function setTopField(field, value) {
    mutate({ ...latestAttireRef.current, [field]: value });
  }

  // ── Outfits ──────────────────────────────────────────────────────────────────
  function addOutfit() {
    const cur = latestAttireRef.current;
    mutate({
      ...cur,
      outfits: [
        ...(cur.outfits || []),
        { id: uid(), role: '', roleCustom: '', name: '', description: '', source: '', status: 'Not started', measurements: '', cost: '', photoUrl: '' },
      ],
    });
  }

  function updateOutfit(id, field, value) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, outfits: (cur.outfits || []).map(o => o.id === id ? { ...o, [field]: value } : o) });
  }

  function removeOutfit(id) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, outfits: (cur.outfits || []).filter(o => o.id !== id) });
  }

  // ── Tailor ───────────────────────────────────────────────────────────────────
  function setTailorField(field, value) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, tailor: { ...(cur.tailor || {}), [field]: value } });
  }

  // ── Fittings ─────────────────────────────────────────────────────────────────
  function addFitting() {
    const cur = latestAttireRef.current;
    mutate({
      ...cur,
      fittings: [...(cur.fittings || []), { id: uid(), date: '', who: '', notes: '' }],
    });
  }

  function updateFitting(id, field, value) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, fittings: (cur.fittings || []).map(f => f.id === id ? { ...f, [field]: value } : f) });
  }

  function removeFitting(id) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, fittings: (cur.fittings || []).filter(f => f.id !== id) });
  }

  // ── Accessories ───────────────────────────────────────────────────────────────
  function addAccessory() {
    const cur = latestAttireRef.current;
    mutate({
      ...cur,
      accessories: [...(cur.accessories || []), { id: uid(), item: '', forWhom: '', done: false }],
    });
  }

  function updateAccessory(id, field, value) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, accessories: (cur.accessories || []).map(a => a.id === id ? { ...a, [field]: value } : a) });
  }

  function removeAccessory(id) {
    const cur = latestAttireRef.current;
    mutate({ ...cur, accessories: (cur.accessories || []).filter(a => a.id !== id) });
  }

  // ── Photo upload ──────────────────────────────────────────────────────────────
  async function handlePhotoUpload(outfitId, file) {
    lastFileByOutfitRef.current[outfitId] = file;

    const err = validateUploadFile(file, 'image');
    if (err) {
      setUploadStates(s => ({ ...s, [outfitId]: { status: 'error', error: err } }));
      return;
    }

    setUploadStates(s => ({ ...s, [outfitId]: { status: 'uploading', error: null } }));
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      updateOutfit(outfitId, 'photoUrl', result.file_url);
      setUploadStates(s => ({ ...s, [outfitId]: { status: 'success', error: null } }));
    } catch {
      setUploadStates(s => ({ ...s, [outfitId]: { status: 'error', error: 'Upload failed. Please try again.' } }));
    }
  }

  function retryPhotoUpload(outfitId) {
    const file = lastFileByOutfitRef.current[outfitId];
    if (file) handlePhotoUpload(outfitId, file);
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const tid = toast.loading('Saving attire...');
    try {
      const id = detailsIdRef.current;
      const payload = latestAttireRef.current;
      if (id) {
        await WeddingDetails.update(id, { attire: payload });
      } else {
        const c = await WeddingDetails.create({ attire: payload });
        detailsIdRef.current = c.id;
      }
      setDirty(false);
      setSavedOk(true);
      toast.success('Attire saved!', { id: tid });
      savedOkTimer.current = setTimeout(() => setSavedOk(false), 2500);
    } catch (e) {
      console.error('[AttirePanel] save error:', e);
      toast.error('Failed to save', { id: tid });
    }
    setSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} style={{ color: '#E03553' }} className="animate-spin" />
      </div>
    );
  }

  const outfits = attire.outfits || [];
  const tailor = attire.tailor || {};
  const fittings = attire.fittings || [];
  const accessories = attire.accessories || [];

  return (
    <div style={{ fontFamily: PJS, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── A. Outfits ────────────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Outfits" onAdd={addOutfit} addLabel="Add outfit" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {outfits.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
              No outfits added yet. Click "Add outfit" to start planning.
            </p>
          )}
          {outfits.map(outfit => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onUpdate={updateOutfit}
              onRemove={removeOutfit}
              uploadState={uploadStates[outfit.id]}
              onPhotoUpload={handlePhotoUpload}
              onPhotoRetry={retryPhotoUpload}
              fileRefs={fileRefs}
            />
          ))}
        </div>
      </div>

      {/* ── B. Tailor ────────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 32 }}>
        <SectionHead title="Tailor" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <Field lbl="Tailor / studio name">
            <input
              value={tailor.name || ''}
              onChange={e => setTailorField('name', e.target.value)}
              style={inputStyle}
              placeholder="Studio or tailor name"
            />
          </Field>
          <Field lbl="Contact person">
            <input
              value={tailor.contact || ''}
              onChange={e => setTailorField('contact', e.target.value)}
              style={inputStyle}
              placeholder="Contact name"
            />
          </Field>
          <Field lbl="Phone">
            <input
              value={tailor.phone || ''}
              onChange={e => setTailorField('phone', e.target.value)}
              style={inputStyle}
              placeholder="Phone number"
            />
          </Field>
          <Field lbl="Email">
            <input
              type="email"
              value={tailor.email || ''}
              onChange={e => setTailorField('email', e.target.value)}
              style={inputStyle}
              placeholder="Email address"
            />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field lbl="Notes">
              <textarea
                value={tailor.notes || ''}
                onChange={e => setTailorField('notes', e.target.value)}
                style={textareaStyle}
                placeholder="Deposit, deadlines, special instructions"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Fittings (sub-section of tailor) ─────────────────────────────── */}
      <div style={{ paddingTop: 24 }}>
        <SectionHead title="Fittings" onAdd={addFitting} addLabel="Add fitting" />
        <div style={{ marginTop: 12 }}>
          {fittings.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '8px 0 0' }}>
              No fittings scheduled yet.
            </p>
          )}
          {fittings.map(f => (
            <div
              key={f.id}
              style={{ display: 'grid', gridTemplateColumns: '160px 1fr 2fr auto', gap: 12, alignItems: 'end', padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}
            >
              <Field lbl="Date">
                <input
                  type="date"
                  value={f.date || ''}
                  onChange={e => updateFitting(f.id, 'date', e.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field lbl="Who">
                <input
                  value={f.who || ''}
                  onChange={e => updateFitting(f.id, 'who', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Bride"
                />
              </Field>
              <Field lbl="Notes">
                <input
                  value={f.notes || ''}
                  onChange={e => updateFitting(f.id, 'notes', e.target.value)}
                  style={inputStyle}
                  placeholder="What to bring, alterations needed"
                />
              </Field>
              <button
                onClick={() => removeFitting(f.id)}
                style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,10,10,0.4)', flexShrink: 0, marginBottom: 2 }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── C. Accessories ───────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 32 }}>
        <SectionHead title="Accessories" onAdd={addAccessory} addLabel="Add accessory" />
        <div style={{ marginTop: 12 }}>
          {accessories.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '8px 0 0' }}>
              No accessories added yet. Click "Add accessory" to build your checklist.
            </p>
          )}
          {accessories.map(a => (
            <div
              key={a.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}
            >
              <input
                type="checkbox"
                checked={a.done || false}
                onChange={e => updateAccessory(a.id, 'done', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#E03553', flexShrink: 0, cursor: 'pointer' }}
              />
              <input
                value={a.item || ''}
                onChange={e => updateAccessory(a.id, 'item', e.target.value)}
                style={{
                  ...inputStyle, flex: 2,
                  textDecoration: a.done ? 'line-through' : 'none',
                  color: a.done ? 'rgba(10,10,10,0.35)' : '#0A0A0A',
                }}
                placeholder="Item (e.g. veil, cufflinks, garter)"
              />
              <input
                value={a.forWhom || ''}
                onChange={e => updateAccessory(a.id, 'forWhom', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="For whom"
              />
              <button
                onClick={() => removeAccessory(a.id)}
                style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,10,10,0.4)', flexShrink: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── D. Notes ─────────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 32 }}>
        <SectionHead title="Notes" />
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '0 0 12px', fontFamily: PJS }}>
            Dress code is set per event in{' '}
            <a href="/event-details" style={{ color: '#E03553', fontWeight: 600, textDecoration: 'none' }}>
              Event Details → Venue
            </a>.
          </p>
          <Field lbl="Attire notes">
            <textarea
              value={attire.notes || ''}
              onChange={e => setTopField('notes', e.target.value)}
              style={{ ...textareaStyle, minHeight: 100 }}
              placeholder="e.g. Ceremony is on grass — consider heel-friendly footwear. Bridesmaids can choose their own shoes in dusty rose."
            />
          </Field>
        </div>
      </div>

      {/* ── Save bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28, marginTop: 16, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 20px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: PJS, opacity: saving ? 0.7 : 1 }}
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Save attire
        </button>

        {dirty && !savedOk && (
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
            Unsaved changes
          </span>
        )}
        {savedOk && (
          <span style={{ fontSize: 12, color: '#16a34a', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} /> Saved ✓
          </span>
        )}
      </div>

    </div>
  );
}
