import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Camera } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const STYLES = ['candid', 'traditional', 'artistic', 'documentary', 'cinematic', 'vintage', 'modern', 'natural'];

function PillToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <button type="button" onClick={() => onChange(!value)}
        style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content',
          background: value ? '#0A0A0A' : 'transparent',
          color: value ? '#FFFFFF' : '#0A0A0A',
          border: `1.5px solid ${value ? '#0A0A0A' : 'rgba(10,10,10,0.2)'}`,
        }}>
        {value ? 'Yes' : 'No'}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function PhotographerForm({ photographer, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(photographer || {
    name: "", type: "photographer", contact_person: "", phone: "", email: "",
    website: "", instagram: "", address: "", status: "researching",
    starting_price: "", quoted_price: "", package_selected: "", hours_booked: "",
    booking_date: "", start_time: "", end_time: "", meeting_date: "",
    contract_signed: false, deposit_paid: false, deposit_amount: "",
    style: [], portfolio_url: "", equipment: "", backup_equipment: false,
    second_shooter: false, delivery_timeline: "", image_count: "", video_length: "",
    editing_style: "", travel_fee: "", special_requests: "", notes: "",
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const toggleStyle = (s) => {
    const cur = formData.style || [];
    set('style', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      starting_price: formData.starting_price ? parseFloat(formData.starting_price) : undefined,
      quoted_price: formData.quoted_price ? parseFloat(formData.quoted_price) : undefined,
      hours_booked: formData.hours_booked ? parseInt(formData.hours_booked) : undefined,
      deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : undefined,
      image_count: formData.image_count ? parseInt(formData.image_count) : undefined,
      travel_fee: formData.travel_fee ? parseFloat(formData.travel_fee) : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:opacity-100">
        {/* Header — kept as its own dark-navy band (distinct from the plain
            white headers elsewhere) since this form covers two roles
            (photographer/videographer) across a long field set; not part
            of the round-6 modal-consistency sweep's centering/backdrop/
            radius fixes, which this Dialog migration already covers. */}
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={16} style={{ color: '#DDF762' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {photographer ? 'Edit professional' : 'Add photographer / videographer'}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Basic info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Basic information</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Business / professional name *">
                <input required style={inputStyle} value={formData.name} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Service type *">
                <Select value={formData.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photographer">Photographer</SelectItem>
                    <SelectItem value="videographer">Videographer</SelectItem>
                    <SelectItem value="both">Photography & videography</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Contact person">
                <input style={inputStyle} value={formData.contact_person} onChange={e => set('contact_person', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input style={inputStyle} value={formData.phone} onChange={e => set('phone', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Email">
                <input type="email" style={inputStyle} value={formData.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Instagram">
                <input style={inputStyle} placeholder="@username" value={formData.instagram} onChange={e => set('instagram', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Website">
                <input type="url" style={inputStyle} value={formData.website} onChange={e => set('website', e.target.value)} />
              </Field>
              <Field label="Portfolio URL">
                <input type="url" style={inputStyle} value={formData.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} />
              </Field>
            </div>
            <Field label="Address / location">
              <input style={inputStyle} value={formData.address} onChange={e => set('address', e.target.value)} />
            </Field>
          </div>

          <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }} />

          {/* Style */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Style & preferences</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Photography / videography style</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STYLES.map(s => {
                  const active = (formData.style || []).includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleStyle(s)}
                      style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: active ? '#0A0A0A' : 'transparent',
                        color: active ? '#FFFFFF' : '#0A0A0A',
                        border: `1.5px solid ${active ? '#0A0A0A' : 'rgba(10,10,10,0.2)'}`,
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Editing style">
              <input style={inputStyle} placeholder="e.g., Light & airy, moody, vibrant" value={formData.editing_style} onChange={e => set('editing_style', e.target.value)} />
            </Field>
          </div>

          <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }} />

          {/* Booking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Booking details</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Status">
                <Select value={formData.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="researching">Researching</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="meeting_scheduled">Meeting scheduled</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Package">
                <input style={inputStyle} placeholder="e.g., Full day coverage" value={formData.package_selected} onChange={e => set('package_selected', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Starting price ($)">
                <input type="number" step="0.01" style={inputStyle} value={formData.starting_price} onChange={e => set('starting_price', e.target.value)} />
              </Field>
              <Field label="Quoted price ($)">
                <input type="number" step="0.01" style={inputStyle} value={formData.quoted_price} onChange={e => set('quoted_price', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Booking date">
                <input type="date" style={inputStyle} value={formData.booking_date} onChange={e => set('booking_date', e.target.value)} />
              </Field>
              <Field label="Hours booked">
                <input type="number" style={inputStyle} placeholder="e.g., 8" value={formData.hours_booked} onChange={e => set('hours_booked', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Start time">
                <input type="time" style={inputStyle} value={formData.start_time} onChange={e => set('start_time', e.target.value)} />
              </Field>
              <Field label="End time">
                <input type="time" style={inputStyle} value={formData.end_time} onChange={e => set('end_time', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PillToggle label="Contract signed" value={formData.contract_signed} onChange={v => set('contract_signed', v)} />
              <PillToggle label="Deposit paid" value={formData.deposit_paid} onChange={v => set('deposit_paid', v)} />
            </div>
            {formData.deposit_paid && (
              <Field label="Deposit amount ($)">
                <input type="number" step="0.01" style={inputStyle} value={formData.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} />
              </Field>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }} />

          {/* Deliverables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Deliverables & details</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Edited images count">
                <input type="number" style={inputStyle} value={formData.image_count} onChange={e => set('image_count', e.target.value)} />
              </Field>
              <Field label="Video length">
                <input style={inputStyle} placeholder="e.g., 3-5 minute highlight" value={formData.video_length} onChange={e => set('video_length', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Delivery timeline">
                <input style={inputStyle} placeholder="e.g., 4-6 weeks" value={formData.delivery_timeline} onChange={e => set('delivery_timeline', e.target.value)} />
              </Field>
              <Field label="Travel fee ($)">
                <input type="number" step="0.01" style={inputStyle} value={formData.travel_fee} onChange={e => set('travel_fee', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PillToggle label="Includes second shooter" value={formData.second_shooter} onChange={v => set('second_shooter', v)} />
              <PillToggle label="Has backup equipment" value={formData.backup_equipment} onChange={v => set('backup_equipment', v)} />
            </div>
            <Field label="Special requests / must-have shots">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="List specific shots or moments you want captured..."
                value={formData.special_requests} onChange={e => set('special_requests', e.target.value)} />
            </Field>
            <Field label="Internal notes">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                placeholder="Any additional notes..."
                value={formData.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <button type="button" onClick={onCancel} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={13} />{photographer ? 'Update' : 'Add photographer'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
