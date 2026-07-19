/**
 * src/lib/assetExport.js
 *
 * Real PDF/PNG export for the wedding asset system (BUILDER_UNIVERSE_
 * AUDIT.md / WEBSITE_BUILDER_GAP_MAP.md item 6) — replaces every
 * `alert('Download coming soon...')` stub.
 *
 * Approach: html2canvas rasterises the exact DOM node the couple already
 * sees on screen (same fonts, same universe colours/texture — no separate
 * "export renderer" to drift out of sync with the live preview), then
 * jsPDF embeds that raster at the asset's real physical print size. This
 * is the same proven pattern already used by
 * src/components/schedule/WeddingDayTimelineBuilder.jsx.
 *
 * Fonts: html2canvas only rasterises glyphs that have actually finished
 * loading in the browser at capture time — callers MUST await
 * document.fonts.ready (and ideally the specific universe font's
 * FontFace) before capturing, or a page load race will silently rasterise
 * the fallback font instead of the real universe typeface. See
 * waitForFontsReady() below.
 */

// jsPDF/html2canvas are loaded on demand (only when an export actually
// runs) rather than bundled into the main app chunk — neither is needed
// until a couple clicks an export button.
let _libsPromise = null;
function loadExportLibs() {
  if (!_libsPromise) {
    _libsPromise = Promise.all([import('jspdf'), import('html2canvas')])
      .then(([jsPDFMod, html2canvasMod]) => ({
        jsPDF: jsPDFMod.default,
        html2canvas: html2canvasMod.default,
      }));
  }
  return _libsPromise;
}

/**
 * Per-asset physical export spec. 'pdf' assets get their real-world print
 * size (mm); 'png' assets are digital-only (social media), sized for
 * their native aspect ratio instead of a physical page.
 */
export const ASSET_EXPORT_SPECS = {
  saveTheDate:    { format: 'pdf', widthMm: 148, heightMm: 105 },              // A6 landscape postcard
  digitalInvitation: { format: 'pdf', widthMm: 148, heightMm: 210 },           // A5 portrait
  menuCard:       { format: 'pdf', widthMm: 148, heightMm: 210 },              // A5 portrait
  seatingChart:   { format: 'pdf', widthMm: 297, heightMm: 420 },              // A3 poster
  rsvpCard:       { format: 'pdf', widthMm: 148, heightMm: 105 },              // A6 landscape
  welcomeSignage: { format: 'pdf', widthMm: 594, heightMm: 841, landscapeCapable: true }, // A1 poster
  guestTags:      { format: 'pdf', widthMm: 210, heightMm: 297, perPage: 6 },  // A4, 6 tags/sheet
  thankYouNotes:  { format: 'pdf', widthMm: 148, heightMm: 105 },              // A6 landscape
  instagramStory: { format: 'png', pixelWidth: 1080, pixelHeight: 1920 },      // 9:16 social, not print
  motionGraphic:  { format: 'png', pixelWidth: 1920, pixelHeight: 1080 },      // digital-only, not print
};

/** Resolves once every currently-loading web font has finished (or immediately if the API is unavailable). */
export async function waitForFontsReady() {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-fatal — export proceeds with whatever's loaded */ }
  }
}

async function rasterise(element) {
  const { html2canvas } = await loadExportLibs();
  return html2canvas(element, { scale: 2, useCORS: true, backgroundColor: null });
}

/**
 * Single-page export — screenshots `element` and embeds it as one PDF
 * page (or a plain PNG for digital-only asset types) at the asset's real
 * physical size.
 *
 * @param {HTMLElement} element
 * @param {string} assetKey   key into ASSET_EXPORT_SPECS
 * @param {string} filename   without extension
 */
export async function exportAsset(element, assetKey, filename) {
  if (!element) throw new Error('exportAsset: no element to capture');
  const spec = ASSET_EXPORT_SPECS[assetKey];
  if (!spec) throw new Error(`exportAsset: no export spec for '${assetKey}'`);

  await waitForFontsReady();
  const canvas = await rasterise(element);

  if (spec.format === 'png') {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}.png`;
    link.click();
    return;
  }

  const { jsPDF } = await loadExportLibs();
  const orientation = spec.widthMm >= spec.heightMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [spec.widthMm, spec.heightMm] });
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, spec.widthMm, spec.heightMm);
  pdf.save(`${filename}.pdf`);
}

/**
 * Multi-page export — screenshots each element in `pageElements` (already
 * laid out at the target page size, e.g. one "6 tags" grid per page) onto
 * its own PDF page. Used for guest tags, where every real guest must
 * appear across as many sheets as needed, not just the first few shown in
 * the on-screen preview.
 *
 * @param {HTMLElement[]} pageElements
 * @param {{ widthMm: number, heightMm: number }} pageSize
 * @param {string} filename
 */
export async function exportMultiPagePdf(pageElements, pageSize, filename) {
  if (!pageElements || pageElements.length === 0) throw new Error('exportMultiPagePdf: no pages to export');
  await waitForFontsReady();

  const { jsPDF } = await loadExportLibs();
  const orientation = pageSize.widthMm >= pageSize.heightMm ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [pageSize.widthMm, pageSize.heightMm] });

  for (let i = 0; i < pageElements.length; i++) {
    const canvas = await rasterise(pageElements[i]);
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage([pageSize.widthMm, pageSize.heightMm], orientation);
    pdf.addImage(imgData, 'PNG', 0, 0, pageSize.widthMm, pageSize.heightMm);
  }
  pdf.save(`${filename}.pdf`);
}
