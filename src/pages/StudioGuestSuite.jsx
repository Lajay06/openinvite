import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Crown } from 'lucide-react';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

function UltraGate() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      {/* Blurred demo background */}
      <div style={{ filter: 'blur(4px)', opacity: 0.22, pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          <div style={{ width: 60, height: 12, background: 'rgba(10,10,10,0.12)', borderRadius: 2 }} />
          <div style={{ width: 120, height: 16, background: 'rgba(10,10,10,0.12)', borderRadius: 2, margin: '0 auto' }} />
        </div>
        <div style={{ height: 48, borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'flex-end', padding: '0 24px', gap: 0 }}>
          {['Website', 'Assets', 'Experience Guide', 'Policies', 'Share'].map((tab, i) => (
            <div key={i} style={{ height: 48, padding: '0 18px', display: 'flex', alignItems: 'center', borderBottom: i === 0 ? '2px solid #E03553' : '2px solid transparent' }}>
              <div style={{ width: tab.length * 7, height: 11, background: 'rgba(10,10,10,0.1)', borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '40px 32px' }}>
          {[100, 80, 90].map((w, i) => (
            <div key={i} style={{ height: 72, background: 'rgba(10,10,10,0.04)', borderRadius: 4, marginBottom: 16, width: `${w}%` }} />
          ))}
        </div>
      </div>

      {/* Upgrade overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)', padding: '48px 40px', maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(10,10,10,0.12)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Crown size={28} color="#FFFFFF" strokeWidth={1.8} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.12em', margin: '0 0 10px', ...F }}>ULTRA FEATURE</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2, ...F }}>
            Guest Suite is an Ultra feature
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.55)', lineHeight: 1.7, margin: '0 0 32px', ...F }}>
            Build your wedding website, manage guest accommodations, create your experience guide, and share your digital suite — all in one place.
          </p>
          <button
            onClick={() => navigate('/account')}
            style={{ width: '100%', padding: '14px 24px', border: 'none', borderRadius: 999, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#FFFFFF', fontSize: 15, fontWeight: 800, cursor: 'pointer', ...F, letterSpacing: '0.01em', marginBottom: 16 }}
          >
            Upgrade to Ultra
          </button>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', margin: 0, ...F }}>
            Already on Ultra? Make sure you're signed in with the right account.
          </p>
        </div>
      </div>
    </div>
  );
}

// Import all the builder sub-components
import StudioWebsiteTab from '@/components/studio/guest-suite/StudioWebsiteTab';
import StudioAssetsTab from '@/components/studio/guest-suite/StudioAssetsTab';
import PoliciesTab from '@/components/studio/guest-suite/PoliciesTab';
import StudioShareTab from '@/components/studio/guest-suite/StudioShareTab';

const TABS = [
  { id: 'website',  label: 'Website' },
  { id: 'assets',   label: 'Assets' },
  { id: 'policies', label: 'Policies' },
  { id: 'share',    label: 'Share' },
];

function getTabFromPath(pathname) {
  if (pathname.includes('/assets'))   return 'assets';
  if (pathname.includes('/policies')) return 'policies';
  if (pathname.includes('/share'))    return 'share';
  return 'website';
}

export default function StudioGuestSuite() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const canAccess = plan === 'ultra' || plan === 'free';
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Keep activeTab in sync when the URL changes externally (e.g. back button in Website Builder)
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  // Check for ?autofill=true param — switch to website tab and signal auto-fill
  const searchParams = new URLSearchParams(location.search);
  const triggerAutofill = searchParams.get('autofill') === 'true';

  const queryClient = useQueryClient();
  const { data: details } = useQuery({
    queryKey: ['guestSuiteDetails'],
    queryFn: () => getMyWeddingDetails(),
  });

  // Optimistic local update so an asset edit is reflected immediately
  // (mini-preview, reopening the editor) without waiting on a refetch —
  // the actual persist call happens in StudioAssetsTab itself.
  const handleDetailsChange = (nextDetails) => {
    queryClient.setQueryData(['guestSuiteDetails'], nextDetails);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const pathMap = {
      website:  '/studio/guest-suite',
      assets:   '/studio/guest-suite/assets',
      policies: '/studio/guest-suite/policies',
      share:    '/studio/guest-suite/share',
    };
    navigate(pathMap[tabId], { replace: true });
  };

  if (!canAccess) return <UltraGate />;

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
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0', flexShrink: 0 }}
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
                color: isActive ? '#0A0A0A' : 'rgba(10,10,10,0.6)', fontSize: 13, fontWeight: 600,
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
        {activeTab === 'assets'   && <StudioAssetsTab details={details} onDetailsChange={handleDetailsChange} />}
        {activeTab === 'policies' && <PoliciesTab details={details} />}
        {activeTab === 'share' && <StudioShareTab details={details} />}
      </div>
    </div>
  );
}