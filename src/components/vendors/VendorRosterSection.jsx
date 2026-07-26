import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import VendorFormModal from './VendorFormModal';
import VendorList from './VendorList';

const Vendor = base44.entities.Vendor;
const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE shared vendor ROSTER block — for pages that track a list of several
 * vendors in one category (Beauty's "Beauty team" tab, Music's "Vendor"
 * tab), as opposed to VendorContactSection (a single vendor-for-this-
 * section picker). Self-contained: fetches its own category-filtered
 * Vendor list and owns add/edit/delete, the same way VendorContactSection
 * owns its own fetch — a page never hand-rolls the add-button+VendorList+
 * VendorFormModal wiring itself.
 */
export default function VendorRosterSection({ category, categoryLabel, readOnly }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const label = categoryLabel || category;

  const load = useCallback(async () => {
    try {
      const all = await getMyRecords('Vendor');
      setVendors(all.filter(v => v.category === category));
    } catch {
      toast.error('Failed to load vendors');
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (vendorData) => {
    const tid = toast.loading(editingVendor ? 'Updating…' : 'Adding vendor…');
    try {
      if (editingVendor) {
        await Vendor.update(editingVendor.id, vendorData);
        toast.success('Vendor updated', { id: tid });
      } else {
        await Vendor.create({ ...vendorData, category });
        toast.success('Vendor added', { id: tid });
      }
      setShowForm(false);
      setEditingVendor(null);
      load();
    } catch {
      toast.error('Failed to save vendor', { id: tid });
    }
  };

  const handleEdit = (vendor) => { setEditingVendor(vendor); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor?')) return;
    const tid = toast.loading('Deleting…');
    try {
      await Vendor.delete(id);
      toast.success('Vendor deleted', { id: tid });
      setVendors(prev => prev.filter(v => v.id !== id));
    } catch {
      toast.error('Failed to delete', { id: tid });
    }
  };

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setEditingVendor(null); setShowForm(true); }}
            className="btn-primary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={13} />Add {label} vendor
          </button>
        </div>
      )}
      {vendors.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, textAlign: 'center', padding: '40px 0' }}>
          No {label} vendors added yet.{!readOnly && ` Click "Add ${label} vendor" to get started.`}
        </p>
      ) : (
        <VendorList vendors={vendors} onEdit={readOnly ? undefined : handleEdit} onDelete={readOnly ? undefined : handleDelete} />
      )}

      <VendorFormModal
        open={showForm}
        vendor={editingVendor}
        defaultCategory={category}
        onSubmit={handleSubmit}
        onCancel={() => { setShowForm(false); setEditingVendor(null); }}
      />
    </div>
  );
}
