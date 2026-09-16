import React, { useState, useEffect, useRef } from "react";
import AvaModal from '@/components/layout/AvaModal';
import toast from 'react-hot-toast';
import { Loader2, Search, FileText, Check, Music4, Mic2, Sparkles } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import AvaButton from '@/components/shared/AvaButton';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { createMyWeddingDetails } from '@/lib/createMyWeddingDetails';
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

function GoogleField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input style={{ ...inputStyle, flex: 1 }} value={value || ''} onChange={onChange} placeholder={placeholder} />
        {value && (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(value)}`} target="_blank" rel="noopener noreferrer"
            title="Search on Google"
            style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: 7 }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.45)'}>
            <Search size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

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

const AVA_PROMPTS = [
  "What should I look for when hiring a wedding DJ?",
  "Suggest unique entertainment ideas beyond a DJ or band",
  "How do I build a do-not-play list for my wedding?",
  "What's the difference between a band and DJ for weddings?",
];


const TABS = [
  { key: 'music', label: 'Music & DJ' },
  { key: 'mc',    label: 'MC & host' },
  { key: 'extras',label: 'Entertainment extras' },
  { key: 'notes', label: 'Notes' },
];

export default function EntertainmentDetailsPage() {
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('music');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setData(r.entertainmentDetails || {});
      setRecordId(r.id || null);
      latestRef.current = r;
    } catch (e) { console.error(e); toast.error('Failed to load — please refresh and try again.'); }
    setLoading(false);
  };

  const persist = (full) => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        if (recordId) {
          await WeddingDetails.update(recordId, full);
        } else {
          const c = await createMyWeddingDetails(full);
          setRecordId(c.id);
          latestRef.current = { ...full, id: c.id };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); toast.error('Save failed. Please try again.'); }
    }, 1200);
  };

  // persist() writes only this page's own field — a full-object write would
  // silently clobber whatever another page currently holds in local state
  // (e.g. an encrypted budget/contactPerson decrypted into that page's
  // memory).
  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    latestRef.current = { ...latestRef.current, entertainmentDetails: next };
    persist({ entertainmentDetails: next });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Entertainment" subtitle="Plan your music, performances, and wedding atmosphere" />

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava about your entertainment" onClick={() => setShowAva(true)} />
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

      <div style={{ padding: '32px 32px 48px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Music & DJ */}
          {activeTab === 'music' && (
          <DetailsSection title="Music & DJ" icon={Music4}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <GoogleField label="Band / DJ name" value={data.bandDjName} onChange={e => update({ bandDjName: e.target.value })} placeholder="e.g. The Groove Masters" />
              <SectionInput label="Contact / booking" value={data.bandDjContact} onChange={e => update({ bandDjContact: e.target.value })} />
            </div>
            <SectionInput label="Band / DJ preference notes" isTextarea value={data.bandDjNotes} onChange={e => update({ bandDjNotes: e.target.value })} placeholder="Live band, DJ, genre preferences, set length…" />
            <SectionInput label="First dance song" value={data.firstDanceSong} onChange={e => update({ firstDanceSong: e.target.value })} placeholder="Song title & artist" />
            <SectionInput label="Parent dances" isTextarea value={data.parentDances} onChange={e => update({ parentDances: e.target.value })} placeholder="Father-daughter, mother-son songs…" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="First song (reception open)" value={data.openingSong} onChange={e => update({ openingSong: e.target.value })} placeholder="Song title & artist" />
              <SectionInput label="Last song of the night" value={data.lastSong} onChange={e => update({ lastSong: e.target.value })} placeholder="Song title & artist" />
            </div>
            <SectionInput label="Songs to avoid / do-not-play list" isTextarea value={data.doNotPlayList} onChange={e => update({ doNotPlayList: e.target.value })} placeholder="Songs you absolutely do not want played…" />
          </DetailsSection>
          )}

          {/* MC & Host */}
          {activeTab === 'mc' && (
          <DetailsSection title="MC & host" icon={Mic2}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="MC / host name" value={data.mcName} onChange={e => update({ mcName: e.target.value })} placeholder="Name of your MC or host" />
              <SectionInput label="MC contact" value={data.mcContact} onChange={e => update({ mcContact: e.target.value })} />
            </div>
            <SectionInput label="MC briefing notes" isTextarea value={data.mcNotes} onChange={e => update({ mcNotes: e.target.value })} placeholder="Announcements, tone, key moments to introduce…" />
          </DetailsSection>
          )}

          {/* Extra entertainment */}
          {activeTab === 'extras' && (
          <DetailsSection title="Entertainment extras" icon={Sparkles}>
            <PillToggle label="Photo booth" value={data.photoBooth || false} onChange={v => update({ photoBooth: v })} />
            {data.photoBooth && (
              <SectionInput label="Photo booth details" isTextarea value={data.photoBoothDetails} onChange={e => update({ photoBoothDetails: e.target.value })} placeholder="Provider, props, backdrop, print style…" />
            )}
            <SectionInput label="Special performances" isTextarea value={data.specialPerformances} onChange={e => update({ specialPerformances: e.target.value })} placeholder="Live performers, surprise acts, fireworks…" />
            <SectionInput label="Other entertainment" isTextarea value={data.otherEntertainment} onChange={e => update({ otherEntertainment: e.target.value })} placeholder="Lawn games, casino tables, magician…" />
          </DetailsSection>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Additional notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else about entertainment…" />
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
        pageTitle="Entertainment"
        systemPrompt="You are Ava, helping a couple plan the music and entertainment on the day — DJ, band, and what happens between them. Answer from what their record already says where it says anything, and keep it to what they can act on next."
        quickActions={AVA_PROMPTS}
      />
    </div>
  );
}
