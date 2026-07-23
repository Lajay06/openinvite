/**
 * scripts/lib/schemaDropScan.mjs
 *
 * Shared scan logic behind both `npm run audit:schema` (scripts/audit-schema.mjs,
 * human-readable report) and the schema-drift guard test
 * (tests/persistence/schema-drift-guard.mjs, pass/fail assertions in the
 * persistence suite). Extracted so the two never drift from each other —
 * one scanner, two consumers.
 *
 * IMPORTANT LIMITATION, confirmed empirically 2026-07: Base44's schema
 * metadata is NOT reachable from a plain script authenticated with a bearer
 * token or the admin key — `/apps/:id/entities/:entity/schema`,
 * `/apps/:id/schema`, and `/apps/:id/entities/:entity/meta` all 404 against
 * the live REST API, and the `@base44/sdk` client exposes no runtime
 * schema-fetch method (only build-time codegen via the CLI's "Dynamic
 * Types" feature). The schema data below is therefore an EMBEDDED SNAPSHOT,
 * refreshed via the `mcp__claude_ai_Base44__list_entity_schemas` tool
 * whenever a real schema change is made — not a live fetch. Re-run
 * `npm run audit:schema` and update SCHEMAS below after every
 * `update_entity_schema` call, or this scanner will silently under- or
 * over-report drift against its own stale memory.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC   = resolve(__dir, '..', '..', 'src');

// ── Embedded schemas (from mcp__claude_ai_Base44__list_entity_schemas, refreshed 2026-07) ──

export const SCHEMAS = {
  WeddingDetails: {
    // Top-level registered fields (scalars + arrays)
    couple1Name:1, couple2Name:1, coupleNames:1, weddingDate:1, guestCount:1, guestType:1,
    weddingStyle:1, importantFeatures:1, honeymoonDestination:1, honeymoonDeparture:1,
    honeymoonNotes:1, ceremonyMusic:1, ceremonyReadings:1, floristNotes:1, cateringNotes:1,
    photographyNotes:1, videographyNotes:1, hairMakeupNotes:1, transportNotes:1,
    accommodationNotes:1, preWeddingEvents:1, postWeddingEvents:1, qna:1, slug:1,
    websiteEnabled:1, websitePassword:1, websiteTheme:1, heroVideoUrl:1, heroVideoFile:1,
    coverPhoto:1, websiteAccentColor:1, welcomeMessage:1, coupleStory:1, activeTheme:1,
    activeTypography:1, websiteMode:1, pageTransition:1, scrollAnimation:1, heroEffect:1,
    enabledPages:1, activeUniverse:1, menuItems:1, welcomeSignageText:1, thankYouMessage:1,
    homeContent:1, ourStoryContent:1, celebrationContent:1, rsvpContent:1, travelContent:1,
    registryContent:1, musicContent:1, photosContent:1, pageSections:1, customPages:1,
    polls:1, dayVendorContacts:1,
    // Registered 2026-06-03 (previously silently dropped — planning page fields)
    foodAndBeverage:1, photography:1, attire:1, flowers:1, decorations:1, beauty:1, entertainmentDetails:1,
    // Registered 2026-07 (AUDIT_2026-07.md schema-drift re-verification —
    // reverted at some point after an earlier fix, restored again; see
    // BASE44_PLATFORM_NOTES.md's "Schema drift" section for the recurring
    // pattern this is an instance of)
    assetContent:1, onboardingDraft:1, onboardingStepIndex:1,
    // Registered top-level OBJECT keys (also have sub-field definitions in _nested)
    mainCeremony:1, reception:1, theme:1, celebrant:1, license:1, rehearsal:1,
    welcomeDinner:1, dayAfterBrunch:1, contactPerson:1, experienceGuide:1,
    accommodation:1, music:1, transport:1, guestSuiteAccommodation:1, guestSuiteTransport:1,
    weddingPolicies:1, emergencyContacts:1,
    // Nested objects with registered sub-fields
    _nested: {
      mainCeremony: ['venueName','address','placeId','mapsUrl','photoUrl','phone','website',
        'rating','startTime','endTime','dressCode','parkingInfo','accessibilityNotes','notes'],
      reception: ['venueName','address','placeId','mapsUrl','photoUrl','phone','website',
        'rating','startTime','endTime','dressCode','parkingInfo','accessibilityNotes','notes'],
      theme: ['aesthetic','faith','faithSecondary','culture','cultureOther','atmosphere',
        'season','setting','vibes','is_religious','religious_details','is_cultural','cultural_details'],
      celebrant: ['name','title','phone','email','type','notes'],
      license: ['issuingOffice','applicationDate','issueDate','expiryDate','licenseNumber',
        'witnessesRequired','notes'],
      rehearsal: ['date','time','venue','address','attendees','notes'],
      welcomeDinner: ['date','venue','notes'],
      dayAfterBrunch: ['date','venue','notes'],
      contactPerson: ['name','phone'],
      experienceGuide: ['published','destination','heroPhotoUrl','heroVideoUrl','editorialIntro',
        'vibes','coupleNotes','couplePicks','customGems','pinnedViator','categories','itinerary'],
      accommodation: ['partnerRecommendationsEnabled','coupleNote','checkInDate','checkOutDate',
        'suggestedAreas','manualProperties','hiddenProperties','pinnedProperties'],
      music: ['spotifyConnected','spotifyUserId','guestRequestsEnabled','requestsRequireApproval',
        'requestsClosedDate','limitOnePerGuest','onlyForConfirmedGuests','requestMessage','playlists'],
      transport: ['coupleNote','recommendedMode','enabledModes','parking','publicTransport',
        'walking','rideshare','carHire','shuttles','freeTextNotes','aiAnalysis'],
      guestSuiteAccommodation: ['places'],
      guestSuiteTransport: ['places','notes'],
      weddingPolicies: ['photography','socialMedia','children','dietary','gifts','dressCode',
        'lateArrival','other'],
      emergencyContacts: ['primary','backup','venue','otherNotes'],
    },
  },

  Guest: {
    name:1, email:1, phone:1, profile_picture_url:1, category:1, tags:1, table_assignment:1,
    dietary_restrictions:1, rsvp_status:1, rsvp_date:1, meal_choice:1, plus_one:1,
    plus_one_name:1, plus_one_email:1, plus_one_rsvp:1, plus_one_meal_choice:1,
    plus_one_dietary_restrictions:1, special_requests:1, invitation_sent:1, rsvp_link_id:1,
    seating_preferences:1, seating_avoid:1, notes:1, interests:1,
    // Registered 2026-06-03 (previously silently dropped — Guest RSVP fields)
    song_request:1, rsvp_note:1, poll_votes:1,
    // Registered 2026-06-03 (previously silently dropped — invite-tracking fields)
    invite_sent_at:1, invite_channel:1, reminder_sent_at:1,
    // Registered via feat/plus-one-identity (mcp update_entity_schema)
    plus_one_rsvp_link_id:1,
    // Present in the live schema (confirmed via list_entity_schemas 2026-07)
    // but missing from this embedded snapshot until now — was producing a
    // false-positive DROPPED finding for Guests.jsx:269.
    event_responses:1, is_test:1,
    _nested: {},
  },

  User: {
    // IMPORTANT, confirmed empirically 2026-07 (schema-drift-guard triage):
    // Base44's built-in User entity persists ARBITRARY custom fields
    // regardless of schema declaration — a totally undeclared probe field
    // written via PUT /entities/User/me round-tripped correctly on a fresh
    // GET. This is fundamentally different from every custom entity above
    // (WeddingDetails, Guest, Note, etc.), which silently drop anything not
    // declared in their schema. Practically: a "DROPPED" finding for User
    // from this scanner is likely a false positive by the nature of this
    // entity, not a real bug — treat it with much lower confidence than a
    // DROPPED finding on a custom entity. tempUnit/deletionRequestedAt were
    // both wrongly flagged as dropped for exactly this reason before this
    // list was corrected; onboardingCompleted (camelCase, used everywhere
    // in the app) and the plan/Stripe fields below are further confirmed-
    // or-inferred examples of the same thing.
    language:1, currency:1, onboarding_completed:1, onboardingCompleted:1, onboardingPath:1,
    tempUnit:1, deletionRequestedAt:1,
    // Auth-level system fields: always stored by Base44 auth, not governed by entity schema.
    // These appear in the login response and GET /entities/User/me regardless of schema.
    // Updating them via updateMe() DOES persist (tested) — treat as registered.
    full_name:1, email:1, role:1, is_verified:1,
    // plan fields: written by PaymentSuccess.jsx. planActivatedAt confirmed
    // persisting via a live round-trip; planName/planTier/stripeCustomerId
    // not force-tested (didn't want to write test values into billing-
    // adjacent state on a real account) but are very likely fine given the
    // arbitrary-field behavior confirmed above — kept in _uncertain out of
    // caution, not because they're suspected dropped.
    planActivatedAt:1,
    _uncertain: ['planName', 'planTier', 'stripeCustomerId'],
    _nested: {},
  },

  Budget: {
    category:1, item_name:1, budgeted_amount:1, actual_amount:1, vendor:1, paid:1,
    payment_date:1, notes:1, _nested: {},
  },

  Schedule: {
    event_name:1, event_date:1, start_time:1, end_time:1, location:1, description:1,
    responsible_person:1, category:1, notes:1, _nested: {},
  },

  Vendor: {
    name:1, category:1, contact_person:1, phone:1, email:1, website:1, address:1,
    latitude:1, longitude:1, rating:1, price_range:1, status:1, quoted_price:1,
    contract_date:1, payment_schedule:1, notes:1, google_place_id:1, google_rating:1,
    google_reviews_count:1, image_url:1, _nested: {},
  },

  Note: {
    title:1, description:1, category:1, priority:1, completed:1, due_date:1,
    reminder_date:1, is_suggested:1, wedding_timeline:1,
    // Registered 2026-07 (real drop, not a snapshot omission — TodoList.jsx's
    // kanban board writes AND reads both; see schema-drift-guard triage)
    status:1, view_type:1,
    _nested: {},
  },

  Task: {
    title:1, description:1, category:1, priority:1, completed:1, due_date:1,
    reminder_date:1, is_suggested:1, wedding_timeline:1, _nested: {},
  },

  Table: {
    name:1, capacity:1, shape:1, x:1, y:1, rotation:1, assigned_guests:1, _nested: {},
  },

  VenueAsset: {
    name:1, type:1, x:1, y:1, width:1, height:1, rotation:1, _nested: {},
  },

  VowSpeech: {
    title:1, type:1, author:1, content:1, notes:1, _nested: {},
  },

  RegistryItem: {
    store_name:1, url:1, description:1, image_url:1, _nested: {},
  },

  RegistryProduct: {
    name:1, description:1, price:1, image_url:1, product_url:1, category:1,
    registry_platform:1, external_id:1, quantity_requested:1, quantity_purchased:1,
    purchased_by:1, priority:1, notes:1, _nested: {},
  },

  CustomGift: {
    title:1, description:1, category:1, requested_amount:1, image_url:1, _nested: {},
  },

  ReceivedGift: {
    item_name:1, giver_guest_id:1, giver_name:1, giver_email:1, delivery_status:1,
    received_date:1, thank_you_sent:1, thank_you_date:1, thank_you_note:1,
    estimated_value:1, category:1, notes:1, _nested: {},
  },

  VendorLog: {
    vendor_id:1, type:1, subject:1, body:1, document_url:1, document_name:1,
    document_type:1, logged_at:1, _nested: {},
  },

  VendorTask: {
    vendor_id:1, title:1, due_date:1, completed:1, priority:1, notes:1, _nested: {},
  },

  Collaborator: {
    name:1, email:1, permissions:1, _nested: {},
  },

  Photographer: {
    name:1, type:1, contact_person:1, phone:1, email:1, website:1, instagram:1,
    address:1, latitude:1, longitude:1, rating:1, reviews_count:1, price_range:1,
    starting_price:1, status:1, quoted_price:1, package_selected:1, hours_booked:1,
    booking_date:1, start_time:1, end_time:1, meeting_date:1, contract_signed:1,
    deposit_paid:1, deposit_amount:1, style:1, portfolio_url:1, sample_work:1,
    services_offered:1, equipment:1, backup_equipment:1, second_shooter:1,
    delivery_timeline:1, image_count:1, video_length:1, editing_style:1, travel_fee:1,
    cancellation_policy:1, notes:1, special_requests:1, google_place_id:1, image_url:1,
    _nested: {},
  },

  Music: {
    song_title:1, artist:1, spotify_track_id:1, album:1, duration:1, preview_url:1,
    image_url:1, category:1, added_by:1, guest_suggestion:1, approved:1, notes:1,
    // Present in the live schema (confirmed via list_entity_schemas 2026-07)
    // but missing from this embedded snapshot until now — was producing a
    // false-positive DROPPED finding for Music.jsx:162. Not a real drift
    // incident, unlike Note.status/view_type below.
    source:1, embed_url:1,
    _nested: {},
  },

  GuestMessage: {
    guest_name:1, guest_email:1, guest_id:1, guest_phone:1, message:1, reply:1,
    replied:1, read:1, channel:1, whatsapp_contacted:1, whatsapp_contact_date:1,
    _nested: {},
  },

  SongRequest: {
    weddingId:1, spotifyTrackId:1, title:1, artist:1, album:1, albumArt:1, duration:1,
    explicit:1, spotifyUrl:1, submittedBy:1, guestEmail:1, guestNote:1, status:1,
    playlist:1, aiTags:1, mustPlay:1, doNotPlay:1, _nested: {},
  },

  StoryMilestone: {
    title:1, date:1, story:1, image_url:1, order:1, _nested: {},
  },

  Photo: {
    title:1, image_url:1, category:1, description:1, photographer_credit:1,
    date_taken:1, order:1, visible_to_guests:1, _nested: {},
  },

  LiveStream: {
    title:1, stream_url:1, stream_type:1, embed_code:1, scheduled_start:1,
    is_live:1, chat_enabled:1, password:1, _nested: {},
  },

  StreamChat: {
    stream_id:1, guest_name:1, message:1, is_visible:1, _nested: {},
  },

  WebsiteTheme: {
    primary_color:1, secondary_color:1, background_color:1, text_color:1,
    accent_color:1, font_family:1, heading_font:1, hero_image_url:1, _nested: {},
  },

  CustomEventPage: {
    title:1, slug:1, event_type:1, date:1, venue_name:1, venue_address:1,
    description:1, dress_code:1, rsvp_required:1, visible_to_guests:1, order:1,
    _nested: {},
  },

  MoodboardItem: {
    title:1, image_url:1, source_url:1, category:1, tags:1, notes:1,
    board_name:1, position_x:1, position_y:1, pinterest_id:1, _nested: {},
  },

  Invitation: {
    couple_names:1, wedding_date:1, rsvp_deadline:1, custom_message:1,
    personalized_messages:1, design:1, enabled_sections:1, _nested: {},
  },

  ThemeDetails: {
    vibes:1, is_religious:1, religious_details:1, is_cultural:1, cultural_details:1,
    season:1, setting:1, _nested: {},
  },

  Notification: {
    recipient_user_id:1, type:1, title:1, body:1, link:1, read:1, is_test:1,
    _nested: {},
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRegistered(entity, fieldPath) {
  const schema = SCHEMAS[entity];
  if (!schema) return null; // unknown entity
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    if (parts[0] === '_nested' || parts[0] === '_uncertain') return false; // internal
    if (schema._uncertain?.includes(parts[0])) return 'uncertain';
    return parts[0] in schema;
  }
  const [top, ...rest] = parts;
  if (!(top in schema) && !schema._nested?.[top]) return false;
  const nested = schema._nested?.[top];
  if (!nested) return 'open'; // top-level registered but sub-keys untracked (open object)
  return nested.includes(rest[0]);
}

function relPath(abs) {
  return abs.replace(resolve(__dir, '..', '..') + '/', '');
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else if (/\.(jsx|js|mjs)$/.test(entry) && !entry.includes('.test.'))
      out.push(full);
  }
  return out;
}

function extractKeys(text, prefix = '', maxDepth = 2, depth = 0) {
  if (depth >= maxDepth) return [];
  const keys = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === '"' || text[i] === "'") {
      const q = text[i++];
      while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; }
      i++;
      continue;
    }
    if (text[i] === '/' && text[i+1] === '/') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    if (text[i] === '/' && text[i+1] === '*') {
      i += 2;
      while (i < n - 1 && !(text[i] === '*' && text[i+1] === '/')) i++;
      i += 2;
      continue;
    }
    const keyMatch = text.slice(i).match(/^([a-zA-Z_$][\w$]*)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      i += keyMatch[0].length;
      while (i < n && /\s/.test(text[i])) i++;
      if (text[i] === '{') {
        i++;
        const subKeys = extractKeys(text.slice(i), fullKey, maxDepth, depth + 1);
        keys.push(...subKeys);
        let d = 1;
        while (i < n && d > 0) {
          if (text[i] === '{') d++;
          else if (text[i] === '}') d--;
          i++;
        }
      } else {
        let d = 0;
        while (i < n) {
          if (text[i] === '{' || text[i] === '(' || text[i] === '[') d++;
          else if (text[i] === '}' || text[i] === ')' || text[i] === ']') {
            if (d === 0) break;
            d--;
          } else if (text[i] === ',' && d === 0) break;
          else if (text[i] === '"' || text[i] === "'") {
            const q = text[i++];
            while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; }
          }
          i++;
        }
      }
      continue;
    }
    if (text.slice(i, i+3) === '...') {
      keys.push(prefix ? `${prefix}.__spread__` : '__spread__');
      i += 3;
      let d = 0;
      while (i < n) {
        if (text[i] === '{' || text[i] === '(' || text[i] === '[') d++;
        else if ((text[i] === '}' || text[i] === ')' || text[i] === ']') && d === 0) break;
        else if ((text[i] === '}' || text[i] === ')' || text[i] === ']')) d--;
        else if (text[i] === ',' && d === 0) break;
        i++;
      }
      continue;
    }
    if (text[i] === '}') break;
    i++;
  }
  return keys;
}

function extractArg(src, pos, argIndex) {
  let i = pos;
  const n = src.length;
  let arg = 0;
  let argStart = pos;
  let depth = 0;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = src[i++];
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++;
      continue;
    }
    if (c === '/' && src[i+1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i+1] === '*') { i+=2; while (i < n-1 && !(src[i]==='*'&&src[i+1]==='/')) i++; i+=2; continue; }
    if ((c === '{' || c === '(' || c === '[') ) depth++;
    else if ((c === '}' || c === ')' || c === ']') && depth > 0) depth--;
    else if ((c === ')') && depth === 0) {
      if (arg === argIndex) return { text: src.slice(argStart, i).trim(), end: i };
      return null;
    } else if (c === ',' && depth === 0) {
      if (arg === argIndex) return { text: src.slice(argStart, i).trim(), end: i };
      arg++;
      argStart = i + 1;
    }
    i++;
  }
  return null;
}

const KNOWN_WRITES = [
  { entity:'WeddingDetails', field:'attire',            file:'src/pages/Styling.jsx', line:107, note:'sectionKey="attire"' },
  { entity:'WeddingDetails', field:'flowers',           file:'src/pages/Styling.jsx', line:107, note:'sectionKey="flowers"' },
  { entity:'WeddingDetails', field:'decorations',       file:'src/pages/Styling.jsx', line:107, note:'sectionKey="decorations"' },
  { entity:'WeddingDetails', field:'beauty',            file:'src/pages/Beauty.jsx', line:126, note:'full = { ...latestRef.current, beauty: nextBeauty }' },
  { entity:'WeddingDetails', field:'entertainmentDetails', file:'src/pages/EntertainmentDetails.jsx', line:169, note:'full = { ...latestRef.current, entertainmentDetails: next }' },
  // src/pages/Catering.jsx (wrote WeddingDetails.foodAndBeverage) was
  // deleted in the round-6 vendor-consolidation pass — an orphaned,
  // unreachable duplicate of FoodBeverage.jsx's Catering tab, which
  // writes the (differently-named) foodBeverage field instead.
  { entity:'Guest', field:'song_request',   file:'src/components/rsvp/RSVPPage.jsx', line:160, note:'spread of form object' },
  { entity:'Guest', field:'rsvp_note',      file:'src/components/rsvp/RSVPPage.jsx', line:160, note:'spread of form object' },
  { entity:'Guest', field:'poll_votes',     file:'src/components/rsvp/RSVPPage.jsx', line:203, note:'{ poll_votes: mergedVotes }' },
  { entity:'__dynamic__', field:'__dynamic__', file:'src/components/layout/AvaModal.jsx', line:147, note:'action.data passed to create/update — fields determined by Ava LLM response' },
  { entity:'WeddingDetails', field:'__spread_details__', file:'src/pages/AvaStudioWebsite.jsx', line:282, note:'full details variable — includes registered fields (coverPhoto, welcomeMessage, coupleStory, qna, registryContent) + whatever updateField was called with' },
];

const ENTITY_PATTERNS = [
  /base44\.entities\.(\w+)\.(?:create|update)\s*\(/g,
  /\b(WeddingDetails|Guest|Budget|Schedule|Vendor|Note|Task|Table|VenueAsset|VowSpeech|RegistryItem|RegistryProduct|CustomGift|ReceivedGift|VendorLog|VendorTask|Collaborator|Photographer|Music|GuestMessage|SongRequest|StoryMilestone|Photo|LiveStream|StreamChat|WebsiteTheme|CustomEventPage|MoodboardItem|Invitation|ThemeDetails)\.(?:create|update)\s*\(/g,
  /base44\.auth\.updateMe\s*\(/g,
];

function dedupeByField(arr) {
  const m = new Map();
  for (const f of arr) {
    const k = `${f.entity}|${f.field}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return [...m.values()].map(group => ({
    ...group[0],
    allSites: group.map(g => `${g.file}:${g.line}`).join('  '),
  }));
}

/**
 * Runs the full static scan + classification. Returns raw (non-deduped)
 * REGISTERED/DROPPED/UNCERTAIN arrays plus deduped-by-field versions.
 */
