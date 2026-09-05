import React from 'react';
import SectionReveal from '../SectionReveal';
import { parseWeddingDate } from '@/lib/guestDate';
import { isMotionEnabled } from '@/lib/universeStyling';
import { accentText } from '@/lib/surfaceTint';
import EditorialSectionKicker from '../layouts/EditorialSectionKicker';
import ZelligeDivider from '../layouts/ZelligeDivider';
import MinimalSectionMark from '../layouts/MinimalSectionMark';
import HairlineRule from '../layouts/HairlineRule';
import KyotoSectionMark from '../layouts/KyotoSectionMark';
import VerticalRule from '../layouts/VerticalRule';
import TicketStub from '../layouts/TicketStub';
import BaliSectionMark from '../layouts/BaliSectionMark';
import WaveDivider from '../layouts/WaveDivider';
import ParisSectionMark from '../layouts/ParisSectionMark';
import CapriSectionMark from '../layouts/CapriSectionMark';
import CitrusScallop from '../layouts/CitrusScallop';
import MykonosSectionMark from '../layouts/MykonosSectionMark';
import CubeBlock from '../layouts/CubeBlock';
import CapeTownSectionMark from '../layouts/CapeTownSectionMark';
import VineRule from '../layouts/VineRule';
import UniverseBlocks from '../blocks/UniverseBlocks';

import { compareDayThenTime } from '@/lib/scheduleOrder';
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

