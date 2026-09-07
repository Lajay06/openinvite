/**
 * src/lib/emailTemplateStore.js
 *
 * THE COUPLE'S OWN WORDS AND LOOK FOR THE FIVE EMAILS — and the one honest
 * thing this file does about the fact that they cannot be stored yet.
 *
 * ── THE FIELD DOES NOT EXIST ────────────────────────────────────────────────
 *
 * `WeddingDetails.emailTemplates` is in neither the repo's entity mirror nor
 * the live Base44 schema. That was established by round-trip probe, not by
 * reading: Base44 accepts an unknown field with HTTP 200 and DISCARDS it
 * (platform gotcha: "unknown fields are silently dropped"). So a save appears
 * to work, the toast says "Saved", and the words are gone on the next load.
 *
 * That silent-loss shape is the whole reason this file exists. `saveTemplates`
 * writes, READS BACK, and compares. If the field did not survive, it reports
 * `{ ok: false, reason: 'not-switched-on' }` — the caller shows that and keeps
 * the draft in the editor, so the couple's writing is still on screen and they
 * are told plainly that this is not switched on yet. Nothing is ever reported
 * as saved that was not.
 *
 * When the owner adds the field, nothing here changes: the round-trip starts
 * succeeding and the same code path reports `{ ok: true }`.
 *
 * ── WHAT IS A DEFAULT AND WHAT IS LOCKED ────────────────────────────────────
 *
 * Owner ruling 2026-09-07: "clearly advise the default wording vs what they
 * can change." Three states, and the editor shows which is which rather than
 * leaving a couple to discover it by typing:
 *
 *   LOCKED    the date line, the doorway button's label, the unsubscribe
 *             footer. These are the email's anatomy, not its voice. They are
 *             rendered as read-only rows so a couple can SEE them — an
 *             invisible locked field reads as a missing feature.
 *   DEFAULT   subject, greeting, message, sign-off, pre-filled with the wording
 *             that sends today. Untouched, they still send; the panel says so.
 *   THEIRS    the same four, once edited. Reset puts the default back.
 */
import { getEmailTypeConfig, getTypeComposeDefaults } from './emailTemplate.js';
import { PALETTE_VARIANT_IDS, BUTTON_STYLE_IDS, normalizeVariant, normalizeButtonStyle } from './emailPalette.js';

/**
 * THE FIVE, AS THE OWNER NAMED THEM — and the one entry that stands for two
 * emails.
 *
 * Owner, 2026-09-07: "five templates listed (Save the date · Invitation ·
 * Update · Reminder · Thank you)". Four of those are one email each. "Thank
 * you" is two: a guest who accepted and a guest who declined receive different
 * letters, and folding them into one would thank someone for coming who has
 * just said they cannot. So the LIST is the five the owner asked for, and the
 * Thank you entry carries a reply switch inside its own Content tab — both
 * emails keep their own words, and neither is hidden.
 */
export const EDITOR_TEMPLATES = [
  { id: 'save_the_date', label: 'Save the date', types: ['save_the_date'] },
  { id: 'invite', label: 'Invitation', types: ['invite'] },
  { id: 'update', label: 'Update', types: ['update'] },
  { id: 'reminder', label: 'Reminder', types: ['reminder'] },
  {
    id: 'thank_you',
    label: 'Thank you',
    types: ['thank_you_attending', 'thank_you_declined'],
    typeLabels: { thank_you_attending: 'Coming', thank_you_declined: "Can't make it" },
  },
];

/** Every stored key — the renderer's own type ids, so nothing needs remapping later. */
export const TEMPLATE_TYPES = EDITOR_TEMPLATES.flatMap((t) => t.types);

/** The editor entry a renderer type belongs to. */
export function editorEntryFor(type) {
  return EDITOR_TEMPLATES.find((t) => t.types.includes(type)) || EDITOR_TEMPLATES[1];
}

/** The four things a couple can write. Everything else is the universe's. */
export const TEMPLATE_FIELDS = ['subject', 'greeting', 'body', 'signOff'];

export const FIELD_LABELS = {
  subject: 'Subject line',
  greeting: 'Greeting',
  body: 'Message',
  signOff: 'Sign-off',
};

/**
 * THE DEFAULT WORDING, SPLIT THE WAY A COUPLE THINKS ABOUT A LETTER.
 *
 * The send path already owns per-type copy (getTypeComposeDefaults), written
 * in the [Bracket] merge-tag convention that api/send-invites resolves per
 * guest. That is one paragraph. A couple does not edit one paragraph; they
 * edit "how it opens", "what it says", "how we sign it" — so the same copy is
 * carried here in three parts, and the subject comes straight from the send
 * path so the two can never disagree about it.
 */