export function runSchemaDropScan() {
  const findings = [];
  const files = walkFiles(SRC);

  for (const filePath of files) {
    let src;
    try { src = readFileSync(filePath, 'utf8'); } catch { continue; }
    const getLine = (pos) => src.slice(0, pos).split('\n').length;

    for (const pat of ENTITY_PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(src)) !== null) {
        const isUpdateMe = m[0].includes('updateMe');
        const entity = isUpdateMe ? 'User' : m[1];
        const callPos = m.index + m[0].length;
        const isUpdate = !isUpdateMe && m[0].includes('.update');
        const argIdx = isUpdate ? 1 : 0;

        const arg = extractArg(src, callPos, argIdx);
        if (!arg) continue;

        const text = arg.text.trim();
        if (!text.startsWith('{')) {
          findings.push({
            entity, field: '__var_ref__:' + text.slice(0, 40),
            file: relPath(filePath), line: getLine(m.index), certain: false,
          });
          continue;
        }

        const keys = extractKeys(text.slice(1), '', 2);
        for (const key of keys) {
          if (key.endsWith('.__spread__')) {
            findings.push({ entity, field: key, file: relPath(filePath), line: getLine(m.index), certain: false });
          } else {
            findings.push({ entity, field: key, file: relPath(filePath), line: getLine(m.index), certain: true });
          }
        }
      }
    }
  }

  for (const k of KNOWN_WRITES) {
    findings.push({ entity: k.entity, field: k.field, file: k.file, line: k.line, certain: k.field !== '__dynamic__' && !k.field.startsWith('__'), knownWrite: true, note: k.note });
  }

  const seen = new Set();
  const deduped = [];
  for (const f of findings) {
    const key = `${f.entity}|${f.field}|${f.file}|${f.line}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(f); }
  }

  const REGISTERED = [], DROPPED = [], UNCERTAIN = [];

  for (const f of deduped) {
    if (!f.certain || f.entity === '__dynamic__' || f.field.startsWith('__')) {
      UNCERTAIN.push(f);
      continue;
    }
    if (['id','created_date','updated_date','created_by_id','created_by','is_sample'].includes(f.field)) {
      REGISTERED.push({ ...f, note: 'Base44 system field' });
      continue;
    }
    const schema = SCHEMAS[f.entity];
    if (!schema) {
      UNCERTAIN.push({ ...f, note: 'Entity schema unknown' });
      continue;
    }
    const reg = isRegistered(f.entity, f.field);
    if (reg === true || reg === 'open') {
      REGISTERED.push(f);
    } else if (reg === 'uncertain') {
      UNCERTAIN.push({ ...f, note: 'In _uncertain list — may be auth-level or silently dropped; manual round-trip needed' });
    } else if (reg === false) {
      DROPPED.push(f);
    } else {
      UNCERTAIN.push({ ...f, note: 'Unknown entity' });
    }
  }

  return {
    registered: REGISTERED,
    dropped: DROPPED,
    uncertain: UNCERTAIN,
    droppedDeduped: dedupeByField(DROPPED),
    registeredDeduped: dedupeByField(REGISTERED),
  };
}
