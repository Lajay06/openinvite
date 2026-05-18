import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Monitor, Tablet, Smartphone, ChevronLeft, ExternalLink, Sparkles } from 'lucide-react';
import WBRightPanel from '@/components/website-builder/WBRightPanel';
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
      const merged = { ...DEFAULT, ...existing, pageSections: existing.pageSections || {} };
      setDetails(merged);
      detailsRef.current = merged;
    } else if (existing === null) {
      setDetails({ ...DEFAULT });
      detailsRef.current = { ...DEFAULT };
    }
  }, [existing]);

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
    try {
      const payload = detailsRef.current;
      if (existing?.id) {
        await base44.entities.WeddingDetails.update(existing.id, payload);
      } else {
        await base44.entities.WeddingDetails.create(payload);
      }
      setUnsaved(false);
      if (showToast) toast.success('Saved');
    } catch {
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

  const frameWidth = previewDevice === 'mobile' ? 390 : previewDevice === 'tablet' ? 768 : '100%';
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
        <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF', position: 'absolute', left: '50%', transform: 'translateX(-50%)', margin: 0, pointerEvents: 'none', letterSpacing: '0.01em' }}>
          Website builder
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', border: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <ExternalLink size={12} />
              Preview
            </a>
          )}
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
        <LeftPanel details={details} currentPage={currentPage} onPageChange={(p) => { setCurrentPage(p); setSelectedSection(null); setRightPanelTab('design'); }} onAvaClick={() => setAvaModalOpen(true)} />

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
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: frameWidth, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '100%', border: 'none', outline: 'none' }}>
              {/* Nav bar inside preview */}
              <div style={{ background: theme.darkBg || '#0A0A0A', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: '#fff' }}>
                  {details.coupleNames || 'Your Names'}
                </span>
                <div style={{ display: 'flex', gap: 20 }}>
                  {(details.enabledPages || ['home']).slice(0, 5).map(slug => {
                    const label = allPageLabels[slug] || slug;
                    return (
                      <span key={slug} onClick={() => { setCurrentPage(slug); setSelectedSection(null); setRightPanelTab('design'); }} style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: currentPage === slug ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', paddingBottom: 2, borderBottom: currentPage === slug ? '1px solid #fff' : '1px solid transparent' }}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Sections */}
              <div style={{ flex: 1, overflowY: 'auto', background: theme.lightBg || '#F8F7F5' }}>
                {currentPageSections.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 40 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 28 }}>+</div>
                    <p style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', marginBottom: 8 }}>No sections yet</p>
                    <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', marginBottom: 24 }}>Add your first section to start building this page</p>
                    <button onClick={() => { setInsertAfterIndex(0); setSectionPickerOpen(true); }} style={{ padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999 }}>
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
                        onSelect={() => { setSelectedSection(section); setRightPanelTab('section-editor'); }}
                        onMoveUp={() => moveSection(index, 'up')}
                        onMoveDown={() => moveSection(index, 'down')}
                        onDelete={() => deleteSection(section.id)}
                        onInsertAbove={() => { setInsertAfterIndex(index - 0.5); setSectionPickerOpen(true); }}
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
                    onClick={() => { setInsertAfterIndex(currentPageSections.length); setSectionPickerOpen(true); }}
                    style={{ width: '100%', maxWidth: 500, height: 48, border: '2px dashed rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'rgba(10,10,10,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,10,10,0.15)'; e.currentTarget.style.color = 'rgba(10,10,10,0.4)'; }}
                  >
                    + Add section
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 280, background: '#161616', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <WBRightPanel
            details={details}
            onChange={rightPanelTab === 'section-editor' ? handleSectionContentChange : updateField}
            selectedSection={selectedSection?.id || null}
            onClearSection={() => { setSelectedSection(null); setRightPanelTab('design'); }}
            rightTab={rightPanelTab === 'section-editor' ? 'section' : 'design'}
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

// LEFT PANEL
function LeftPanel({ details, currentPage, onPageChange, onAvaClick }) {
  const [hoveredPage, setHoveredPage] = useState(null);

  const pageList = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'our-story', label: 'Our story', icon: '📖' },
    { id: 'celebration', label: 'Celebration', icon: '🎉' },
    { id: 'rsvp', label: 'RSVP', icon: '✉️' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'registry', label: 'Registry', icon: '🎁' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'photos', label: 'Photos', icon: '📷' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ];

  return (
    <div style={{ width: 200, background: '#111111', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
        {/* Pages label */}
        <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', margin: '0 0 8px', padding: '0 16px' }}>
          Pages
        </p>
        {pageList.map(page => {
          const isActive = currentPage === page.id;
          const isHovered = hoveredPage === page.id && !isActive;
          return (
            <div
              key={page.id}
              onClick={() => onPageChange(page.id)}
              onMouseEnter={() => setHoveredPage(page.id)}
              onMouseLeave={() => setHoveredPage(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: isActive ? '7px 16px 7px 14px' : '7px 16px',
                gap: 8,
                cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.06)' : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderLeft: isActive ? '2px solid #E03553' : '2px solid transparent',
                transition: 'background 0.12s',
              }}
            >
              <span style={{ fontSize: 12 }}>{page.icon}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? '#FFFFFF' : isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', fontFamily: "'Plus Jakarta Sans'", transition: 'color 0.12s' }}>
                {page.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onAvaClick}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg, #ec4899, #9333ea)', color: '#FFFFFF', border: 'none', cursor: 'pointer', width: '100%', fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", borderRadius: 999 }}
        >
          <Sparkles size={12} />
          Auto-fill with Ava
        </button>
        <button
          onClick={() => window.location.href = '/studio/ava'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', width: '100%', fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'", borderRadius: 999, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <span style={{ fontSize: 10 }}>✦</span>
          Ava's studio
        </button>
      </div>
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