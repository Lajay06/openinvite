import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import RealWebsitePreview from '@/components/website-builder/RealWebsitePreview';
import { WEDDING_PAGES } from '@/lib/websiteThemes';
import { resolveTypography } from '@/lib/universeStyling';
import { loadFontFamilies, familiesFromGoogleSpec } from '@/lib/selfHostedFonts';
import { BottomSheet, FilterPills } from '../../ui';

/**
 * The guest suite preview on the phone (goal 8, item 5): the desktop
 * editor's own renderer, RealWebsitePreview, imported directly. It is the
 * one implementation of "what a guest sees" outside the published site's
 * wrapper (the builder canvas and the full-screen preview both use it), so
 * the universe, fonts, photos, sections and content here are the desktop's
 * to the pixel, sample content and all. View only: `editable` is never
 * passed, so no builder control renders.
 *
 * Two surfaces share it:
 *   SitePreviewFrame  the 4:5 tile on the Guest suite tab: the home page
 *                     laid out at 390px and scaled into the tile, inert,
 *                     tapping it opens the sheet;
 *   SitePreviewSheet  a full-height sheet with the desktop's page picker as
 *                     pills and the site scrolling inside a frame that also
 *                     contains the guest nav's fixed menu, as
 *                     FullScreenPreview.jsx's phone frame does
 *                     (`transform: translateZ(0)`).
 *
 * The fonts come from the same self-hosted loader the builder and the
 * published site use.
 */
const PHONE_W = 390;

function useSiteFonts(details) {
  useEffect(() => {
    if (!details) return;
    try { loadFontFamilies(familiesFromGoogleSpec(resolveTypography(details)?.googleFonts)); } catch { /* fonts fall back */ }
  }, [details]);
}

export function sitePages(details) {
  const enabled = details?.enabledPages || ['home'];
  return [
    ...WEDDING_PAGES.filter((p) => enabled.includes(p.slug)).map((p) => ({ key: p.slug, label: p.label })),
    ...(details?.customPages || []).map((p) => ({ key: p.slug, label: p.name })),
  ];
}

export function SitePreviewFrame({ details, width = 342, onOpen, label = 'Open the guest suite preview' }) {
  useSiteFonts(details);
  const scale = width / PHONE_W;
  const height = Math.round(width * 1.25);
  if (!details) return null;
  return (
    <button type="button" className="oi-m-sitepreview oi-m-press" style={{ width, height }} onClick={onOpen} aria-label={label}>
      <div className="oi-m-sitepreview__scale" style={{ width: PHONE_W, height: Math.round(height / scale), transform: `scale(${scale})` }} aria-hidden="true">
        <RealWebsitePreview details={details} currentPage="home" onNavigate={() => {}} />
      </div>
      <span className="oi-m-sitepreview__hint"><Maximize2 size={14} strokeWidth={2} /> Preview</span>
    </button>
  );
}

export function SitePreviewSheet({ details, open, onClose, initialPage = 'home' }) {
  useSiteFonts(details);
  const [page, setPage] = useState(initialPage);
  useEffect(() => { if (open) setPage(initialPage); }, [open, initialPage]);
  const pages = useMemo(() => sitePages(details), [details]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Guest suite preview" full flush>
      {open && details && (
        <div className="oi-m-sitepreview-sheet">
          {pages.length > 1 && (
            <div className="oi-m-sitepreview-sheet__pages">
              <FilterPills options={pages.map((p) => ({ key: p.key, label: p.label }))} value={page} onChange={setPage} />
            </div>
          )}
          <div className="oi-m-sitepreview-sheet__frame" data-preview-frame="mobile">
            <RealWebsitePreview details={details} currentPage={page} onNavigate={setPage} />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
