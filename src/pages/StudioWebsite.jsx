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
import { resolveColors, resolveTypography } from '@/lib/universeStyling';
import { loadFontFamilies, familiesFromGoogleSpec } from '@/lib/selfHostedFonts';
import RealWebsitePreview from '@/components/website-builder/RealWebsitePreview';
import PublishModal from '@/components/website-builder/PublishModal';
import { MediaLibraryContext } from '@/components/website-builder/SectionEditorFields';
import MediaLibraryModal from '@/components/website-builder/MediaLibraryModal';
import ComponentLibraryModal from '@/components/website-builder/ComponentLibraryModal';
import { newBlock } from '@/components/guest-website/blocks/blockTypes';
import { customPageFor, customPageBlocks } from '@/lib/customPages';

import { syncWeddingAddress } from '@/lib/weddingAddress';
import WBEmailPreview from '@/components/website-builder/WBEmailPreview';
import { templatesOf, saveTemplates, EDITOR_TEMPLATES, SAVE_FAILURE_MESSAGE } from '@/lib/emailTemplateStore';
const UNIVERSE_THEMES = {
  london: {
    name: 'London',
    primary: '#0A0A0A',
    secondary: '#C4956A',
    background: '#F8F7F5',
    text: '#0A0A0A',
    accent: '#C4956A',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Plus Jakarta Sans", sans-serif',
    feeling: 'Classical grandeur',
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
  // FALSE, AND NOT WRITABLE. See WRITABLE_FIELDS below — publishing is a
  // choice, not a default. `{ ...DEFAULT, ...existing }` means a record that
  // already carries `websiteEnabled: true` keeps it; a record that carries
  // nothing now reads as not-published, which is the truth about it.
  websiteEnabled: false,
  // websitePassword is deliberately NOT here, and websitePasswordEnabled is
  // deliberately not in WRITABLE_FIELDS below. Both are written only through
  // /api/my-wedding-details (src/lib/websitePasswordGate.js), because the
  // credential is hashed server-side — this page's Save writes to base44
  // directly, so including either would overwrite the scrypt hash with
  // whatever plaintext the local draft happened to hold.
  activeTheme: 'still',
  activeTypography: null,
  pageTransition: 'fade',
  scrollAnimation: 'subtle',
  heroEffect: 'static',
  heroVideoUrl: '',
  coverPhoto: '',
  // EMPTY, like every field around it. This was pre-filled with 'We are
  // overjoyed to celebrate with you.' — our words, sitting in the couple's
  // draft as though they had written them, and persistable to their record on
  // the next save. welcomeMessage is the SECOND link in the home page's
  // tagline chain (homeContent.tagline || welcomeMessage || ''), so a default
  // here reaches guests by the same route the removed fallback did.
  welcomeMessage: '',
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

// doSave() writes only these fields — the builder's actual edit surface —
// instead of the whole loaded WeddingDetails record. DEFAULT above is this
// component's own declared ceiling of what it owns, so every DEFAULT key is
// included by construction; the rest are additional top-level fields
// confirmed written via updateField/updateNested/setPageBlocks/
// updateAssetContent (WBRightPanel.jsx, WBLeftPanel.jsx, this file) that
// aren't part of the initial DEFAULT shape. Anything NOT in this list
// (budget, contactPerson, emergencyContacts, guests, tables, ...) is owned
// by another page and must never round-trip through this component's save —
// a full-object write here would silently revert any field another page
// has since moved to encrypted-at-rest storage back to stale plaintext.
// `slug` is deliberately REMOVED from this payload, for exactly the reason
// websitePassword and websitePasswordEnabled are absent above: it is written
// only through a dedicated server path. Here that path is /api/claim-slug.
//
// It cannot ride the autosave. This page saves every 2 seconds, and an address
// is CLAIMED, not stored — autosaving it would fire a claim attempt on every
// keystroke, and the couple would race themselves through half-typed names.
// The studio still SUGGESTS an address locally; PublishModal claims it.
const WRITABLE_FIELDS = [
  // `slug` AND `websiteEnabled` ARE BOTH CLAIMS, NOT CONTENT.
  //
  // slug was excluded on 2026-08-26, after this page's 2-second autosave was
  // caught persisting a wedding's public address keystroke by keystroke. The
  // rule written down that day was "an address is claimed, not stored:
  // anything a couple can hold only one of, that strangers depend on, cannot
  // ride a general-purpose save."
  //
  // `websiteEnabled` is the same kind of thing and was left in. DEFAULT had
  // it TRUE, so `{ ...DEFAULT, ...existing }` gave every record without the
  // field a `true`, and the next autosave persisted it. A couple who opened
  // the builder and typed one character PUBLISHED THEIR SITE — no button, no
  // modal, no decision. That is how smoke01 came to read
  // `websiteEnabled: true, slug: null`: nothing ever published it.
  //
  // Excluded here rather than defaulted to false alone, because a default is
  // a guess about the record and an exclusion is a fact about this page:
  // the builder does not own whether a site is live. The two publish controls
  // do, and both now refuse without an address.
  ...Object.keys(DEFAULT).filter(k => k !== 'slug' && k !== 'websiteEnabled'),
  'fontOverride',
  'guestExperienceSettings',
  'photosContent',
  'customPages',
  // Where a custom page's blocks live. Absent from this list the field would
  // be dropped from every save payload, and the couple's blocks would survive
  // exactly until the next autosave — the same silent loss the undeclared
  // field caused, moved one layer up.
  'customPageContent',
  // 'assetContent' is RETAINED here although nothing writes it any more. The
  // asset feature was removed in Wave 2; dropping the field from this payload
  // would strand whatever a couple already has stored the next time anything
  // else saves. A fix that narrows a payload can orphan the field it removes.
  'assetContent',
];

export default function StudioWebsite({ onBack }) {
  const navigate = useNavigate();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishModalTab, setPublishModalTab] = useState('website');
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

  // ── THE FIVE EMAILS ────────────────────────────────────────────────────
  //
  // `selectedEmail` is { entryId, type } | null and is the SAME KIND of
  // selection as `currentPage`: it says what the canvas is showing. The two
  // are mutually exclusive — selecting a page in the left panel clears it,
  // selecting an email in the right panel takes the canvas over — because a
  // canvas shows one thing.
  //
  // `emailDraft` is deliberately NOT part of `details`, and that is the whole
  // safety mechanism. `details` is autosaved every two seconds through
  // WRITABLE_FIELDS and toasts "Saved" on any 200, while
  // WeddingDetails.emailTemplates does not exist in the Base44 schema yet and
  // is accepted-then-discarded. Riding the autosave would put "Saved" on
  // screen over words that had already been thrown away. The draft therefore
  // lives here, is written only by saveEmails() below, and that write proves
  // itself by reading back.
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailDraft, setEmailDraft] = useState(() => templatesOf(null));
  const [emailSave, setEmailSave] = useState({ status: 'idle' });

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
    // Seeded from the record, normalized. When the field does not exist this
    // is every template empty, which is exactly right: empty means "the
    // defaults send", and the panel shows those defaults pre-filled.
    setEmailDraft(templatesOf(existing));
  }, [existing]);

  // THE ADDRESS IS NOT GENERATED HERE ANY MORE.
  //
  // This appended `Math.random().toString(36).substring(2, 6)` to a name-derived
  // stem — the random token the ruling forbids, live in the product. It reads as
  // a tracking code on something that goes on printed cards and gets read aloud.
  // It also normalized differently from every other surface (30-char truncation,
  // no accent handling), and wrote to local state only, so the couple saw an
  // address that was never on their record.
  //
  // Derivation now happens once, server-side, from the names, on a ladder of
  // real facts — see src/lib/weddingAddress.js.
  useEffect(() => {
    if (existing?.id && !details?.slug) syncWeddingAddress(existing.id);
  }, [existing?.id, details?.slug]);

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
  const baseUniverseTheme = UNIVERSE_THEMES[normalizeUniverseKey(details?.activeUniverse)] || UNIVERSE_THEMES.london;
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

  // A CUSTOM PAGE STORES ITS BLOCKS IN customPageContent, KEYED BY SLUG.
  //
  // It cannot store them on its own record: `customPages` declares its item
  // properties (id, name, slug, template) and Base44 strips every key such a
  // schema does not name — which is why `sections: []` is absent from every
  // live record and why this half of the package waited for a field. The one
  // the owner declared is a BARE object, so it keeps whatever nested keys it
  // is handed, exactly as homeContent.blocks does.
  //
  // Before this, both helpers below simply gave up on a slug they did not
  // recognise: getPageBlocks returned [] and setPageBlocks returned without
  // writing. So the canvas offered a custom page no blocks and quietly
  // discarded any it was given.
  const isCustomPage = (page) => !PAGE_CONTENT_FIELD[page] && !!customPageFor(detailsRef.current, page);

  const getPageBlocks = (page) => {
    if (isCustomPage(page)) return customPageBlocks(detailsRef.current, page);
    const field = PAGE_CONTENT_FIELD[page];
    return field ? (detailsRef.current?.[field]?.blocks || []) : [];
  };

  const setPageBlocks = (page, nextBlocks) => {
    const ordered = nextBlocks.map((b, i) => ({ ...b, order: i }));
    if (isCustomPage(page)) {
      setDetailsAndMark(prev => ({
        ...prev,
        customPageContent: {
          ...(prev.customPageContent || {}),
          [page]: { ...(prev.customPageContent?.[page] || {}), blocks: ordered },
        },
      }));
      return;
    }
    const field = PAGE_CONTENT_FIELD[page];
    if (!field) return;
    setDetailsAndMark(prev => ({
      ...prev,
      [field]: { ...(prev[field] || {}), blocks: ordered },
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
  // The mark over a media block, stored ON the block. A side map keyed by
  // block id would orphan its entries the moment a block was deleted; an
  // overlay on the block moves, copies and deletes with it. `undefined`
  // removes the key rather than storing an empty object, the same way an
  // untouched block carries no `style`.
  const updateBlockOverlayOnPage = (page, id, overlay) => {
    setPageBlocks(page, getPageBlocks(page).map(b => {
      if (b.id !== id) return b;
      const next = { ...b };
      if (overlay === undefined) delete next.overlay;
      else next.overlay = overlay;
      return next;
    }));
  };

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

  const updateSelectedBlockOverlay = (overlay) => {
    if (!selectedBlockRef) return;
    updateBlockOverlayOnPage(selectedBlockRef.page, selectedBlockRef.blockId, overlay);
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

  const updateEmailField = (type, patch) => {
    setEmailDraft(prev => ({ ...prev, [type]: { ...(prev?.[type] || {}), ...patch } }));
    setEmailSave({ status: 'idle' });
  };

  /**
   * Write the five, then prove they are there.
   *
   * saveTemplates() writes, re-reads the record and compares field by field.
   * A Base44 200 means the request was accepted, not that the field was kept
   * — so a "Saved" that trusted the status code would be a lie on this field
   * today. When the round-trip fails, the draft is untouched: whatever the
   * couple typed is still in the boxes, and they are told plainly why.
   */
  const saveEmails = async () => {
    setEmailSave({ status: 'saving' });
    const result = await saveTemplates({
      update: (id, patch) => base44.entities.WeddingDetails.update(id, patch),
      reload: () => getMyWeddingDetails(),
      id: existing?.id,
      templates: emailDraft,
    });
    if (result.ok) {
      setEmailSave({ status: 'saved' });
      return;
    }
    setEmailSave({
      status: 'failed',
      message: SAVE_FAILURE_MESSAGE[result.reason] || 'That did not save. Your words are still here.',
    });
  };

  const doSave = async (showToast = true) => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const source = detailsRef.current || {};
      const payload = {};
      for (const field of WRITABLE_FIELDS) {
        if (field in source) payload[field] = source[field];
      }
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

  // LIVE IS BOTH HALVES. websiteEnabled says the couple chose to go live; the
  // slug says there is an address to go live AT. UniverseWorldView already
  // gates on exactly this pair, for exactly this reason — and two live
  // records were measured with websiteEnabled true and an empty slug.
  const isLive = Boolean(details?.websiteEnabled && details?.slug);

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
      {/* zIndex 40, NOT 100. The shared modal wrapper paints at z-50, so a
          header above it covered the full-page preview's own toolbar — the
          device toggles were on screen, clickable, and invisible, which is
          exactly what "the preview only shows desktop" looked like. Radix
          drops pointer-events on the page behind an open dialog, so the
          toggles still answered the mouse; only the paint was wrong, and
          only a pixel read can see that. 40 still clears everything in the
          builder (the panels sit beside the header, never under it). */}
      <div className="wb-builder-header" style={{ height: 48, flexShrink: 0, background: '#1C1C1E', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16, position: 'sticky', top: 0, zIndex: 40 }}>
        <button
          onClick={() => onBack ? onBack() : navigate('/studio/guest-suite/assets')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <ChevronLeft size={14} />
          {onBack ? 'Design Studio' : 'Guest suite'}
        </button>
        {/* CENTRED BY TAKING IT OUT OF FLOW, which is why it collided. Absolute
            centring ignores the two button groups either side, so at phone
            width "Website builder" was drawn straight through Save and Share.
            The class puts it back in flow on its own row below 640px — see
            index.css. Desktop is untouched: no rule applies above that. */}
        <div className="wb-builder-title" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>Website builder</span>
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
          currentPage={selectedEmail ? null : currentPage}
          onPageChange={(p) => { setCurrentPage(p); setSelectedEmail(null); }}
          emailDraft={emailDraft}
          selectedEmail={selectedEmail}
          onSelectEmail={(sel) => { setSelectedEmail(sel); clearSelectedBlock(); }}
        />

        {/* CENTER PREVIEW */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#2C2C2E', minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Device switcher toolbar */}
          <div style={{ height: 48, background: '#2C2C2E', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', flexShrink: 0, position: 'relative' }}>
            {/* URL indicator — left */}
            {/* A PLACEHOLDER IS NOT AN ADDRESS, AND A GREEN DOT IS A CLAIM.
                This printed `openinvite.com.au/w/your-wedding/` — the literal
                fallback string — beside a dot that was green unconditionally.
                A couple with no address was shown one, and told it was live.
                The dot is green only when the site is BOTH published and
                reachable; otherwise there is no address to print and the bar
                says so, with the way to fix it. */}
            <div style={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? '#22C55E' : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {/* An email has no address. Leaving the site URL up while the
                    canvas shows an invitation would label the wrong thing. */}
                {selectedEmail
                  ? 'Email · 600px'
                  : details.slug
                    ? `openinvite.com.au/w/${details.slug}/${currentPage !== 'home' ? currentPage : ''}`
                    : 'No address yet'}
              </span>
              {!selectedEmail && !details.slug && (
                <button
                  onClick={() => navigate('/EventDetails')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: '#E03553', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  Add your names
                </button>
              )}
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
                {selectedEmail
                  ? (EDITOR_TEMPLATES.find(e => e.id === selectedEmail.entryId)?.label || 'Email')
                  : (allPageLabels[currentPage] || currentPage)}
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
              {selectedEmail ? (
                <WBEmailPreview details={details} template={emailDraft?.[selectedEmail.type]} type={selectedEmail.type} />
              ) : (
              <PreviewContent
                universeTheme={universeTheme} details={details} currentPage={currentPage}
                onPageChange={(slug) => { setCurrentPage(slug); clearSelectedBlock(); }}
                editable={canvasMode === 'edit'}
                replayEntranceKey={replayEntranceKey}
                onRequestInsert={index => openLibrary(currentPage, index)}
                onMoveBlock={(id, dir) => moveBlockOnPage(currentPage, id, dir)}
                onDeleteBlock={id => { deleteBlockOnPage(currentPage, id); if (selectedBlockRef?.blockId === id) clearSelectedBlock(); }}
                onSelectBlock={id => selectBlock(currentPage, id)}
                selectedBlockId={selectedBlockRef?.page === currentPage ? selectedBlockRef.blockId : null}
              />
              )}
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
            currentPage={currentPage}
            rightTab={rightPanelTab}
            onRightTabChange={setRightPanelTab}
            selectedBlock={selectedBlock}
            onUpdateSelectedBlockContent={updateSelectedBlockContent}
            onUpdateSelectedBlockStyle={updateSelectedBlockStyle}
            onUpdateSelectedBlockOverlay={updateSelectedBlockOverlay}
            onDeleteSelectedBlock={deleteSelectedBlock}
            onClearSelectedBlock={clearSelectedBlock}
            emailDraft={emailDraft}
            selectedEmail={selectedEmail}
            onEmailChange={updateEmailField}
            emailSave={emailSave}
            onSaveEmails={saveEmails}
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
  // Self-hosted (L1b). The builder preloads every universe pairing and every
  // picker option so a couple comparing them sees instant switching -- that
  // behaviour is unchanged, only the source is: families now come from our
  // own origin via @fontsource instead of a stylesheet link per family to
  // Google, and the two preconnects to Google are gone with them.
  useEffect(() => {
    const families = new Set();
    Object.values(UNIVERSE_CONFIGS).forEach(cfg => {
      familiesFromGoogleSpec(cfg.typography?.googleFonts).forEach(f => families.add(f));
    });
    FONT_OPTIONS.forEach(f => {
      familiesFromGoogleSpec(f.google || f.googleFonts).forEach(n => families.add(n));
    });
    loadFontFamilies([...families]);
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
