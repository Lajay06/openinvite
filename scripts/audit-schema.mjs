/**
 * scripts/audit-schema.mjs
 *
 * Schema-drop audit: finds every field written to a Base44 entity across the
 * codebase and classifies it as REGISTERED (persists), DROPPED (silently
 * discarded), or UNCERTAIN (dynamic / can't resolve statically).
 *
 * Usage:  npm run audit:schema
 *
 * Schemas are embedded (fetched via MCP 2026-06-03 — re-run after schema
 * changes). The Base44 schema REST endpoint does not expose schemas via the
 * same token the app uses, so the schema data is embedded here.
 *
 * Sanity-check baseline (these must show REGISTERED for the method to be
 * correct): theme.*, guestCount, guestType, onboardingCompleted,
 * mainCeremony.dressCode, guestSuiteAccommodation.places.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC   = resolve(__dir, '..', 'src');

// ── Embedded schemas (from mcp__claude_ai_Base44__list_entity_schemas 2026-06-03) ──

const SCHEMAS = {
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
    _nested: {},
  },

  User: {
    language:1, currency:1, onboarding_completed:1, onboardingCompleted:1, onboardingPath:1,
    // Auth-level system fields: always stored by Base44 auth, not governed by entity schema.
    // These appear in the login response and GET /entities/User/me regardless of schema.
    // Updating them via updateMe() DOES persist (tested) — treat as registered.
    full_name:1, email:1, role:1, is_verified:1,
    // plan fields: written by PaymentSuccess.jsx — UNCERTAIN whether they persist
    // (not in entity schema; may be silently dropped or stored via different mechanism)
    _uncertain: ['planActivatedAt', 'planName', 'planTier', 'stripeCustomerId'],
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
    reminder_date:1, is_suggested:1, wedding_timeline:1, _nested: {},
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
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRegistered(entity, fieldPath) {
  const schema = SCHEMAS[entity];
  if (!schema) return null; // unknown entity
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    if (parts[0] === '_nested' || parts[0] === '_uncertain') return false; // internal
    // Check _uncertain list — these need manual verification
    if (schema._uncertain?.includes(parts[0])) return 'uncertain';
    return parts[0] in schema;
  }
  // Nested: check top-level key exists AND sub-key is in _nested definition
  const [top, ...rest] = parts;
  if (!(top in schema) && !schema._nested?.[top]) return false;
  const nested = schema._nested?.[top];
  if (!nested) {
    // Top-level is registered but we don't track sub-keys (open object)
    return 'open';
  }
  return nested.includes(rest[0]);
}

function relPath(abs) {
  return abs.replace(resolve(__dir, '..') + '/', '');
}

// Walk src/ recursively and return all .jsx/.js files
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

// ── Write-site patterns ───────────────────────────────────────────────────────
// Each pattern: { pattern, entityFn, fieldExtract }

/**
 * Lightweight object-key extractor.
 * Given a string that starts just after the opening `{`, extracts top-level
 * key names and (one level deep) nested key names, returning dotted paths.
 * Stops at the matching closing `}`.
 */
