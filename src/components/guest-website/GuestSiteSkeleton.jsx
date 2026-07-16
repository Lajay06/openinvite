import React from 'react';

/**
 * GuestSiteSkeleton — the guest-site's loading placeholder. The active
 * universe (and its palette) isn't known until the wedding fetch resolves,
 * so this can't be tinted to match it exactly — it uses a warm-neutral
 * background instead of the previous flat black, which was the most
 * jarring possible flash against any light universe.
 *
 * Shape mirrors the real page: a 56px nav bar (WeddingWebsiteNav), a large
 * hero block with two centred text-line placeholders, then a few
 * paragraph-shaped rows below.
 */
export default function GuestSiteSkeleton({ prefersReduced }) {
  const blockClass = prefersReduced ? '' : 'guest-skeleton-block';
  const blockStyle = prefersReduced
    ? { background: '#EDE9E3' }
    : undefined;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F2ED' }}>
      {/* Nav bar */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
        <div className={blockClass} style={{ ...blockStyle, width: 140, height: 14 }} />
        <div style={{ display: 'flex', gap: 20 }}>
          <div className={blockClass} style={{ ...blockStyle, width: 48, height: 10 }} />
          <div className={blockClass} style={{ ...blockStyle, width: 48, height: 10 }} />
          <div className={blockClass} style={{ ...blockStyle, width: 48, height: 10 }} />
        </div>
      </div>

      {/* Hero */}
      <div style={{ height: '70vh', minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div className={blockClass} style={{ ...blockStyle, width: 'min(480px, 70vw)', height: 40 }} />
        <div className={blockClass} style={{ ...blockStyle, width: 'min(240px, 40vw)', height: 16 }} />
      </div>

      {/* Content rows */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className={blockClass} style={{ ...blockStyle, width: '100%', height: 14 }} />
        <div className={blockClass} style={{ ...blockStyle, width: '85%', height: 14 }} />
        <div className={blockClass} style={{ ...blockStyle, width: '92%', height: 14 }} />
        <div className={blockClass} style={{ ...blockStyle, width: '60%', height: 14 }} />
      </div>
    </div>
  );
}
