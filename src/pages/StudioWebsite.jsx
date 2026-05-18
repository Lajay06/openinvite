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
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, WEDDING_PAGES } from '@/lib/websiteThemes';
import WBSectionRenderer from '@/components/website-builder/WBSectionRenderer';
import AvaAutoFillModal from '@/components/website-builder/AvaAutoFillModal';
import PublishModal from '@/components/website-builder/PublishModal';
import { ASSET_PREVIEW_MAP, ASSET_ID_TO_KEY } from '@/components/website-builder/AssetPreviews';

const DEFAULT = {
  coupleNames: '',
  weddingDate: '',
  slug: '',
  websiteEnabled: true,
  websitePassword: '',
  activeTheme: 'still',
  activeTypography: 'classic',
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
  travelContent: { gettingThereNotes: '', parkingInfo: '', transportInfo: '', accommodations: [] },
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
  const typo = TYPOGRAPHY_PAIRINGS.find(t => t.id === (details?.activeTypography || 'classic')) || TYPOGRAPHY_PAIRINGS[0];

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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0F0F' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ height: '100vh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif", background: '#0F0F0F', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{ height: 48, flexShrink: 0, background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button
          onClick={() => navigate('/studio/guest-suite')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ChevronLeft size={14} />
          Guest suite
        </button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', letterSpacing: '0.01em' }}>Website builder</span>
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
            style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            Save
          </button>
          <button
            onClick={() => navigate('/studio/guest-suite/share')}
            style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, transition: 'background 0.15s' }}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1A1A1A', minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Device switcher toolbar */}
          <div style={{ height: 48, background: '#1A1A1A', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', flexShrink: 0, position: 'relative' }}>
            {/* URL indicator — left */}
            <div style={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
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
          <div style={{ flex: 1, overflowY: 'auto', padding: previewDevice === 'desktop' ? 0 : 24 }}>
            {previewDevice === 'mobile' ? (
              /* ── Phone chrome ── */
              <div style={{ width: 414, margin: '24px auto', background: '#1A1A1A', borderRadius: 44, padding: 12, boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 24px 48px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                <div style={{ height: 32, background: '#0A0A0A', borderRadius: '32px 32px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 80, height: 24, background: '#0A0A0A', borderRadius: 999, border: '2px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div style={{ width: '390px', height: 'calc(100vh - 200px)', overflowY: 'auto', overflowX: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                  <PreviewContent
                    theme={theme} typo={typo} details={details} currentPage={currentPage}
                    currentPageSections={currentPageSections} allPageLabels={allPageLabels} selectedSection={selectedSection}
                    onPageChange={(slug) => { setCurrentPage(slug); setSelectedSection(null); setRightPanelTab('design'); }}
                    onSectionSelect={(section) => { setSelectedSection(section); setRightPanelTab('section-editor'); }}
                    onMoveSection={moveSection} onDeleteSection={deleteSection}
                    onInsertAbove={(index) => { setInsertAfterIndex(index - 0.5); setSectionPickerOpen(true); }}
                    onAddSection={(index) => { setInsertAfterIndex(index); setSectionPickerOpen(true); }}
                    isMobile={true}
                  />
                </div>
                <div style={{ height: 24, background: '#0A0A0A', borderRadius: '0 0 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 999 }} />
                </div>
              </div>
            ) : (
              /* ── Desktop / Tablet frame ── */
              <div style={{ width: frameWidth, margin: '0 auto', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: previewDevice === 'desktop' ? '100%' : undefined }}>
                <PreviewContent
                  theme={theme} typo={typo} details={details} currentPage={currentPage}
                  currentPageSections={currentPageSections} allPageLabels={allPageLabels} selectedSection={selectedSection}
                  onPageChange={(slug) => { setCurrentPage(slug); setSelectedSection(null); setRightPanelTab('design'); }}
                  onSectionSelect={(section) => { setSelectedSection(section); setRightPanelTab('section-editor'); }}
                  onMoveSection={moveSection} onDeleteSection={deleteSection}
                  onInsertAbove={(index) => { setInsertAfterIndex(index - 0.5); setSectionPickerOpen(true); }}
                  onAddSection={(index) => { setInsertAfterIndex(index); setSectionPickerOpen(true); }}
                  isMobile={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 280, background: '#161616', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <WBRightPanel
            details={details}
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
function SectionWrap({ section, index, isSelected, onSelect, onMoveUp, onMoveDown, onDelete, onInsertAbove, theme, typo, masterData }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: 'relative', outline: isSelected ? '2px solid #E03553' : 'none', outlineOffset: -2, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <WBSectionRenderer section={section} theme={theme} typo={typo} masterData={masterData} />
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

function PreviewContent({ theme, typo, details, currentPage, currentPageSections, allPageLabels, selectedSection, onPageChange, onSectionSelect, onMoveSection, onDeleteSection, onInsertAbove, onAddSection, isMobile }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <>
      {/* Nav bar inside preview */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ background: theme.darkBg || '#0A0A0A', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: theme.darkText || '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {details.coupleNames || 'Your Names'}
          </span>
          {isMobile ? (
            <button onClick={() => setMobileMenuOpen(v => !v)} style={{ background: 'none', border: 'none', color: theme.darkText || '#FFFFFF', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 20 }}>
              {(details.enabledPages || ['home']).slice(0, 5).map(slug => {
                const label = allPageLabels[slug] || slug;
                return (
                  <span key={slug} onClick={() => onPageChange(slug)} style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: theme.darkText || '#FFFFFF', opacity: currentPage === slug ? 1 : 0.4, cursor: 'pointer', paddingBottom: 2, borderBottom: currentPage === slug ? `1px solid ${theme.darkText || '#fff'}` : '1px solid transparent' }}>
                    {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {isMobile && mobileMenuOpen && (
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, background: theme.darkBg || '#0A0A0A', zIndex: 20, padding: '8px 0 16px' }}>
            {(details.enabledPages || ['home']).slice(0, 5).map(slug => {
              const label = allPageLabels[slug] || slug;
              return (
                <div key={slug} onClick={() => { onPageChange(slug); setMobileMenuOpen(false); }} style={{ padding: '12px 24px', color: theme.darkText || '#FFFFFF', fontSize: 14, cursor: 'pointer', opacity: currentPage === slug ? 1 : 0.6 }}>
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', background: theme.lightBg || '#F8F7F5' }}>
        {currentPageSections.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 28 }}>+</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', marginBottom: 8 }}>No sections yet</p>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', marginBottom: 24 }}>Add your first section to start building this page</p>
            <button onClick={() => onAddSection(0)} style={{ padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999 }}>
              + Add first section
            </button>
          </div>
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
                masterData={details}
              />
            ))}
          </>
        )}

        {/* Add section at bottom */}
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => onAddSection(currentPageSections.length)}
            style={{ width: '100%', maxWidth: 500, height: 48, border: '2px dashed rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'rgba(10,10,10,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,10,10,0.15)'; e.currentTarget.style.color = 'rgba(10,10,10,0.4)'; }}
          >
            + Add section
          </button>
        </div>
      </div>
    </>
  );
}