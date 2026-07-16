import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import {
  MockPageHeader, MockTabBar, AccordionSection, VendorTabMock, NotesTabMock, ConsiderationsTabMock,
  PJS, labelStyle, inputStyle, SAMPLE_MY_VENDORS,
} from '@/components/mocks/VendorTemplateMock';

const TABS = [
  { key: 'food', label: 'Food & beverage' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'notes', label: 'Notes' },
  { key: 'considerations', label: 'Considerations' },
];

const SERVICE_STYLES = [
  { value: 'plated', label: 'Plated' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'stations', label: 'Food stations' },
  { value: 'family_style', label: 'Family style' },
];

const BAR_TYPES = [
  { value: 'full_bar', label: 'Full bar' },
  { value: 'beer_wine', label: 'Beer & wine only' },
  { value: 'dry', label: 'Dry (no alcohol)' },
  { value: 'byo', label: 'BYO' },
];

const FILLED_DATA = {
  serviceStyle: 'buffet',
  dietaryRequirements: '3 vegetarian, 2 gluten free, 1 nut allergy — see guest list for details.',
  menuItems: [
    { name: 'Herb-crusted lamb', description: 'With rosemary jus and roasted seasonal vegetables' },
    { name: 'Pan-seared salmon', description: 'With lemon butter sauce and asparagus' },
    { name: 'Wild mushroom risotto', description: 'Vegetarian, finished with truffle oil' },
  ],
  weddingCakeDetails: 'Three-tier naked cake, vanilla and lemon layers, fresh flowers — from Sweet Layers Bakery.',
  barType: 'full_bar',
  signatureCocktail: "Rosé spritz — the couple's go-to summer drink.",
  barNotes: 'Open bar 5–11pm, champagne toast at speeches, dry-friendly mocktail option available.',
  additionalNotes: 'Caterer needs final numbers 2 weeks out. Confirm cake delivery time with venue coordinator.',
};

const EMPTY_DATA = {
  serviceStyle: '', dietaryRequirements: '', menuItems: [], weddingCakeDetails: '',
  barType: '', signatureCocktail: '', barNotes: '', additionalNotes: '',
};