function extractKeys(text, prefix = '', maxDepth = 2, depth = 0) {
  if (depth >= maxDepth) return [];
  const keys = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    // Skip strings, comments, whitespace
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
    // Match identifier key: /(\w+)\s*:/
    const keyMatch = text.slice(i).match(/^([a-zA-Z_$][\w$]*)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      i += keyMatch[0].length;
      // Skip whitespace
      while (i < n && /\s/.test(text[i])) i++;
      // Check if value is an object literal — if so, recurse one level
      if (text[i] === '{') {
        i++;
        const subKeys = extractKeys(text.slice(i), fullKey, maxDepth, depth + 1);
        keys.push(...subKeys);
        // Skip to end of this object
        let d = 1;
        while (i < n && d > 0) {
          if (text[i] === '{') d++;
          else if (text[i] === '}') d--;
          i++;
        }
      } else {
        // Skip value (possibly nested expr) until comma or }
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
    // Spread `...` — flag the current level as uncertain
    if (text.slice(i, i+3) === '...') {
      keys.push(prefix ? `${prefix}.__spread__` : '__spread__');
      i += 3;
      // skip the spread expression
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
    // End of object
    if (text[i] === '}') break;
    i++;
  }
  return keys;
}

/**
 * Extract the text of the Nth argument of a function call starting at `pos`
 * in `src` (pos should be right after the opening paren).
 * Returns { text, end } or null.
 */
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

// ── Main scan ─────────────────────────────────────────────────────────────────

// findings: { entity, field, file, line, certain }[]
const findings = [];

// Manually-known write sites where static extraction is unreliable (variable
// objects, spread full records, etc.) — these are handled below as KNOWN entries.
// The static scanner adds to this via regex patterns.

/**
 * Known EXPLICIT write sites that the regex may miss (variable-pass patterns,
 * helpers, etc.). These were determined by reading the source.
 * Format: { entity, field, file, line, note }
 */
const KNOWN_WRITES = [
  // ── Styling.jsx: handleSectionSave writes `{ [sectionKey]: details[sectionKey] }`
  // sectionKey can be 'attire', 'flowers', or 'decorations'
  { entity:'WeddingDetails', field:'attire',            file:'src/pages/Styling.jsx', line:107, note:'sectionKey="attire"' },
  { entity:'WeddingDetails', field:'flowers',           file:'src/pages/Styling.jsx', line:107, note:'sectionKey="flowers"' },
  { entity:'WeddingDetails', field:'decorations',       file:'src/pages/Styling.jsx', line:107, note:'sectionKey="decorations"' },
  // ── Beauty.jsx: writes `{ beauty: nextBeauty }`
  { entity:'WeddingDetails', field:'beauty',            file:'src/pages/Beauty.jsx', line:126, note:'full = { ...latestRef.current, beauty: nextBeauty }' },
  // ── EntertainmentDetails.jsx: writes `{ entertainmentDetails: next }`
  { entity:'WeddingDetails', field:'entertainmentDetails', file:'src/pages/EntertainmentDetails.jsx', line:169, note:'full = { ...latestRef.current, entertainmentDetails: next }' },
  // ── Catering.jsx: writes `{ foodAndBeverage: details.foodAndBeverage }`
  { entity:'WeddingDetails', field:'foodAndBeverage',   file:'src/pages/Catering.jsx', line:85, note:'{ foodAndBeverage: details.foodAndBeverage }' },
  // ── RSVPPage.jsx: writes `{ ...form }` which contains song_request, rsvp_note
  { entity:'Guest', field:'song_request',   file:'src/components/rsvp/RSVPPage.jsx', line:160, note:'spread of form object' },
  { entity:'Guest', field:'rsvp_note',      file:'src/components/rsvp/RSVPPage.jsx', line:160, note:'spread of form object' },
  // ── RSVPPage.jsx: writes poll_votes separately
  { entity:'Guest', field:'poll_votes',     file:'src/components/rsvp/RSVPPage.jsx', line:203, note:'{ poll_votes: mergedVotes }' },
  // ── AvaModal: dynamic action.data — entity and fields unknown at parse time
  { entity:'__dynamic__', field:'__dynamic__', file:'src/components/layout/AvaModal.jsx', line:147, note:'action.data passed to create/update — fields determined by Ava LLM response' },
  // ── AvaStudioWebsite: writes full `details` variable
  { entity:'WeddingDetails', field:'__spread_details__', file:'src/pages/AvaStudioWebsite.jsx', line:282, note:'full details variable — includes registered fields (coverPhoto, welcomeMessage, coupleStory, qna, registryContent) + whatever updateField was called with' },
];

// ── Static scan ───────────────────────────────────────────────────────────────

const ENTITY_PATTERNS = [
  // base44.entities.EntityName.create({...}) or .update(id, {...})
  /base44\.entities\.(\w+)\.(?:create|update)\s*\(/g,
  // EntityName.create({...}) or EntityName.update(id, {...}) where EntityName is imported
  /\b(WeddingDetails|Guest|Budget|Schedule|Vendor|Note|Task|Table|VenueAsset|VowSpeech|RegistryItem|RegistryProduct|CustomGift|ReceivedGift|VendorLog|VendorTask|Collaborator|Photographer|Music|GuestMessage|SongRequest|StoryMilestone|Photo|LiveStream|StreamChat|WebsiteTheme|CustomEventPage|MoodboardItem|Invitation|ThemeDetails)\.(?:create|update)\s*\(/g,
  // base44.auth.updateMe({...})
  /base44\.auth\.updateMe\s*\(/g,
];

const files = walkFiles(SRC);

for (const filePath of files) {
  let src;
  try { src = readFileSync(filePath, 'utf8'); } catch { continue; }
  const lines = src.split('\n');
  const getLine = (pos) => src.slice(0, pos).split('\n').length;

  // Scan for entity write patterns
  for (const pat of ENTITY_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(src)) !== null) {
      const isUpdateMe = m[0].includes('updateMe');
      const entity = isUpdateMe ? 'User' : m[1];
      const callPos = m.index + m[0].length; // right after the opening (

      // Determine which arg index has the object literal
      // .create({}) → arg 0
      // .update(id, {}) → arg 1
      // .updateMe({}) → arg 0
      const isUpdate = !isUpdateMe && m[0].includes('.update');
      const argIdx = isUpdate ? 1 : 0;

      const arg = extractArg(src, callPos, argIdx);
      if (!arg) continue;

      const text = arg.text.trim();
      if (!text.startsWith('{')) {
        // Variable reference — flag as uncertain
        findings.push({
          entity,
          field: '__var_ref__:' + text.slice(0, 40),
          file: relPath(filePath),
          line: getLine(m.index),
          certain: false,
        });
        continue;
      }

      // Extract keys from the object literal (skip the leading `{`)
      const keys = extractKeys(text.slice(1), '', 2);
      for (const key of keys) {
        if (key.endsWith('.__spread__')) {
          findings.push({
            entity,
            field: key,
            file: relPath(filePath),
            line: getLine(m.index),
            certain: false,
          });
        } else {
          findings.push({
            entity,
            field: key,
            file: relPath(filePath),
            line: getLine(m.index),
            certain: true,
          });
        }
      }
    }
  }
}

// ── Merge with known writes ───────────────────────────────────────────────────

for (const k of KNOWN_WRITES) {
  findings.push({ entity: k.entity, field: k.field, file: k.file, line: k.line, certain: k.field !== '__dynamic__' && !k.field.startsWith('__'), knownWrite: true, note: k.note });
}

// ── De-duplicate (same entity+field+file) ────────────────────────────────────

const seen = new Set();
const deduped = [];
for (const f of findings) {
  const key = `${f.entity}|${f.field}|${f.file}|${f.line}`;
  if (!seen.has(key)) { seen.add(key); deduped.push(f); }
}

// ── Classification ────────────────────────────────────────────────────────────

const REGISTERED = [], DROPPED = [], UNCERTAIN = [];

for (const f of deduped) {
  if (!f.certain || f.entity === '__dynamic__' || f.field.startsWith('__')) {
    UNCERTAIN.push(f);
    continue;
  }

  // Skip internal metadata fields
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

// ── Check reads for DROPPED fields ───────────────────────────────────────────

function fieldIsRead(entity, field) {
  // Grep across all src files for the field name being read
  const topLevel = field.split('.')[0];
  let found = false;
  for (const filePath of files) {
    let src;
    try { src = readFileSync(filePath, 'utf8'); } catch { continue; }
    // Check for reads like .fieldName, ['fieldName'], r.fieldName, ?.fieldName
    const readPat = new RegExp(`[?.]${topLevel}\\b|\\['${topLevel}'\\]|\\["${topLevel}"\\]`);
    if (readPat.test(src)) { found = true; break; }
  }
  return found;
}

// Augment DROPPED with read info
for (const d of DROPPED) {
  d.isRead = fieldIsRead(d.entity, d.field);
}

// Sort DROPPED: written+read first (worst), then write-only
DROPPED.sort((a, b) => (b.isRead ? 1 : 0) - (a.isRead ? 1 : 0));

// ── De-duplicate display (one entry per entity+field) ────────────────────────

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

const droppedDeduped = dedupeByField(DROPPED);
const regDeduped     = dedupeByField(REGISTERED);

// ── Report ────────────────────────────────────────────────────────────────────

const W = 68;
const hr  = '═'.repeat(W);
const hr2 = '─'.repeat(W);

console.log(`\n${hr}`);
console.log('  Base44 Schema-Drop Audit — Openinvite');
console.log(`  ${new Date().toISOString()}`);
console.log(`${hr}\n`);

console.log(`⛔  DROPPED FIELDS (${droppedDeduped.length} unique field paths) — written but NOT in schema`);
console.log('    Base44 returns HTTP 200 but the data is silently discarded.\n');

const droppedByEntity = {};
for (const d of droppedDeduped) {
  (droppedByEntity[d.entity] = droppedByEntity[d.entity] || []).push(d);
}

for (const [entity, fields] of Object.entries(droppedByEntity)) {
  console.log(`  ── ${entity} ──────────────────────────────────────────`);
  for (const f of fields) {
    const severity = f.isRead ? '🔴 LIVE BUG (written+read, data loss)' : '🟡 dead write (written, never read)';
    console.log(`  ⛔  ${f.field}`);
    console.log(`       ${severity}`);
    console.log(`       Sites: ${f.allSites}`);
    if (f.note) console.log(`       Note:  ${f.note}`);
  }
  console.log();
}

console.log(`${hr2}\n`);
console.log(`⚠️   UNCERTAIN (${UNCERTAIN.filter((v,i,a) => a.findIndex(x=>x.entity===v.entity&&x.field===v.field)===i).length} unique field paths) — can't resolve statically, needs manual review\n`);

const unc = dedupeByField(UNCERTAIN.filter(u => u.entity !== '__dynamic__'));
const dynCount = UNCERTAIN.filter(u => u.entity === '__dynamic__').length;

for (const u of unc.slice(0, 30)) {
  const fieldDisplay = u.field.startsWith('__var_ref__:') ? `[variable: ${u.field.slice(12)}]` : u.field;
  console.log(`  ⚠️   ${u.entity} → ${fieldDisplay}`);
  console.log(`       ${u.file}:${u.line}${u.note ? '  — ' + u.note : ''}`);
}
if (dynCount > 0) {
  console.log(`  ⚠️   AvaModal (AvaModal.jsx:147–152): entity + fields determined by LLM at runtime`);
  console.log(`       Passes action.data directly to create/update — fields are whatever Ava generates.`);
  console.log(`       Verify the LLM prompt constrains field names to registered schema fields.`);
}
if (unc.length > 30) console.log(`  … and ${unc.length - 30} more (variable references and spreads)`);

console.log(`\n${hr2}\n`);
console.log(`✅  REGISTERED — spot-check of known-good baselines\n`);
const baselines = [
  ['WeddingDetails','guestCount'], ['WeddingDetails','guestType'],
  ['WeddingDetails','theme.aesthetic'], ['WeddingDetails','theme.faith'],
  ['WeddingDetails','mainCeremony.dressCode'], ['WeddingDetails','guestSuiteAccommodation.places'],
  ['WeddingDetails','polls'], ['User','onboardingCompleted'],
  ['WeddingDetails','emergencyContacts.primary'], ['WeddingDetails','experienceGuide.categories'],
];
for (const [entity, field] of baselines) {
  const reg = isRegistered(entity, field);
  const status = (reg === true || reg === 'open') ? '✅ REGISTERED' : '❌ NOT REGISTERED — method error!';
  console.log(`  ${status.padEnd(20)} ${entity}.${field}`);
}

console.log(`\n${hr}\n`);
console.log('  SUMMARY');
console.log(`${hr2}`);
console.log(`  ⛔  DROPPED      : ${droppedDeduped.length} unique field paths`);
console.log(`       🔴 Live bug (written+read)  : ${droppedDeduped.filter(d=>d.isRead).length}`);
console.log(`       🟡 Dead write (write-only)  : ${droppedDeduped.filter(d=>!d.isRead).length}`);
console.log(`  ⚠️   UNCERTAIN    : ${unc.length + (dynCount > 0 ? 1 : 0)} (${unc.length} var-refs/spreads + ${dynCount > 0 ? '1 dynamic AvaModal' : '0 dynamic'})`);
console.log(`  ✅  REGISTERED   : ${regDeduped.length} (static scan, not exhaustive)`);
console.log(`${hr}\n`);

console.log('  ACTION REQUIRED: only the ⛔ DROPPED list needs attention.');
console.log('  Do NOT register fields unsupervised — typo\'d names get cemented.');
console.log('  Review each entry with the dev before registering or redirecting writes.\n');
