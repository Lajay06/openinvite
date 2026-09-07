import React, { useMemo } from 'react';
import { renderInvitationEmail, emailBannerUrl } from '@/lib/emailTemplate';
import { personalMessageFrom, subjectFrom, designOf } from '@/lib/emailTemplateStore';
import { normalizeUniverseKey } from '@/lib/websiteThemes';

/**
 * THE CANVAS, SHOWING AN EMAIL INSTEAD OF A PAGE.
 *
 * Owner ruling 2026-09-07, rejecting a standalone /Emails page: "this editor
 * needs to be in the design studio like I asked. Just have it in the right
 * panel." So the five emails are selected from the builder's own Design tab
 * and previewed on the builder's own canvas — the same place a page is
 * previewed, at the width an email actually arrives in.
 *
 * ── IT IS THE SENDING RENDERER, NOT A LOOKALIKE ─────────────────────────────
 *
 * renderInvitationEmail() is what api/send-invites.js hands to Resend. This
 * calls that function and puts its output on screen. There is no second,
 * preview-only render path, which is the only way "what you see is what they
 * get" can be true rather than aspirational.
 *
 * ── WHY AN IFRAME ───────────────────────────────────────────────────────────
 *
 * The email's HTML is a full document with its own <body> background, and it
 * is styled entirely by inline attributes. Dropped into the page it would be
 * caught by index.css's `*, *::before, *::after { font-family: … !important }`
 * — the same rule that made twenty universes render in one face — and every
 * serif in the email would silently become Plus Jakarta Sans. An iframe with
 * `srcDoc` is its own document, so the email renders in the fonts it will
 * actually be read in, and nothing of ours leaks in.
 *
 * SANDBOXED with no allow-scripts and no allow-same-origin: the document is
 * ours, but it is also the surface a couple's own words land on, and a preview
 * has no reason to be able to run anything or reach our origin.
 */
export default function WBEmailPreview({ details, template, type, width = 600 }) {
  const universeId = normalizeUniverseKey(details?.activeUniverse) || 'london';
  const design = designOf(template, { coverPhoto: details?.coverPhoto });

  const { html, subject } = useMemo(() => {
    const coupleNames = details?.coupleNames
      || [details?.couple1Name, details?.couple2Name].filter(Boolean).join(' & ')
      || 'The Wedding';
    const rendered = renderInvitationEmail({
      universeId,
      type,
      // A PREVIEW NEEDS A GUEST, and the couple's own guest list is not it —
      // the panel would show whoever happens to sit first in the table and
      // read as though that email had been sent. A named stand-in says
      // plainly that it is a specimen.
      guestName: 'Sam Whitfield',
      coupleNames,
      events: eventsFrom(details),
      personalMessage: personalMessageFrom(template, type),
      rsvpUrl: siteUrlFrom(details),
      siteUrl: siteUrlFrom(details),
      weddingDate: details?.weddingDate,
      bannerImageUrl: emailBannerUrl(design.bannerUrl),
      design,
    });
    return { html: rendered.html, subject: subjectFrom(template, type) };
  }, [details, template, type, universeId, design.bannerUrl, design.paletteVariant, design.buttonStyle]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#E8E8E8' }}>
      {/* The subject line, where a mail client puts it — above the message,
          in the client's chrome rather than the email's own design. Without
          it the couple edits a subject they never see. */}
      <div style={{ flexShrink: 0, padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Subject
        </p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", wordBreak: 'break-word' }}>
          {subject}
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <iframe
          title="Email preview"
          srcDoc={html}
          sandbox=""
          style={{ width: '100%', maxWidth: width, minHeight: '100%', border: 'none', display: 'block', background: '#FFFFFF' }}
        />
      </div>
    </div>
  );
}

/**
 * The events the reminder and update blocks show. Built from the wedding's own
 * ceremony and reception rather than from the guest list, because a preview
 * has no guest — and an empty events array is what those two types would look
 * like on a wedding with nothing filled in, which is also worth seeing.
 */
function eventsFrom(details) {
  const out = [];
  const date = details?.weddingDate;
  const ceremony = details?.mainCeremony;
  const reception = details?.reception;
  if (ceremony?.venueName) out.push({ name: 'Ceremony', date, startTime: ceremony.startTime, venue: ceremony.venueName });
  if (reception?.venueName) out.push({ name: 'Reception', date, startTime: reception.startTime, venue: reception.venueName });
  return out;
}

function siteUrlFrom(details) {
  return details?.slug ? `https://openinvite.com.au/w/${details.slug}` : 'https://openinvite.com.au';
}
