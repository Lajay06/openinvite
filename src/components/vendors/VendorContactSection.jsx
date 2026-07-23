import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Phone, Mail, Pencil, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import VendorFormModal from './VendorFormModal';

const Vendor = base44.entities.Vendor;
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};

const STATUS_STYLES = {
  booked:      { background: '#DDF762', color: '#0A1930' },
  quoted:      { background: '#803D81', color: '#FFFFFF' },
  contacted:   { background: '#0A1930', color: '#FFFFFF' },
  researching: { background: 'rgba(10,10,10,0.07)', color: 'rgba(10,10,10,0.6)', border: '1px solid rgba(10,10,10,0.15)' },
  rejected:    { background: 'rgba(224,53,83,0.08)', color: '#E03553', border: '1px solid rgba(224,53,83,0.2)' },
};

/**
 * THE ONE shared vendor-contact block. Every section that stores
 * vendor/contact info (Styling, Beauty, Photography, Food & beverage,
 * Flowers, Music, and any other) renders this instead of hand-rolling its
 * own vendor-select-or-manual-input UI. Dashboard round 6, item 5 — the
 * fifth request for this consolidation; this time it's structural: a
 * section only ever stores a vendorId, contact details live on the Vendor
 * record itself (single source of truth, no per-page copy that can drift
 * out of sync with the real vendor's actual phone/email).
 *
 * Usage:
 *   <VendorContactSection
 *     category="flowers"
 *     vendorId={details.flowers?.vendorId}
 *     onVendorIdChange={id => handleUpdate('flowers', 'vendorId', id)}
 *   />
 */
export default function VendorContactSection({ category, vendorId, onVendorIdChange }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'choose'
  const [pickedId, setPickedId] = useState('');
  const [formModal, setFormModal] = useState(null); // null | 'new' | vendor object (edit)

  useEffect(() => { loadVendors(); }, []);

  const loadVendors = async () => {
    try {
      setVendors(await getMyRecords('Vendor'));
    } catch {
      // best-effort — an empty list just means "no vendors to pick from yet"
    }
    setLoading(false);
  };

  const selectedVendor = vendors.find(v => v.id === vendorId) || null;
  const categoryVendors = vendors.filter(v => v.category === category && v.id !== vendorId);

  const handleFormSubmit = async (data) => {
    const tid = toast.loading(formModal?.id ? 'Updating vendor…' : 'Adding vendor…');
    try {
      let saved;
      if (formModal?.id) {
        saved = await Vendor.update(formModal.id, data);
        toast.success('Vendor updated', { id: tid });
      } else {
        saved = await Vendor.create({ ...data, category: data.category || category });
        toast.success('Vendor added', { id: tid });
      }
      await loadVendors();
      onVendorIdChange(saved.id);
      setFormModal(null);
      setMode(null);
    } catch {
      toast.error('Failed to save vendor', { id: tid });
    }
  };

  const handlePickExisting = () => {
    if (!pickedId) return;
    onVendorIdChange(pickedId);
    setMode(null);
    setPickedId('');
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={16} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {selectedVendor ? (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 6px' }}>
            {selectedVendor.name}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            {selectedVendor.contact_person && (
              <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>{selectedVendor.contact_person}</span>
            )}
            {selectedVendor.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444444', fontFamily: PJS }}>
                <Phone size={11} style={{ color: 'rgba(10,10,10,0.6)' }} />{selectedVendor.phone}
              </span>
            )}
            {selectedVendor.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444444', fontFamily: PJS }}>
                <Mail size={11} style={{ color: 'rgba(10,10,10,0.6)' }} />{selectedVendor.email}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 999, fontFamily: PJS, ...(STATUS_STYLES[selectedVendor.status] || STATUS_STYLES.researching) }}>
            {selectedVendor.status || 'researching'}
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <button onClick={() => setFormModal(selectedVendor)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Pencil size={11} />Edit vendor
            </button>
            <button onClick={() => setMode('choose')} className="btn-editorial-secondary" style={{ fontSize: 12 }}>
              Change vendor
            </button>
            <button onClick={() => onVendorIdChange(null)} style={{ fontSize: 12, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={11} />Remove
            </button>
          </div>
        </div>
      ) : mode !== 'choose' && (
        <div style={{ border: '1px dashed rgba(10,10,10,0.18)', padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 16px' }}>
            No vendor added yet.
          </p>
          <button onClick={() => setMode('choose')} className="btn-primary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add vendor
          </button>
        </div>
      )}

      {mode === 'choose' && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 20, marginTop: selectedVendor ? 16 : 0 }}>
          <p style={{ ...labelStyle, marginBottom: 14 }}>Add vendor</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>Select existing vendor</p>
              {categoryVendors.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>No matching vendors in My vendors yet.</p>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Select value={pickedId} onValueChange={setPickedId}>
                      <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                      <SelectContent>
                        {categoryVendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <button onClick={handlePickExisting} disabled={!pickedId} className="btn-primary" style={{ fontSize: 12, opacity: pickedId ? 1 : 0.4 }}>
                    Select
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
            </div>
            <button onClick={() => setFormModal('new')} className="btn-editorial-secondary" style={{ fontSize: 12, alignSelf: 'flex-start' }}>
              Add vendor
            </button>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <button onClick={() => { setMode(null); setPickedId(''); }} style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <VendorFormModal
        open={!!formModal}
        vendor={formModal && formModal !== 'new' ? formModal : null}
        defaultCategory={category}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormModal(null)}
      />
    </div>
  );
}
