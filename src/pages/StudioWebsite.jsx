import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Monitor, Tablet, Smartphone, ChevronLeft, ExternalLink, Menu, X } from 'lucide-react';
import WBRightPanel from '@/components/website-builder/WBRightPanel';
import WBLeftPanel from '@/components/website-builder/WBLeftPanel';
import FullScreenPreview from '@/components/website-builder/FullScreenPreview';
import SectionTemplatePicker from '@/components/website-builder/SectionTemplatePicker';
import { WEBSITE_THEMES, FONT_OPTIONS, WEDDING_PAGES } from '@/lib/websiteThemes';
import WBSectionRenderer from '@/components/website-builder/WBSectionRenderer';
import AvaAutoFillModal from '@/components/website-builder/AvaAutoFillModal';
import PublishModal from '@/components/website-builder/PublishModal';
import { ASSET_PREVIEW_MAP, ASSET_ID_TO_KEY } from '@/components/website-builder/AssetPreviews';

const UNIVERSE_THEMES = {
  aman: {
    name: 'Aman',
    primary: '#0A0A0A',
    secondary: '#C4956A',
    background: '#F8F7F5',
    text: '#0A0A0A',
    accent: '#C4956A',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Quiet luxury',
  },
  tulum: {
    name: 'Tulum',
    primary: '#3D2B1F',
    secondary: '#C4956A',
    background: '#F5ECD7',
    text: '#3D2B1F',
    accent: '#D4845A',
    highlight: '#8B7355',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Barefoot luxury, earthy, editorial, sunset energy',
  },
  kyoto: {
    name: 'Kyoto',
    primary: '#1A1A1A',
    secondary: '#8B7355',
    background: '#F5F2ED',
    text: '#2C2C2C',
    accent: '#6B6B5A',
    fontDisplay: '"Noto Serif JP", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Elegant restraint, balance, calm sophistication',
  },
  capri: {
    name: 'Capri',
    primary: '#1B3A6B',
    secondary: '#7BA7C2',
    background: '#FEFBF3',
    text: '#1B3A6B',
    accent: '#E8C547',
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Joyful luxury, coastal summer, effortless glamour',
  },
  tokyo: {
    name: 'Tokyo',
    primary: '#FFFFFF',
    secondary: '#C0C0C0',
    background: '#0A0A0A',
    text: '#FFFFFF',
    accent: '#B8FF00',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Editorial nightlife, modern luxury, elevated tech',
  },
  marrakech: {
    name: 'Marrakech',
    primary: '#2C1810',
    secondary: '#C9A96E',
    background: '#F2E8D9',
    text: '#2C1810',
    accent: '#8B2635',
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Intimate, layered, atmospheric, luxurious',
  },
  paris: {
    name: 'Paris',
    primary: '#1A1A2E',
    secondary: '#C9A96E',
    background: '#FAF7F2',
    text: '#1A1A2E',
    accent: '#C9A96E',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Chic, timeless, understated luxury',
  },
  amalfi: {
    name: 'Amalfi',
    primary: '#1B4B6B',
    secondary: '#E8A040',
    background: '#FEFDF9',
    text: '#1B3A4B',
    accent: '#2E8B8B',
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Sun-drenched, luxurious, vibrant',
  },
  sedona: {
    name: 'Sedona',
    primary: '#3D2415',
    secondary: '#C4783A',
    background: '#F2EAE0',
    text: '#3D2415',
    accent: '#8B4513',
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Earthy, intimate, spiritual luxury',
  },
  aspen: {
    name: 'Aspen',
    primary: '#1A1A1A',
    secondary: '#2D5A27',
    background: '#F8F8F6',
    text: '#1A1A1A',
    accent: '#2D5A27',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Cozy luxury, black tie winter romance',
  },
  santorini: {
    name: 'Santorini',
    primary: '#0A2540',
    secondary: '#4A90D9',
    background: '#FAFCFF',
    text: '#0A2540',
    accent: '#4A90D9',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Sculptural, crisp, modern coastal elegance',
  },
};

