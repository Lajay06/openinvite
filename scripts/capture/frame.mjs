/**
 * scripts/capture/frame.mjs
 *
 * Wraps a raw screenshot or screen recording in a minimal, on-brand browser
 * chrome: a flat top bar (traffic-light dots + a URL pill), no shadow, no
 * rounded corners on the frame itself — the same "no box-shadow, sharp
 * corners except pills/buttons" language as the rest of the product
 * (DESIGN_SPEC.md), rather than a generic glossy device-mockup look.
 *
 * Stills: render an HTML page (chrome + the screenshot as a background
 * image) with Playwright itself and re-screenshot it — no image-editing
 * library needed, since we already have a browser.
 *
 * Video: render the SAME chrome as a standalone PNG at the exact recording
 * width, then use ffmpeg's vstack filter to stack it above the raw
 * recording. Simpler and more reliable than alpha-compositing a cut-out
 * bezel over motion video, and it reads identically to the still frame.
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import path from 'node:path';
import fs from 'node:fs';

const execFileAsync = promisify(execFile);

const BAR_HEIGHT = 40; // CSS px, doubled at 2x scale like everything else

function chromeHtml({ url, contentWidth, contentHeight, imageSrc, isVideoBarOnly }) {
  const dots = `
    <span style="width:11px;height:11px;border-radius:50%;background:#FF5F57;display:inline-block;"></span>
    <span style="width:11px;height:11px;border-radius:50%;background:#FEBC2E;display:inline-block;margin-left:7px;"></span>
    <span style="width:11px;height:11px;border-radius:50%;background:#28C840;display:inline-block;margin-left:7px;"></span>
  `;
  const bar = `
    <div style="
      width:${contentWidth}px; height:${BAR_HEIGHT}px; background:#F0F0EE;
      border-bottom:1px solid rgba(10,10,10,0.1); display:flex; align-items:center;
      padding:0 16px; box-sizing:border-box; font-family:'Plus Jakarta Sans',-apple-system,sans-serif;
    ">
      <div style="display:flex; align-items:center; flex-shrink:0;">${dots}</div>
      <div style="
        flex:1; margin:0 auauto 0 20px; background:#FFFFFF; border:1px solid rgba(10,10,10,0.08);
        border-radius:999px; padding:5px 14px; font-size:12px; color:rgba(10,10,10,0.5);
        max-width:420px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      ">${url}</div>
    </div>
  `;
  if (isVideoBarOnly) {
    return `<!doctype html><html><body style="margin:0;">${bar}</body></html>`;
  }
  return `
    <!doctype html><html><body style="margin:0;">
      ${bar}
      <img src="${imageSrc}" style="display:block; width:${contentWidth}px; height:${contentHeight}px; object-fit:cover;" />
    </body></html>
  `;
}

/** Wraps a still screenshot in the browser chrome. Returns the output PNG path. */
export async function frameStill({ screenshotPath, url, outputPath, contentWidth, contentHeight, scale = 2 }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: contentWidth, height: contentHeight + BAR_HEIGHT },
      deviceScaleFactor: scale,
    });
    // Inline as a data URI — a page loaded via setContent() (effectively
    // about:blank) can't load file:// resources due to Chromium's
    // cross-origin file-access restrictions, but data: URIs always work.
    const base64 = fs.readFileSync(screenshotPath).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    await page.setContent(chromeHtml({ url, contentWidth, contentHeight, imageSrc: dataUrl }));
    await page.waitForTimeout(100); // let the (already-inline) image paint
    await page.screenshot({ path: outputPath });
    await page.close();
  } finally {
    await browser.close();
  }
  return outputPath;
}

/** Renders just the top bar as a standalone PNG at the given content width. */
async function renderBarPng({ url, contentWidth, scale, outputPath }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: contentWidth, height: BAR_HEIGHT },
      deviceScaleFactor: scale,
    });
    await page.setContent(chromeHtml({ url, contentWidth, isVideoBarOnly: true }));
    await page.screenshot({ path: outputPath });
    await page.close();
  } finally {
    await browser.close();
  }
}

/**
 * Wraps a raw recording (webm from Playwright) in the browser chrome via
 * ffmpeg vstack, transcodes to both webm (vp9) and mp4 (h264) for broad
 * <video> support, and extracts a poster jpg for prefers-reduced-motion /
 * before-load display.
 */
export async function frameVideo({ rawVideoPath, url, contentWidth, contentHeight, outBaseName, outDir, scale = 2 }) {
  const barPngPath = path.join(outDir, `${outBaseName}-bar.png`);
  await renderBarPng({ url, contentWidth, scale, outputPath: barPngPath });

  const webmOut = path.join(outDir, `${outBaseName}.webm`);
  const mp4Out = path.join(outDir, `${outBaseName}.mp4`);
  const posterOut = path.join(outDir, `${outBaseName}-poster.jpg`);

  const filter = `[0:v]scale=${contentWidth * scale}:${contentHeight * scale}[content];[1:v][content]vstack=inputs=2[out]`;

  // webm (vp9) — smaller, modern-browser primary source
  await execFileAsync(ffmpegPath, [
    '-y', '-i', rawVideoPath, '-i', barPngPath,
    '-filter_complex', filter, '-map', '[out]',
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1',
    '-an', webmOut,
  ]);

  // mp4 (h264) — Safari/older-browser fallback
  await execFileAsync(ffmpegPath, [
    '-y', '-i', rawVideoPath, '-i', barPngPath,
    '-filter_complex', filter, '-map', '[out]',
    '-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-an', mp4Out,
  ]);

  // Poster frame ~1s before the end, not 1s in — every flow spends its
  // first few seconds on page-load/settle (skeletons, spinners) before the
  // real interaction, so an early frame would poster a loading state.
  // Grabbing near the end guarantees fully-settled content, from the
  // finished mp4 so the poster matches exactly what viewers who never
  // press play see.
  await execFileAsync(ffmpegPath, [
    '-y', '-sseof', '-1', '-i', mp4Out, '-frames:v', '1', '-q:v', '3', posterOut,
  ]);

  return { webmOut, mp4Out, posterOut };
}
