import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  CHAPTERS, FINALE, chapterProgressKey, completedCount,
  mediaFor, resolveChapter, totalTimeLabel,
} from '@/lib/studioTour';
import { spotlight } from '@/lib/tourSpotlight';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE STUDIO TOUR. One component, two modes, nine chapters and a finale.
 *
 * Goal 2026-09-28. It replaces the 7-card TipsModal and the 6-stop
 * QuickTipsTour, both retired in the same PR so main never carries two help
 * systems at once.
 *
 * ── TWO MODES, ONE BODY ────────────────────────────────────────────────────
 *
 *   takeover  first run, full screen, before anything else. Two buttons:
 *             "Take the tour" with the time, and "Later".
 *   panel     the sidebar entry and the "?" on every page header. Same
 *             chapters, opened on the page's own chapter first.
 *
 * They are one component because they are one tour. Two components would be
 * two places to fix a chapter, and the rail, the keyboard handling and the
 * progress writing would drift between them within a month.
 *
 * ── WHAT IT NEVER DOES ─────────────────────────────────────────────────────
 *
 * IT MAKES NO READ. Names and numbers arrive as `context` from data the
 * dashboard has already loaded, which is the goal's own constraint: "It never
 * makes a new read." A tour that fetched would be a tour that could fail.
 *
 * IT NEVER INVENTS A NAME. resolveChapter drops the clause that carried a
 * missing name rather than printing a placeholder.
 *
 * ── REDUCED MOTION ─────────────────────────────────────────────────────────
 *
 * prefers-reduced-motion shows the poster frame and does not autoplay, per the
 * brief. The check is a media query read once per mount, not a CSS-only rule,
 * because the decision is whether to mount a playing <video> at all.
 */

/** The viewport width below which the panel becomes a full-height sheet. */
const SHEET_MAX_WIDTH = 720;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const read = () => setNarrow(window.innerWidth <= SHEET_MAX_WIDTH);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return narrow;
}

/**
 * The chapter's recording, or its poster.
 *
 * ONLY THE CURRENT AND NEXT CHAPTER PRELOAD, per the brief. Everything else
 * gets preload="none", so opening the tour does not pull nine videos.
 *
 * ── THE VIDEO IS KEYED, AND THAT IS THE WHOLE OF DEFECT 1 ──────────────────
 *
 * Changing the `src` of a <source> element does NOT change what a media
 * element is playing. The browser resolves its source once, at load, and
 * afterwards the <source> children are inert markup. One <ChapterMedia> is
 * rendered at a time, so React reused the same <video> node for all nine
 * chapters and only swapped the source attributes: the poster changed, the
 * words changed, and the footage stayed on whichever chapter the tour was
 * opened at.
 *
 * Measured on main before this fix, panel at 1440, stepping through all nine:
 * currentSrc read `studio-tour/guests/1440.webm` on every one of them while
 * currentTime went on advancing from the same file. `key={chapterKey}` makes
 * each chapter its own element, and the effect below calls load() as well, so
 * a future refactor that drops the key fails loudly rather than silently
 * playing the wrong chapter.
 *
 * ── THE BOX COMES FROM THE FRAME, NOT FROM WHAT IS LOADED ─────────────────
 *
 * The media used to carry `aspect-ratio: 16 / 9` on itself, which asks a
 * REPLACED element to ignore its own intrinsic size. That holds in a browser
 * that supports it and leaves a <video> at its default 300 by 150 in one that
 * does not, or before its metadata arrives: a small first chapter, then a
 * large one from the second on, which is exactly the shape of the report.
 * The aspect now lives on a plain <div> that holds no intrinsic size of its
 * own, and the media fills it absolutely. Nothing the browser loads, or fails
 * to load, can change the box.
 */
