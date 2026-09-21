import React from 'react';
import { ImageOff } from 'lucide-react';
import Screen from '../../shell/Screen';
import { SmartImage, StatusPill, PanelCard } from '../../ui';
import { allSlots, todoSlots, duplicateIds, usedIds, imageUrl } from '../../images';

/**
 * /m/preview/images, dev only: every decorative slot from images.ts with the
 * assigned photo from the app/ folder, where it is used, the pixel size to
 * supply, and a clear marker on any slot still waiting for a photo. A
 * photo in two slots anywhere in the app is a build error here: the screen
 * throws (goal 5), so the duplicate cannot ship unnoticed.
 */
export default function ImageGalleryScreen({ back }) {
  const slots = allSlots();
  const todo = todoSlots();
  const dupes = duplicateIds();
  if (dupes.length) throw new Error(`images.ts repeats a photo: ${dupes.map((d) => `${d.id} in ${d.keys.join(', ')}`).join('; ')}`);
  const ids = usedIds();
  const distinct = new Set(ids).size;
  const subtitle = `${slots.length} slots, ${distinct} photos, no repeats${todo.length ? `, ${todo.length} need${todo.length === 1 ? 's' : ''} a photo` : ''}`;
  return (
    <Screen title="Image slots" subtitle={subtitle} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <PanelCard tone="neutral" label="How to read this" body="Each card is one place the app shows a photo the couple did not upload. Every photo comes from the app folder in Cloudinary and is used in one slot only, anywhere in the app; this screen fails to render if that stops being true. Change the id in src/mobile/images.ts and it changes everywhere." />
        {slots.map((s) => (
          <div key={s.key} className="oi-m-card oi-m-card--flush">
            <div style={{ padding: 8 }}>
              {s.id ? (
                <SmartImage src={imageUrl(s.key)} alt={s.alt} width={342} ratio={s.ratio} style={s.focal ? { objectPosition: s.focal } : undefined} />
              ) : (
                <div style={{ aspectRatio: s.ratio.replace('/', ' / '), borderRadius: 'var(--m-r-image)', background: s.tone === 'ink' ? 'var(--m-ink)' : s.tone === 'tint' ? 'var(--m-tint)' : 'var(--m-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.tone === 'ink' ? '#FFFFFF' : 'var(--m-text-2)' }}>
                  <ImageOff size={28} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="oi-m-body oi-m-strong">{s.key}</span>
                {s.todo ? <StatusPill tone="no">Needs photo</StatusPill> : <StatusPill tone="ok">In use</StatusPill>}
              </div>
              <div className="oi-m-meta">{s.usedIn} (screen: {s.screen})</div>
              <div className="oi-m-meta">Drawn at {s.size.w} by {s.size.h}, ratio {s.ratio}. Supply {s.size.w * 3} by {s.size.h * 3} or larger{s.focal ? `, focal point ${s.focal}` : ''}.</div>
              <div className="oi-m-meta" style={{ overflowWrap: 'anywhere' }}>{s.id ? s.id : 'No id yet'}</div>
              <div className="oi-m-meta">Alt: {s.alt}</div>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}