const PLACEHOLDER_PAGES = {
  home: {
    sections: [
      { type: 'hero', heading: 'Sarah & James', subheading: '20 September 2025 · Amalfi Coast, Italy', body: 'Join us as we celebrate our love' },
      { type: 'intro', heading: "We're getting married", body: "We can't wait to share this day with the people who matter most to us. Save the date and join us for an unforgettable celebration." },
    ],
  },
  'our-story': {
    sections: [
      { type: 'story', heading: 'How it all began', body: "We met and knew from that moment on that something special had begun. We're so excited to celebrate this next chapter with the people we love most." },
    ],
  },
  celebration: {
    sections: [
      { type: 'event', heading: 'The ceremony', body: 'Villa Rufolo, Ravello\n3:00 PM — Ceremony\n5:00 PM — Cocktail hour\n7:00 PM — Reception dinner' },
    ],
  },
  rsvp: {
    sections: [
      { type: 'rsvp', heading: 'Will you join us?', body: "Please let us know by 1 August 2025 whether you'll be able to attend. We look forward to celebrating with you." },
    ],
  },
  travel: {
    sections: [
      { type: 'travel', heading: 'Getting there', body: 'The nearest airport is Naples International (NAP), approximately 60km from the venue. We recommend flying in the day before and staying overnight.' },
    ],
  },
};

const DEFAULT = {
  coupleNames: '',
  weddingDate: '',
  slug: '',
  websiteEnabled: true,
  websitePassword: '',
  activeTheme: 'still',
  activeTypography: null,
  pageTransition: 'fade',
  scrollAnimation: 'subtle',
  heroEffect: 'static',
  heroVideoUrl: '',
  coverPhoto: '',
  welcomeMessage: 'We are overjoyed to celebrate with you.',
  coupleStory: '',
  enabledPages: ['home', 'our-story', 'celebration', 'rsvp'],
  homeContent: { tagline: '', partnerOneName: '', partnerTwoName: '' },
  ourStoryContent: { storyText: '', milestones: [], photos: [] },
  celebrationContent: { daySchedule: [] },
  mainCeremony: { venueName: '', address: '', startTime: '', endTime: '', dressCode: '', notes: '' },
  reception: { venueName: '', address: '', startTime: '', endTime: '', notes: '' },
  rsvpContent: { rsvpDeadline: '', mealOptions: [], enablePlusOnes: true, enableDietaryField: true, enableSongRequest: false, enableMessage: true, closingMessage: '' },
  travelContent: { gettingThereNotes: '', parkingInfo: '', transportInfo: '', rideshareNotes: '', accommodations: [], transportOptions: [] },
  accommodationContent: { hotelNotes: '', airbnbNotes: '', alternativeNotes: '', showAlternative: false, roomBlocks: [], customOptions: [] },
  registryContent: { registryLinks: [], registryMessage: '', noGiftsPlease: false },
  musicContent: { spotifyPlaylistUrl: '', enableGuestRequests: false, customMessage: '' },
  qna: [],
  pageSections: {},
};