function ChapterMedia({ chapterKey, title, active, adjacent, reducedMotion }) {
  const media = mediaFor(chapterKey);
  const showVideo = media.hasFootage && !reducedMotion;
  const videoRef = useRef(null);

  // BELT AND BRACES BESIDE THE KEY. A keyed element is already a new one, so
  // this is a second line of defense rather than the fix: if the key is ever
  // removed, load() still re-resolves the sources on a chapter change.
  useEffect(() => {
    const el = videoRef.current;
    if (el && typeof el.load === 'function') el.load();
  }, [chapterKey, showVideo]);

  // A DIV, NOT THE MEDIA, HOLDS THE SHAPE. It has no intrinsic size to fall
  // back to, so the box is the same before the footage loads, after it loads,
  // and if it never loads at all.
  const frame = {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    aspectRatio: '16 / 9',
    background: '#F5F5F5',
    overflow: 'hidden',
    display: 'block',
  };
  const fill = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
  };

  return (
    <div data-tour-media-frame style={frame}>
      {showVideo ? (
        <video
          key={chapterKey}
          ref={videoRef}
          data-tour-media="video"
          data-tour-media-key={chapterKey}
          poster={media.poster}
          autoPlay={active}
          muted
          loop
          playsInline
          preload={active || adjacent ? 'metadata' : 'none'}
          aria-label={title}
          style={fill}
        >
          {media.webm && <source src={media.webm} type="video/webm" />}
          {media.mp4 && <source src={media.mp4} type="video/mp4" />}
        </video>
      ) : (
        <img
          key={chapterKey}
          src={media.poster}
          alt=""
          aria-hidden="true"
          data-tour-media="poster"
          data-tour-media-key={chapterKey}
          style={fill}
        />
      )}
    </div>
  );
}

/**
 * onOpenAva IS A PROP, AND THAT IS NOT A STYLE CHOICE.
 *
 * This component used to `import { openAva } from '@/lib/avaOpen'`. It is
 * rendered by WhatsHerePanel, which is rendered by WhatsHereControl, which
 * lives in DashboardPageHeader, which EVERY dashboard page imports. So that one
 * import put avaOpen in every page's import graph, and
 * scripts/lib/avaEntryPoints.mjs walks that graph to decide which pages offer
 * Ask Ava: fourteen pages that offer nothing of the kind became Ava pages, and
 * CI failed with "undeclared: Admin, AvaStudio, Calendar, Considerations,
 * DailyUpdate, ...".
 *
 * Adding those pages to that guard's expectations would have been the wrong
 * repair: they do not offer Ask Ava, and the guard was right. The tour asks its
 * HOST to open Ava now. Layout already imports avaOpen and already provides the
 * tour context, so the capability travels down without the module travelling
 * into the header.
 */
