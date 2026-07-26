import React, { useState, useEffect, useRef } from "react";
import { Camera, Video, Image, Clock, Loader2 } from "lucide-react";
import PageConsiderations from '../components/shared/PageConsiderations';
import toast from 'react-hot-toast';
import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import AvaButton from '../components/shared/AvaButton';
import AvaModal from '../components/layout/AvaModal';

import VendorContactSection from "../components/vendors/VendorContactSection";
import VendorRosterSection from "../components/vendors/VendorRosterSection";
import SectionInput from "../components/event-details/SectionInput";
import DetailsSection from "../components/event-details/DetailsSection";
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

export default function PhotographyPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("photographers");
  const [avaOpen, setAvaOpen] = useState(false);

  const [details, setDetails] = useState({ photography: {} });
  const [detailsId, setDetailsId] = useState(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  useEffect(() => { loadData(); }, []);

  // `vendors` here is only for the stat strip below — the "Photographers"/
  // "Videographers" tabs and the "Photo & video details" pickers each own
  // their own fetch (VendorRosterSection/VendorContactSection), same
  // pattern as Beauty.jsx's page-level vendor fetch for its stat cards.
  const loadData = async () => {
    setLoading(true);
    try {
      const [vendorData, detailsData] = await Promise.all([
        getMyRecords('Vendor'),
        getMyWeddingDetails().catch(() => null),
      ]);
      setVendors(vendorData.filter(v => v.category === 'photography' || v.category === 'videography'));
      if (detailsData) {
        setDetails(detailsData);
        setDetailsId(detailsData.id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  const handleDetailsUpdate = (field, value) => {
    setDetails(prev => ({ ...prev, photography: { ...prev.photography, [field]: value } }));
  };

  const handleDetailsSave = async () => {
    setIsSavingDetails(true);
    const toastId = toast.loading('Saving photography details...');
    try {
      if (!detailsId) {
        const newDetails = await WeddingDetails.create({ photography: details.photography });
        setDetailsId(newDetails.id);
      } else {
        await WeddingDetails.update(detailsId, { photography: details.photography });
      }
      toast.success('Photography details saved!', { id: toastId });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save photography details.', { id: toastId });
    }
    setIsSavingDetails(false);
  };

  const stats = React.useMemo(() => ({
    total: vendors.length,
    photographersCount: vendors.filter(v => v.category === 'photography').length,
    videographersCount: vendors.filter(v => v.category === 'videography').length,
    bookedCount: vendors.filter(v => v.status === 'booked').length,
  }), [vendors]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
      </div>
    );
  }

  const TABS = [
    { key: 'photographers',   label: 'Photographers' },
    { key: 'videographers',   label: 'Videographers' },
    { key: 'details',         label: 'Photo & video details' },
    { key: 'shot-list',       label: 'Shot list' },
    { key: 'timeline',        label: 'Timeline' },
    { key: 'considerations',  label: 'Considerations' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Photography & videography" subtitle="Plan your photography, videography, and visual storytelling" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total', value: stats.total },
          { label: 'Photographers', value: stats.photographersCount },
          { label: 'Videographers', value: stats.videographersCount },
          { label: 'Booked', value: stats.bookedCount },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : undefined }}>
            <div style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <CountUp to={stat.value} />
            </div>
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to plan your photo coverage" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
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

      <div style={{ padding: '32px 32px 48px' }}>

        {/* Photographers tab */}
        {activeTab === 'photographers' && (
          <VendorRosterSection category="photography" categoryLabel="photography" />
        )}

        {/* Videographers tab */}
        {activeTab === 'videographers' && (
          <VendorRosterSection category="videography" categoryLabel="videography" />
        )}

        {/* Photo & video details tab */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Photographer details" icon={Camera} sectionKey="photographer" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <VendorContactSection
                category="photography"
                vendorId={details.photography?.photographerVendorId}
                onVendorIdChange={id => handleDetailsUpdate('photographerVendorId', id)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Package selected" value={details.photography?.photographyPackage} onChange={e => handleDetailsUpdate('photographyPackage', e.target.value)} placeholder="Package name" />
                <SectionInput label="Hours booked" type="number" value={details.photography?.photographyHours} onChange={e => handleDetailsUpdate('photographyHours', e.target.value)} placeholder="Hours" />
              </div>
              <SectionInput label="Photography style" isTextarea value={details.photography?.photographyStyle} onChange={e => handleDetailsUpdate('photographyStyle', e.target.value)} placeholder="Candid, traditional, artistic, documentary, etc." />
            </DetailsSection>

            <DetailsSection title="Videographer details" icon={Video} sectionKey="videographer" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <VendorContactSection
                category="videography"
                vendorId={details.photography?.videographerVendorId}
                onVendorIdChange={id => handleDetailsUpdate('videographerVendorId', id)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Package selected" value={details.photography?.videographyPackage} onChange={e => handleDetailsUpdate('videographyPackage', e.target.value)} placeholder="Package name" />
                <SectionInput label="Video length" value={details.photography?.videoLength} onChange={e => handleDetailsUpdate('videoLength', e.target.value)} placeholder="e.g., 3-5 minute highlight reel" />
              </div>
              <SectionInput label="Video style" isTextarea value={details.photography?.videoStyle} onChange={e => handleDetailsUpdate('videoStyle', e.target.value)} placeholder="Cinematic, documentary, traditional, etc." />
            </DetailsSection>
          </div>
        )}

        {/* Shot list tab */}
        {activeTab === 'shot-list' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Shot list" icon={Image} sectionKey="shotlist" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <SectionInput label="Getting ready" isTextarea value={details.photography?.gettingReadyShots} onChange={e => handleDetailsUpdate('gettingReadyShots', e.target.value)} placeholder="Details, dress, shoes, rings, etc." />
              <SectionInput label="Ceremony shots" isTextarea value={details.photography?.ceremonyShots} onChange={e => handleDetailsUpdate('ceremonyShots', e.target.value)} placeholder="Processional, vows, first kiss, recessional" />
              <SectionInput label="Family portraits" isTextarea value={details.photography?.familyPortraits} onChange={e => handleDetailsUpdate('familyPortraits', e.target.value)} placeholder="List family groupings for formal photos" />
              <SectionInput label="Reception shots" isTextarea value={details.photography?.receptionShots} onChange={e => handleDetailsUpdate('receptionShots', e.target.value)} placeholder="First dance, cake cutting, toasts, dancing" />
              <SectionInput label="Must-have shots" isTextarea value={details.photography?.mustHaveShots} onChange={e => handleDetailsUpdate('mustHaveShots', e.target.value)} placeholder="Specific photos or moments you want captured" />
            </DetailsSection>
          </div>
        )}

        {/* Considerations tab */}
        {activeTab === 'considerations' && (
          <div style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="photography" />
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Delivery & editing" icon={Clock} sectionKey="delivery" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Photo delivery timeline" value={details.photography?.photoDeliveryTimeline} onChange={e => handleDetailsUpdate('photoDeliveryTimeline', e.target.value)} placeholder="e.g., 4-6 weeks" />
                <SectionInput label="Number of edited photos" type="number" value={details.photography?.editedPhotosCount} onChange={e => handleDetailsUpdate('editedPhotosCount', e.target.value)} placeholder="Number" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Video delivery timeline" value={details.photography?.videoDeliveryTimeline} onChange={e => handleDetailsUpdate('videoDeliveryTimeline', e.target.value)} placeholder="e.g., 8-12 weeks" />
                <SectionInput label="Editing style" value={details.photography?.editingStyle} onChange={e => handleDetailsUpdate('editingStyle', e.target.value)} placeholder="Bright & airy, dark & moody, natural, vintage, black & white" />
              </div>
              <SectionInput label="Delivery format" isTextarea value={details.photography?.deliveryFormat} onChange={e => handleDetailsUpdate('deliveryFormat', e.target.value)} placeholder="Online gallery, USB drive, prints, albums, etc." />
            </DetailsSection>
          </div>
        )}
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Photography advisor"
        systemPrompt="You are Ava, a wedding photography advisor. Help plan shots, timelines and photographer selection. If the couple has selected cultures and traditions, suggest shot-list moments specific to those traditions where useful (e.g. Mehndi hand detail shots, a tea ceremony sequence, sofreh aghd close-ups)."
        quickActions={["Create a shot list for my wedding", "How many hours of coverage do I need?", "What should I ask a photographer?", "Golden hour timing suggestions"]}
      />
    </div>
  );
}
