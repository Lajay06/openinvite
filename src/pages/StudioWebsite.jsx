import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Monitor, Tablet, Smartphone, ChevronLeft, ExternalLink, Sparkles } from 'lucide-react';
import WBRightPanel from '@/components/website-builder/WBRightPanel';
import WBLeftPanel from '@/components/website-builder/WBLeftPanel';
import FullScreenPreview from '@/components/website-builder/FullScreenPreview';
import { FONT_OPTIONS, WEDDING_PAGES, UNIVERSE_CONFIGS, normalizeUniverseKey } from '@/lib/websiteThemes';
import { resolveColors, resolveTypography, googleFontsHref } from '@/lib/universeStyling';
import RealWebsitePreview from '@/components/website-builder/RealWebsitePreview';
import PublishModal from '@/components/website-builder/PublishModal';
import { MediaLibraryContext } from '@/components/website-builder/SectionEditorFields';
import MediaLibraryModal from '@/components/website-builder/MediaLibraryModal';
import ComponentLibraryModal from '@/components/website-builder/ComponentLibraryModal';
import { newBlock } from '@/components/guest-website/blocks/blockTypes';

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
  brooklyn: {
    name: 'Brooklyn',
    primary: '#1C1C1C',
    secondary: '#E5E5E5',
    background: '#F5F5F5',
    text: '#1C1C1C',
    accent: '#B85C38',
    fontDisplay: '"Bebas Neue", sans-serif',
    fontBody: '"IBM Plex Sans", sans-serif',
    feeling: 'Urban industrial, gritty, direct, unfussy',
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
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Lato", sans-serif',
    feeling: 'Chic, timeless, French romance',
  },
  bali: {
    name: 'Bali',
    primary: '#2D5A27',
    secondary: '#F5E6CC',
    background: '#FAF7EF',
    text: '#1A3318',
    accent: '#F5E6CC',
    fontDisplay: '"Prata", serif',
    fontBody: '"Mulish", sans-serif',
    feeling: 'Tropical spirit, lush, languid, alive',
  },
  capetown: {
    name: 'Cape Town',
    primary: '#5C3D2E',
    secondary: '#C4A882',
    background: '#F5EEE3',
    text: '#3D2818',
    accent: '#C4A882',
    fontDisplay: '"Bitter", serif',
    fontBody: '"Josefin Sans", sans-serif',
    feeling: 'Safari chic, earthy, adventurous, warm',
  },
  mykonos: {
    name: 'Mykonos',
    primary: '#1B4F8A',
    secondary: '#FFFFFF',
    background: '#F5FAFF',
    text: '#0A2540',
    accent: '#1B4F8A',
    fontDisplay: '"Cinzel", serif',
    fontBody: '"Montserrat", sans-serif',
    feeling: 'Aegean blue, crisp, whitewashed, coastal',
  },
  // feat/universes-expansion-10 — colour fields below are overridden by
  // resolveColors() at the call site (see the comment above where
  // baseUniverseTheme is resolved); name/feeling/fontDisplay/fontBody are
  // this file's own values, matching the pattern every universe above
  // already follows.
  amalfi: {
    name: 'Amalfi', primary: '#1B5E6B', secondary: '#D9A441', background: '#FBFAF6', text: '#1B5E6B', accent: '#D9A441',
    fontDisplay: '"Cormorant", serif', fontBody: '"Work Sans", sans-serif', feeling: 'Amalfi light — bright, airy, unhurried',
  },
  sedona: {
    name: 'Sedona', primary: '#3B2A1E', secondary: '#B5522A', background: '#EFDDC8', text: '#3B2A1E', accent: '#B5522A',
    fontDisplay: '"Cinzel", serif', fontBody: '"Sora", sans-serif', feeling: 'Red rock ritual — organic, grounded',
  },
  aspen: {
    name: 'Aspen', primary: '#2A2E31', secondary: '#3D5A46', background: '#F7F9FA', text: '#2A2E31', accent: '#3D5A46',
    fontDisplay: '"Spectral", serif', fontBody: '"Plus Jakarta Sans", sans-serif', feeling: 'Black tie winter — premium, quiet',
  },
  taj: {
    name: 'Taj', primary: '#5C1626', secondary: '#C9922E', background: '#FBF6EA', text: '#3A1116', accent: '#C9922E',
    fontDisplay: '"Prata", serif', fontBody: '"Hind", sans-serif', feeling: 'Pavilion in gold — rich, ornamental',
  },
  havana: {
    name: 'Havana', primary: '#16324A', secondary: '#D9713C', background: '#F3E7CF', text: '#16324A', accent: '#D9713C',
    fontDisplay: '"Abril Fatface", serif', fontBody: '"Raleway", sans-serif', feeling: 'Retro luxury — warm, film-poster',
  },
  edinburgh: {
    name: 'Edinburgh', primary: '#2E3B2A', secondary: '#6B2333', background: '#F2ECDD', text: '#2E3B2A', accent: '#6B2333',
    fontDisplay: '"EB Garamond", serif', fontBody: '"Source Sans 3", sans-serif', feeling: 'Heritage estate — slow, cinematic',
  },
  monaco: {
    name: 'Monaco', primary: '#0D0D10', secondary: '#B8963E', background: '#FFFFFF', text: '#0D0D10', accent: '#B8963E',
    fontDisplay: '"Antic Didone", serif', fontBody: '"Manrope", sans-serif', feeling: 'Marina fashion-plate — precise, cool',
  },
  florence: {
    name: 'Florence', primary: '#5C2A2E', secondary: '#B5643A', background: '#F2E9DC', text: '#5C2A2E', accent: '#B5643A',
    fontDisplay: '"Libre Baskerville", serif', fontBody: '"DM Sans", sans-serif', feeling: 'Tuscan editorial — sketched, unfussy',
  },
  seoul: {
    name: 'Seoul', primary: '#2B2E33', secondary: '#9B8AC4', background: '#F7F3F8', text: '#2B2E33', accent: '#9B8AC4',
    fontDisplay: '"Outfit", sans-serif', fontBody: '"Noto Sans KR", sans-serif', feeling: 'Contemporary calm — modern, precise',
  },
  shanghai: {
    name: 'Shanghai', primary: '#0F1B14', secondary: '#C9A227', background: '#F5F0E8', text: '#0F1B14', accent: '#C9A227',
    fontDisplay: '"Playfair Display", serif', fontBody: '"Noto Sans SC", sans-serif', feeling: 'Modern glamour — jade, gold, lacquer',
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
};