export default function StudioTour({
  mode = 'panel',
  startChapterKey = null,
  context = {},
  dismissed = [],
  onClose,
  onFinish,
  onChapterComplete,
  onOpenAva,
}) {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useIsNarrow();

  const startIndex = useMemo(() => {
    const i = CHAPTERS.findIndex((c) => c.key === startChapterKey);
    return i === -1 ? 0 : i;
  }, [startChapterKey]);

  // `offered` is the takeover's first screen: the two buttons, before the
  // chapters. In panel mode there is nothing to offer, the couple asked.
  const [offered, setOffered] = useState(mode === 'takeover');
  const [at, setAt] = useState(startIndex);
  const [onFinale, setOnFinale] = useState(false);

  const containerRef = useRef(null);
  const chapter = CHAPTERS[at];
  const resolved = useMemo(() => resolveChapter(chapter, context), [chapter, context]);
  const done = useMemo(() => completedCount(dismissed), [dismissed]);

  // A CHAPTER IS MARKED WHEN THE COUPLE LEAVES IT, NOT WHEN THEY ARRIVE.
  //
  // Marking on arrival was the first version and the render guard showed what
  // it looked like: a tick against the chapter you are currently reading, and
  // "4 of 9 done" while you are on the fourth. Worse, resume then returned a
  // couple to the chapter AFTER the one they stopped on, so closing the tour
  // half way through a chapter meant never seeing the rest of it.
  //
  // Leaving is the honest moment. The last chapter is marked by the finale,
  // which is the only way to leave it forwards.
  const leftRef = useRef(null);
  useEffect(() => {
    if (offered) return;
    const key = onFinale ? CHAPTERS[CHAPTERS.length - 1].key : chapter?.key;
    // On arrival, remember where we are and mark the PREVIOUS one.
    const previous = leftRef.current;
    leftRef.current = onFinale ? null : key;
    if (previous && previous !== key && onChapterComplete) onChapterComplete(previous);
    // Reaching the finale completes the chapter it came from and the last one.
    if (onFinale && onChapterComplete) onChapterComplete(CHAPTERS[CHAPTERS.length - 1].key);
  }, [offered, onFinale, chapter, onChapterComplete]);

  // AND CLOSING COUNTS AS LEAVING. Without this, a couple who read four
  // chapters and closed the panel would have three recorded, because the
  // fourth was never left.
  useEffect(() => () => {
    if (leftRef.current && onChapterComplete) onChapterComplete(leftRef.current);
  }, [onChapterComplete]);

  const finish = useCallback(() => {
    if (onFinish) onFinish();
    if (onClose) onClose();
  }, [onFinish, onClose]);

  const goTo = useCallback((index) => {
    setOnFinale(false);
    setAt(Math.max(0, Math.min(CHAPTERS.length - 1, index)));
  }, []);

  const next = useCallback(() => {
    if (at >= CHAPTERS.length - 1) { setOnFinale(true); return; }
    goTo(at + 1);
  }, [at, goTo]);

  const back = useCallback(() => {
    if (onFinale) { setOnFinale(false); return; }
    goTo(at - 1);
  }, [at, onFinale, goTo]);

  /**
   * Arrows move chapters, Escape closes, and focus is trapped while open.
   *
   * THE TRAP IS A CYCLE, NOT A BLOCK. Tab past the last control returns to the
   * first rather than escaping to the page behind, which is what makes this a
   * dialog rather than an overlay a keyboard can walk out of.
   */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); if (onClose) onClose(); return; }
      if (offered) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
      if (e.key !== 'Tab') return;

      const focusable = node.querySelectorAll(
        'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    node.addEventListener('keydown', onKeyDown);
    // Focus the panel itself, so the first Tab lands inside it.
    node.focus({ preventScroll: true });
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [offered, next, back, onClose]);

  /** "Try it": go to the page, spotlight the control, and close. */
  const tryIt = useCallback(() => {
    const target = chapter?.tryIt;
    if (!target) return;
    if (target.opens === 'ava') {
      if (onClose) onClose();
      if (onOpenAva) onOpenAva();
      return;
    }
    if (target.spotlight) spotlight(target.spotlight, { pulseOnly: !!target.pulseOnly });
    if (target.to) navigate(target.to);
    if (onClose) onClose();
  }, [chapter, navigate, onClose, onOpenAva]);

  const overlay = {
    position: 'fixed',
    inset: 0,
    zIndex: 70,
    background: 'rgba(10,10,10,0.55)',
    display: 'flex',
    alignItems: mode === 'takeover' ? 'center' : 'stretch',
    justifyContent: mode === 'takeover' ? 'center' : 'flex-end',
    padding: mode === 'takeover' && !narrow ? 32 : 0,
  };

  const shell = {
    background: '#FFFFFF',
    display: 'flex',
    flexDirection: narrow ? 'column' : 'row',
    overflow: 'hidden',
    width: mode === 'takeover' ? 'min(1040px, 100%)' : (narrow ? '100%' : 'min(560px, 100%)'),
    height: narrow ? '100%' : (mode === 'takeover' ? 'min(640px, 100%)' : '100%'),
    maxHeight: '100%',
    outline: 'none',
  };

  // ── the takeover's offer screen ───────────────────────────────────────────
  if (offered) {
    return (
      <div style={overlay} role="presentation">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Studio tour"
          tabIndex={-1}
          data-studio-tour="offer"
          style={{ ...shell, flexDirection: 'column', maxWidth: 'min(520px, 100%)', height: 'auto' }}
        >
          <div style={{ padding: narrow ? '28px 24px' : '36px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: 0 }}>
              Studio tour
            </p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1.25 }}>
              {resolveChapter(CHAPTERS[0], context).title}
            </p>
            <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, lineHeight: 1.65 }}>
              {CHAPTERS[0].lead}
            </p>
          </div>
          <div style={{ padding: narrow ? '0 24px 28px' : '0 40px 36px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setOffered(false)}
              className="btn-primary"
              style={{ fontSize: 13 }}
            >
              Take the tour, {totalTimeLabel()}
            </button>
            {/* "LATER" WRITES tourSeenAt, THE SAME AS FINISHING. Owner ruling:
                no nagging, no "remind me". A tour a couple put off and then met
                again is worse than one they never saw. */}
            <button
              type="button"
              onClick={finish}
              className="btn-editorial-secondary"
              style={{ fontSize: 13 }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── the chapter body ─────────────────────────────────────────────────────
  const rail = (
    <nav
      aria-label="Tour chapters"
      data-tour-rail
      style={narrow ? {
        display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 16px',
        borderBottom: '1px solid rgba(10,10,10,0.12)', flexShrink: 0,
      } : {
        width: 208, flexShrink: 0, borderRight: '1px solid rgba(10,10,10,0.12)',
        padding: '20px 0', overflowY: 'auto',
      }}
    >
      {!narrow && (
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 20px 12px' }}>
          {done} of {CHAPTERS.length} done
        </p>
      )}
      {CHAPTERS.map((c, i) => {
        const isAt = i === at && !onFinale;
        const isDone = dismissed.includes(chapterProgressKey(c.key));
        // RESOLVED, NOT RAW. The rail printed "Welcome to your studio,
        // {coupleFirstNames}." because it read the chapter's template while the
        // body read the resolved copy. Measured in a browser, not reasoned
        // about: the placeholder was on screen in the chapter list.
        const railTitle = resolveChapter(c, context).title;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => goTo(i)}
            aria-current={isAt ? 'step' : undefined}
            data-tour-chapter={c.key}
            style={narrow ? {
              flexShrink: 0, padding: '6px 12px', borderRadius: 999, border: 'none',
              background: isAt ? '#0A0A0A' : 'rgba(10,10,10,0.06)',
              color: isAt ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
              fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', whiteSpace: 'nowrap',
            } : {
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '8px 20px', background: isAt ? 'rgba(224,53,83,0.08)' : 'transparent',
              borderLeft: isAt ? '2px solid #E03553' : '2px solid transparent',
              borderTop: 'none', borderRight: 'none', borderBottom: 'none',
              color: isAt ? '#E03553' : '#0A0A0A',
              fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', textAlign: 'left',
            }}
          >
            {!narrow && (
              <span aria-hidden="true" style={{ width: 12, display: 'flex', color: 'rgba(10,10,10,0.45)' }}>
                {isDone ? <Check size={12} /> : null}
              </span>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {railTitle}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div style={overlay} role="presentation">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Studio tour"
        tabIndex={-1}
        data-studio-tour={mode}
        style={shell}
      >
        {rail}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(10,10,10,0.12)', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Studio tour</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: narrow ? '20px 16px' : '24px 28px' }}>
            {onFinale ? (
              <div data-tour-finale style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1.3 }}>
                  {FINALE.line}
                </p>
                <div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 13 }}
                    onClick={() => { navigate(FINALE.to); finish(); }}
                  >
                    {FINALE.buttonLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <ChapterMedia
                  chapterKey={chapter.key}
                  title={resolved.title}
                  active
                  adjacent={false}
                  reducedMotion={reducedMotion}
                />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 6px' }}>
                    {at + 1} of {CHAPTERS.length}
                  </p>
                  <p style={{ fontSize: 19, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 10px', lineHeight: 1.3 }}>
                    {resolved.title}
                  </p>
                  <p style={{ fontSize: 15, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.6 }}>
                    {resolved.lead}
                  </p>
                  <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>
                    {resolved.body}
                  </p>
                </div>
                <div style={{ borderTop: '1px solid rgba(10,10,10,0.12)', paddingTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 6px' }}>
                    Most people miss this
                  </p>
                  <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>
                    {resolved.tip}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderTop: '1px solid rgba(10,10,10,0.12)', flexShrink: 0 }}>
            <button
              type="button"
              onClick={back}
              disabled={at === 0 && !onFinale}
              aria-label="Previous chapter"
              style={{
                background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, fontFamily: PJS, padding: 0,
                color: at === 0 && !onFinale ? 'rgba(10,10,10,0.3)' : 'rgba(10,10,10,0.6)',
                cursor: at === 0 && !onFinale ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!onFinale && chapter.tryIt && (
                <button type="button" onClick={tryIt} className="btn-editorial-secondary" style={{ fontSize: 13 }}>
                  Try it
                </button>
              )}
              {onFinale ? (
                <button type="button" onClick={finish} className="btn-primary" style={{ fontSize: 13 }}>Close</button>
              ) : (
                <button type="button" onClick={next} className="btn-primary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Next<ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
