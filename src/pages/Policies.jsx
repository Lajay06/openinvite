import React, { useState, useEffect } from "react";
import { Shield, Baby, Users, Loader2, Camera, Wifi, Gift, Sparkles, Phone, Clock } from "lucide-react";
import toast from 'react-hot-toast';

import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import SectionInput from "../components/event-details/SectionInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { InvokeLLM } from "@/integrations/Core";
import { base44 } from "@/api/base44Client";
const WeddingDetails = base44.entities.WeddingDetails;

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: 'childrenPolicy',    label: 'Children',        icon: Baby },
  { key: 'plusOnePolicy',     label: 'Plus one',        icon: Users },
  { key: 'photographyPolicy', label: 'Photography',     icon: Camera },
  { key: 'socialMediaPolicy', label: 'Social media',    icon: Wifi },
  { key: 'giftPolicy',        label: 'Gift',            icon: Gift },
  { key: 'unpluggedPolicy',   label: 'Unplugged',       icon: Phone },
  { key: 'dresscodePolicy',   label: 'Arrival & timing',icon: Clock },
];

function SaveButton({ onClick, isSaving, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
      <button
        onClick={onClick}
        disabled={isSaving}
        className="btn-primary"
        style={{ opacity: isSaving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Shield size={12} />
        Save {label.toLowerCase()}
      </button>
    </div>
  );
}

function AiButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)',
        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: PJS,
        opacity: disabled ? 0.5 : 1, marginTop: 22, flexShrink: 0,
      }}
    >
      <Sparkles size={11} />AI
    </button>
  );
}