const DEFAULT_PARTS = {
  save_the_date: {
    greeting: 'Hi [Guest name],',
    body: "We're getting married on [Wedding date], and we would love for you to be there. The full invitation will follow — for now, please keep the day free.",
    signOff: '[Couple names]',
  },
  invite: {
    greeting: 'Hi [Guest name],',
    body: "We'd love for you to celebrate with us on [Wedding date]. Everything you need is on our website, and you can reply to us there.",
    signOff: "We can't wait to see you,\n[Couple names]",
  },
  update: {
    greeting: 'Hi [Guest name],',
    body: 'We wanted to share an update about our celebration on [Wedding date]. The details below have changed — please have a look and let us know if anything is a problem.',
    signOff: '[Couple names]',
  },
  reminder: {
    greeting: 'Hi [Guest name],',
    body: "Just a gentle nudge — we're still hoping to hear from you. It takes a minute to reply, and it helps us more than you'd think.",
    signOff: '[Couple names]',
  },
  thank_you_attending: {
    greeting: 'Dear [Guest name],',
    body: "Thank you for saying yes. Having you there means a great deal to us, and we can't wait to celebrate together.",
    signOff: 'With love,\n[Couple names]',
  },
  thank_you_declined: {
    greeting: 'Dear [Guest name],',
    body: "Thank you for letting us know. We understand completely, and while we'll miss you on the day, we hope to see you soon after.",
    signOff: 'With love,\n[Couple names]',
  },
};

/** The default for one field of one type — what sends when the couple writes nothing. */
export function defaultFor(type, field) {
  if (field === 'subject') return getTypeComposeDefaults(type).subject || '';
  return DEFAULT_PARTS[type]?.[field] || '';
}

/** All four defaults for a type. */
export function defaultsFor(type) {
  const out = {};
  for (const f of TEMPLATE_FIELDS) out[f] = defaultFor(type, f);
  return out;
}

/**
 * THE PARTS A COUPLE CANNOT CHANGE, named and shown.
 *
 * Each row is a real literal read off the renderer's own config — not a
 * paraphrase of one. If the doorway's label changes in emailTemplate.js, this
 * row changes with it, because it IS that value.
 */
export function lockedRowsFor(type) {
  const cfg = getEmailTypeConfig(type);
  const rows = [
    { key: 'kicker', label: 'Kicker', value: cfg.kicker },
  ];
  if (cfg.showDate) {
    rows.push({ key: 'date', label: 'Date line', value: 'Your wedding date, in the universe’s display face' });
  }
  if (cfg.showEvents) {
    rows.push({ key: 'events', label: 'Event details', value: 'The events this guest is invited to' });
  }
  if (cfg.showRsvp && cfg.ctaLabel) {
    rows.push({ key: 'cta', label: 'Button', value: cfg.ctaLabel });
  }
  rows.push({
    key: 'footer',
    label: 'Footer',
    value: `You received this ${cfg.footerNoun} because someone added you to their guest list on openinvite.com.au.`,
  });
  return rows;
}

/**
 * THE THREE DESIGN CHOICES, PER EMAIL.
 *
 * Owner ruling 2026-09-07, rejecting the four color buttons the first attempt
 * shipped: a banner photograph, a palette variant made of the universe's own
 * colors, and a solid-or-outline button. No free color anywhere — see
 * emailPalette.js.
 *
 * `bannerPublicId` is stored alongside `bannerUrl` because identity, not URL
 * string, is what says two photographs are the same one: the same picture
 * appears as `w_1400` in Our Story and `w_2048` as the hero.
 */
export const DESIGN_FIELDS = ['bannerUrl', 'bannerPublicId', 'paletteVariant', 'buttonStyle'];

const CLOUDINARY_IMAGE_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/[^/]*\/(.+)$/;

/** The Cloudinary public id inside a delivery URL, or '' for anything that is not one. */
export function publicIdOf(url) {
  const m = CLOUDINARY_IMAGE_RE.exec(String(url || ''));
  return m ? m[1] : '';
}

/** An empty template — every field present, so a draft is never partly undefined. */
export function emptyTemplate() {
  return {
    subject: '', greeting: '', body: '', signOff: '',
    bannerUrl: '', bannerPublicId: '', paletteVariant: '', buttonStyle: '',
  };
}

