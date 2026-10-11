import React, { useState, useEffect, useRef } from "react";
import AvaModal from '@/components/layout/AvaModal';
import toast from 'react-hot-toast';
import { Loader2, X, FileText, Check, Plus, Phone, Users, Building2 } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { getMyWeddingDetails, putMyWeddingDetails, getMyRecords } from "@/lib/resolveMyWedding";
import { contactFromVendor, blankContact, ADD_VENDOR_LABEL, ADD_CONTACT_LABEL } from '@/components/vendors/vendorPicks';
import AvaButton from '@/components/shared/AvaButton';


const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const AVA_PROMPTS = [
  "What contacts should every wedding couple have on hand on the day?",
  "How do I brief my day-of coordinator?",
  "What should I include in an emergency kit for the wedding day?",
  "Who should be my primary point of contact on the wedding day?",
];


const TABS = [
  { key: 'contacts', label: 'Contacts' },
  { key: 'vendors',  label: 'Vendors' },
  { key: 'notes',    label: 'Notes' },
];

export default function EmergencyContactPage() {
  const [data, setData] = useState({});
  const [vendorContacts, setVendorContacts] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');
  // ── THE VENDOR LIST, FOR PICKING ──────────────────────────────────────
  //
  // Item 1 of goals/2026-10-11-dashboard-fixes-batch-1.md. This page keeps
  // its own free array (dayVendorContacts) because the people a couple needs
  // on the day are not all vendors, which is the owner's ruling. What it
  // gains is the ability to pick one of the vendors it already knows about
  // instead of retyping a number that is already in the system.
  const [vendorChoices, setVendorChoices] = useState([]);
  const [picking, setPicking] = useState(false);
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setData(r.emergencyContacts || {});
      setVendorContacts(r.dayVendorContacts || []);
      setRecordId(r.id || null);
      latestRef.current = r;
      // Best effort: an empty list only means there is nobody to pick yet,
      // and the free-text action does not depend on it.
      getMyRecords('Vendor').then(setVendorChoices).catch(() => {});
    } catch (e) { console.error(e); toast.error('Failed to load — please refresh and try again.'); }
    setLoading(false);
  };

  // Both of this page's fields are AES-256-GCM ciphertext at rest (Step 2b),
  // so they can only be written server-side — encrypting needs
  // BASE44_ADMIN_KEY, which the browser never holds. putMyWeddingDetails()
  // sends both in ONE request: two separate calls on a first-ever save would
  // each find no record and each create one. It also creates the record when
  // the couple has none yet, which is why there is no create branch here any
  // more.
  const persist = (dataOverride, vendorsOverride) => {
    const full = { emergencyContacts: dataOverride ?? data, dayVendorContacts: vendorsOverride ?? vendorContacts };
    latestRef.current = { ...latestRef.current, ...full };
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        const id = await putMyWeddingDetails(full);
        if (!recordId) {
          setRecordId(id);
          latestRef.current = { ...latestRef.current, id };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('[EmergencyContact] save failed:', e.message);
        setSaveStatus('idle');
        toast.error('Save failed. Please try again.');
      }
    }, 1200);
  };

  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    persist(next, null);
  };

  const updateNested = (key, patch) => {
    update({ [key]: { ...(data[key] || {}), ...patch } });
  };

  /** The free-text action: one blank row to fill in. */
  const addContact = () => {
    const updated = [...vendorContacts, blankContact()];
    setVendorContacts(updated);
    persist(null, updated);
  };

  /**
   * The pick action: name and phone copied in from a Vendor row, role
   * prefilled from its category, every field still editable afterwards.
   * contactFromVendor is the one place that decides what travels.
   */
  const addFromVendor = (vendorId) => {
    const vendor = vendorChoices.find(v => v.id === vendorId);
    if (!vendor) return;
    const updated = [...vendorContacts, contactFromVendor(vendor)];
    setVendorContacts(updated);
    setPicking(false);
    persist(null, updated);
  };

  const removeVendor = (i) => {
    const updated = vendorContacts.filter((_, idx) => idx !== i);
    setVendorContacts(updated);
    persist(null, updated);
  };

  const updateVendor = (i, field, val) => {
    const updated = vendorContacts.map((v, idx) => idx === i ? { ...v, [field]: val } : v);
    setVendorContacts(updated);
    persist(null, updated);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  const primary = data.primary || {};
  const backup = data.backup || {};
  const venue = data.venue || {};

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Emergency contacts" subtitle="Key contacts and vendor numbers for the wedding day" />

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava about who to have on hand" onClick={() => setShowAva(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.6)', minWidth: 80 }}>
          {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
          {saveStatus === 'saved' && <><Check size={12} />Saved</>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', padding: '0 32px' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? '#E03553' : '#444444',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* FULL WIDTH, item 9 of goals/2026-10-08-site-fixes-batch-1.md. This
          page capped its tab content at 760px and centred it while Getting
          here and Stay, reached from the same sidebar group, ran full width:
          four pages in one section, two of each. The ruling is full width
          everywhere, matching the larger half of the dashboard (Budget,
          Dashboard, Music, Food & beverage, Guests and the rest). */}
      <div style={{ padding: '32px 32px 48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Contacts tab: primary + backup + venue */}
          {activeTab === 'contacts' && (
          <>
          <DetailsSection title="On-the-day contact" icon={Phone}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Name" value={primary.name} onChange={e => updateNested('primary', { name: e.target.value })} placeholder="Full name" />
              <SectionInput label="Phone" value={primary.phone} onChange={e => updateNested('primary', { phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <SectionInput label="Role / relationship" value={primary.role} onChange={e => updateNested('primary', { role: e.target.value })} placeholder="e.g. Maid of honor, wedding planner" />
          </DetailsSection>

          <DetailsSection title="Backup contact" icon={Users}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Name" value={backup.name} onChange={e => updateNested('backup', { name: e.target.value })} placeholder="Full name" />
              <SectionInput label="Phone" value={backup.phone} onChange={e => updateNested('backup', { phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <SectionInput label="Role / relationship" value={backup.role} onChange={e => updateNested('backup', { role: e.target.value })} placeholder="e.g. Best man, parent" />
          </DetailsSection>

          <DetailsSection title="Venue contact" icon={Building2}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Venue coordinator name" value={venue.name} onChange={e => updateNested('venue', { name: e.target.value })} />
              <SectionInput label="Phone" value={venue.phone} onChange={e => updateNested('venue', { phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
          </DetailsSection>
          </>
          )}

          {/* Vendor contacts */}
          {activeTab === 'vendors' && (
          <DetailsSection title="Key vendors on the day" icon={Phone}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vendorContacts.map((v, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <input value={v.name || ''} onChange={e => updateVendor(i, 'name', e.target.value)} placeholder="Vendor name"
                    style={inputStyle} />
                  <input value={v.phone || ''} onChange={e => updateVendor(i, 'phone', e.target.value)} placeholder="Phone"
                    style={inputStyle} />
                  <input value={v.role || ''} onChange={e => updateVendor(i, 'role', e.target.value)} placeholder="Role"
                    style={inputStyle} />
                  <button onClick={() => removeVendor(i)} aria-label="Remove vendor contact" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: '0 0 7px' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {/* ── TWO ACTIONS, AND "Add vendor" LEADS ───────────────────────
                  Item 1's one-for-one promise: every add control on every
                  surface leads with "Add vendor". Here that action picks from
                  the vendors the couple already has, and "Add contact" is the
                  free-text row for the aunt with the spare veil. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <button data-add-vendor onClick={() => setPicking(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content' }}>
                  <Plus size={12} />{ADD_VENDOR_LABEL}
                </button>
                <button data-add-contact onClick={addContact}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontWeight: 700, background: 'none', border: '1px dashed rgba(10,10,10,0.2)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content' }}>
                  <Plus size={12} />{ADD_CONTACT_LABEL}
                </button>
              </div>
              {picking && (
                <div data-vendor-pick style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {vendorChoices.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                      No vendors saved yet. Add them on the Vendors page, or use Add contact.
                    </p>
                  ) : vendorChoices.map(v => (
                    <button key={v.id} onClick={() => addFromVendor(v.id)}
                      style={{ textAlign: 'left', background: 'none', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#0A0A0A' }}>
                      {v.name}{v.category ? ` · ${v.category}` : ''}{v.phone ? ` · ${v.phone}` : ' · no number saved'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DetailsSection>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Other emergency notes" isTextarea value={data.otherNotes} onChange={e => update({ otherNotes: e.target.value })} placeholder="Medical contacts, allergy kit location, nearby hospital…" />
          </DetailsSection>
          )}
        </div>
      </div>

      {/* ONE SHELL (owner ruling, Run 5 T3). This page carried its own navy
          dialog — the fourth Ava — whose InvokeLLM call sent
          "<context>: <question>" and nothing else: no wedding, no history, no
          action mirror. So the window with the most confident branding knew
          the least about the couple. Its four prompts are not lost; they are
          the quick actions below, answered by the shell that reads the
          couple's actual record. */}
      <AvaModal
        isOpen={showAva}
        onClose={() => setShowAva(false)}
        pageTitle="Emergency contacts"
        systemPrompt="You are Ava, helping a couple plan who the couple can reach on the day, and what to have ready before it. Answer from what their record already says where it says anything, and keep it to what they can act on next."
        quickActions={AVA_PROMPTS}
      />
    </div>
  );
}