export default function PoliciesPage() {
  const [details, setDetails] = useState({
    childrenPolicy: {},
    plusOnePolicy: {},
    photographyPolicy: {},
    socialMediaPolicy: {},
    giftPolicy: {},
    dresscodePolicy: {},
    unpluggedPolicy: {},
  });
  const [detailsId, setDetailsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('childrenPolicy');

  useEffect(() => { loadDetails(); }, []);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const existingDetails = await WeddingDetails.list();
      if (existingDetails.length > 0) {
        setDetails(existingDetails[0]);
        setDetailsId(existingDetails[0].id);
      }
    } catch {
      toast.error("Failed to load details.");
    }
    setLoading(false);
  };

  const handleUpdate = (section, field, value) => {
    setDetails(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSectionSave = async (sectionKey) => {
    setIsSaving(true);
    const tid = toast.loading(`Saving…`);
    try {
      let currentDetailsId = detailsId;
      if (!currentDetailsId) {
        const newDetails = await WeddingDetails.create(details);
        setDetailsId(newDetails.id);
        currentDetailsId = newDetails.id;
      } else {
        await WeddingDetails.update(currentDetailsId, { [sectionKey]: details[sectionKey] });
      }
      toast.success(`Saved`, { id: tid });
    } catch {
      toast.error(`Failed to save`, { id: tid });
    }
    setIsSaving(false);
  };

  const generateAISuggestion = async (policyType) => {
    setGeneratingAI(true);
    const tid = toast.loading('Generating AI suggestion…');
    try {
      const descriptions = {
        childrenPolicy: "children at the wedding (whether they're welcome, adults-only, etc.)",
        plusOnePolicy: "plus ones/guest bringing a date to the wedding",
        photographyPolicy: "photography and camera usage during the ceremony",
        socialMediaPolicy: "social media and photo sharing at the wedding",
        giftPolicy: "wedding gifts and registry preferences",
        unpluggedPolicy: "unplugged ceremony (asking guests to put away phones/cameras)",
      };
      const response = await InvokeLLM({
        prompt: `Generate a polite, warm, and clear wedding policy note about ${descriptions[policyType]}. Make it friendly but clear. Keep it to 2-3 sentences. Don't include a title, just the policy text.`,
      });
      handleUpdate(policyType, 'notes', response);
      toast.success('Generated', { id: tid });
    } catch {
      toast.error('Failed to generate', { id: tid });
    }
    setGeneratingAI(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
      </div>
    );
  }

  const renderTabContent = () => {
    const d = details;
    switch (activeTab) {
      case 'childrenPolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Policy</Label>
              <Select value={d.childrenPolicy?.policy} onValueChange={v => handleUpdate('childrenPolicy', 'policy', v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select a policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Children are welcome</SelectItem>
                  <SelectItem value="adults_only">Adults-only celebration</SelectItem>
                  <SelectItem value="family_only">Family children only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <SectionInput label="Notes" isTextarea value={d.childrenPolicy?.notes} onChange={e => handleUpdate('childrenPolicy', 'notes', e.target.value)} placeholder="e.g., 'We have arranged for a babysitter in a separate room for your convenience.'" />
              </div>
              <AiButton onClick={() => generateAISuggestion('childrenPolicy')} disabled={generatingAI} />
            </div>
            <SaveButton onClick={() => handleSectionSave('childrenPolicy')} isSaving={isSaving} label="Children policy" />
          </div>
        );

      case 'plusOnePolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Policy</Label>
              <Select value={d.plusOnePolicy?.policy} onValueChange={v => handleUpdate('plusOnePolicy', 'policy', v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select a policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">All guests welcome a +1</SelectItem>
                  <SelectItem value="named_only">+1s for named guests only</SelectItem>
                  <SelectItem value="no_plus_ones">No plus ones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <SectionInput label="Notes" isTextarea value={d.plusOnePolicy?.notes} onChange={e => handleUpdate('plusOnePolicy', 'notes', e.target.value)} placeholder="e.g., 'Please ensure you provide your guest's name when you RSVP.'" />
              </div>
              <AiButton onClick={() => generateAISuggestion('plusOnePolicy')} disabled={generatingAI} />
            </div>
            <SaveButton onClick={() => handleSectionSave('plusOnePolicy')} isSaving={isSaving} label="Plus one policy" />
          </div>
        );

      case 'photographyPolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Policy</Label>
              <Select value={d.photographyPolicy?.policy} onValueChange={v => handleUpdate('photographyPolicy', 'policy', v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select a policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Photography welcome</SelectItem>
                  <SelectItem value="ceremony_only">No photography during ceremony</SelectItem>
                  <SelectItem value="unplugged">Unplugged ceremony</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <SectionInput label="Notes" isTextarea value={d.photographyPolicy?.notes} onChange={e => handleUpdate('photographyPolicy', 'notes', e.target.value)} placeholder="e.g., 'We have hired a professional photographer. Please enjoy the moment with us!'" />
              </div>
              <AiButton onClick={() => generateAISuggestion('photographyPolicy')} disabled={generatingAI} />
            </div>
            <SaveButton onClick={() => handleSectionSave('photographyPolicy')} isSaving={isSaving} label="Photography policy" />
          </div>
        );

      case 'socialMediaPolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Policy</Label>
              <Select value={d.socialMediaPolicy?.policy} onValueChange={v => handleUpdate('socialMediaPolicy', 'policy', v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select a policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="encouraged">Share away!</SelectItem>
                  <SelectItem value="with_hashtag">Share with our hashtag</SelectItem>
                  <SelectItem value="after_ceremony">Share after ceremony</SelectItem>
                  <SelectItem value="no_social">Please don't share</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionInput label="Wedding hashtag" value={d.socialMediaPolicy?.hashtag} onChange={e => handleUpdate('socialMediaPolicy', 'hashtag', e.target.value)} placeholder="e.g., #SmithWedding2024" />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <SectionInput label="Notes" isTextarea value={d.socialMediaPolicy?.notes} onChange={e => handleUpdate('socialMediaPolicy', 'notes', e.target.value)} placeholder="e.g., 'We'd love for you to share your photos using our hashtag!'" />
              </div>
              <AiButton onClick={() => generateAISuggestion('socialMediaPolicy')} disabled={generatingAI} />
            </div>
            <SaveButton onClick={() => handleSectionSave('socialMediaPolicy')} isSaving={isSaving} label="Social media policy" />
          </div>
        );

      case 'giftPolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Policy</Label>
              <Select value={d.giftPolicy?.policy} onValueChange={v => handleUpdate('giftPolicy', 'policy', v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select a policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="registry">Registry available</SelectItem>
                  <SelectItem value="cash_preferred">Cash/monetary gifts preferred</SelectItem>
                  <SelectItem value="no_gifts">No gifts please</SelectItem>
                  <SelectItem value="charity">Charity donations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <SectionInput label="Notes" isTextarea value={d.giftPolicy?.notes} onChange={e => handleUpdate('giftPolicy', 'notes', e.target.value)} placeholder="e.g., 'Your presence is the best present, but if you wish to give, our registry is available online.'" />
              </div>
              <AiButton onClick={() => generateAISuggestion('giftPolicy')} disabled={generatingAI} />
            </div>
            <SaveButton onClick={() => handleSectionSave('giftPolicy')} isSaving={isSaving} label="Gift policy" />
          </div>
        );

      case 'unpluggedPolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Policy</Label>
              <Select value={d.unpluggedPolicy?.policy} onValueChange={v => handleUpdate('unpluggedPolicy', 'policy', v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select a policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unplugged">Unplugged ceremony (no devices)</SelectItem>
                  <SelectItem value="partial">Phones away during ceremony</SelectItem>
                  <SelectItem value="devices_ok">Devices welcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <SectionInput label="Notes" isTextarea value={d.unpluggedPolicy?.notes} onChange={e => handleUpdate('unpluggedPolicy', 'notes', e.target.value)} placeholder="e.g., 'We kindly ask you to put away your phones and cameras during the ceremony so you can be fully present.'" />
              </div>
              <AiButton onClick={() => generateAISuggestion('unpluggedPolicy')} disabled={generatingAI} />
            </div>
            <SaveButton onClick={() => handleSectionSave('unpluggedPolicy')} isSaving={isSaving} label="Unplugged policy" />
          </div>
        );

      case 'dresscodePolicy':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionInput label="Recommended arrival time" value={d.dresscodePolicy?.arrival} onChange={e => handleUpdate('dresscodePolicy', 'arrival', e.target.value)} placeholder="e.g., '30 minutes before ceremony start'" />
            <SectionInput label="Notes" isTextarea value={d.dresscodePolicy?.notes} onChange={e => handleUpdate('dresscodePolicy', 'notes', e.target.value)} placeholder="e.g., 'Please arrive early to allow time for parking and seating.'" />
            <SaveButton onClick={() => handleSectionSave('dresscodePolicy')} isSaving={isSaving} label="Arrival & timing" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Policies" subtitle="Set and communicate your wedding policies to guests" />

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, padding: '0 32px', minWidth: 'max-content' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: PJS,
                  color: isActive ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
                  borderBottom: isActive ? '2px solid #0A0A0A' : '2px solid transparent',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                  marginBottom: -1,
                }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '32px 32px 64px', maxWidth: 640 }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