export default function StudioWebsite({ initialOpenAutofill = false }) {
  const navigate = useNavigate();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishModalTab, setPublishModalTab] = useState('website');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [details, setDetails] = useState(null);
  const [unsaved, setUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedSection, setSelectedSection] = useState(null);
  const [rightPanelTab, setRightPanelTab] = useState('design');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState(null);
  const [avaModalOpen, setAvaModalOpen] = useState(initialOpenAutofill);
  const detailsRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autosaveTimerRef = useRef(null);

  const updateAssetContent = (assetKey, field, value) => {
    setDetailsAndMark(prev => ({
      ...prev,
      assetContent: {
        ...(prev.assetContent || {}),
        [assetKey]: {
          ...(prev.assetContent?.[assetKey] || {}),
          [field]: value,
        }
      }
    }));
  };

  const { data: existing, isLoading } = useQuery({
    queryKey: ['wb-details'],
    queryFn: async () => {
      const r = await base44.entities.WeddingDetails.list();
      return r.length > 0 ? r[0] : null;
    },
  });

  useEffect(() => {
    if (existing) {
      const serverSections = existing.pageSections || {};
      const hasServerSections = Object.values(serverSections).some(arr => Array.isArray(arr) && arr.length > 0);
      setDetails(prev => {
        const merged = { ...DEFAULT, ...existing, pageSections: hasServerSections ? serverSections : (prev?.pageSections || {}) };
        detailsRef.current = merged;
        return merged;
      });
    } else if (existing === null) {
      setDetails({ ...DEFAULT });
      detailsRef.current = { ...DEFAULT };
    }
  }, [existing]);

  // Auto-generate slug from couple names if none set
  useEffect(() => {
    if (!details?.slug && details?.coupleNames) {
      const autoSlug = details.coupleNames
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);
      const slug = autoSlug + '-' + Math.random().toString(36).substring(2, 6);
      updateField('slug', slug);
    }
  }, [details?.coupleNames]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-populate home page with default sections on first open when empty
  useEffect(() => {
    if (!details) return;
    const homeSections = details.pageSections?.home || [];
    if (homeSections.length > 0) return;
    const ts = Date.now();
    const defaultSections = [
      {
        id: `sec_${ts}_0`, type: 'cinematic-hero', order: 0,
        content: {
          title: details.coupleNames || 'Our Wedding',
          date: details.weddingDate || '',
          location: details.mainCeremony?.venueName || '',
          subtitle: 'Join us as we celebrate our love',
        },
      },
      {
        id: `sec_${ts}_1`, type: 'our-story', order: 1,
        content: {
          text: details.coupleStory || 'We met and knew from that moment on that something special had begun. We\'re so excited to celebrate this next chapter with the people we love most.',
        },
      },
      {
        id: `sec_${ts}_2`, type: 'event-details', order: 2,
        content: {
          ceremony: {
            venue: details.mainCeremony?.venueName || 'Ceremony venue',
            address: details.mainCeremony?.address || '',
            time: details.mainCeremony?.startTime || '3:00 PM',
            dressCode: details.mainCeremony?.dressCode || '',
          },
          reception: {
            venue: details.reception?.venueName || 'Reception venue',
            address: details.reception?.address || '',
            time: details.reception?.startTime || '6:00 PM',
          },
        },
      },
      {
        id: `sec_${ts}_3`, type: 'full-rsvp', order: 3,
        content: {
          deadline: details.rsvpContent?.rsvpDeadline || '',
          closingMessage: 'We cannot wait to celebrate with you.',
        },
      },
    ];
    setDetailsAndMark(prev => ({
      ...prev,
      pageSections: { ...(prev.pageSections || {}), home: defaultSections },
    }));
  }, [details]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave — debounced 2s after last change
  useEffect(() => {
    if (!unsaved || !details) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => { doSave(false); }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [unsaved]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPageSections = useMemo(() => {
    if (!details?.pageSections) return [];
    const sections = details.pageSections[currentPage] || [];
    return [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [details, currentPage]);

  const theme = WEBSITE_THEMES.find(t => t.id === (details?.activeTheme || 'still')) || WEBSITE_THEMES[0];
  const universeTheme = UNIVERSE_THEMES[details?.activeUniverse] || UNIVERSE_THEMES.aman;
  const typo = {
    fontDisplay: details?.displayFont || universeTheme?.fontDisplay || '"Plus Jakarta Sans", sans-serif',
    fontBody: details?.bodyFont || universeTheme?.fontBody || '"Plus Jakarta Sans", sans-serif',
  };

  const setDetailsAndMark = (updater) => {
    setDetails(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      detailsRef.current = next;
      return next;
    });
    setUnsaved(true);
  };

  const updateField = (field, value) => {
    setDetailsAndMark(prev => ({ ...prev, [field]: value }));
  };

  const doSave = async (showToast = true) => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const payload = detailsRef.current;
      if (existing?.id) {
        await base44.entities.WeddingDetails.update(existing.id, payload);
      } else {
        await base44.entities.WeddingDetails.create(payload);
      }
      setUnsaved(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
      if (showToast) toast.success('Saved');
    } catch {
      setSaveStatus('idle');
      toast.error('Failed to save');
    }
    setIsSaving(false);
  };

  const handleAddSection = (newSection) => {
    setDetailsAndMark(prev => {
      const currentSections = prev?.pageSections?.[currentPage] || [];
      const withNew = [...currentSections, { ...newSection, order: typeof insertAfterIndex === 'number' ? insertAfterIndex + 0.5 : currentSections.length }];
      const normalized = withNew.sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
      return { ...prev, pageSections: { ...(prev.pageSections || {}), [currentPage]: normalized } };
    });
    setSectionPickerOpen(false);
    setSelectedSection(newSection);
    setRightPanelTab('section-editor');
  };

  const deleteSection = (sectionId) => {
    setDetailsAndMark(prev => {
      const sections = (prev?.pageSections?.[currentPage] || []).filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i }));
      return { ...prev, pageSections: { ...(prev.pageSections || {}), [currentPage]: sections } };
    });
    if (selectedSection?.id === sectionId) { setSelectedSection(null); setRightPanelTab('design'); }
  };

  const moveSection = (index, direction) => {
    setDetailsAndMark(prev => {
      const sections = [...(prev?.pageSections?.[currentPage] || [])];
      const newIdx = direction === 'up' ? index - 1 : index + 1;
      if (newIdx < 0 || newIdx >= sections.length) return prev;
      [sections[index], sections[newIdx]] = [sections[newIdx], sections[index]];
      const updated = sections.map((s, i) => ({ ...s, order: i }));
      return { ...prev, pageSections: { ...(prev.pageSections || {}), [currentPage]: updated } };
    });
  };

  const handleSectionContentChange = (field, value) => {
    updateField(field, value);
    if (field === 'pageSections' && selectedSection) {
      const updatedSec = (value[currentPage] || []).find(s => s.id === selectedSection.id);
      if (updatedSec) setSelectedSection(updatedSec);
    }
  };

  const frameWidth = previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '390px';
  const previewUrl = details?.slug ? `/w/${details.slug}?preview=true` : null;

  const allPageLabels = {
    ...Object.fromEntries(WEDDING_PAGES.map(p => [p.slug, p.label])),
    ...Object.fromEntries((details?.customPages || []).map(p => [p.slug, p.name])),
  };

  if (isLoading || details === null) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1C1E' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ height: '100vh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif", background: '#1C1C1E', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{ height: 48, flexShrink: 0, background: '#1C1C1E', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button
          onClick={() => navigate('/studio/guest-suite/assets')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ChevronLeft size={14} />
          Guest suite
        </button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', letterSpacing: '0.01em' }}>Website builder</span>
          {details?.displayFont && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 999 }}>
              {FONT_OPTIONS.find(f => f.value === details.displayFont)?.label || details.displayFont.replace(/['"]/g, '').split(',')[0]}
            </span>
          )}
          {saveStatus === 'saving' && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>✓ Saved</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <button
            onClick={() => setShowFullPreview(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, padding: '5px 12px', fontFamily: 'inherit', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            <Monitor size={13} />
            Preview
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: '5px 6px', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              title="Open in new tab"
            >
              <ExternalLink size={11} />
            </a>
          )}
          <button
            onClick={() => doSave(true)}
            style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            Save
          </button>
          <button
            onClick={() => navigate('/studio/guest-suite/share')}
            style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            Share
          </button>
          <button
            onClick={() => doSave(true).then(() => { setPublishModalTab('website'); setPublishModalOpen(true); })}
            style={{ padding: '5px 16px', background: '#E03553', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: 999, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#C42D47'}
            onMouseLeave={e => e.currentTarget.style.background = '#E03553'}
          >
            Publish
          </button>
        </div>
      </div>

      {/* THREE-PANEL BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <WBLeftPanel
          details={details}
          onChange={updateField}
          currentPage={currentPage}
          onPageChange={(p) => { setCurrentPage(p); setSelectedSection(null); setRightPanelTab('design'); }}
          selectedAsset={selectedAsset}
          onAssetSelect={setSelectedAsset}
        />

        {/* CENTER PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#2C2C2E', minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Device switcher toolbar */}
          <div style={{ height: 48, background: '#2C2C2E', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', flexShrink: 0, position: 'relative' }}>
            {/* URL indicator — left */}
            <div style={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                openinvite.com/w/{details.slug || 'your-wedding'}/{currentPage !== 'home' ? currentPage : ''}
              </span>
            </div>
            {/* Device pill */}
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', borderRadius: 999, padding: 3 }}>
              {[{ id: 'desktop', Icon: Monitor }, { id: 'tablet', Icon: Tablet }, { id: 'mobile', Icon: Smartphone }].map(({ id, Icon }) => (
                <button
                  key={id}
                  onClick={() => setPreviewDevice(id)}
                  style={{ padding: '5px 12px', borderRadius: 999, background: previewDevice === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: previewDevice === id ? '#FFFFFF' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                >
                  <Icon size={13} strokeWidth={1.5} />
                </button>
              ))}
            </div>
            {/* Page label — right */}
            <span style={{ position: 'absolute', right: 16, fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
              {allPageLabels[currentPage] || currentPage}
            </span>
          </div>

          {/* Website Frame */}
          <div style={{
            flex: 1, overflow: 'hidden',
            background: '#1C1C1E',
            display: 'flex', alignItems: previewDevice === 'desktop' ? 'flex-start' : 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '390px',
              height: previewDevice === 'mobile' ? '693px' : '100%',
              background: '#fff',
              overflowY: 'auto', overflowX: 'hidden',
              flexShrink: 0,
              display: 'flex', flexDirection: 'column',
            }}>
              <PreviewContent
                theme={theme} typo={typo} universeTheme={universeTheme} details={details} currentPage={currentPage}
                currentPageSections={currentPageSections} allPageLabels={allPageLabels} selectedSection={selectedSection}
                onPageChange={(slug) => { setCurrentPage(slug); setSelectedSection(null); setRightPanelTab('design'); }}
                onSectionSelect={(section) => { setSelectedSection(section); setRightPanelTab('section-editor'); }}
                onMoveSection={moveSection} onDeleteSection={deleteSection}
                onInsertAbove={(index) => { setInsertAfterIndex(index - 0.5); setSectionPickerOpen(true); }}
                onAddSection={(index) => { setInsertAfterIndex(index); setSectionPickerOpen(true); }}
                isMobile={previewDevice === 'mobile'}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 280, background: '#1C1C1E', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <WBRightPanel
            details={details}
            universeTheme={universeTheme}
            onChange={rightPanelTab === 'section-editor' ? handleSectionContentChange : updateField}
            selectedSection={selectedSection?.id || null}
            onClearSection={() => { setSelectedSection(null); setRightPanelTab('design'); }}
            rightTab={rightPanelTab === 'section-editor' ? 'section' : rightPanelTab}
            onRightTabChange={(tab) => setRightPanelTab(tab === 'section' ? 'section-editor' : tab)}
            masterData={details}
            selectedAsset={null}
            assetContent={{}}
            onAssetChange={updateAssetContent}
            onClearAsset={() => {}}
          />
        </div>
      </div>

      {/* Section picker modal */}
      {sectionPickerOpen && (
        <SectionTemplatePicker
          theme={theme}
          insertIndex={insertAfterIndex}
          onSelect={(newSection) => handleAddSection(newSection)}
          onClose={() => setSectionPickerOpen(false)}
        />
      )}

      {avaModalOpen && (
        <AvaAutoFillModal
          onClose={() => setAvaModalOpen(false)}
          weddingDetails={details}
          onApply={(newPageSections) => {
            setDetailsAndMark(prev => ({ ...prev, pageSections: newPageSections }));
            setCurrentPage('home');
            setSelectedSection(null);
            setRightPanelTab('design');
          }}
        />
      )}

      {showFullPreview && (
        <FullScreenPreview
          details={details}
          initialPage={currentPage}
          onClose={() => setShowFullPreview(false)}
        />
      )}

      {publishModalOpen && details && (
        <PublishModal
          onClose={() => setPublishModalOpen(false)}
          details={{ ...details, initialTab: publishModalTab }}
          onUpdate={(patch) => {
            setDetailsAndMark(prev => ({ ...prev, ...patch }));
          }}
        />
      )}
    </div>
  );
}

// Section wrapper with hover toolbar
function SectionWrap({ section, index, isSelected, onSelect, onMoveUp, onMoveDown, onDelete, onInsertAbove, theme, typo, universeTheme, masterData, isMobile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', outline: isSelected ? '2px solid #E03553' : 'none', outlineOffset: -2, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <WBSectionRenderer section={section} theme={theme} typo={typo} universeTheme={universeTheme} masterData={masterData} isMobile={isMobile} />
      {(hovered || isSelected) && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30, display: 'flex', gap: 4, background: isSelected ? '#E03553' : '#2563EB', borderRadius: 4, padding: '4px 8px' }}>
          <ToolBtn onClick={e => { e.stopPropagation(); onMoveUp(); }} title="Move up">↑</ToolBtn>
          <ToolBtn onClick={e => { e.stopPropagation(); onMoveDown(); }} title="Move down">↓</ToolBtn>
          <ToolBtn onClick={e => { e.stopPropagation(); onSelect(); }} title="Edit" bold>Edit</ToolBtn>
          <ToolBtn onClick={e => { e.stopPropagation(); onInsertAbove(); }} title="Add above">+</ToolBtn>
          <ToolBtn onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete">×</ToolBtn>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ children, onClick, title, bold }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: bold ? 11 : 13, fontWeight: bold ? 700 : 400, padding: '2px 4px', fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

function PlaceholderSection({ section, universeTheme, effectiveHf, effectiveBf, onCustomise }) {
  const [hovered, setHovered] = useState(false);
  const { text, accent, background } = universeTheme;
  const hf = effectiveHf || universeTheme.fontDisplay;
  const bf = effectiveBf || universeTheme.fontBody;
  const muted = text + '80';
  const divider = `1px solid ${text}14`;
  const isHero = section.type === 'hero';
  return (
    <div
      onClick={onCustomise}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', background, borderTop: isHero ? 'none' : divider }}
    >
      {isHero ? (
        <div style={{ padding: '80px 40px 64px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: hf, fontSize: 48, fontWeight: 400, color: text, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {section.heading}
          </h1>
          {section.subheading && (
            <p style={{ fontFamily: bf, fontSize: 13, color: accent, margin: '0 0 14px', letterSpacing: '0.05em' }}>
              {section.subheading}
            </p>
          )}
          {section.body && (
            <p style={{ fontFamily: bf, fontSize: 14, color: muted, margin: 0, lineHeight: 1.6 }}>
              {section.body}
            </p>
          )}
        </div>
      ) : (
        <div style={{ padding: '48px 40px' }}>
          <h2 style={{ fontFamily: hf, fontSize: 30, fontWeight: 400, color: text, margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {section.heading}
          </h2>
          {section.body && (
            <p style={{ fontFamily: bf, fontSize: 14, color: muted, margin: 0, lineHeight: 1.75, maxWidth: 560, whiteSpace: 'pre-line' }}>
              {section.body}
            </p>
          )}
        </div>
      )}
      {hovered && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', padding: '7px 16px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#0A0A0A', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(4px)' }}>
            Click to customise
          </div>
        </div>
      )}
    </div>
  );
}

// Universe fonts not covered by any TYPOGRAPHY_PAIRINGS entry
const UNIVERSE_GFONTS = {
  'Noto Serif JP': 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400&display=swap',
};

function PreviewContent({ theme, typo, universeTheme, details, currentPage, currentPageSections, allPageLabels, selectedSection, onPageChange, onSectionSelect, onMoveSection, onDeleteSection, onInsertAbove, onAddSection, isMobile }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preload ALL typography fonts at mount so switching is instant (no loading delay)
  useEffect(() => {
    const needed = new Set();

    // Universe display font (for fonts not covered by any typography pairing)
    const univName = universeTheme?.fontDisplay?.replace(/['"]/g, '').split(',')[0].trim();
    if (univName && UNIVERSE_GFONTS[univName]) needed.add(UNIVERSE_GFONTS[univName]);

    // Preload every font option so switching is instant
    FONT_OPTIONS.forEach(f => {
      if (f.google) needed.add(`https://fonts.googleapis.com/css2?family=${f.google}&display=swap`);
    });

    // Remove previously injected font links
    document.head.querySelectorAll('link[data-wf-font]').forEach(el => el.remove());

    // Inject fresh links
    needed.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-wf-font', '1');
      document.head.appendChild(link);
    });
    console.log('[fonts] preloaded', needed.size, 'font URLs');
  }, [universeTheme?.fontDisplay, details?.displayFont, details?.bodyFont]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholderData = PLACEHOLDER_PAGES[currentPage];
  const showPlaceholders = currentPageSections.length === 0 && !!placeholderData;
  // Detect dark universe backgrounds (e.g. Tokyo) so button/empty-state colours stay readable
  const bgHex = universeTheme.background || '#F8F7F5';
  const bgR = parseInt(bgHex.slice(1, 3), 16);
  const bgIsDark = (bgR * 299 + parseInt(bgHex.slice(3, 5), 16) * 587 + parseInt(bgHex.slice(5, 7), 16) * 114) / 1000 < 128;
  const addBtnBorder = (showPlaceholders && !bgIsDark) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)';
  const addBtnColor = (showPlaceholders && !bgIsDark) ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)';
  // Typography overrides universe fonts; universe fonts override system defaults
  const effectiveHf = typo?.fontDisplay || universeTheme?.fontDisplay || '"Plus Jakarta Sans", sans-serif';
  const effectiveBf = typo?.fontBody || universeTheme?.fontBody || '"Plus Jakarta Sans", sans-serif';

  console.log('[typo] PreviewContent — hf:', effectiveHf, '| bf:', effectiveBf);

  return (
    <>
      {/* Nav bar inside preview */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ background: universeTheme.primary, padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: '#FFFFFF', fontFamily: effectiveHf }}>
            {details.coupleNames || 'Your Names'}
          </span>
          {isMobile ? (
            <button onClick={() => setMobileMenuOpen(v => !v)} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 20 }}>
              {(details.enabledPages || ['home']).slice(0, 5).map(slug => {
                const label = allPageLabels[slug] || slug;
                return (
                  <span key={slug} onClick={() => onPageChange(slug)} style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: '#FFFFFF', opacity: currentPage === slug ? 1 : 0.4, cursor: 'pointer', paddingBottom: 2, borderBottom: currentPage === slug ? '1px solid #FFFFFF' : '1px solid transparent', fontFamily: effectiveBf }}>
                    {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {isMobile && mobileMenuOpen && (
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, background: universeTheme.primary, zIndex: 20, padding: '8px 0 16px' }}>
            {(details.enabledPages || ['home']).slice(0, 5).map(slug => {
              const label = allPageLabels[slug] || slug;
              return (
                <div key={slug} onClick={() => { onPageChange(slug); setMobileMenuOpen(false); }} style={{ padding: '12px 24px', color: '#FFFFFF', fontSize: 14, cursor: 'pointer', opacity: currentPage === slug ? 1 : 0.6, fontFamily: effectiveBf }}>
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', background: universeTheme.background, fontFamily: effectiveBf }}>
        {currentPageSections.length === 0 ? (
          showPlaceholders ? (
            placeholderData.sections.map((section, i) => (
              <PlaceholderSection
                key={i}
                section={section}
                universeTheme={universeTheme}
                effectiveHf={effectiveHf}
                effectiveBf={effectiveBf}
                onCustomise={() => onAddSection(0)}
              />
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 40 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: bgIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 28, color: universeTheme.text }}>+</div>
              <p style={{ fontSize: 18, fontWeight: 600, color: universeTheme.text, marginBottom: 8, fontFamily: effectiveBf }}>No sections yet</p>
              <p style={{ fontSize: 14, color: bgIsDark ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,10,0.4)', marginBottom: 24, fontFamily: effectiveBf }}>Add your first section to start building this page</p>
              <button onClick={() => onAddSection(0)} style={{ padding: '12px 24px', background: universeTheme.primary, color: bgIsDark ? universeTheme.background : '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999 }}>
                + Add first section
              </button>
            </div>
          )
        ) : (
          <>
            {currentPageSections.map((section, index) => (
              <SectionWrap
                key={section.id}
                section={section}
                index={index}
                isSelected={selectedSection?.id === section.id}
                onSelect={() => onSectionSelect(section)}
                onMoveUp={() => onMoveSection(index, 'up')}
                onMoveDown={() => onMoveSection(index, 'down')}
                onDelete={() => onDeleteSection(section.id)}
                onInsertAbove={() => onInsertAbove(index)}
                theme={theme}
                typo={typo}
                universeTheme={universeTheme}
                masterData={details}
                isMobile={isMobile}
              />
            ))}
          </>
        )}

        {/* Add section at bottom */}
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => onAddSection(currentPageSections.length)}
            style={{ width: '100%', maxWidth: 500, height: 48, border: `2px dashed ${addBtnBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: addBtnColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = addBtnBorder; e.currentTarget.style.color = addBtnColor; }}
          >
            + Add section
          </button>
        </div>
      </div>
    </>
  );
}