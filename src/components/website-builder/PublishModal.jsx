import React, { useState } from 'react';
import { Globe, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchGuestLinks } from '@/lib/guestLinks';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useWebsitePasswordGate } from '@/lib/websitePasswordGate';

import { coupleNameParts } from '@/lib/coupleNames';
import { syncWeddingAddress } from '@/lib/weddingAddress';
function ToggleSwitch({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-label={label ? `Toggle ${label}` : 'Toggle'}
      aria-pressed={value}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: value ? '#E03553' : '#CCCCCC', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s', padding: 0,
      }}
    >
      <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: value ? 18 : 2, transition: 'left 0.2s' }} />
    </button>
  );
}

export default function PublishModal({ onClose, details, onUpdate }) {
  const [tab, setTab] = useState(details?.initialTab || 'website');

  const hasRealSlug = !!details?.slug;
  // window.location.host, not a hardcoded literal — so the link shown
  // and shared always matches wherever this is actually running (a
  // Vercel preview, www., etc.), never a stale/wrong domain.
  const siteHost = typeof window !== 'undefined' ? window.location.host : 'openinvite.com.au';
  const siteUrl = hasRealSlug ? `${siteHost}/w/${details.slug}` : null;

  // THE QR IS GONE, with the rest of the link sharing.
  //
  // Item 12 of goals/2026-10-08-site-fixes-batch-1.md, 12a: this modal loses
  // Copy, Copy Link, WhatsApp and QR and any URL display, and email becomes
  // the only way guests receive the site. A QR is a link in another encoding.
  //
  // #726 and the commit after it moved both QRs in this file off
  // api.qrserver.com, because an <img> pointed at a third party put the
  // couple's private address in a query string to a service we have no
  // agreement with, on every open and every download. That reasoning is kept
  // here rather than deleted with the code it justified: a QR on this modal
  // is drawn locally or it is not drawn.
  const [refusal, setRefusal] = useState('');

  const togglePublish = async () => {
    const next = { websiteEnabled: !details?.websiteEnabled };

    // PUBLISH SETTLES THE ADDRESS, BEFORE THE SITE BECOMES REACHABLE.
    //
    // Two records can derive the same address simultaneously — the platform
    // has no unique constraint and no conditional write, so the race can only
    // be DETECTED, and the deterministic tie-break decides who moves.
    //
    // Detection previously happened "on the next load", which is not a
    // guarantee: a couple who publishes and sends invitations without
    // revisiting never triggers it. Guests only exist after publish, so
    // forcing resolution HERE closes the window before anyone can be hurt by
    // it — the address a guest is given has already been settled.
    //
    // Before enabling only, and awaited: the point is to be certain the
    // address is final at the moment it becomes shareable.
    if (next.websiteEnabled) {
      const settled = await syncWeddingAddress(details.id);
      if (settled.changed && settled.slug) onUpdate({ slug: settled.slug });

      // AND IT REFUSES IF THERE IS STILL NO ADDRESS. This settled the address
      // and then published regardless: `update()` was unconditional, so a
      // record with no names — `claim-slug` answering `{slug: null, reason:
      // 'no-names'}` — went live at an address that does not exist. The
      // button above is disabled without a slug, but a disabled button is a
      // hint, not a gate; the write is the gate.
      const address = settled.slug || details.slug;
      if (!address) {
        setRefusal('Add your names first so your guest suite has an address.');
        return;
      }
    }
    setRefusal('');

    await base44.entities.WeddingDetails.update(details.id, next);
    onUpdate(next);

    // PUBLISH-TIME SWEEP, over EVERY guest id -- not a selection.
    //
    // Guests created through api/my-guests.js already carry a token. This is
    // the safety net for the rest: rows created before that shipped, and any
    // path that reaches Guest without going through it. Publishing is the right
    // moment because it is when the site becomes something a guest can arrive
    // at and try to RSVP.
    //
    // Passing ALL ids is load-bearing. my-guest-links mints only for the ids it
    // is ASKED for, and every other caller passes a narrow selection (a send
    // list, checked rows, one guest). A selection here would inherit exactly the
    // gap this sweep exists to close.
    //
    // Only on publish, never on unpublish, and non-fatal: a failed sweep must
    // not make the couple think their site did not publish.
    if (next.websiteEnabled) {
      try {
        const all = await base44.entities.Guest.list();
        const ids = (all || []).map(g => g?.id).filter(Boolean);
        if (ids.length > 0) await fetchGuestLinks(ids);
      } catch (err) {
        console.error('[publish] guest token sweep failed:', err?.message);
      }
    }
  };


  // The gate hook persists through /api/my-wedding-details itself (the
  // credential is hashed server-side); this only keeps the parent in step.
  const passwordGate = useWebsitePasswordGate(details, (patch) => {
    onUpdate({
      ...(('websitePasswordEnabled' in patch) ? { websitePasswordEnabled: patch.websitePasswordEnabled } : {}),
      ...(('websitePassword' in patch) ? { websitePasswordIsSet: !!patch.websitePassword?.trim() } : {}),
    });
  });

  const [couple1, couple2] = coupleNameParts(details, 'John', 'Sarah');

  const [emailSubject, setEmailSubject] = useState(`${couple1} & ${couple2}'s Wedding — Save the Date`);
  const [emailMessage, setEmailMessage] = useState(
    `We're so excited to share our guest suite with you!\n\nVisit: https://${siteUrl || `${siteHost}/w/`}\n\nWe can't wait to celebrate with you.\n\nWith love,\n${couple1} & ${couple2}`
  );

  // ICONS, NOT EMOJI. These were a globe, a chain link, an envelope with a
  // variation selector and a black square — four glyphs from four different
  // platform emoji fonts, at whatever size and colour the OS decided, sitting
  // inside type we control to the pixel. lucide draws them in currentColor at
  // a size we choose, which is the whole reason the rest of the product uses
  // it.
  //
  // TWO TABS NOW, not four. 12a removed Share (copy, WhatsApp, SMS, Facebook)
  // and QR code, so what is left is the site's own settings and the one
  // channel the ruling keeps. "QR Code" had also been the only Title Case tab
  // of the four, which is why that note was here.
  const TABS = [
    { id: 'website', label: 'Website', Icon: Globe },
    { id: 'email', label: 'Email', Icon: Mail },
  ];
  // A CALLER CAN STILL ASK FOR A TAB THAT NO LONGER EXISTS. details.initialTab
  // arrives from StudioWebsite, and a stale 'share' or 'qr' would draw the tab
  // strip over an empty body. Fall back to the first tab rather than to blank.
  const activeTab = TABS.some(t => t.id === tab) ? tab : TABS[0].id;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="Share your wedding" className="w-[620px] max-w-[620px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>Share your wedding</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'rgba(10,10,10,0.45)', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EEE', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '12px 8px', border: 'none', background: 'none',
                fontSize: 12, fontWeight: 600,
                color: activeTab === t.id ? '#0A0A0A' : 'rgba(10,10,10,0.6)',
                borderBottom: activeTab === t.id ? '2px solid #E03553' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <t.Icon size={13} strokeWidth={1.8} aria-hidden="true" />
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {activeTab === 'website' && (
            <div>
              {/* Status */}
              <div style={{ padding: 16, background: '#F8F8F8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: details?.websiteEnabled ? '#22C55E' : '#AAAAAA', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                    {!hasRealSlug ? 'Add your names in Event details to get your address' : details?.websiteEnabled ? 'Your website is live' : 'Your website is not published yet'}
                  </p>
                  {/* THE ADDRESS WAS PRINTED HERE. 12a removes every URL
                      display from this modal, so the status says only what
                      the status is. */}
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>
                    {details?.websiteEnabled ? 'Guests receive it by email.' : 'Nobody can reach it yet.'}
                  </p>
                </div>
                <button
                  onClick={togglePublish}
                  disabled={!hasRealSlug}
                  style={{
                    padding: '8px 20px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                    cursor: hasRealSlug ? 'pointer' : 'not-allowed',
                    opacity: hasRealSlug ? 1 : 0.4,
                    // Solid #E03553, not the pink/purple ramp. Same button,
                    // same togglePublish handler, same disabled rule — only
                    // the fill changes (owner ruling 2026-09-08).
                    background: details?.websiteEnabled ? 'transparent' : '#E03553',
                    color: details?.websiteEnabled ? '#E03553' : '#FFF',
                    border: details?.websiteEnabled ? '1px solid #E03553' : 'none',
                  }}
                >
                  {details?.websiteEnabled ? 'Unpublish' : 'Publish Now'}
                </button>
              </div>

              {refusal && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 20, background: 'rgba(224,53,83,0.08)', border: '1px solid rgba(224,53,83,0.3)', fontSize: 13, lineHeight: 1.5 }}>
                  <span>
                    {refusal}{' '}
                    <a href="/EventDetails" style={{ color: '#E03553', fontWeight: 600 }}>Event details</a>
                  </span>
                </div>
              )}

              {/* "YOUR URL" WAS HERE, printing the address and the slug. Both
                  are gone under 12a. The address is changed from the guest
                  suite's share tab, which is where the ruling put the one
                  control that touches it. */}

              {/* Password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Password Protection</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>Require guests to enter a password</p>
                </div>
                <ToggleSwitch value={passwordGate.wantsProtection} onChange={passwordGate.toggle} label="Password protection" />
              </div>
              {passwordGate.wantsProtection && (
                <>
                  <input
                    type="password"
                    value={passwordGate.password}
                    onChange={e => passwordGate.setPassword(e.target.value)}
                    onBlur={passwordGate.commitPassword}
                    placeholder={passwordGate.hasStoredPassword ? 'Set a new password…' : 'Set password for guests...'}
                    style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                  />
                  {passwordGate.hasStoredPassword ? (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>
                      A password is set. It can&rsquo;t be shown again — type a new one to replace it, or{' '}
                      <button onClick={passwordGate.clearPassword} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#E03553', cursor: 'pointer', textDecoration: 'underline' }}>remove it</button>.
                    </p>
                  ) : passwordGate.incomplete && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>Enter a password to turn protection on. Until you do, your site stays public.</p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              {/* THE EMPTY STATE USED TO SAY "set your website's URL on the
                  Website tab first", and after 12a the Website tab shows no
                  URL to set. The address comes from the couple's names, so
                  that is what it points at now. */}
              {!hasRealSlug ? (
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', marginBottom: 0 }}>Add your names in <a href="/EventDetails" style={{ color: '#E03553', fontWeight: 600 }}>Event details</a> first. The email needs an address to send.</p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>Send your guest suite link directly to guests by email.</p>

                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>SUBJECT</p>
                  <input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    style={{ width: '100%', border: 'none', borderBottom: '1px solid #DDD', padding: '10px 0', fontSize: 13, outline: 'none', marginBottom: 16, fontFamily: 'inherit', background: 'transparent' }}
                  />

                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>MESSAGE</p>
                  <textarea
                    rows={6}
                    value={emailMessage}
                    onChange={e => setEmailMessage(e.target.value)}
                    style={{ width: '100%', border: '1px solid #EEE', padding: '12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 16, boxSizing: 'border-box' }}
                  />

                  <a
                    href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`}
                    style={{ display: 'block', textAlign: 'center', width: '100%', padding: '14px', background: '#E03553', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', boxSizing: 'border-box' }}
                  >
                    Open in Email App
                  </a>
                </>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}