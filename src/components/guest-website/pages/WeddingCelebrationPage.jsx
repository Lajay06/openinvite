import React from 'react';
import SectionReveal from '../SectionReveal';

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function WeddingCelebrationPage({ weddingDetails, theme, typography, universeConfig }) {
  const weddingDate = weddingDetails.weddingDate || '';
  const ceremony   = weddingDetails.mainCeremony || {};
  const reception  = weddingDetails.reception    || {};
  const preEvents  = weddingDetails.preWeddingEvents  || [];
  const postEvents = weddingDetails.postWeddingEvents || [];
  const daySchedule = weddingDetails.celebrationContent?.daySchedule || [];

  // ── Build unified event list ─────────────────────────────────────────────────
  const allEvents = [];

  if (ceremony.venueName || ceremony.startTime || ceremony.notes) {
    allEvents.push({
      _id: 'ceremony', _title: 'Ceremony', _date: weddingDate,
      _photoUrl: ceremony.photoUrl || null,
      startTime: ceremony.startTime || ceremony.time || '', endTime: ceremony.endTime || '',
      venueName: ceremony.venueName || '', address: ceremony.address || '',
      dressCode: ceremony.dressCode || '', notes: ceremony.notes || '',
    });
  }

  if (reception.venueName || reception.startTime || reception.notes) {
    allEvents.push({
      _id: 'reception', _title: 'Reception', _date: weddingDate,
      _photoUrl: reception.photoUrl || null,
      startTime: reception.startTime || reception.time || '', endTime: reception.endTime || '',
      venueName: reception.venueName || '', address: reception.address || '',
      dressCode: reception.dressCode || '', notes: reception.notes || '',
    });
  }

  [...preEvents, ...postEvents].forEach(ev => {
    if (ev.name || ev.venueName || ev.startTime) {
      allEvents.push({
        _id: ev.id || `ev-${Math.random()}`, _title: ev.name || ev.type || 'Event',
        _date: ev.date || '', _photoUrl: ev.venuePhotoUrl || ev.photoUrl || null,
        startTime: ev.startTime || ev.time || '', endTime: ev.endTime || '',
        venueName: ev.venueName || ev.venue || '',
        address: ev.venueAddress || ev.address || '',
        dressCode: ev.dressCode || '', notes: ev.details || ev.notes || '',
      });
    }
  });

  // Sort chronologically: by date then start time
  allEvents.sort((a, b) => {
    const da = a._date || '9999-12-31', db = b._date || '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  // Group by date key
  const dayMap = {};
  const dayOrder = [];
  allEvents.forEach(ev => {
    const key = ev._date || '';
    if (!dayMap[key]) { dayMap[key] = []; dayOrder.push(key); }
    dayMap[key].push(ev);
  });

  const hasEvents = allEvents.length > 0;

  const T   = typography;
  const hFont = T.headingFont;
  const bFont = T.bodyFont;
  const hWt   = T.headingWeight || 400;
  const lt    = theme.lightText;
  const acc   = theme.accent;

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
        <SectionReveal universeConfig={universeConfig}>
          <h1 style={{
            fontFamily: hFont, fontWeight: hWt, letterSpacing: '-0.025em',
            fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1.05,
            color: lt, textAlign: 'center', margin: '0 0 96px',
          }}>
            The celebration
          </h1>
        </SectionReveal>

        {/* ── Day groups ─────────────────────────────────────────────────────── */}
        {hasEvents ? dayOrder.map((dateKey, gi) => {
          const events = dayMap[dateKey];

          let dayOfWeek = '', fullDate = '';
          if (dateKey) {
            try {
              const d = new Date(dateKey + 'T00:00:00');
              dayOfWeek = d.toLocaleDateString('en-AU', { weekday: 'long' });
              fullDate  = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
            } catch { fullDate = dateKey; }
          }

          return (
            <SectionReveal key={dateKey || gi} universeConfig={universeConfig}>
              <div style={{ marginBottom: gi < dayOrder.length - 1 ? 112 : 0 }}>

                {/* Day header */}
                {dateKey && (
                  <div style={{ marginBottom: 64, paddingBottom: 28, borderBottom: `1px solid ${lt}14` }}>
                    {dayOfWeek && (
                      <p style={{ fontFamily: bFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: acc, margin: '0 0 10px' }}>
                        {dayOfWeek}
                      </p>
                    )}
                    <h2 style={{ fontFamily: hFont, fontWeight: hWt, fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', letterSpacing: '-0.02em', color: lt, margin: 0, lineHeight: 1.1 }}>
                      {fullDate}
                    </h2>
                  </div>
                )}

                {/* Events */}
                {events.map((ev, ei) => {
                  const timeStr = [fmtTime(ev.startTime), ev.endTime && fmtTime(ev.endTime)].filter(Boolean).join(' – ');
                  const hasPhoto = !!ev._photoUrl;

                  return (
                    <div key={ev._id} style={{ marginBottom: ei < events.length - 1 ? 72 : 0 }}>
                      {ei > 0 && <div style={{ height: 1, background: `${lt}08`, marginBottom: 72 }} />}

                      {/* ── Card with photo ─────────────────────────────────── */}
                      {hasPhoto ? (
                        <div className="cel-grid">
                          <div className="cel-photo">
                            <img
                              src={ev._photoUrl}
                              alt={ev.venueName || ev._title}
                              onError={e => {
                                // On photo error, collapse photo col and expand details
                                const grid = e.target.closest('.cel-grid');
                                if (grid) {
                                  e.target.closest('.cel-photo').style.display = 'none';
                                  const det = grid.querySelector('.cel-details');
                                  if (det) {
                                    det.style.paddingLeft = '28px';
                                    det.style.borderLeft = `2px solid ${acc}50`;
                                    det.style.gridColumn = '1 / -1';
                                  }
                                }
                              }}
                            />
                          </div>
                          <EventDetails ev={ev} timeStr={timeStr} lt={lt} acc={acc} hFont={hFont} bFont={bFont} hWt={hWt} />
                        </div>
                      ) : (
                        /* ── Type-only card — full width, accent left rule ── */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                          <EventDetails
                            ev={ev} timeStr={timeStr} lt={lt} acc={acc} hFont={hFont} bFont={bFont} hWt={hWt}
                            noPhoto
                            style={{ paddingLeft: 28, borderLeft: `2px solid ${acc}50` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionReveal>
          );
        }) : (
          /* ── Empty state ──────────────────────────────────────────────────── */
          <SectionReveal universeConfig={universeConfig}>
            <p style={{ fontFamily: bFont, fontSize: '1rem', color: `${lt}50`, textAlign: 'center', margin: 0 }}>
              Event details coming soon.
            </p>
          </SectionReveal>
        )}

        {/* ── Legacy day schedule fallback (if no structured events) ──────── */}
        {!hasEvents && daySchedule.length > 0 && (
          <SectionReveal universeConfig={universeConfig}>
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

      {/* Dress code — quiet pill, sentence case, no loud colour */}
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
