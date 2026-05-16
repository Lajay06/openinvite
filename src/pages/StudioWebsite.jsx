import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ height: '100vh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif", background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{ height: 56, flexShrink: 0, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/studio/guest-suite')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444444', fontSize: 13, fontWeight: 500, padding: 0 }}>
          ← Guest Suite
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', position: 'absolute', left: '50%', transform: 'translateX(-50%)', margin: 0, pointerEvents: 'none' }}>
          Website Builder
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', border: '1px solid #EEEEEE', background: 'transparent', color: '#444444', fontSize: 12, fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }}>
              ↗ Preview
            </a>
          )}
          <button onClick={() => navigate('/studio/guest-suite/share')} style={{ padding: '8px 16px', border: '1px solid #EEEEEE', background: 'transparent', color: '#444444', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            Share ↗
          </button>
          <button onClick={() => doSave(true).then(() => { setPublishModalTab('website'); setPublishModalOpen(true); })} style={{ padding: '8px 20px', background: '#0A0A0A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            Publish
          </button>
        </div>
      </div>

      {/* THREE-PANEL BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <LeftPanel details={details} currentPage={currentPage} onPageChange={(p) => { setCurrentPage(p); setSelectedSection(null); setRightPanelTab('design'); }} onAvaClick={() => setAvaModalOpen(true)} />

        {/* CENTER PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F0F0F0', minWidth: 0, borderLeft: '1px solid #EEEEEE' }}>

          {/* Preview device toolbar */}
          <div style={{ height: 44, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
            {[{ id: 'desktop', Icon: Monitor }, { id: 'tablet', Icon: Tablet }, { id: 'mobile', Icon: Smartphone }].map(({ id, Icon }) => (
              <button key={id} onClick={() => setPreviewDevice(id)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${previewDevice === id ? '#0A0A0A' : '#EEEEEE'}`, background: previewDevice === id ? '#0A0A0A' : 'transparent', cursor: 'pointer' }}>
                <Icon size={13} color={previewDevice === id ? '#fff' : '#888888'} strokeWidth={1.5} />
              </button>
            ))}
            <div style={{ flex: 1, height: 28, background: '#F5F5F5', border: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 12px', overflow: 'hidden', maxWidth: 400, margin: '0 8px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', marginRight: 6, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                openinvite.com/w/{details.slug || 'your-wedding'}/{currentPage !== 'home' ? currentPage : ''}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#444444' }}>{allPageLabels[currentPage] || currentPage}</span>
          </div>

          {/* Website Frame */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 16 }}>
            <div style={{ width: frameWidth, background: '#fff', boxShadow: previewDevice === 'mobile' ? '0 8px 40px rgba(0,0,0,0.2)' : '0 2px 20px rgba(0,0,0,0.12)', borderRadius: previewDevice === 'mobile' ? 36 : previewDevice === 'tablet' ? 8 : 0, border: previewDevice === 'mobile' ? '6px solid #1D1D1F' : previewDevice === 'tablet' ? '1px solid #DDD' : 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              {/* Nav bar inside preview */}
              <div style={{ background: theme.darkBg || '#0A0A0A', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', textTransform: 'uppercase' }}>
                  {details.coupleNames || 'Your Names'}
                </span>
                <div style={{ display: 'flex', gap: 20 }}>
                  {(details.enabledPages || ['home']).slice(0, 5).map(slug => {
                    const label = allPageLabels[slug] || slug;
                    return (
                      <span key={slug} onClick={() => { setCurrentPage(slug); setSelectedSection(null); setRightPanelTab('design'); }} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: currentPage === slug ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', paddingBottom: 2, borderBottom: currentPage === slug ? '1px solid #fff' : '1px solid transparent' }}>
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
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 28 }}>+</div>
                    <p style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', marginBottom: 8 }}>No sections yet</p>
                    <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Add your first section to start building this page</p>
                    <button onClick={() => { setInsertAfterIndex(0); setSectionPickerOpen(true); }} style={{ padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Add First Section
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
                    style={{ width: '100%', maxWidth: 500, height: 48, border: '2px dashed #DDDDDD', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.color = '#888'; }}
                  >
                    + Add Section
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 320, background: '#FFFFFF', borderLeft: '1px solid #EEEEEE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
  const pageList = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'our-story', label: 'Our Story', icon: '📖' },
    { id: 'celebration', label: 'Celebration', icon: '🎉' },
    { id: 'rsvp', label: 'RSVP', icon: '✉️' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'registry', label: 'Registry', icon: '🎁' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'photos', label: 'Photos', icon: '📷' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ];

  const enabledPages = details?.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];

  return (
    <div style={{ width: 280, background: '#FFFFFF', borderRight: '1px solid #EEEEEE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* PAGES */}
        <div style={{ padding: '16px 20px 8px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Pages</p>
        </div>
        {pageList.map(page => (
          <div
            key={page.id}
            onClick={() => onPageChange(page.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              gap: 10,
              cursor: 'pointer',
              background: currentPage === page.id ? '#F5F5F5' : 'transparent',
              borderLeft: currentPage === page.id ? '2px solid #E03553' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 12 }}>{page.icon}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: currentPage === page.id ? '#0A0A0A' : '#444444', fontFamily: "'Plus Jakarta Sans'" }}>
              {page.label}
            </span>
          </div>
        ))}

        {/* Ava section at bottom */}
      </div>

      <div style={{ borderTop: '1px solid #EEEEEE', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onAvaClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'linear-gradient(135deg,#E03553,#803D81)', color: '#FFFFFF', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>
          <span>✦</span>
          <span>Auto-Fill with Ava</span>
        </button>
        <button onClick={() => window.location.href = '/studio/ava'} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'transparent', color: '#0A0A0A', border: '1px solid #EEEEEE', cursor: 'pointer', width: '100%', fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans'" }}>
          <span style={{ fontSize: 10 }}>✦</span>
          <span>Ava's Studio</span>
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
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30, display: 'flex', gap: 4, background: isSelected ? '#E03553' : '#2563EB', borderRadius: 6, padding: '4px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
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