function WeddingCelebrationPageContent({ weddingDetails, theme, typography, universeConfig }) {
  const weddingDate = weddingDetails.weddingDate || '';
  const ceremony   = weddingDetails.mainCeremony || {};
  const reception  = weddingDetails.reception    || {};
  const preEvents  = weddingDetails.preWeddingEvents  || [];
  const postEvents = weddingDetails.postWeddingEvents || [];
  const daySchedule = weddingDetails.celebrationContent?.daySchedule || [];

  // ── Build unified event list ─────────────────────────────────────────────────
  //
  // NO `_photoUrl`. #650 removed the location photo from every event block at
  // the owner's instruction, but the three assignments that fed it survived
  // for another eleven PRs — an image resolved into a variable and rendered
  // nowhere. It was found only when a sample tried to fill it and nothing
  // appeared on screen.
  //
  // COMPUTING AN IMAGE AND RENDERING NOTHING IS EXACTLY WHAT R30 EXISTS TO
  // CATCH: a field name is a claim about where data goes, and only the reader
  // proves it. If a Celebration image is ever wanted again, add the render
  // first and the field second.
  const allEvents = [];

  if (ceremony.venueName || ceremony.startTime || ceremony.notes) {
    allEvents.push({
      _id: 'ceremony', _title: 'Ceremony', _date: weddingDate,
      startTime: ceremony.startTime || ceremony.time || '', endTime: ceremony.endTime || '',
      venueName: ceremony.venueName || '', address: ceremony.address || '',
      dressCode: ceremony.dressCode || '', notes: ceremony.notes || '',
    });
  }

  if (reception.venueName || reception.startTime || reception.notes) {
    allEvents.push({
      _id: 'reception', _title: 'Reception', _date: weddingDate,
      startTime: reception.startTime || reception.time || '', endTime: reception.endTime || '',
      venueName: reception.venueName || '', address: reception.address || '',
      dressCode: reception.dressCode || '', notes: reception.notes || '',
    });
  }

  [...preEvents, ...postEvents].forEach(ev => {
    if (ev.name || ev.venueName || ev.startTime) {
      allEvents.push({
        _id: ev.id || `ev-${Math.random()}`, _title: ev.name || ev.type || 'Event',
        _date: ev.date || '',
        startTime: ev.startTime || ev.time || '', endTime: ev.endTime || '',
        venueName: ev.venueName || ev.venue || '',
        address: ev.venueAddress || ev.address || '',
        dressCode: ev.dressCode || '', notes: ev.details || ev.notes || '',
      });
    }
  });

  // Chronological: day first, then time, undated last. This page had the rule
  // right while the two dashboard lists ignored the day entirely — so the rule
  // now lives in one place rather than in the one surface that happened to
  // implement it correctly.
  allEvents.sort((a, b) => compareDayThenTime(a._date, a.startTime, b._date, b.startTime));

  // Group by date key
  const dayMap = {};
  const dayOrder = [];
  allEvents.forEach(ev => {
    const key = ev._date || '';
    if (!dayMap[key]) { dayMap[key] = []; dayOrder.push(key); }
    dayMap[key].push(ev);
  });

  const hasEvents = allEvents.length > 0;
  const isEditorial = universeConfig?.layout === 'editorial-masthead';
  const isMinimal = universeConfig?.layout === 'london-minimal';
  const isKyoto = universeConfig?.layout === 'kyoto-vertical';
  const isBrooklyn = universeConfig?.layout === 'brooklyn-offgrid';
  const isBali = universeConfig?.layout === 'bali-organic';
  const isParis = universeConfig?.layout === 'paris-couture';
  const isCapri = universeConfig?.layout === 'capri-citrus';
  const isMykonos = universeConfig?.layout === 'mykonos-whitewash';
  const isCapeTown = universeConfig?.layout === 'capetown-estate';
  const copy = universeConfig?.copy || {};
  // Every branch's heading is now the kicker alone, so the kicker can no
  // longer be optional — tulum defines no celebrationKicker, and a custom
  // wedding has no universeConfig at all. Both fall back to the exact words
  // the removed serif title printed, so no new universe voice is invented.
  const celebrationKicker = copy.celebrationKicker || 'The celebration';

  const T   = typography;
  const hFont = T.headingFont;
  const bFont = T.bodyFont;
  const hWt   = T.headingWeight || 400;
  const lt    = theme.lightText;
  // P2c: `acc` is used as a TEXT color for times and labels, and the raw
  // accent fails 4.5:1 against lightBg on 15 of the 20 palettes (london 2.27,
  // measured on screen, not inferred). accentText darkens it toward the
  // palette's own ink only as far as needed, keeping the hue.
  const acc   = accentText(theme);

  return (
    <div style={{ backgroundColor: theme.lightBg, color: lt, minHeight: '100vh' }}>

      {/* Responsive grid styles */}
      <style>{`
        .cel-grid { display: grid; grid-template-columns: 5fr 7fr; }
        .cel-photo { aspect-ratio: 4 / 5; overflow: hidden; }
        .cel-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cel-details { padding: 0 0 0 56px; display: flex; flex-direction: column; justify-content: center; }
        .cel-full { grid-column: 1 / -1; }
        @media (max-width: 680px) {
          .cel-grid { grid-template-columns: 1fr; }
          .cel-photo { aspect-ratio: 3 / 2; }
          .cel-details { padding: 28px 0 0 0; }
          .cel-full { grid-column: 1 / 1; }
        }
      `}</style>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '80px 32px 120px' }}>

        {/* Page heading */}
        {isParis ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 88, textAlign: 'center' }}>
              <ParisSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
              {/* P2e: the serif display title is gone. This page printed its
                  name twice — once as the SectionMark kicker above and again
                  as a 36px serif heading, the same words both times. The kicker
                  stays and is now the page's only heading, as on every other. */}
            </div>
          </SectionReveal>
        ) : isCapri ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 72 }}>
              <CapriSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} accentColor={acc} />
            </div>
          </SectionReveal>
        ) : isMykonos ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 96 }}>
              <MykonosSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} accentColor={acc} />
            </div>
          </SectionReveal>
        ) : isCapeTown ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 88 }}>
              <CapeTownSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
            </div>
          </SectionReveal>
        ) : isKyoto ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 96 }}>
              <KyotoSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
              {/* P2e: serif title removed — the kicker above prints these same words. */}
            </div>
          </SectionReveal>
        ) : isBrooklyn ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 80, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {/* P2e: serif title removed — brooklyn's celebrationKicker IS
                  "The party", so this printed the same words twice, exactly
                  like the other four branches. */}
              <TicketStub color={acc} width={200} height={12} />
              {celebrationKicker && (
                <h1 className="wb-body-face" style={{ fontFamily: bFont, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: acc, opacity: 0.8, margin: '16px 0 0' }}>
                  {celebrationKicker}
                </h1>
              )}
            </div>
          </SectionReveal>
        ) : isBali ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 88 }}>
              <BaliSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
              {/* P2e: serif title removed — the kicker above prints these same words. */}
            </div>
          </SectionReveal>
        ) : isMinimal ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 88 }}>
              <MinimalSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
              {/* P2e: serif title removed — the kicker above prints these same words. */}
            </div>
          </SectionReveal>
        ) : isEditorial ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginBottom: 96 }}>
              <EditorialSectionKicker as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
              {/* P2e: serif title removed — the kicker above prints these same words. */}
            </div>
          </SectionReveal>
        ) : (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            {/* P2e: the default branch had no SectionMark, so it gets the same
                kicker-only heading the layout branches use rather than losing
                its title outright. */}
            <MinimalSectionMark as="h1" kicker={celebrationKicker} theme={theme} typography={typography} />
          </SectionReveal>
        )}

        {/* ── Day groups ─────────────────────────────────────────────────────── */}
        {hasEvents ? dayOrder.map((dateKey, gi) => {
          const events = dayMap[dateKey];

          // The try/catch that used to sit here guarded nothing:
          // toLocaleDateString RETURNS the string "Invalid Date" instead of
          // throwing, so the catch never fired and every guest saw that text as
          // a day header. parseWeddingDate handles the real cause — weddingDate
          // is a full ISO timestamp, not the date-only string 'T00:00:00' was
          // being appended to.
          let dayOfWeek = '', fullDate = '';
          const d = parseWeddingDate(dateKey);
          if (d) {
            dayOfWeek = d.toLocaleDateString('en-AU', { weekday: 'long' });
            fullDate  = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
          }

          return (
            <SectionReveal key={dateKey || gi} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: gi < dayOrder.length - 1 ? 112 : 0 }}>

                {/* Day header */}
                {dateKey && (
                  <div style={{
                    marginBottom: 64,
                    paddingBottom: (isEditorial || isMinimal || isKyoto || isBali || isParis || isCapri || isMykonos || isCapeTown) ? 0 : 28,
                    borderBottom: (isEditorial || isMinimal || isKyoto || isBali || isParis || isCapri || isMykonos || isCapeTown) ? 'none' : `1px solid ${lt}14`,
                    textAlign: (isMinimal || isParis) ? 'center' : isBrooklyn ? 'right' : 'left',
                    display: isKyoto ? 'flex' : 'block',
                    gap: isKyoto ? 20 : undefined,
                  }}>
                    {isKyoto && <VerticalRule color={acc} opacity={0.4} height={56} style={{ flexShrink: 0, marginTop: 4 }} />}
                    <div>
                      {dayOfWeek && (
                        <p style={{
                          fontFamily: (isEditorial || isMinimal || isParis || isCapeTown) ? hFont : bFont,
                          fontStyle: (isEditorial || isMinimal || isParis || isCapeTown) ? 'italic' : 'normal',
                          fontSize: (isEditorial || isMinimal) ? '1rem' : isBrooklyn ? 12 : isParis ? 12 : isCapeTown ? '1rem' : 11,
                          fontWeight: (isEditorial || isMinimal || isCapeTown) ? hWt : isBrooklyn ? 700 : isCapri ? 700 : 600,
                          letterSpacing: (isEditorial || isMinimal) ? '0.01em' : isBrooklyn ? '0.18em' : isParis ? '0.24em' : isMykonos ? '0.16em' : '0.1em',
                          textTransform: (isBrooklyn || isParis || isMykonos) ? 'uppercase' : 'none',
                          color: acc, margin: '0 0 10px',
                        }}>
                          {dayOfWeek}
                        </p>
                      )}
                      <h2 style={{
                        fontFamily: hFont, fontWeight: hWt,
                        fontSize: isBrooklyn ? 'clamp(2.2rem, 5.5vw, 3.5rem)' : 'clamp(1.6rem, 3.5vw, 2.5rem)',
                        letterSpacing: isBrooklyn ? '0.01em' : isMykonos ? '-0.01em' : '-0.02em',
                        color: lt, margin: 0, lineHeight: 1.1,
                      }}>
                        {fullDate}
                      </h2>
                      {isEditorial && (
                        <ZelligeDivider color={lt} opacity={0.35} height={14} style={{ width: '100%', marginTop: 28 }} />
                      )}
                      {isMinimal && (
                        <HairlineRule color={lt} opacity={0.2} width={40} style={{ margin: '28px auto 0' }} />
                      )}
                      {isBrooklyn && (
                        <TicketStub color={acc} width={120} height={10} style={{ marginTop: 20, marginLeft: 'auto' }} />
                      )}
                      {isBali && (
                        <WaveDivider color={lt} opacity={0.3} height={16} style={{ maxWidth: 140, marginTop: 24 }} />
                      )}
                      {isParis && (
                        <HairlineRule color={lt} opacity={0.3} width={100} style={{ margin: '24px auto 0' }} />
                      )}
                      {isCapri && (
                        <CitrusScallop color={acc} bumpSize={5} style={{ maxWidth: 90, marginTop: 20 }} />
                      )}
                      {isMykonos && (
                        <CubeBlock color={acc} width={28} height={6} style={{ marginTop: 22 }} />
                      )}
                      {isCapeTown && (
                        <VineRule color={lt} opacity={0.4} style={{ maxWidth: 130, marginTop: 24 }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Events */}
                {events.map((ev, ei) => {
                  const timeStr = [fmtTime(ev.startTime), ev.endTime && fmtTime(ev.endTime)].filter(Boolean).join(' – ');

                  return (
                    <div key={ev._id} style={{ marginBottom: ei < events.length - 1 ? 72 : 0 }}>
                      {ei > 0 && <div style={{ height: 1, background: `${lt}08`, marginBottom: 72 }} />}

                      {/* ── Card with photo ─────────────────────────────────── */}
                      {/* OWNER ITEM 10 — the location photo is gone from each
                          event block. Every event now renders the type-only
                          card: full width, accent left rule. The photo branch
                          and its onError collapse went with it, because both
                          existed only to lay out around an image. */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                        <EventDetails
                          ev={ev} timeStr={timeStr} lt={lt} acc={acc} hFont={hFont} bFont={bFont} hWt={hWt}
                          noPhoto
                          style={{ paddingLeft: 28, borderLeft: `2px solid ${acc}50` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionReveal>
          );
        }) : (
          /* ── Empty state ──────────────────────────────────────────────────── */
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ fontFamily: bFont, fontSize: '1rem', color: `${lt}50`, textAlign: 'center', margin: 0 }}>
              Event details coming soon.
            </p>
          </SectionReveal>
        )}

        {/* ── Legacy day schedule fallback (if no structured events) ──────── */}
        {!hasEvents && daySchedule.length > 0 && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <div style={{ marginTop: 40 }}>
              <h2 style={{ fontFamily: hFont, fontWeight: hWt, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.02em', color: lt, margin: '0 0 40px' }}>
                Day schedule
              </h2>
              {daySchedule.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 32, paddingBottom: 24, marginBottom: 24, borderBottom: i < daySchedule.length - 1 ? `1px solid ${lt}0A` : 'none' }}>
                  <p style={{ flex: '0 0 88px', fontFamily: bFont, fontSize: '0.875rem', fontWeight: 600, color: acc, margin: 0 }}>{item.time}</p>
                  <p style={{ flex: 1, fontFamily: bFont, fontSize: '1rem', color: lt, margin: 0, lineHeight: 1.6 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}

// ── Shared details column — reused by both photo and no-photo cards ───────────
function EventDetails({ ev, timeStr, lt, acc, hFont, bFont, hWt, noPhoto, style: extraStyle }) {
  return (
    <div
      className={noPhoto ? 'cel-full' : 'cel-details'}
      style={noPhoto
        ? { ...extraStyle }
        : { padding: '0 0 0 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', ...extraStyle }}
    >
      {/* Event name */}
      <h3 style={{
        fontFamily: hFont, fontWeight: hWt, letterSpacing: '-0.015em',
        fontSize: 'clamp(1.3rem, 2.8vw, 1.85rem)', lineHeight: 1.1,
        color: lt, margin: '0 0 18px',
      }}>
        {ev._title}
      </h3>

      {/* Time range */}
      {timeStr && (
        <p style={{ fontFamily: bFont, fontSize: '0.9375rem', fontWeight: 500, color: acc, margin: '0 0 22px', letterSpacing: '0.01em' }}>
          {timeStr}
        </p>
      )}

      {/* Venue */}
      {ev.venueName && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontFamily: bFont, fontSize: '0.9375rem', fontWeight: 600, color: lt, margin: '0 0 4px' }}>
            {ev.venueName}
          </p>
          {ev.address && (
            <p style={{ fontFamily: bFont, fontSize: '0.8125rem', color: `${lt}60`, margin: 0, lineHeight: 1.55 }}>
              {ev.address}
            </p>
          )}
        </div>
      )}

      {/* Dress code — quiet pill, sentence case, no loud color */}
      {ev.dressCode && (
        <div style={{ marginBottom: 22 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 12px', borderRadius: 999,
            fontSize: 11, fontWeight: 600, fontFamily: bFont, letterSpacing: '0.04em',
            background: `${lt}0D`, color: `${lt}70`,
            border: `1px solid ${lt}18`,
          }}>
            {ev.dressCode}
          </span>
        </div>
      )}

      {/* Notes */}
      {ev.notes && (
        <p style={{ fontFamily: bFont, fontSize: '0.8125rem', color: `${lt}55`, margin: 0, lineHeight: 1.75 }}>
          {ev.notes}
        </p>
      )}
    </div>
  );
}

// See WeddingHomePage.jsx for why this wraps at the export boundary rather
// than editing every isXxx branch above.
export default function WeddingCelebrationPage(props) {
  return (
    <>
      <WeddingCelebrationPageContent {...props} />
      <UniverseBlocks
        blocks={props.weddingDetails?.celebrationContent?.blocks}
        weddingDetails={props.weddingDetails}
        theme={props.theme}
        typography={props.typography}
        universeConfig={props.universeConfig}
        editable={props.editable}
        onRequestInsert={props.onRequestInsert}
        onMoveBlock={props.onMoveBlock}
        onDeleteBlock={props.onDeleteBlock}
        onSelectBlock={props.onSelectBlock}
        selectedBlockId={props.selectedBlockId}
      />
    </>
  );
}
