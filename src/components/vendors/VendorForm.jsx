import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES = [
  { value: "venue",          label: "Venue" },
  { value: "catering",       label: "Catering" },
  { value: "photography",    label: "Photography" },
  { value: "videography",    label: "Videography" },
  { value: "flowers",        label: "Flowers & florist" },
  { value: "music",          label: "Music & DJ" },
  { value: "bakery",         label: "Bakery & cake" },
  { value: "transportation", label: "Transportation" },
  { value: "beauty",         label: "Beauty & hair" },
  { value: "attire",         label: "Attire & fashion" },
  { value: "planning",       label: "Wedding planning" },
  { value: "decorations",    label: "Decorations" },
  { value: "entertainment",  label: "Entertainment" },
  { value: "other",          label: "Other" },
];

const STATUSES = [
  { value: "researching",       label: "Researching" },
  { value: "contacted",         label: "Contacted" },
  { value: "meeting_scheduled", label: "Meeting scheduled" },
  { value: "quoted",            label: "Quoted" },
  { value: "booked",            label: "Booked" },
  { value: "rejected",          label: "Rejected" },
];

const PRICE_RANGES = [
  { value: "$",    label: "$ — Budget friendly" },
  { value: "$$",   label: "$$ — Moderate" },
  { value: "$$$",  label: "$$$ — Premium" },
  { value: "$$$$", label: "$$$$ — Luxury" },
];

const PHOTO_STYLES = [
  { value: "candid", label: "Candid" },
  { value: "traditional", label: "Traditional" },
  { value: "artistic", label: "Artistic" },
  { value: "documentary", label: "Documentary" },
  { value: "cinematic", label: "Cinematic" },
  { value: "vintage", label: "Vintage" },
  { value: "modern", label: "Modern" },
  { value: "natural", label: "Natural" },
];

const BLANK_VENDOR = {
  name: "", category: "", contact_person: "", phone: "", email: "",
  website: "", address: "", rating: "", price_range: "",
  status: "researching", quoted_price: "", contract_date: "",
  payment_schedule: "", notes: "",
  // Photography/videography-only fields — see the section rendered below,
  // conditional on category. Kept on every vendor's formData regardless of
  // category so switching category back and forth doesn't drop whatever
  // was already typed.
  instagram: "", reviews_count: "", starting_price: "", package_selected: "",
  hours_booked: "", booking_date: "", start_time: "", end_time: "", meeting_date: "",
  contract_signed: false, deposit_paid: false, deposit_amount: "",
  style: [], portfolio_url: "", sample_work: "", services_offered: "",
  equipment: "", backup_equipment: false, second_shooter: false,
  delivery_timeline: "", image_count: "", video_length: "", editing_style: "",
  travel_fee: "", cancellation_policy: "", special_requests: "",
};

// services_offered/sample_work are stored as arrays but edited as one
// textarea each (comma-separated / one-per-line) — convert on the way in,
// split back out on submit (see handleSubmit).
function toFormData(vendor, defaultCategory) {
  if (!vendor) return { ...BLANK_VENDOR, category: defaultCategory || "" };
  return {
    ...BLANK_VENDOR,
    ...vendor,
    services_offered: Array.isArray(vendor.services_offered) ? vendor.services_offered.join(', ') : (vendor.services_offered || ""),
    sample_work: Array.isArray(vendor.sample_work) ? vendor.sample_work.join('\n') : (vendor.sample_work || ""),
    style: Array.isArray(vendor.style) ? vendor.style : [],
  };
}

