import React, { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Plus, Video, Image, Clock, Loader2 } from "lucide-react";
import PageConsiderations from '../components/shared/PageConsiderations';
import toast from 'react-hot-toast';
import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import AvaButton from '../components/shared/AvaButton';
import AvaModal from '../components/layout/AvaModal';

import PhotographerList from "../components/photography/PhotographerList";
import PhotographerForm from "../components/photography/PhotographerForm";
import SectionInput from "../components/event-details/SectionInput";
import DetailsSection from "../components/event-details/DetailsSection";
import { base44 } from "@/api/base44Client";
const Photographer = base44.entities.Photographer;
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
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
  const [photographers, setPhotographers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPhotographer, setEditingPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("photographers");
  const [avaOpen, setAvaOpen] = useState(false);

  const [details, setDetails] = useState({ photography: {} });
  const [detailsId, setDetailsId] = useState(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [photographersData, detailsData] = await Promise.all([
        Photographer.list('-created_date'),
        WeddingDetails.list().catch(() => []),
      ]);
      setPhotographers(photographersData);
      if (detailsData.length > 0) {
        setDetails(detailsData[0]);
        setDetailsId(detailsData[0].id);
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

  const handleVendorSelect = (vendorId, type) => {
    const vendor = photographers.find(v => v.id === vendorId);
    if (!vendor) return;
    if (type === 'photographer') {
      handleDetailsUpdate('photographerVendorId', vendorId);
      handleDetailsUpdate('photographer', vendor.name);
      handleDetailsUpdate('photographerContact', vendor.contact_person);
      handleDetailsUpdate('photographerPhone', vendor.phone);
      handleDetailsUpdate('photographerEmail', vendor.email);
    } else {
      handleDetailsUpdate('videographerVendorId', vendorId);
      handleDetailsUpdate('videographer', vendor.name);
      handleDetailsUpdate('videographerContact', vendor.contact_person);
      handleDetailsUpdate('videographerPhone', vendor.phone);
      handleDetailsUpdate('videographerEmail', vendor.email);
    }
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

  const handleSubmit = async (photographerData) => {
    const toastId = toast.loading(editingPhotographer ? 'Updating...' : 'Adding...');
    try {
      if (editingPhotographer) {
        await Photographer.update(editingPhotographer.id, photographerData);
        toast.success('Photographer updated!', { id: toastId });
      } else {
        await Photographer.create(photographerData);
        toast.success('Photographer added!', { id: toastId });
      }
      setShowForm(false);
      setEditingPhotographer(null);
      loadData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error('Failed to save photographer', { id: toastId });
    }
  };

  const handleEdit = (photographer) => {
    setEditingPhotographer(photographer);
    setShowForm(true);
  };

  const handleDelete = async (photographerId) => {
    if (!window.confirm("Are you sure you want to delete this photographer?")) return;
    const toastId = toast.loading('Deleting...');
    try {
      await Photographer.delete(photographerId);
      toast.success('Photographer deleted', { id: toastId });
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error('Failed to delete photographer', { id: toastId });
    }
  };

  const photographersList = photographers.filter(p => p.type === 'photographer' || p.type === 'both');
  const videographersList = photographers.filter(p => p.type === 'videographer' || p.type === 'both');

  const stats = React.useMemo(() => ({
    total: photographers.length,
    photographersCount: photographers.filter(p => p.type === 'photographer' || p.type === 'both').length,
    videographersCount: photographers.filter(p => p.type === 'videographer' || p.type === 'both').length,
    bookedCount: photographers.filter(p => p.status === 'booked').length,
  }), [photographers]);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setEditingPhotographer(null); setShowForm(true); }} className="btn-primary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} />Add photographer
              </button>
            </div>
            <PhotographerList photographers={photographersList} onEdit={handleEdit} onDelete={handleDelete} />
            {photographersList.length === 0 && (
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center', padding: '40px 0' }}>
                No photographers added yet. Click "Add photographer" to get started.
              </p>
            )}
          </div>
        )}

        {/* Videographers tab */}
        {activeTab === 'videographers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setEditingPhotographer(null); setShowForm(true); }} className="btn-primary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} />Add videographer
              </button>
            </div>
            <PhotographerList photographers={videographersList} onEdit={handleEdit} onDelete={handleDelete} />
            {videographersList.length === 0 && (
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center', padding: '40px 0' }}>
                No videographers added yet. Click "Add videographer" to get started.
              </p>
            )}
          </div>
        )}

        {/* Photo & video details tab */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Photographer details" icon={Camera} sectionKey="photographer" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Select photographer</label>
                {photographersList.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Select value={details.photography?.photographerVendorId || ''} onValueChange={v => handleVendorSelect(v, 'photographer')}>
                        <SelectTrigger><SelectValue placeholder="Select from your photographers" /></SelectTrigger>
                        <SelectContent>
                          {photographersList.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <button type="button" onClick={() => { setEditingPhotographer(null); setShowForm(true); }} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Photographer name" value={details.photography?.photographer || ''} onChange={e => handleDetailsUpdate('photographer', e.target.value)} />
                    <button type="button" onClick={() => { setEditingPhotographer(null); setShowForm(true); }} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Contact person" value={details.photography?.photographerContact} onChange={e => handleDetailsUpdate('photographerContact', e.target.value)} placeholder="Contact name" />
                <SectionInput label="Phone" value={details.photography?.photographerPhone} onChange={e => handleDetailsUpdate('photographerPhone', e.target.value)} placeholder="Phone number" />
              </div>
              <SectionInput label="Email" type="email" value={details.photography?.photographerEmail} onChange={e => handleDetailsUpdate('photographerEmail', e.target.value)} placeholder="Email address" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Package selected" value={details.photography?.photographyPackage} onChange={e => handleDetailsUpdate('photographyPackage', e.target.value)} placeholder="Package name" />
                <SectionInput label="Hours booked" type="number" value={details.photography?.photographyHours} onChange={e => handleDetailsUpdate('photographyHours', e.target.value)} placeholder="Hours" />
              </div>
              <SectionInput label="Photography style" isTextarea value={details.photography?.photographyStyle} onChange={e => handleDetailsUpdate('photographyStyle', e.target.value)} placeholder="Candid, traditional, artistic, documentary, etc." />
            </DetailsSection>

            <DetailsSection title="Videographer details" icon={Video} sectionKey="videographer" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Select videographer</label>
                {videographersList.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Select value={details.photography?.videographerVendorId || ''} onValueChange={v => handleVendorSelect(v, 'videographer')}>
                        <SelectTrigger><SelectValue placeholder="Select from your videographers" /></SelectTrigger>
                        <SelectContent>
                          {videographersList.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <button type="button" onClick={() => { setEditingPhotographer(null); setShowForm(true); }} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Videographer name" value={details.photography?.videographer || ''} onChange={e => handleDetailsUpdate('videographer', e.target.value)} />
                    <button type="button" onClick={() => { setEditingPhotographer(null); setShowForm(true); }} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Contact person" value={details.photography?.videographerContact} onChange={e => handleDetailsUpdate('videographerContact', e.target.value)} placeholder="Contact name" />
                <SectionInput label="Phone" value={details.photography?.videographerPhone} onChange={e => handleDetailsUpdate('videographerPhone', e.target.value)} placeholder="Phone number" />
              </div>
              <SectionInput label="Email" type="email" value={details.photography?.videographerEmail} onChange={e => handleDetailsUpdate('videographerEmail', e.target.value)} placeholder="Email address" />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Editing style</label>
                  <Select value={details.photography?.editingStyle || ''} onValueChange={v => handleDetailsUpdate('editingStyle', v)}>
                    <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bright_airy">Bright & airy</SelectItem>
                      <SelectItem value="dark_moody">Dark & moody</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                      <SelectItem value="black_white">Black & white</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SectionInput label="Delivery format" isTextarea value={details.photography?.deliveryFormat} onChange={e => handleDetailsUpdate('deliveryFormat', e.target.value)} placeholder="Online gallery, USB drive, prints, albums, etc." />
            </DetailsSection>
          </div>
        )}
      </div>

      {/* Form overlay */}
      {showForm && (
        <PhotographerForm
          photographer={editingPhotographer}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingPhotographer(null); }}
        />
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Photography advisor"
        systemPrompt="You are Ava, a wedding photography advisor. Help plan shots, timelines and photographer selection."
        quickActions={["Create a shot list for my wedding", "How many hours of coverage do I need?", "What should I ask a photographer?", "Golden hour timing suggestions"]}
      />
    </div>
  );
}
