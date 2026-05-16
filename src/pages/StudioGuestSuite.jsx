import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Import all the builder sub-components
import StudioWebsiteTab from '@/components/studio/guest-suite/StudioWebsiteTab';
import StudioAssetsTab from '@/components/studio/guest-suite/StudioAssetsTab';
import ExperienceGuideTab from '@/components/studio/guest-suite/ExperienceGuideTab';
import PoliciesTab from '@/components/studio/guest-suite/PoliciesTab';
import StudioShareTab from '@/components/studio/guest-suite/StudioShareTab';

const TABS = [
  { id: 'website', label: 'Website' },
  { id: 'assets', label: 'Assets' },
  { id: 'experience', label: 'Experience Guide' },
  { id: 'policies', label: 'Policies' },
  { id: 'share', label: 'Share' },
];

function getTabFromPath(pathname) {
  if (pathname.includes('/assets')) return 'assets';
  if (pathname.includes('/experience')) return 'experience';
  if (pathname.includes('/policies')) return 'policies';
  if (pathname.includes('/share')) return 'share';
  return 'website';
}

export default function StudioGuestSuite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Check for ?autofill=true param — switch to website tab and signal auto-fill
  const searchParams = new URLSearchParams(location.search);
  const triggerAutofill = searchParams.get('autofill') === 'true';

  const { data: details } = useQuery({
    queryKey: ['guestSuiteDetails'],
    queryFn: async () => {
      const r = await base44.entities.WeddingDetails.list();
      return r[0] || null;
    },
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const pathMap = {
      website: '/studio/guest-suite',
      assets: '/studio/guest-suite/assets',
      experience: '/studio/guest-suite/experience',
      policies: '/studio/guest-suite/policies',
      share: '/studio/guest-suite/share',
    };
    navigate(pathMap[tabId], { replace: true });
  };

  const previewUrl = details?.slug ? `/w/${details.slug}?preview=true` : null;

  // Website tab is a full-screen experience — hide the outer chrome
  const isWebsiteTab = activeTab === 'website';

  if (isWebsiteTab || triggerAutofill) {
    return <StudioWebsiteTab onBack={() => navigate('/studio')} openAutofill={triggerAutofill} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{
        height: 56, flexShrink: 0, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => navigate('/studio')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0', flexShrink: 0 }}
        >
          <ChevronLeft size={15} /> Studio
        </button>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, pointerEvents: 'none' }}>
          Guest Suite
        </p>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '7px 14px', border: '1px solid #CCCCCC', background: 'transparent', color: '#444', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', borderRadius: 4 }}
            >
              Preview ↗
            </a>
          )}
        </div>
      </div>

      {/* HORIZONTAL TABS */}
      <div style={{
        height: 48, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE',
        display: 'flex', alignItems: 'flex-end', padding: '0 24px', gap: 0,
        position: 'sticky', top: 56, zIndex: 90, flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                height: 48, padding: '0 18px', background: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid #E03553' : '2px solid transparent',
                color: isActive ? '#0A0A0A' : '#888888', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'assets' && <StudioAssetsTab details={details} />}
        {activeTab === 'experience' && <ExperienceGuideTab details={details} />}
        {activeTab === 'policies' && <PoliciesTab details={details} />}
        {activeTab === 'share' && <StudioShareTab details={details} />}
      </div>
    </div>
  );
}