import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import DesignTab from '../components/website-editor/DesignTab';
import ContentTab from '../components/website-editor/ContentTab';
import SectionsTab from '../components/website-editor/SectionsTab';
import SettingsTab from '../components/website-editor/SettingsTab';
import WebsitePreview from '../components/website-editor/WebsitePreview';
import { ExternalLink } from 'lucide-react';

const DEFAULT_WEDDING = {
  coupleNames: '',
  weddingDate: new Date().toISOString().split('T')[0],
  slug: '',
  websiteEnabled: true,
  websitePassword: '',
  websiteTheme: 'still',
  websiteTypography: 'classic',
  heroVideoUrl: '',
  heroVideoFile: '',
  coverPhoto: '',
  welcomeMessage: 'We are overjoyed to celebrate with you.',
  coupleStory: '',
  sectionsVisible: {
    welcome: true,
    ceremony: true,
    reception: true,
    story: true,
    rsvp: true,
    travel: true,
    music: true,
    footer: true,
  },
  sectionsOrder: ['welcome', 'ceremony', 'reception', 'story', 'rsvp', 'travel', 'music', 'footer'],
  mainCeremony: { venueName: '', address: '', startTime: '', endTime: '' },
  reception: { venueName: '', address: '', startTime: '', endTime: '' },
};

export default function WeddingWebsiteEditor() {
  const [activeTab, setActiveTab] = useState('design');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wedding, setWedding] = useState(DEFAULT_WEDDING);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  const { data: existingWedding, isLoading } = useQuery({
    queryKey: ['wedding-details'],
    queryFn: async () => {
      const weddings = await base44.entities.WeddingDetails.list();
      return weddings.length > 0 ? weddings[0] : null;
    },
  });

  useEffect(() => {
    if (existingWedding) {
      setWedding(prev => ({ ...prev, ...existingWedding }));
    }
  }, [existingWedding]);

  const handleFieldChange = (field, value) => {
    setWedding(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);

    clearTimeout(autoSaveTimer);
    const timer = setTimeout(handleAutoSave, 2000);
    setAutoSaveTimer(timer);
  };

  const handleAutoSave = async () => {
    if (!unsavedChanges) return;
    setIsSaving(true);
    try {
      if (existingWedding?.id) {
        await base44.entities.WeddingDetails.update(existingWedding.id, wedding);
      } else {
        await base44.entities.WeddingDetails.create(wedding);
      }
      setUnsavedChanges(false);
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (existingWedding?.id) {
        await base44.entities.WeddingDetails.update(existingWedding.id, wedding);
      } else {
        await base44.entities.WeddingDetails.create(wedding);
      }
      setUnsavedChanges(false);
      toast.success('Website saved.');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (!wedding.slug) {
      toast.error('Please set a URL slug first.');
      setActiveTab('settings');
      return;
    }
    window.open(`/w/${wedding.slug}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <p style={{ color: '#888888' }}>Loading your website...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FFFFFF' }}>
      {/* LEFT PANEL */}
      <div
        style={{
          width: '380px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #EEEEEE',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #EEEEEE',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>
                Website Editor
              </h1>
              <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
                Customise your wedding website
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="h-8 px-3 text-xs font-semibold"
              >
                Preview <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 px-4"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
          {unsavedChanges && (
            <p style={{ fontSize: '11px', color: '#E03553', margin: 0 }}>Unsaved changes</p>
          )}
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #EEEEEE',
            padding: '0 24px',
            gap: '32px',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          {['design', 'content', 'sections', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 0',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 600,
                color: activeTab === tab ? '#0A0A0A' : '#888888',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #E03553' : 'none',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {activeTab === 'design' && (
            <DesignTab wedding={wedding} onChange={handleFieldChange} />
          )}
          {activeTab === 'content' && (
            <ContentTab wedding={wedding} onChange={handleFieldChange} />
          )}
          {activeTab === 'sections' && (
            <SectionsTab wedding={wedding} onChange={handleFieldChange} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab wedding={wedding} onChange={handleFieldChange} />
          )}
        </div>
      </div>

      {/* RIGHT PANEL — LIVE PREVIEW */}
      <div
        style={{
          flex: 1,
          background: '#F2F2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        <WebsitePreview wedding={wedding} />
      </div>
    </div>
  );
}