export default function MockVendorTemplateFoodBeverage() {
  const [filled, setFilled] = useState(true);
  const [tab, setTab] = useState('food');
  const [vendor, setVendor] = useState(SAMPLE_MY_VENDORS.find(v => v.category === 'catering' && v.status === 'booked') || null);
  const [data, setData] = useState(FILLED_DATA);

  const toggleFilled = () => {
    const next = !filled;
    setFilled(next);
    setData(next ? FILLED_DATA : EMPTY_DATA);
    setVendor(next ? (SAMPLE_MY_VENDORS.find(v => v.category === 'catering' && v.status === 'booked') || null) : null);
  };

  const update = (patch) => setData(prev => ({ ...prev, ...patch }));

  const cateringSummary = data.serviceStyle || data.dietaryRequirements
    ? [
        data.serviceStyle && (SERVICE_STYLES.find(s => s.value === data.serviceStyle)?.label),
        data.dietaryRequirements && 'dietary needs noted',
      ].filter(Boolean).join(' · ')
    : 'Not started';

  const menuSummary = data.menuItems.length > 0 || data.weddingCakeDetails
    ? [
        data.menuItems.length > 0 && `${data.menuItems.length} menu item${data.menuItems.length === 1 ? '' : 's'}`,
        data.weddingCakeDetails && 'cake details added',
      ].filter(Boolean).join(' · ')
    : 'Nothing added yet';

  const barSummary = data.barType || data.signatureCocktail
    ? [
        data.barType && (BAR_TYPES.find(b => b.value === data.barType)?.label),
        data.signatureCocktail && `signature cocktail: ${data.signatureCocktail.split('—')[0].trim()}`,
      ].filter(Boolean).join(' · ')
    : 'Not started';

  const updateMenuItem = (i, field, val) => update({ menuItems: data.menuItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item) });
  const removeMenuItem = (i) => update({ menuItems: data.menuItems.filter((_, idx) => idx !== i) });
  const addMenuItem = () => update({ menuItems: [...data.menuItems, { name: '', description: '' }] });

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{ padding: '10px 32px', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>MOCK — vendor template preview (Food & beverage)</span>
        <button onClick={toggleFilled} className="btn-editorial-secondary" style={{ fontSize: 11 }}>
          {filled ? 'Show empty (first-time) state' : 'Show filled example'}
        </button>
      </div>

      <MockPageHeader title="Food & beverage" subtitle="Plan your wedding catering, menu, and bar" />
      <MockTabBar tabs={TABS} active={tab} onChange={setTab} />

      <div style={{ padding: '32px 32px 48px' }}>
        {tab === 'food' && (
          <div style={{ maxWidth: 760 }}>
            <AccordionSection title="Catering" summary={cateringSummary}>
              <div>
                <label style={labelStyle}>Service style</label>
                <div style={{ marginTop: 6 }}>
                  <Select value={data.serviceStyle} onValueChange={v => update({ serviceStyle: v })}>
                    <SelectTrigger><SelectValue placeholder="Select style…" /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Dietary requirements overview</label>
                <textarea style={{ ...inputStyle, marginTop: 6, resize: 'vertical', minHeight: 60 }} value={data.dietaryRequirements} onChange={e => update({ dietaryRequirements: e.target.value })} placeholder="Overall dietary needs for guest list…" />
              </div>
            </AccordionSection>

            <AccordionSection title="Menu" summary={menuSummary}>
              <div>
                <label style={labelStyle}>Menu items</label>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.menuItems.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'flex-end' }}>
                      <input value={item.name} onChange={e => updateMenuItem(i, 'name', e.target.value)} placeholder="Item name" style={inputStyle} />
                      <input value={item.description} onChange={e => updateMenuItem(i, 'description', e.target.value)} placeholder="Description" style={inputStyle} />
                      <button onClick={() => removeMenuItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', display: 'flex', padding: '0 0 7px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={addMenuItem} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: PJS, width: 'fit-content' }}>
                    <Plus size={12} />Add menu item
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Wedding cake details</label>
                <textarea style={{ ...inputStyle, marginTop: 6, resize: 'vertical', minHeight: 60 }} value={data.weddingCakeDetails} onChange={e => update({ weddingCakeDetails: e.target.value })} placeholder="Flavour, design, tiers, baker…" />
              </div>
            </AccordionSection>

            <AccordionSection title="Bar & drinks" summary={barSummary}>
              <div>
                <label style={labelStyle}>Bar type</label>
                <div style={{ marginTop: 6 }}>
                  <Select value={data.barType} onValueChange={v => update({ barType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {BAR_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Signature cocktail</label>
                <input style={{ ...inputStyle, marginTop: 6 }} value={data.signatureCocktail} onChange={e => update({ signatureCocktail: e.target.value })} placeholder="Name and description of your signature drink" />
              </div>
              <div>
                <label style={labelStyle}>Drinks & bar notes</label>
                <textarea style={{ ...inputStyle, marginTop: 6, resize: 'vertical', minHeight: 60 }} value={data.barNotes} onChange={e => update({ barNotes: e.target.value })} placeholder="Open bar hours, wine selection, champagne toast…" />
              </div>
            </AccordionSection>
          </div>
        )}

        {tab === 'vendor' && (
          <VendorTabMock category="catering" vendor={vendor} setVendor={setVendor} myVendors={SAMPLE_MY_VENDORS} />
        )}

        {tab === 'notes' && (
          <NotesTabMock value={data.additionalNotes} onChange={v => update({ additionalNotes: v })} placeholder="Anything else your caterer should know…" />
        )}

        {tab === 'considerations' && <ConsiderationsTabMock pageKey="food" />}
      </div>
    </div>
  );
}