/** The stored map, normalized: every type, every field, always strings. */
export function templatesOf(weddingDetails) {
  const stored = weddingDetails?.emailTemplates;
  const out = {};
  for (const type of TEMPLATE_TYPES) {
    const t = (stored && typeof stored === 'object' && stored[type]) || {};
    const row = emptyTemplate();
    for (const f of [...TEMPLATE_FIELDS, ...DESIGN_FIELDS]) {
      if (typeof t[f] === 'string') row[f] = t[f];
    }
    out[type] = row;
  }
  return out;
}

/**
 * The design for one type, resolved: the couple's pick where they made one,
 * the wedding's own cover photo as the banner where they did not.
 *
 * A banner is NOT invented from nothing — if the wedding has no usable cover
 * photo the email simply has none, which the renderer has always handled.
 */
export function designOf(template, { coverPhoto } = {}) {
  const t = template || {};
  return {
    bannerUrl: t.bannerUrl || coverPhoto || '',
    bannerPublicId: t.bannerPublicId || '',
    paletteVariant: normalizeVariant(t.paletteVariant),
    buttonStyle: normalizeButtonStyle(t.buttonStyle),
    // True when the couple picked this banner rather than inheriting the site's.
    bannerIsOwn: !!t.bannerUrl,
  };
}

/**
 * The three written parts as the ONE string the renderer takes.
 *
 * renderInvitationEmail has a single `personalMessage` slot, and it is not
 * this editor's job to change the email's anatomy — the date line and the
 * doorway button are the renderer's and stay exactly as they are. Greeting,
 * body and sign-off are how a couple THINKS about a letter; joining them here
 * keeps that without inventing a second renderer.
 *
 * Falls back to each part's DEFAULT rather than to nothing, because the panel
 * shows those defaults pre-filled: what the couple reads in the editor is what
 * the guest receives, whether or not they touched it.
 */
export function personalMessageFrom(template, type) {
  const parts = ['greeting', 'body', 'signOff']
    .map((f) => {
      const written = typeof template?.[f] === 'string' ? template[f].trim() : '';
      return written || (type ? defaultFor(type, f) : '');
    })
    .filter(Boolean);
  return parts.length ? parts.join('\n\n') : null;
}

/** The subject that would send — the couple's, or the default. */
export function subjectFrom(template, type) {
  const written = typeof template?.subject === 'string' ? template.subject.trim() : '';
  return written || defaultFor(type, 'subject');
}

/** True when this field still holds exactly the default (i.e. nothing was written). */
export function isDefault(template, type, field) {
  const written = typeof template?.[field] === 'string' ? template[field] : '';
  return written.trim() === '' || written === defaultFor(type, field);
}

/** True when the couple has written anything at all for this type. */
export function isWritten(template, type) {
  return TEMPLATE_FIELDS.some((f) => !isDefault(template, type, f));
}

/**
 * Save, then prove it saved.
 *
 * @param {object} deps
 * @param {Function} deps.update    (id, patch) => Promise<any>
 * @param {Function} deps.reload    () => Promise<object>  — re-reads the record
 * @param {string}   deps.id
 * @param {object}   deps.templates
 * @returns {Promise<{ok: boolean, reason?: string, error?: string}>}
 */
export async function saveTemplates({ update, reload, id, templates }) {
  if (!id) return { ok: false, reason: 'no-record' };
  try {
    await update(id, { emailTemplates: templates });
  } catch (err) {
    return { ok: false, reason: 'write-failed', error: err?.message || String(err) };
  }
  // THE READ-BACK IS THE POINT. A 200 from Base44 means the request was
  // accepted, not that the field was kept.
  let fresh;
  try {
    fresh = await reload();
  } catch (err) {
    return { ok: false, reason: 'read-back-failed', error: err?.message || String(err) };
  }
  const back = templatesOf(fresh);
  // TEXT AND DESIGN BOTH ROUND-TRIP, or nothing is reported as saved. They
  // ride the same field, so they are subject to the same silent discard.
  const same = TEMPLATE_TYPES.every((type) =>
    [...TEMPLATE_FIELDS, ...DESIGN_FIELDS].every(
      (f) => (back[type][f] || '') === ((templates?.[type]?.[f]) || '')));
  return same ? { ok: true } : { ok: false, reason: 'not-switched-on' };
}

/** What the couple is told when a save did not survive the round-trip. */
export const SAVE_FAILURE_MESSAGE = {
  'no-record': 'There is no wedding record to save to yet.',
  'write-failed': 'That did not save. Your words are still here — try again.',
  'read-back-failed': 'Saved, but we could not read it back to confirm. Your words are still here.',
  'not-switched-on': 'Email wording is not switched on for your account yet. Nothing was lost — what you wrote is still here.',
};

export { PALETTE_VARIANT_IDS, BUTTON_STYLE_IDS };