export default function VendorForm({ vendor, onSubmit, onCancel, defaultCategory }) {
  const [formData, setFormData] = useState(() => toFormData(vendor, defaultCategory));

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const toggleStyle = (s) => {
    const cur = formData.style || [];
    set('style', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  };

  const isPhotoOrVideo = formData.category === 'photography' || formData.category === 'videography';

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = (v) => (v === '' || v == null ? null : parseFloat(v));
    onSubmit({
      ...formData,
      rating: num(formData.rating),
      quoted_price: num(formData.quoted_price),
      // Only sent when actually relevant — keeps a non-photography vendor's
      // record free of empty photography fields rather than writing nulls
      // for two dozen fields it'll never use.
      ...(isPhotoOrVideo ? {
        reviews_count: num(formData.reviews_count),
        starting_price: num(formData.starting_price),
        hours_booked: num(formData.hours_booked),
        deposit_amount: num(formData.deposit_amount),
        image_count: num(formData.image_count),
        travel_fee: num(formData.travel_fee),
        services_offered: formData.services_offered
          ? formData.services_offered.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        sample_work: formData.sample_work
          ? formData.sample_work.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
      } : {}),
    });
  };

  return (
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 32px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
            <Label htmlFor="name">Business name *</Label>
            <Input id="name" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Vendor or business name" required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Category *</Label>
            {defaultCategory ? (
              <div style={{ borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
                {CATEGORIES.find(c => c.value === defaultCategory)?.label || defaultCategory}
                <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontWeight: 400 }}>pre-selected</span>
              </div>
            ) : (
              <Select value={formData.category} onValueChange={v => set('category', v)} required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="contact_person">Contact person</Label>
            <Input id="contact_person" value={formData.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Primary contact name" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="Email address" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={formData.website} onChange={e => set('website', e.target.value)} placeholder="Website URL" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={formData.address} onChange={e => set('address', e.target.value)} placeholder="Street address or city" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="quoted_price">Quoted price</Label>
            <Input id="quoted_price" type="number" step="0.01" min="0" value={formData.quoted_price} onChange={e => set('quoted_price', e.target.value)} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Price range</Label>
            <Select value={formData.price_range} onValueChange={v => set('price_range', v)}>
              <SelectTrigger><SelectValue placeholder="Select price range" /></SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="rating">Rating (1–5)</Label>
            <Input id="rating" type="number" min="1" max="5" step="0.1" value={formData.rating} onChange={e => set('rating', e.target.value)} placeholder="e.g. 4.8" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="contract_date">Contract date</Label>
            <Input id="contract_date" type="date" value={formData.contract_date} onChange={e => set('contract_date', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="payment_schedule">Payment schedule</Label>
            <Input id="payment_schedule" value={formData.payment_schedule} onChange={e => set('payment_schedule', e.target.value)} placeholder="e.g. 50% deposit, 50% on wedding day" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this vendor" />
          </div>
        </div>

        {isPhotoOrVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <Label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)' }}>
              Photography &amp; videography details
            </Label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" value={formData.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@handle" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="reviews_count">Reviews count</Label>
                <Input id="reviews_count" type="number" min="0" value={formData.reviews_count} onChange={e => set('reviews_count', e.target.value)} placeholder="0" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="starting_price">Starting price</Label>
                <Input id="starting_price" type="number" step="0.01" min="0" value={formData.starting_price} onChange={e => set('starting_price', e.target.value)} placeholder="0.00" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="package_selected">Package selected</Label>
                <Input id="package_selected" value={formData.package_selected} onChange={e => set('package_selected', e.target.value)} placeholder="Package name" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="hours_booked">Hours booked</Label>
                <Input id="hours_booked" type="number" min="0" value={formData.hours_booked} onChange={e => set('hours_booked', e.target.value)} placeholder="Hours" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="booking_date">Booking date</Label>
                <Input id="booking_date" type="date" value={formData.booking_date} onChange={e => set('booking_date', e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="start_time">Start time</Label>
                <Input id="start_time" value={formData.start_time} onChange={e => set('start_time', e.target.value)} placeholder="e.g. 14:00" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="end_time">End time</Label>
                <Input id="end_time" value={formData.end_time} onChange={e => set('end_time', e.target.value)} placeholder="e.g. 22:00" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="meeting_date">Meeting date</Label>
                <Input id="meeting_date" type="datetime-local" value={formData.meeting_date} onChange={e => set('meeting_date', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="deposit_amount">Deposit amount</Label>
                <Input id="deposit_amount" type="number" step="0.01" min="0" value={formData.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} placeholder="0.00" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                <Input id="portfolio_url" value={formData.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="Portfolio website URL" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="delivery_timeline">Delivery timeline</Label>
                <Input id="delivery_timeline" value={formData.delivery_timeline} onChange={e => set('delivery_timeline', e.target.value)} placeholder="e.g. 4-6 weeks" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="image_count">Edited image count</Label>
                <Input id="image_count" type="number" min="0" value={formData.image_count} onChange={e => set('image_count', e.target.value)} placeholder="Number of images" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="video_length">Video length</Label>
                <Input id="video_length" value={formData.video_length} onChange={e => set('video_length', e.target.value)} placeholder="e.g. 3-5 minute highlight reel" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="editing_style">Editing style</Label>
                <Input id="editing_style" value={formData.editing_style} onChange={e => set('editing_style', e.target.value)} placeholder="e.g. bright & airy" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="travel_fee">Travel fee</Label>
                <Input id="travel_fee" type="number" step="0.01" min="0" value={formData.travel_fee} onChange={e => set('travel_fee', e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Style</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PHOTO_STYLES.map(s => {
                  const active = (formData.style || []).includes(s.value);
                  return (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => toggleStyle(s.value)}
                      className={active ? 'btn-primary' : 'btn-editorial-secondary'}
                      style={{ fontSize: 12, padding: '5px 12px' }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="equipment">Equipment</Label>
              <Textarea id="equipment" value={formData.equipment} onChange={e => set('equipment', e.target.value)} placeholder="Camera equipment and gear used" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="services_offered">Services offered</Label>
              <Input id="services_offered" value={formData.services_offered} onChange={e => set('services_offered', e.target.value)} placeholder="Comma-separated, e.g. engagement shoot, albums, prints" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="sample_work">Sample work</Label>
              <Textarea id="sample_work" value={formData.sample_work} onChange={e => set('sample_work', e.target.value)} placeholder="One image URL per line" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="cancellation_policy">Cancellation policy</Label>
              <Textarea id="cancellation_policy" value={formData.cancellation_policy} onChange={e => set('cancellation_policy', e.target.value)} placeholder="Cancellation policy details" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="special_requests">Special requests</Label>
              <Textarea id="special_requests" value={formData.special_requests} onChange={e => set('special_requests', e.target.value)} placeholder="Special requests or must-have shots" />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Checkbox checked={formData.contract_signed} onCheckedChange={v => set('contract_signed', !!v)} />
                <span style={{ fontSize: 13 }}>Contract signed</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Checkbox checked={formData.deposit_paid} onCheckedChange={v => set('deposit_paid', !!v)} />
                <span style={{ fontSize: 13 }}>Deposit paid</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Checkbox checked={formData.backup_equipment} onCheckedChange={v => set('backup_equipment', !!v)} />
                <span style={{ fontSize: 13 }}>Backup equipment</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Checkbox checked={formData.second_shooter} onCheckedChange={v => set('second_shooter', !!v)} />
                <span style={{ fontSize: 13 }}>Second shooter</span>
              </label>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{vendor?.id ? 'Update vendor' : 'Add vendor'}</button>
        </div>
      </form>
  );
}