export default function StudioWebsite({ onBack }) {
  const navigate = useNavigate();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishModalTab, setPublishModalTab] = useState('website');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [details, setDetails] = useState(null);
  const [unsaved, setUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [rightPanelTab, setRightPanelTab] = useState('design');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showFullPreview, setShowFullPreview] = useState(false);
  // feat/entrance-moment: 0 = never replayed this session. Bumping it
  // remounts EntranceMoment fresh (via `key`) inside RealWebsitePreview —
  // it otherwise never auto-mounts in the builder, so normal editing never
  // replays it.
  const [replayEntranceKey, setReplayEntranceKey] = useState(0);
  const detailsRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autosaveTimerRef = useRef(null);

  // feat/canvas-builder: adding only happens on the canvas now (the
  // side-panel's block list/add control, from feat/block-builder +
  // feat/component-library, was removed entirely). `libraryTarget` is the
  // "Add a section" modal's insert position ({ page, index }); `selectedBlock`
  // is which block is currently click-selected on the canvas ({ page,
  // blockId }) — selecting one switches WBRightPanel's right panel over to
  // that block's edit fields (BlockFields), replacing the Design/Content/
  // Settings tabs until cleared. `canvasMode` toggles the inline canvas
  // between 'edit' (dotted outlines + insert/select controls, editable=true)
  // and 'preview' (renders byte-for-byte like the published site,
  // editable=false) — see the device-switcher toolbar below.
  const [libraryTarget, setLibraryTarget] = useState(null); // { page, index } | null
  const [selectedBlockRef, setSelectedBlockRef] = useState(null); // { page, blockId } | null
  const [canvasMode, setCanvasMode] = useState('edit'); // 'edit' | 'preview'

  // MediaLibraryContext lives here (not inside WBRightPanel) because the
  // on-canvas block editor (the right-panel block editor below) also
  // renders MediaPicker fields (photo/gallery/couple-intro/etc. block
  // types) and needs the same upload/library state WBRightPanel's Content
  // tab already relies on.
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaCallback, setMediaCallback] = useState(null);

  useEffect(() => {
    getMyRecords('Photo', '-created_date', 100).then(photos => {
      setMediaLibrary(photos.map(p => ({
        id: p.id,
        url: p.url || p.photo_url || p.imageUrl || '',
        thumbnail: p.url || p.photo_url || p.imageUrl || '',
        type: 'photo',
        name: p.caption || p.title || 'Photo',
      })).filter(p => p.url));
    }).catch(() => {});
  }, []);

  const openMediaLibrary = (callback) => {
    setMediaCallback(() => callback);
    setMediaModalOpen(true);
  };

  const handleMediaUploaded = (item) => {
    const newItem = { id: Date.now() + '', ...item };
    setMediaLibrary(prev => [newItem, ...prev]);
  };

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
    queryFn: async () => await getMyWeddingDetails(),
  });

  useEffect(() => {
    if (existing) {
      setDetails(prev => {
        const merged = { ...DEFAULT, ...existing };
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

  // Autosave — debounced 2s after last change
  useEffect(() => {
    if (!unsaved || !details) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => { doSave(false); }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [unsaved]); // eslint-disable-line react-hooks/exhaustive-deps

  // A universe's own colours take priority over the legacy activeTheme
  // lookup — see resolveColors() (fix/universe-palettes), so this preview
  // matches what actually publishes.
  const theme = resolveColors(details);
  // universeTheme's font fields (fontDisplay/fontBody/name/feeling) stay as
  // this file's own hand-authored copy (unrelated to palette wiring — see
  // BUILDER_UNIVERSE_AUDIT.md item 3 for that separate, still-open bug) but
  // its colour fields are now derived from the same resolveColors() output
  // as `theme` above, so the two objects can no longer drift out of sync.
  const baseUniverseTheme = UNIVERSE_THEMES[normalizeUniverseKey(details?.activeUniverse)] || UNIVERSE_THEMES.aman;
  const universeTheme = {
    ...baseUniverseTheme,
    primary: theme.navBg,
    background: theme.lightBg,
    text: theme.lightText,
    accent: theme.accent,
    secondary: theme.accentSecondary,
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

  // feat/component-library: page-scoped block mutation helpers backing the
  // on-canvas insert/reorder/delete/edit controls. These write to the exact
  // same {page}Content.blocks fields BlockList.jsx's side-panel editor
  // already writes to (via updateNested in WBRightPanel.jsx) — same data,
  // same Save/autosave path, just a second entry point.
  const PAGE_CONTENT_FIELD = { home: 'homeContent', 'our-story': 'ourStoryContent', celebration: 'celebrationContent' };

  const getPageBlocks = (page) => {
    const field = PAGE_CONTENT_FIELD[page];
    return field ? (detailsRef.current?.[field]?.blocks || []) : [];
  };

  const setPageBlocks = (page, nextBlocks) => {
    const field = PAGE_CONTENT_FIELD[page];
    if (!field) return;
    setDetailsAndMark(prev => ({
      ...prev,
      [field]: { ...(prev[field] || {}), blocks: nextBlocks.map((b, i) => ({ ...b, order: i })) },
    }));
  };

  const insertBlockAt = (page, index, catalogId) => {
    const sorted = [...getPageBlocks(page)].sort((a, b) => (a.order || 0) - (b.order || 0));
    sorted.splice(index, 0, newBlock(catalogId));
    setPageBlocks(page, sorted);
  };

  const moveBlockOnPage = (page, id, dir) => {
    const sorted = [...getPageBlocks(page)].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex(b => b.id === id);
    if (idx === -1) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
    setPageBlocks(page, sorted);
  };

  const deleteBlockOnPage = (page, id) => {
    setPageBlocks(page, getPageBlocks(page).filter(b => b.id !== id));
  };

  const updateBlockContentOnPage = (page, id, key, value) => {
    const next = getPageBlocks(page).map(b => b.id === id ? { ...b, content: { ...(b.content || {}), [key]: value } } : b);
    setPageBlocks(page, next);
  };

  // feat/block-styling-curated: per-block curated style overrides
  // (textColor/background/size/align — see WBRightPanel.jsx's
  // BlockStylePanel and UniverseBlocks.jsx's resolveBlockStyle). Setting a
  // key to undefined removes the override key entirely rather than storing
  // an explicit "unset" value, so an untouched block's `style` stays absent
  // and resolves to the type's own default look.
  const updateBlockStyleOnPage = (page, id, key, value) => {
    const next = getPageBlocks(page).map(b => {
      if (b.id !== id) return b;
      const style = { ...(b.style || {}) };
      if (value === undefined) delete style[key];
      else style[key] = value;
      return { ...b, style };
    });
    setPageBlocks(page, next);
  };

  const openLibrary = (page, index) => setLibraryTarget({ page, index });
  const closeLibrary = () => setLibraryTarget(null);
  const handleLibrarySelect = (catalogId) => {
    if (!libraryTarget) return;
    insertBlockAt(libraryTarget.page, libraryTarget.index, catalogId);
    closeLibrary();
  };

  const selectBlock = (page, blockId) => setSelectedBlockRef({ page, blockId });
  const clearSelectedBlock = () => setSelectedBlockRef(null);

  const selectedBlock = selectedBlockRef
    ? getPageBlocks(selectedBlockRef.page).find(b => b.id === selectedBlockRef.blockId) || null
    : null;

  const updateSelectedBlockContent = (key, value) => {
    if (!selectedBlockRef) return;
    updateBlockContentOnPage(selectedBlockRef.page, selectedBlockRef.blockId, key, value);
  };

  const updateSelectedBlockStyle = (key, value) => {
    if (!selectedBlockRef) return;
    updateBlockStyleOnPage(selectedBlockRef.page, selectedBlockRef.blockId, key, value);
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockRef) return;
    deleteBlockOnPage(selectedBlockRef.page, selectedBlockRef.blockId);
    clearSelectedBlock();
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
    <MediaLibraryContext.Provider value={{ open: openMediaLibrary }}>
    <div style={{ height: '100vh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans',sans-serif", background: '#1C1C1E', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{ height: 48, flexShrink: 0, background: '#1C1C1E', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button
          onClick={() => onBack ? onBack() : navigate('/studio/guest-suite/assets')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ChevronLeft size={14} />
          {onBack ? 'Design Studio' : 'Guest suite'}
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
            onClick={async () => { if (unsaved) await doSave(false); setShowFullPreview(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, padding: '5px 12px', fontFamily: 'inherit', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            <Monitor size={13} />
            Preview
          </button>
          {previewUrl && (
            <button
              onClick={async (e) => { if (unsaved) await doSave(false); window.open(previewUrl, '_blank', 'noreferrer'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: '5px 6px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              title="Open in new tab"
            >
              <ExternalLink size={11} />
            </button>
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
          onPageChange={(p) => { setCurrentPage(p); setRightPanelTab('design'); }}
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
                openinvite.com.au/w/{details.slug || 'your-wedding'}/{currentPage !== 'home' ? currentPage : ''}
              </span>
            </div>
            {/* Device + Edit/Preview pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              {/* feat/canvas-builder: edit mode (dotted outlines + insert/
                  select controls) vs a clean preview that looks exactly like
                  the published site — same canvas, editable prop toggled. */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', borderRadius: 999, padding: 3 }}>
                {[{ id: 'edit', label: 'Edit' }, { id: 'preview', label: 'Preview' }].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setCanvasMode(opt.id); if (opt.id === 'preview') clearSelectedBlock(); }}
                    style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: canvasMode === opt.id ? 'rgba(255,255,255,0.1)' : 'transparent', color: canvasMode === opt.id ? '#FFFFFF' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Page label + replay-entrance — right */}
            <div style={{ position: 'absolute', right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setReplayEntranceKey(k => k + 1)}
                title="Replay entrance animation"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: 'inherit' }}
              >
                <Sparkles size={12} strokeWidth={1.5} /> Replay entrance
              </button>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
                {allPageLabels[currentPage] || currentPage}
              </span>
            </div>
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
                universeTheme={universeTheme} details={details} currentPage={currentPage}
                onPageChange={(slug) => { setCurrentPage(slug); setRightPanelTab('design'); clearSelectedBlock(); }}
                editable={canvasMode === 'edit'}
                replayEntranceKey={replayEntranceKey}
                onRequestInsert={index => openLibrary(currentPage, index)}
                onMoveBlock={(id, dir) => moveBlockOnPage(currentPage, id, dir)}
                onDeleteBlock={id => { deleteBlockOnPage(currentPage, id); if (selectedBlockRef?.blockId === id) clearSelectedBlock(); }}
                onSelectBlock={id => selectBlock(currentPage, id)}
                selectedBlockId={selectedBlockRef?.page === currentPage ? selectedBlockRef.blockId : null}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 280, background: '#1C1C1E', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <WBRightPanel
            details={details}
            theme={theme}
            universeTheme={universeTheme}
            onChange={updateField}
            rightTab={rightPanelTab}
            onRightTabChange={setRightPanelTab}
            selectedAsset={null}
            assetContent={{}}
            onAssetChange={updateAssetContent}
            onClearAsset={() => {}}
            selectedBlock={selectedBlock}
            onUpdateSelectedBlockContent={updateSelectedBlockContent}
            onUpdateSelectedBlockStyle={updateSelectedBlockStyle}
            onDeleteSelectedBlock={deleteSelectedBlock}
            onClearSelectedBlock={clearSelectedBlock}
          />
        </div>
      </div>

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

      {mediaModalOpen && (
        <MediaLibraryModal
          library={mediaLibrary}
          onClose={() => setMediaModalOpen(false)}
          onSelect={(url) => { if (mediaCallback) mediaCallback(url); }}
          onUploaded={handleMediaUploaded}
        />
      )}

      {libraryTarget && (
        <ComponentLibraryModal
          theme={theme}
          typography={resolveTypography(details)}
          activeUniverse={details?.activeUniverse}
          onSelect={handleLibrarySelect}
          onClose={closeLibrary}
        />
      )}

    </div>
    </MediaLibraryContext.Provider>
  );
}

function PreviewContent({ universeTheme, details, currentPage, onPageChange, editable, onRequestInsert, onMoveBlock, onDeleteBlock, onSelectBlock, selectedBlockId, replayEntranceKey }) {
  // Preload ALL typography fonts at mount so switching is instant (no loading
  // delay) — both the generic FONT_OPTIONS/TYPOGRAPHY_PAIRINGS set AND every
  // universe's font pairing, since the universe picker can switch fonts too.
  // (The published site takes the opposite approach — loads only the ONE
  // active pairing — since it only ever has one real visitor-facing config;
  // the builder preloads everything because a couple actively comparing
  // universes/pairings should see instant switching, not a fetch each time.)
  useEffect(() => {
    const needed = new Set();

    // Preload every universe's font pairing
    Object.values(UNIVERSE_CONFIGS).forEach(cfg => {
      const href = googleFontsHref(cfg.typography);
      if (href) needed.add(href);
    });

    // Preload every font option so switching is instant
    FONT_OPTIONS.forEach(f => {
      if (f.google) needed.add(`https://fonts.googleapis.com/css2?family=${f.google}&display=swap`);
    });

    // Preconnect once — shaves the DNS/TLS handshake off every font request
    // below, whether it's 1 or 25 stylesheet links.
    if (!document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]')) {
      const p1 = document.createElement('link');
      p1.rel = 'preconnect';
      p1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(p1);
    }
    if (!document.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
      const p2 = document.createElement('link');
      p2.rel = 'preconnect';
      p2.href = 'https://fonts.gstatic.com';
      p2.crossOrigin = 'anonymous';
      document.head.appendChild(p2);
    }

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

  // RealWebsitePreview is the single shared "render the real guest site off
  // draft data" component (fix/builder-preview-parity, fix/fullscreen-
  // preview-parity) — also used by FullScreenPreview.jsx's full-screen
  // "Preview" and, via the equivalent MultiPageWeddingWebsite.jsx, the
  // published site. One implementation renders all three surfaces; blocks
  // (feat/block-builder) render inside the real page components this
  // resolves to, so that stays true.
  return (
    <RealWebsitePreview
      details={details}
      currentPage={currentPage}
      onNavigate={onPageChange}
      editable={editable}
      onRequestInsert={onRequestInsert}
      onMoveBlock={onMoveBlock}
      onDeleteBlock={onDeleteBlock}
      onSelectBlock={onSelectBlock}
      selectedBlockId={selectedBlockId}
      replayEntranceKey={replayEntranceKey}
    />
  );
}
