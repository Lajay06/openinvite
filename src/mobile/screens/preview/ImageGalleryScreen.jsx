import React from 'react';
import { ImageOff } from 'lucide-react';
import Screen from '../../shell/Screen';
import { SmartImage, StatusPill, PanelCard } from '../../ui';
import { allSlots, todoSlots, CLOUD } from '../../images';

/**
 * /m/preview/images, dev only: every decorative slot from images.ts with the
 * current image, where it is used, the pixel size to supply, and a clear
 * marker on the ones still waiting for a photo. The shopping list for the
 * next batch.
 */
export default function ImageGalleryScreen({ back }) {
  const slots = allSlots();
  const todo = todoSlots();
  return (
    <Screen title="Image slots" subtitle={`${slots.length} slots, ${todo.length} need a photo`} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <PanelCard tone="sand" label="How to read this" body="Each card is one place the app shows a photo the couple did not upload. Supply the size shown at 3x for the sharpest result. Change the id in src/mobile/images.ts and it changes everywhere." />
        {slots.map((s) => (
          <div key={s.key} className="oi-m-card oi-m-card--flush">
            <div style={{ padding: 8 }}>
              {s.id ? (
                <SmartImage src={`${CLOUD}/${s.id}`} alt={s.alt} width={342} ratio={s.ratio} style={s.focal ? { objectPosition: s.focal } : undefined} />
              ) : (
                <div style={{ aspectRatio: s.ratio.replace('/', ' / '), borderRadius: 'var(--m-r-image)', background: s.tone === 'ink' ? 'var(--m-ink)' : s.tone === 'blush' ? 'var(--m-blush)' : 'var(--m-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.tone === 'ink' ? '#FFFFFF' : 'var(--m-text-2)' }}>
                  <ImageOff size={28} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="oi-m-body oi-m-strong">{s.key}</span>
                {s.todo ? <StatusPill tone="no">Needs photo</StatusPill> : <StatusPill tone="ok">In use</StatusPill>}
              </div>
              <div className="oi-m-meta">{s.usedIn}</div>
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
