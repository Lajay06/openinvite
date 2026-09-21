import React, { useState } from 'react';
import { Plus, Store, X } from 'lucide-react';
import { SelectField, PillButton } from '../ui';
import FormSheet from './FormSheet';
import { useEntity } from '../data/plan';
import { vendorFields } from './vendorFields';

/**
 * The desktop's VendorContactSection: a section stores only a vendorId and
 * the contact details live on the Vendor record. Pick one of the couple's
 * vendors in this category, any vendor, or add a new one through the same
 * form My vendors uses (Vendor.create with the category preset).
 */
export default function VendorPickerField({ label, category, value, onChange }) {
  const vendors = useEntity('Vendor', '-created_date');
  const [adding, setAdding] = useState(false);
  const list = vendors.data || [];
  const inCategory = list.filter((v) => v.category === category);
  const others = list.filter((v) => v.category !== category);
  const chosen = list.find((v) => v.id === value);
  const options = [
    ...inCategory.map((v) => ({ value: v.id, label: v.name })),
    ...others.map((v) => ({ value: v.id, label: `${v.name} (${v.category})` })),
  ];
  return (
    <div className="oi-m-field">
      <SelectField label={label} value={value || ''} onChange={(e) => onChange(e.target.value)} options={options} placeholder={list.length ? 'Choose a vendor' : 'No vendors yet'} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <PillButton variant="secondary" size="sm" icon={Plus} onClick={() => setAdding(true)}>Add a vendor</PillButton>
        {chosen && <PillButton variant="ghost" size="sm" icon={X} onClick={() => onChange('')}>Clear</PillButton>}
        {chosen?.phone && <span className="oi-m-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Store size={13} /> {chosen.phone}</span>}
      </div>
      <FormSheet
        open={adding}
        full
        title="Add a vendor"
        fields={vendorFields(category)}
        initial={{ category, status: 'researching' }}
        required={['name', 'category']}
        onClose={() => setAdding(false)}
        onSave={async (values) => { const saved = await vendors.create(values); onChange(saved.id); }}
        saveLabel="Add vendor"
      />
    </div>
  );
}
