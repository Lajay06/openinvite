import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Sparkles, Globe, Mail, Users, Wallet } from 'lucide-react';

const ICON_MAP = { LayoutDashboard, Sparkles, Globe, Mail, Users, Wallet };

const S = {
  h3: { fontSize: 16, fontWeight: 700, color: '#0A0A0A', marginTop: 28, marginBottom: 10, fontFamily: 'Plus Jakarta Sans, sans-serif' },
  p: { fontSize: 15, color: '#333', lineHeight: 1.8, marginTop: 0, marginBottom: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' },
  li: { fontSize: 15, color: '#333', lineHeight: 1.8, marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' },
  ol: { paddingLeft: 20, marginTop: 0, marginBottom: 14 },
  ul: { paddingLeft: 20, marginTop: 0, marginBottom: 14 },
  tip: { background: '#FAFAFA', borderLeft: '3px solid #E03553', padding: 16, marginTop: 24, marginBottom: 8 },
  tipText: { fontSize: 13, color: '#555', margin: 0, lineHeight: 1.7, fontFamily: 'Plus Jakarta Sans, sans-serif' },
};

const ARTICLES = {
  'How to complete your onboarding': (
    <div>
      <p style={S.p}>Onboarding is a step-by-step conversational flow that collects your key wedding details and sets up your account. It takes about 3–5 minutes.</p>
      <h3 style={S.h3}>The steps</h3>
      <ol style={S.ol}>
        <li style={S.li}><strong>Enter your names</strong> — Partner 1 and Partner 2 first names. These appear across your website, Guest Suite assets, and all personalised content.</li>
        <li style={S.li}><strong>Set your wedding date</strong> — Use the date picker to select your date. This drives your countdown timer, checklist deadlines, and Ava's timeline suggestions.</li>
        <li style={S.li}><strong>Add your venue</strong> — Search using Google Places to find your ceremony venue. Start typing and select from the dropdown. The address auto-fills.</li>
        <li style={S.li}><strong>Guest count</strong> — Choose Intimate (under 50), Celebration (50–150), or Grand (150+), then enter your specific number. This helps Ava calibrate your budget and checklist.</li>
        <li style={S.li}><strong>Wedding style</strong> — Select as many style tags as apply: Traditional, Modern, Bohemian, Luxury, and so on. These inform Ava's suggestions throughout.</li>
        <li style={S.li}><strong>What matters most</strong> — Choose the features most important to you: Guest Management, Budget, Invitations, Music, Vendors, or All of it. Openinvite prioritises these in your dashboard.</li>
        <li style={S.li}><strong>Meet Ava</strong> — Your AI wedding specialist is introduced. Ava uses everything you've shared to personalise your experience from this point on.</li>
        <li style={S.li}><strong>Choose your universe</strong> — Select the aesthetic for your entire Guest Suite. AMAN (Quiet Luxury) is currently available. Tap the card to preview the full experience before selecting.</li>
        <li style={S.li}><strong>Path A or B</strong> — Choose "Tell us more" to add guests, budget, vendors, and inspiration now, or "Get started" to go straight to your dashboard.</li>
      </ol>
      <div style={S.tip}><p style={S.tipText}><strong>Tip from Ava:</strong> You can update any of these details at any time from Event Details in the sidebar.</p></div>
    </div>
  ),
  'Setting up your Event Details': (
    <div>
      <p style={S.p}>Event Details is the master source of truth for your wedding. Any detail you enter here flows automatically to your website, Guest Suite assets, checklist, and Ava's responses.</p>
      <h3 style={S.h3}>What lives in Event Details</h3>
      <ul style={S.ul}>
        <li style={S.li}>Partner names (drives all personalised content)</li>
        <li style={S.li}>Wedding date (drives countdown, checklist deadlines, Ava suggestions)</li>
        <li style={S.li}>Ceremony venue — search with Google Places, auto-fills address</li>
        <li style={S.li}>Ceremony time and dress code</li>
        <li style={S.li}>Reception venue and time</li>
        <li style={S.li}>Guest count and type (Intimate / Celebration / Grand)</li>
        <li style={S.li}>Wedding style tags</li>
        <li style={S.li}>Feature priorities</li>
      </ul>
      <h3 style={S.h3}>The Miscellaneous section</h3>
      <p style={S.p}>Collapsed by default, this contains:</p>
      <ul style={S.ul}>
        <li style={S.li}>Photography & videography preferences</li>
        <li style={S.li}>Ceremony details (celebrant, readings, vows notes)</li>
        <li style={S.li}>Catering and food details</li>
        <li style={S.li}>Florals and décor notes</li>
        <li style={S.li}>Entertainment preferences</li>
        <li style={S.li}>Transport and logistics</li>
        <li style={S.li}>Additional events (rehearsal, welcome dinner)</li>
      </ul>
      <h3 style={S.h3}>How to save</h3>
      <p style={S.p}>Changes auto-save after 1.5 seconds. You'll see "Saving..." then "Saved ✓" in the top bar.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Important:</strong> Never enter venue details by typing them manually — always use the Google Places search so the address, coordinates, and place ID are saved correctly. This enables map embeds on your wedding website.</p></div>
    </div>
  ),
  'Understanding the dashboard': (
    <div>
      <p style={S.p}>The dashboard (Overall) gives you a live snapshot of your wedding planning status.</p>
      <h3 style={S.h3}>What you'll see</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Total Guests / Attending / Declined / Awaiting</strong> — pulled live from your Guest List</li>
        <li style={S.li}><strong>Budget Used</strong> — your spend as a percentage of your total budget</li>
        <li style={S.li}><strong>Events Planned</strong> — calendar events count</li>
      </ul>
      <p style={S.p}>The tab bar below the stats lets you jump directly to Guest List, Budget, Schedule, Vendors, Registry, and Seating without leaving the dashboard.</p>
      <h3 style={S.h3}>The left panel shows</h3>
      <ul style={S.ul}>
        <li style={S.li}>Guest Response breakdown (attending, declined, awaiting)</li>
        <li style={S.li}>Upcoming Events from your Calendar</li>
        <li style={S.li}>Checklist progress</li>
      </ul>
      <h3 style={S.h3}>The sidebar organises everything into groups</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>STUDIO:</strong> Design Studio (website, Guest Suite, Ava's Studio)</li>
        <li style={S.li}><strong>PLANNING:</strong> Overall, Calendar, Checklist, To Do List, plus dedicated pages for Food & Beverage, Photography, Florals & Décor, Entertainment, Transport, and Accommodation</li>
        <li style={S.li}><strong>GUESTS:</strong> Guest List, Seating, Messages</li>
        <li style={S.li}><strong>FINANCES:</strong> Budget, Registry</li>
        <li style={S.li}><strong>CREATIVE:</strong> Styling, Music, Schedule, Vows & Speeches, Moodboard</li>
        <li style={S.li}><strong>VENDORS:</strong> Vendors</li>
        <li style={S.li}><strong>OTHER:</strong> Ceremony Details, Honeymoon, Emergency Contact, Live Stream, Policies</li>
      </ul>
      <p style={S.p}>At the bottom of the sidebar: Account Settings, Collaborate, Quick Tips (?), Help Centre, Leave Dashboard.</p>
    </div>
  ),
  'Inviting a collaborator': (
    <div>
      <p style={S.p}>Collaborate lets you give your partner, a wedding planner, or a family member access to your Openinvite account so you can plan together.</p>
      <h3 style={S.h3}>How to add a collaborator</h3>
      <ol style={S.ol}>
        <li style={S.li}>Click "Collaborate" in the sidebar (bottom section)</li>
        <li style={S.li}>Enter the collaborator's email address</li>
        <li style={S.li}>Choose their access level: View Only, or Full Access</li>
        <li style={S.li}>Click Send Invitation — they'll receive an email with a link to join</li>
      </ol>
      <h3 style={S.h3}>What collaborators can do</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Full Access:</strong> view and edit everything across the planner, website builder, and Guest Suite</li>
        <li style={S.li}><strong>View Only:</strong> see all pages but cannot make changes</li>
      </ul>
      <h3 style={S.h3}>Notes</h3>
      <ul style={S.ul}>
        <li style={S.li}>Collaborators log in with their own account — they don't share your password</li>
        <li style={S.li}>You can remove a collaborator at any time from the Collaborate page</li>
        <li style={S.li}>Changes made by collaborators are saved to your account and visible to you instantly</li>
        <li style={S.li}>The couple's primary account holder controls billing and plan settings</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> If you're working with a professional wedding planner, give them Full Access so they can manage vendors, guests, and the checklist on your behalf.</p></div>
    </div>
  ),
  'What is Ava and what can she do?': (
    <div>
      <p style={S.p}>Ava is the AI wedding specialist built into every part of Openinvite. She's powered by Claude, one of the world's most advanced AI models.</p>
      <h3 style={S.h3}>Website building</h3>
      <ul style={S.ul}>
        <li style={S.li}>Auto-fill your entire wedding website from your planning details in one click</li>
        <li style={S.li}>Write your love story, welcome message, and FAQ</li>
        <li style={S.li}>Suggest section layouts and content for each page</li>
      </ul>
      <h3 style={S.h3}>Planning</h3>
      <ul style={S.ul}>
        <li style={S.li}>Generate a personalised wedding checklist based on your date, style, and priorities</li>
        <li style={S.li}>Answer planning questions ("When should I book my florist?")</li>
        <li style={S.li}>Review your budget and flag potential issues</li>
        <li style={S.li}>Suggest vendor questions to ask</li>
      </ul>
      <h3 style={S.h3}>Creative writing</h3>
      <ul style={S.ul}>
        <li style={S.li}>Help write your vows (guided, tone-selectable)</li>
        <li style={S.li}>Draft speeches and toasts</li>
        <li style={S.li}>Write thank you note templates</li>
      </ul>
      <h3 style={S.h3}>Guest management</h3>
      <ul style={S.ul}>
        <li style={S.li}>Suggest seating arrangements based on relationships</li>
        <li style={S.li}>Flag dietary clusters before you finalise your menu</li>
        <li style={S.li}>Draft RSVP reminder messages</li>
      </ul>
      <h3 style={S.h3}>Where to find Ava</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Floating ✦ button:</strong> bottom-right of every page — opens a live chat with Ava</li>
        <li style={S.li}><strong>Auto-Fill with Ava:</strong> in the Guest Suite top bar — populates your entire site</li>
        <li style={S.li}><strong>Use Ava's suggestion:</strong> in Ava's Studio — fills each step with smart suggestions</li>
        <li style={S.li}><strong>Let Ava decide what's next:</strong> on the Ava's Studio home screen</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}>Ava learns from your Event Details, guest list, budget, and checklist. The more you add, the more personalised her suggestions become.</p></div>
    </div>
  ),
  "Using Ava's Studio step-by-step": (
    <div>
      <p style={S.p}>Ava's Studio is a guided, one-step-at-a-time builder for your wedding website and Guest Suite assets. It's designed to remove overwhelm — you focus on one thing, Ava handles the rest.</p>
      <h3 style={S.h3}>How to open it</h3>
      <ol style={S.ol}>
        <li style={S.li}>Click "Design Studio" in the sidebar</li>
        <li style={S.li}>Click "✦ Ava's Studio" button — or use the button in the Guest Suite top bar</li>
      </ol>
      <h3 style={S.h3}>The home screen shows</h3>
      <ul style={S.ul}>
        <li style={S.li}>Your progress: Website Pages (X of 9) and Assets (X of 10)</li>
        <li style={S.li}>Two paths: Build Website or Create Assets</li>
        <li style={S.li}>"Let Ava decide what's next" — Ava analyses your progress and recommends the next action</li>
      </ul>
      <h3 style={S.h3}>Building your website with Ava</h3>
      <p style={S.p}>The guided flow has 12 steps, one at a time: cover photo, welcome message, love story, milestone moments, ceremony details (auto-filled from Event Details), reception details (auto-filled), day timeline, RSVP settings, travel and hotels, registry, music and song requests, and FAQ.</p>
      <p style={S.p}>At each step: Ava gives you a prompt and a hint; a live mini-preview shows your changes in real time; "✦ Use Ava's suggestion" fills the field with a smart default; "Skip for now" moves forward without filling; "← Previous" goes back without losing progress.</p>
      <h3 style={S.h3}>Creating assets with Ava</h3>
      <p style={S.p}>The asset flow covers all 10 Guest Suite pieces one at a time. Same pattern — one question, live preview, Ava's suggestion available at each step.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Light/Dark mode toggle:</strong> available in the top-right of every Ava's Studio screen.</p></div>
    </div>
  ),
  'Auto-filling your website with Ava': (
    <div>
      <p style={S.p}>The "✦ Auto-Fill with Ava" button in the Guest Suite reads all your planning data and generates complete content for every page of your wedding website in about 10–15 seconds.</p>
      <h3 style={S.h3}>How to use it</h3>
      <ol style={S.ol}>
        <li style={S.li}>Open Design Studio → Guest Suite</li>
        <li style={S.li}>Click "✦ Auto-Fill with Ava" in the top bar</li>
        <li style={S.li}>Review what data Ava will use (names, date, venue, story, welcome message)</li>
        <li style={S.li}>Click "Generate with Ava"</li>
        <li style={S.li}>Preview the generated content before applying</li>
        <li style={S.li}>Click "Apply to Website" — all pages are populated instantly</li>
      </ol>
      <h3 style={S.h3}>What Ava generates</h3>
      <ul style={S.ul}>
        <li style={S.li}>Hero title (your names formatted beautifully)</li>
        <li style={S.li}>Hero date (formatted for display)</li>
        <li style={S.li}>Welcome quote (warm, personal)</li>
        <li style={S.li}>Love story (2–3 paragraphs based on your details)</li>
        <li style={S.li}>Milestones (how you met, first date, proposal)</li>
        <li style={S.li}>Ceremony and reception details</li>
        <li style={S.li}>FAQ (based on your venue, dress code, date)</li>
        <li style={S.li}>Closing message, song request message, travel notes</li>
      </ul>
      <h3 style={S.h3}>After applying</h3>
      <p style={S.p}>All content is editable — click any section in the preview to open its editor in the right panel. Auto-fill gives you a complete starting point, not a locked template.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Warning:</strong> Auto-fill replaces existing Guest Suite content. If you've already built pages manually, save your work first or use Ava's Studio for a step-by-step approach instead.</p></div>
    </div>
  ),
  "Ava's vow writing assistant": (
    <div>
      <p style={S.p}>Writing vows is one of the hardest parts of wedding planning. Ava's vow assistant guides you through the process with prompts, tone options, and real-time drafting — without giving you a generic template.</p>
      <h3 style={S.h3}>How to access it</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Vows & Speeches in the sidebar (CREATIVE section)</li>
        <li style={S.li}>Click "Add Vow" or "Add Speech"</li>
        <li style={S.li}>Use the rich text editor — or click "✦ Ask Ava to help"</li>
      </ol>
      <p style={S.p}>Alternatively, open the Ava chat pod (✦ floating button, bottom right) and say "Help me write my vows."</p>
      <h3 style={S.h3}>The guided process</h3>
      <p style={S.p}>Ava will ask you: what tone do you want (Funny, Heartfelt, Poetic, Traditional, Mixed), what you love most about your partner, a specific memory or moment to include, and how long the vows should be (30 seconds / 1 minute / 2 minutes). Ava then drafts something personal — using your answers, not a fill-in-the-blank template.</p>
      <h3 style={S.h3}>Editing the draft</h3>
      <ul style={S.ul}>
        <li style={S.li}>The Vows page has a rich text editor with B/I/U formatting, H1/H2, alignment, case toggles, and a block quote option</li>
        <li style={S.li}>Word count displays live — aim for 150–250 words for 1–2 minute vows</li>
        <li style={S.li}>Save privately — only you and your collaborators can see vows</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> Write a rough draft yourself first, then ask Ava to improve specific parts rather than writing the whole thing. Your vows will sound more authentically you.</p></div>
    </div>
  ),
  'Adding sections to your website': (
    <div>
      <p style={S.p}>Your wedding website is built from sections — individual content blocks you add, reorder, and customise for each page. There are 32 section templates across 8 categories.</p>
      <h3 style={S.h3}>How to add a section</h3>
      <ol style={S.ol}>
        <li style={S.li}>Open Design Studio → Guest Suite → Website tab</li>
        <li style={S.li}>Select a page from the left panel (Home, Our Story, Celebration, etc.)</li>
        <li style={S.li}>Click "+ Add Section" at the bottom of the preview, or hover between existing sections to insert in between</li>
        <li style={S.li}>The Section Template Picker opens — browse 32 templates across categories</li>
        <li style={S.li}>Click a template to add it — it appears in the preview immediately with default content</li>
        <li style={S.li}>The right panel opens automatically to edit that section's content</li>
      </ol>
      <h3 style={S.h3}>The 32 section templates by category</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Hero/Opening:</strong> Cinematic Hero, Split Hero, Minimal Text Hero, Full Screen Gallery</li>
        <li style={S.li}><strong>Couple:</strong> Our Story, Love Letter, Meet The Couple, How We Met</li>
        <li style={S.li}><strong>Celebration:</strong> Event Details, Day Timeline, Venue Showcase, Countdown Timer</li>
        <li style={S.li}><strong>Gallery:</strong> Photo Grid, Photo Strip, Featured Photo</li>
        <li style={S.li}><strong>RSVP:</strong> Full RSVP Form, Simple RSVP, RSVP + Meal</li>
        <li style={S.li}><strong>Practical:</strong> Travel & Stay, Registry Links, FAQ Accordion, Map & Directions</li>
        <li style={S.li}><strong>Music:</strong> Spotify Playlist, Song Request, Music & Playlist</li>
        <li style={S.li}><strong>Social:</strong> Guest Book, Photo Upload, Hashtag Wall</li>
        <li style={S.li}><strong>Closing:</strong> Thank You Note, Save The Date, Quote, Spacer</li>
      </ul>
      <h3 style={S.h3}>Managing sections</h3>
      <p style={S.p}>In the Guest Suite → Website tab, hover over any section in the preview to reveal the action toolbar: ↑ Move Up · ↓ Move Down · Edit · + Add Below · × Delete. Click any section to open its editor in the right panel.</p>
      <h3 style={S.h3}>The right panel tabs</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Content:</strong> all text, photo, and data fields for that section</li>
        <li style={S.li}><strong>Style:</strong> background (dark/light/custom colour), padding size, text alignment, content width</li>
      </ul>
    </div>
  ),
  'Choosing a theme and typography': (
    <div>
      <p style={S.p}>Your theme and typography define the visual identity of your wedding website. Changes apply instantly across all pages in the preview.</p>
      <h3 style={S.h3}>Themes (20 available)</h3>
      <p style={S.p}>Themes control your colour palette — dark background, light background, and accent colour. Notable themes include: STILL (Obsidian dark, Linen light — AMAN default), DUSK (Deep brown, Warm cream, Gold), SAGE (Dark green, Sage, Forest), BLUSH (Dark plum, Blush, Rose), NOIR (Black, Pure white, Red), plus IVORY, MIDNIGHT, TERRA, FOREST, CORAL, LAVENDER, BRONZE, ARCTIC, DESERT, PLUM, JADE, CHARCOAL, CHAMPAGNE, OBSIDIAN.</p>
      <h3 style={S.h3}>How to change theme</h3>
      <ol style={S.ol}>
        <li style={S.li}>In the Guest Suite → Website tab, click the Design tab in the right panel (when nothing is selected)</li>
        <li style={S.li}>Click any theme swatch — preview updates instantly</li>
        <li style={S.li}>Save to apply permanently</li>
      </ol>
      <h3 style={S.h3}>Typography (10 pairings)</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Classic:</strong> Cormorant Garamond 300 + Plus Jakarta Sans (timeless, elegant)</li>
        <li style={S.li}><strong>Modern:</strong> Playfair Display + Plus Jakarta Sans (contemporary romance)</li>
        <li style={S.li}><strong>Minimal:</strong> Plus Jakarta Sans 700 + Plus Jakarta Sans (confident, clean)</li>
        <li style={S.li}><strong>Editorial:</strong> DM Serif Display + DM Sans (magazine feel)</li>
        <li style={S.li}><strong>Romantic:</strong> Libre Baskerville + Lato (soft, traditional)</li>
        <li style={S.li}><strong>Geometric:</strong> Josefin Sans + Josefin Sans (precise, minimal)</li>
        <li style={S.li}><strong>Literary:</strong> EB Garamond + EB Garamond (poetic, bookish)</li>
        <li style={S.li}><strong>Bold:</strong> Montserrat 800 + Montserrat (statement, modern)</li>
        <li style={S.li}><strong>Handcrafted:</strong> Lora + Source Sans 3 (warm, artisan)</li>
        <li style={S.li}><strong>Luxe:</strong> Cinzel + Raleway (opulent, ceremonial)</li>
      </ul>
      <h3 style={S.h3}>Animation options</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Page transition:</strong> Fade / Slide / Reveal / Dissolve</li>
        <li style={S.li}><strong>Scroll animation:</strong> None / Subtle / Dramatic</li>
        <li style={S.li}><strong>Hero effect:</strong> Parallax / Zoom Out / Static</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Note:</strong> Your active universe pre-selects a recommended theme. AMAN defaults to STILL + Classic typography.</p></div>
    </div>
  ),
  'Setting up your RSVP page': (
    <div>
      <p style={S.p}>Your RSVP page lets guests respond to your invitation directly on your wedding website. Responses are collected in your Guest List automatically.</p>
      <h3 style={S.h3}>How to set up RSVP</h3>
      <ol style={S.ol}>
        <li style={S.li}>In the Guest Suite → Website tab, select "RSVP" from the left panel page list (toggle it on if off)</li>
        <li style={S.li}>Click "+ Add Section" and choose one of three RSVP templates: Full RSVP Form, Simple RSVP, or RSVP + Meal</li>
        <li style={S.li}>Click the RSVP section to open its editor: set your RSVP deadline date, add meal options (type and press Enter), toggle plus ones / dietary field / song requests / guest message</li>
        <li style={S.li}>Add a closing message: "We cannot wait to celebrate with you."</li>
        <li style={S.li}>Save — your RSVP form is live at openinvite.com/w/[your-slug]/rsvp</li>
      </ol>
      <h3 style={S.h3}>How responses work</h3>
      <ul style={S.ul}>
        <li style={S.li}>Each RSVP creates or updates a record in your Guest List</li>
        <li style={S.li}>You can see all responses in the Guest List page</li>
        <li style={S.li}>Filter by: Attending / Declined / Awaiting response</li>
        <li style={S.li}>Export responses as CSV from the Guest List</li>
      </ul>
      <h3 style={S.h3}>Password protection</h3>
      <p style={S.p}>If your website has a password, guests must enter it before they can RSVP. You can set a separate, simpler password for the RSVP page if needed.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> Send your RSVP link to guests via the Share tab (Guest Suite → Share) — you can email your entire guest list with one click.</p></div>
    </div>
  ),
  'Publishing and sharing your site': (
    <div>
      <p style={S.p}>Publishing makes your wedding website live at openinvite.com/w/[your-slug] so guests can visit it.</p>
      <h3 style={S.h3}>How to publish</h3>
      <ol style={S.ol}>
        <li style={S.li}>Open the Guest Suite</li>
        <li style={S.li}>Click "Publish" in the top-right corner</li>
        <li style={S.li}>The Publish modal opens — click "Publish Now"</li>
        <li style={S.li}>Your site is immediately live</li>
      </ol>
      <h3 style={S.h3}>Your website URL</h3>
      <p style={S.p}>Your default URL is openinvite.com/w/[your-name-slug]. To customise it: in the Publish modal → Website tab → edit the slug field (e.g. "john-and-sarah-2026") → Save. Your new URL is active immediately.</p>
      <h3 style={S.h3}>Sharing options (Guest Suite → Share tab)</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Copy link:</strong> one click to copy your full URL</li>
        <li style={S.li}><strong>WhatsApp:</strong> opens WhatsApp with a pre-written message and your link</li>
        <li style={S.li}><strong>Email guests:</strong> full email composer targeting your guest list — select All Guests, Not Yet RSVP'd, Attending, or Declined</li>
        <li style={S.li}><strong>QR Code:</strong> download PNG or SVG — print it on your Save the Dates, menus, or welcome signage</li>
      </ul>
      <h3 style={S.h3}>Password protection</h3>
      <p style={S.p}>Enable in Publish modal → Website tab. Guests see a password entry screen before your site loads. The ?preview=true URL parameter bypasses this for your own previewing.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Privacy:</strong> Toggle "Hide from Search" to prevent Google from indexing your wedding website.</p></div>
    </div>
  ),
  'What is the Guest Suite?': (
    <div>
      <p style={S.p}>The Guest Suite is your complete wedding invitation and design collection — 10 pieces, all designed around your chosen universe aesthetic and personalised with your wedding details.</p>
      <h3 style={S.h3}>The 10 pieces</h3>
      <ol style={S.ol}>
        <li style={S.li}><strong>Save the Date</strong> — your first announcement to guests, with a photo of you both</li>
        <li style={S.li}><strong>Digital Invitation</strong> — the full invitation design, links directly to your wedding website</li>
        <li style={S.li}><strong>RSVP Page</strong> — a styled response page connected to your guest list</li>
        <li style={S.li}><strong>Menu Card</strong> — typeset dinner menu for each table or place setting</li>
        <li style={S.li}><strong>Seating Chart</strong> — displays guest table assignments, pulls live from your guest list</li>
        <li style={S.li}><strong>Motion Graphic</strong> — an animated digital asset for sharing on screens or digitally</li>
        <li style={S.li}><strong>Instagram Story Kit</strong> — 5 story designs sized for Instagram/Facebook stories</li>
        <li style={S.li}><strong>Welcome Signage</strong> — large format A1 print-ready signage for your venue entrance</li>
        <li style={S.li}><strong>Guest Tags</strong> — business card sized name tags, 6 per A4 sheet, print-ready</li>
        <li style={S.li}><strong>Thank You Notes</strong> — personalised post-wedding thank you cards</li>
      </ol>
      <h3 style={S.h3}>How all 10 pieces are personalised</h3>
      <p style={S.p}>Every piece reads from your Event Details: your names, wedding date, venue name, and address. Change your date in Event Details — all 10 assets update automatically.</p>
      <h3 style={S.h3}>How to access the Guest Suite</h3>
      <ol style={S.ol}>
        <li style={S.li}>Click "Design Studio" in the sidebar</li>
        <li style={S.li}>Click "Guest Suite" — this takes you to the universe selection page</li>
        <li style={S.li}>Select your universe — click a card to preview the full experience</li>
        <li style={S.li}>Once a universe is selected, your 10 assets are available to edit, download, and share</li>
      </ol>
    </div>
  ),
  'Choosing and switching universes': (
    <div>
      <p style={S.p}>Your universe defines the complete aesthetic of all 10 Guest Suite pieces — colours, typography, layout style, and mood. You choose one universe that applies across everything.</p>
      <h3 style={S.h3}>Available universes</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>AMAN (available now):</strong> Quiet Luxury. Deep black, warm linen, Cormorant Garamond typography. Inspired by Aman Resorts. Palette: Obsidian, Linen, Sand, Pure.</li>
        <li style={S.li}><strong>Coming soon:</strong> TULUM (Desert Bloom), KYOTO (Zen & Ceremony), CAPRI (Italian Coast), MARRAKECH (Spice & Gold), BROOKLYN (Industrial Edge), BALI (Sacred Garden), PARIS (Haussmann Romance), CAPE TOWN (Wild & Free)</li>
      </ul>
      <h3 style={S.h3}>How to choose your universe</h3>
      <p style={S.p}>During onboarding: the universe selection step is built into the flow. Click any card to preview the full universe experience, then click "Select [Universe]" to choose it.</p>
      <p style={S.p}>After onboarding: Design Studio → Guest Suite → click a universe card → preview → "Select [Universe]."</p>
      <h3 style={S.h3}>How to switch universes</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Design Studio → Guest Suite</li>
        <li style={S.li}>Click a different universe card (available ones)</li>
        <li style={S.li}>Preview and select</li>
        <li style={S.li}>Your active universe updates — all 10 assets switch to the new aesthetic instantly</li>
        <li style={S.li}>Any content you've entered (text, photos) is preserved — only the visual design changes</li>
      </ol>
      <div style={S.tip}><p style={S.tipText}><strong>What changes when you switch:</strong> Typography, colour palette, layout styles, section backgrounds across all assets. <strong>What doesn't change:</strong> Your couple names, wedding date, venue, photos, and any custom text you've written.</p></div>
    </div>
  ),
  'Editing your Save the Date': (
    <div>
      <p style={S.p}>Your Save the Date is the first piece guests receive — it announces your wedding and sets the aesthetic tone. In Openinvite, it's a digital asset you can download as a PNG, share directly, or print.</p>
      <h3 style={S.h3}>How to edit it</h3>
      <p style={S.p}><strong>Option A — Guest Suite:</strong> Design Studio → Guest Suite → Assets tab → click "Save the Date." Edit button opens the full editor.</p>
      <p style={S.p}><strong>Option B — Ava's Studio:</strong> Design Studio → Ava's Studio → Create Assets. The Save the Date is step 1 of 10.</p>
      <h3 style={S.h3}>Content fields</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Photo:</strong> click the media picker to select from your library or upload a new photo. Landscape photos (16:9) work best for the cinematic hero layout.</li>
        <li style={S.li}><strong>Overlay strength:</strong> slider 0–80% — controls how much the dark overlay dims your photo</li>
        <li style={S.li}><strong>Main text:</strong> defaults to "Save the Date" — editable</li>
        <li style={S.li}><strong>Subtitle:</strong> e.g. "Formal invitation to follow" — appears below the date</li>
      </ul>
      <h3 style={S.h3}>Auto-populated from Event Details (read-only)</h3>
      <ul style={S.ul}>
        <li style={S.li}>Your couple names</li>
        <li style={S.li}>Wedding date</li>
        <li style={S.li}>Venue name</li>
      </ul>
      <h3 style={S.h3}>Style options</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Layout:</strong> Centered / Split / Minimal / Bold</li>
        <li style={S.li}><strong>Background:</strong> Photo / Dark / Light</li>
        <li style={S.li}><strong>Letter spacing:</strong> slider</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Downloading:</strong> Click "Download PNG" in the right panel or asset grid. The download generates a high-resolution version of the current design.</p></div>
    </div>
  ),
  'Downloading and printing assets': (
    <div>
      <p style={S.p}>Every asset in your Guest Suite can be downloaded for digital sharing or professional printing.</p>
      <h3 style={S.h3}>Download formats</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>PNG:</strong> high resolution (300dpi equivalent), suitable for digital sharing and most print providers</li>
        <li style={S.li}><strong>PDF:</strong> available for print-optimised assets (Menu Card, Welcome Signage, Guest Tags, Save the Date)</li>
        <li style={S.li}><strong>SVG:</strong> available for the QR code</li>
      </ul>
      <h3 style={S.h3}>How to download</h3>
      <ol style={S.ol}>
        <li style={S.li}>In the Guest Suite → Assets tab, click any asset card</li>
        <li style={S.li}>Click "Download" in the asset editor or the ↓ button on the card</li>
      </ol>
      <h3 style={S.h3}>Print specifications</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Menu Card:</strong> A5 (148 × 210mm) portrait, 3mm bleed included in PDF</li>
        <li style={S.li}><strong>Welcome Signage:</strong> A1 (594 × 841mm) portrait, print at 100%</li>
        <li style={S.li}><strong>Guest Tags:</strong> A4 (210 × 297mm) with 6 tags per sheet, 3mm bleed, cut marks included</li>
        <li style={S.li}><strong>Save the Date:</strong> A5 landscape or standard postcard size (148 × 105mm)</li>
        <li style={S.li}><strong>Thank You Notes:</strong> A6 (105 × 148mm), double-sided</li>
      </ul>
      <h3 style={S.h3}>Recommended print providers (Australia)</h3>
      <ul style={S.ul}>
        <li style={S.li}>Canva Print, Officeworks Print & Copy, Vistaprint, Snapfish — all accept PDF uploads</li>
        <li style={S.li}>For premium: Momento, Nulab, Printing for Less</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Digital sharing:</strong> The Instagram Story Kit assets are pre-sized to 1080 × 1920px for Stories. Share PNG files directly via WhatsApp, Instagram, or email.</p></div>
    </div>
  ),
  'Importing guests from a spreadsheet': (
    <div>
      <p style={S.p}>Instead of adding guests one by one, you can import your entire guest list from a CSV or Excel file in seconds.</p>
      <h3 style={S.h3}>How to import</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Guest List in the sidebar</li>
        <li style={S.li}>Click "Import CSV" in the top-right action buttons</li>
        <li style={S.li}>Download the template file to see the expected column format</li>
        <li style={S.li}>Fill in your spreadsheet with your guest data</li>
        <li style={S.li}>Upload the completed file</li>
      </ol>
      <h3 style={S.h3}>Required columns</h3>
      <ul style={S.ul}>
        <li style={S.li}>first_name</li>
        <li style={S.li}>last_name</li>
      </ul>
      <h3 style={S.h3}>Optional columns</h3>
      <ul style={S.ul}>
        <li style={S.li}>email, phone, address, dietary_requirements</li>
        <li style={S.li}>rsvp_status (attending / declined / awaiting)</li>
        <li style={S.li}>table_name or table_number</li>
        <li style={S.li}>plus_one (true/false)</li>
        <li style={S.li}>notes, group (e.g. "Bride's Family", "Groom's Uni Friends")</li>
      </ul>
      <h3 style={S.h3}>Tips for a clean import</h3>
      <ul style={S.ul}>
        <li style={S.li}>One row per guest (not per couple — add each person as a separate row)</li>
        <li style={S.li}>RSVP status values must be exactly: attending, declined, or awaiting</li>
        <li style={S.li}>If a cell is empty, leave it blank — don't type "N/A"</li>
        <li style={S.li}>Remove any formatting (bold, colour) from your spreadsheet before uploading</li>
      </ul>
      <h3 style={S.h3}>After importing</h3>
      <p style={S.p}>All imported guests appear in your Guest List instantly. The dashboard stats update immediately. If a guest with the same name already exists, you'll be prompted to skip or overwrite.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Tip from Ava:</strong> Ask me to help you set up your guest groups. Type "Help me organise my guest list by group" in the Ava chat.</p></div>
    </div>
  ),
  'Tracking RSVPs and responses': (
    <div>
      <p style={S.p}>Openinvite automatically collects RSVPs when guests respond via your wedding website. You can also manually record responses for guests who reply by phone, text, or email.</p>
      <h3 style={S.h3}>How RSVPs work</h3>
      <ol style={S.ol}>
        <li style={S.li}>Guest visits your website and finds the RSVP page</li>
        <li style={S.li}>They enter their name and respond (attending/declining)</li>
        <li style={S.li}>Their response is matched to an existing guest record (by name) or creates a new one</li>
        <li style={S.li}>You see the update immediately in your Guest List</li>
      </ol>
      <h3 style={S.h3}>Each guest record shows</h3>
      <ul style={S.ul}>
        <li style={S.li}>RSVP status (colour-coded: green/red/grey)</li>
        <li style={S.li}>Meal choice (if you have meal options enabled)</li>
        <li style={S.li}>Dietary requirements, plus one status and name</li>
        <li style={S.li}>Song request and personal message to you</li>
      </ul>
      <h3 style={S.h3}>Manually recording a response</h3>
      <ol style={S.ol}>
        <li style={S.li}>Click a guest's row to open their record</li>
        <li style={S.li}>Change the RSVP Status field</li>
        <li style={S.li}>Save — the dashboard stats update instantly</li>
      </ol>
      <h3 style={S.h3}>Sending RSVP reminders</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Design Studio → Share</li>
        <li style={S.li}>Click "Not Yet RSVP'd" — auto-selects all guests without a response</li>
        <li style={S.li}>Choose "RSVP Reminder" as the email type</li>
        <li style={S.li}>The subject and message pre-fill with your deadline date</li>
        <li style={S.li}>Click Send</li>
      </ol>
      <div style={S.tip}><p style={S.tipText}><strong>Exporting responses:</strong> Guest List → Export CSV — downloads all guest records including RSVP status, meal choices, dietary requirements, and notes. Useful for sharing with your caterer or venue coordinator.</p></div>
    </div>
  ),
  'Setting up your seating chart': (
    <div>
      <p style={S.p}>The Seating page lets you organise your guests into tables. Your seating chart in the Guest Suite (the printed asset) pulls from this data automatically.</p>
      <h3 style={S.h3}>Setting up tables</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Seating in the sidebar</li>
        <li style={S.li}>Click "Add Table" — give it a name (e.g. "Table 1" or "The Smiths") and set the capacity</li>
        <li style={S.li}>Repeat for all your tables</li>
      </ol>
      <h3 style={S.h3}>Assigning guests to tables</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Option A — drag and drop:</strong> drag a guest name from the unassigned list onto a table</li>
        <li style={S.li}><strong>Option B — guest record:</strong> open a guest's record (from Guest List), set their Table field</li>
      </ul>
      <h3 style={S.h3}>The seating view shows</h3>
      <ul style={S.ul}>
        <li style={S.li}>Each table as a card with guest names listed</li>
        <li style={S.li}>Unseated guests in a panel on the left</li>
        <li style={S.li}>Table capacity and current count (e.g. "6 of 8 seated")</li>
        <li style={S.li}>Visual warnings when a table exceeds capacity</li>
      </ul>
      <h3 style={S.h3}>The Guest Suite Seating Chart asset</h3>
      <p style={S.p}>Once your seating is set up, your Seating Chart asset pulls this data live. It displays guest names alphabetically (or by table) with the table name next to each guest. Download as a PDF or PNG — ready to print or display at your venue entrance.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> Finalise your seating 2 weeks before the wedding when most RSVPs are in. Before that, use the seating page to plan approximate groupings.</p></div>
    </div>
  ),
  'Sending emails to your guest list': (
    <div>
      <p style={S.p}>The Share page lets you send personalised emails to your entire guest list or specific groups — without leaving Openinvite.</p>
      <h3 style={S.h3}>How to send</h3>
      <ol style={S.ol}>
        <li style={S.li}>Guest Suite → Share tab (or click "Share ↗" in the Guest Suite top bar)</li>
        <li style={S.li}>In the center column, use the Email Guests section</li>
        <li style={S.li}>Select your recipients: All Guests, Not Yet RSVP'd, Attending, or Declined — or select individually</li>
        <li style={S.li}>Choose your email type: Save the Date, Website Share, RSVP Reminder, or Wedding Update</li>
        <li style={S.li}>Edit the subject line and personal message</li>
        <li style={S.li}>Use {'{guestName}'} in your message to personalise each email automatically</li>
        <li style={S.li}>Click Send — the button shows your recipient count</li>
      </ol>
      <h3 style={S.h3}>Requirements</h3>
      <ul style={S.ul}>
        <li style={S.li}>Guests must have an email address in their record to receive emails</li>
        <li style={S.li}>Guests without an email address are excluded automatically — you'll see the count</li>
      </ul>
      <h3 style={S.h3}>Previously sent emails</h3>
      <p style={S.p}>A history list below shows: email type, guest count, date sent, and a Resend option.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Tips:</strong> Always preview by sending to yourself first. Space out your emails: Save the Date → Website Share (1–2 weeks later) → RSVP Reminder (2 weeks before deadline).</p></div>
    </div>
  ),
  'Setting up your wedding budget': (
    <div>
      <p style={S.p}>The Budget page helps you plan your total wedding spend, allocate it across categories, and track every payment as you go.</p>
      <h3 style={S.h3}>Setting your total budget</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Budget in the sidebar</li>
        <li style={S.li}>Click the total budget field at the top — enter your overall budget (select your currency)</li>
        <li style={S.li}>The budget breakdown shows how much is allocated and spent</li>
      </ol>
      <h3 style={S.h3}>Budget categories</h3>
      <p style={S.p}>Venue, Catering & Beverages, Photography & Videography, Florals & Décor, Entertainment, Attire, Hair & Makeup, Stationery & Invitations, Transport, Accommodation, Honeymoon, Gifts & Favours, Celebrant / Officiant, Miscellaneous.</p>
      <h3 style={S.h3}>Adding expenses</h3>
      <ol style={S.ol}>
        <li style={S.li}>Click "+ Add Expense"</li>
        <li style={S.li}>Fill in: vendor/item name, category, amount, date paid, payment method, and notes</li>
        <li style={S.li}>Save — the category spend updates immediately</li>
      </ol>
      <h3 style={S.h3}>Tracking paid vs pending</h3>
      <p style={S.p}>Each expense has a status: Paid / Pending / Deposit Paid. The budget overview shows your total committed spend (all expenses) vs total paid.</p>
      <h3 style={S.h3}>Budget warnings</h3>
      <p style={S.p}>Ava monitors your budget and surfaces alerts when a category exceeds its allocation, your total committed spend exceeds your budget, or a payment date is approaching.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Exporting:</strong> Budget → Export CSV — useful for sharing with your partner or financial advisor.</p></div>
    </div>
  ),
  'Adding and tracking vendors': (
    <div>
      <p style={S.p}>The Vendors page is your central directory for every supplier involved in your wedding — with contact details, contracts, and payment tracking all in one place.</p>
      <h3 style={S.h3}>Adding a vendor</h3>
      <ol style={S.ol}>
        <li style={S.li}>Go to Vendors in the sidebar</li>
        <li style={S.li}>Click "+ Add Vendor"</li>
        <li style={S.li}>Fill in: vendor name, category, contact person, phone, email, website</li>
        <li style={S.li}>Add booking status: Enquiring / Shortlisted / Booked / Confirmed / Cancelled</li>
        <li style={S.li}>Save</li>
      </ol>
      <h3 style={S.h3}>Each vendor record includes</h3>
      <ul style={S.ul}>
        <li style={S.li}>Contact details and booking status</li>
        <li style={S.li}>Contract notes and total contract value</li>
        <li style={S.li}>Deposit amount and due date; Balance amount and due date</li>
        <li style={S.li}>Payments made (list of actual payments with dates)</li>
        <li style={S.li}>Notes (parking instructions, setup times, special requirements)</li>
      </ul>
      <h3 style={S.h3}>Payment reminders</h3>
      <p style={S.p}>When a deposit or balance is due within 14 days, Ava flags it in your dashboard and you receive a reminder.</p>
      <h3 style={S.h3}>Linking to budget</h3>
      <p style={S.p}>When you mark a vendor payment as made, it automatically creates a matching entry in your Budget under the relevant category — no double entry needed.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> Open the Ava chat (✦ button) and say "What should I ask my photographer?" or "Help me prepare for a florist meeting." Ava generates a tailored list of questions for any vendor type.</p></div>
    </div>
  ),
  'Recording payments and deposits': (
    <div>
      <p style={S.p}>Keeping track of deposits and final payments prevents missed due dates and helps you stay on budget.</p>
      <h3 style={S.h3}>How to record a payment</h3>
      <ol style={S.ol}>
        <li style={S.li}>Open a vendor record from the Vendors page</li>
        <li style={S.li}>Scroll to the Payments section</li>
        <li style={S.li}>Click "+ Add Payment"</li>
        <li style={S.li}>Enter: amount, date paid, payment method, and a reference or receipt number</li>
        <li style={S.li}>Save — this payment flows to your Budget automatically</li>
      </ol>
      <h3 style={S.h3}>Setting up deposit and balance due dates</h3>
      <p style={S.p}>In each vendor record, set your Deposit amount + due date and Balance amount + due date. These appear in your Calendar automatically so you never miss them.</p>
      <h3 style={S.h3}>Payment methods to track</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Bank transfer:</strong> include the transaction reference</li>
        <li style={S.li}><strong>Credit card:</strong> note which card for reconciliation</li>
        <li style={S.li}><strong>Cheque:</strong> note the cheque number</li>
        <li style={S.li}><strong>Cash:</strong> add a note confirming receipt</li>
      </ul>
      <h3 style={S.h3}>Viewing all upcoming payments</h3>
      <p style={S.p}>Go to Calendar — filter by "Payments" to see all deposit and balance due dates in one view. Alternatively, check the Upcoming Events panel on the Overall dashboard.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Important:</strong> Always get a receipt or written confirmation for every payment, especially cash. Add the reference number to your vendor notes in Openinvite.</p></div>
    </div>
  ),
  'Using the budget breakdown view': (
    <div>
      <p style={S.p}>The Budget breakdown view gives you a visual overview of how your spend is distributed across categories — helping you spot where you're over-allocated or where you can save.</p>
      <h3 style={S.h3}>How to access it</h3>
      <p style={S.p}>Budget page → click the "Breakdown" tab (or the chart icon if available).</p>
      <h3 style={S.h3}>What the breakdown shows</h3>
      <ul style={S.ul}>
        <li style={S.li}>A bar or ring chart showing each category as a proportion of your total budget</li>
        <li style={S.li}>Allocated vs spent side-by-side for each category</li>
        <li style={S.li}>Colour-coded: green (under budget), amber (near limit), red (over budget)</li>
      </ul>
      <h3 style={S.h3}>Reading the breakdown</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Allocated:</strong> what you've planned to spend in that category</li>
        <li style={S.li}><strong>Committed:</strong> total of all expenses added (paid + pending)</li>
        <li style={S.li}><strong>Paid:</strong> actual money that has left your account</li>
        <li style={S.li}><strong>Remaining:</strong> allocated minus committed</li>
      </ul>
      <h3 style={S.h3}>Typical budget distribution (Australian weddings, 2025–2026)</h3>
      <ul style={S.ul}>
        <li style={S.li}>Venue: 25–35% of total budget</li>
        <li style={S.li}>Catering: 25–35%</li>
        <li style={S.li}>Photography: 8–12%</li>
        <li style={S.li}>Florals & Décor: 8–12%</li>
        <li style={S.li}>Entertainment: 5–8%</li>
        <li style={S.li}>Attire: 5–8%</li>
        <li style={S.li}>All other: 10–15%</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Using Ava for budget advice:</strong> Open the Ava chat (✦ button) and ask "Is my budget allocation realistic for 80 guests in Sydney?", "Where can I save without affecting the experience?", or "My florals are over budget — what are my options?" Ava benchmarks your spend against typical costs for your guest count, location, and wedding style.</p></div>
    </div>
  ),
};

const helpCategories = [
  {
    icon: 'LayoutDashboard',
    title: 'Getting Started',
    description: 'Your first steps with Openinvite',
    articles: [
      { title: 'How to complete your onboarding', time: '2 min read' },
      { title: 'Setting up your Event Details', time: '3 min read' },
      { title: 'Understanding the dashboard', time: '2 min read' },
      { title: 'Inviting a collaborator', time: '1 min read' },
    ]
  },
  {
    icon: 'Sparkles',
    title: 'Ava & AI Features',
    description: 'Get the most from your AI specialist',
    articles: [
      { title: 'What is Ava and what can she do?', time: '3 min read' },
      { title: "Using Ava's Studio step-by-step", time: '5 min read' },
      { title: 'Auto-filling your website with Ava', time: '2 min read' },
      { title: "Ava's vow writing assistant", time: '3 min read' },
    ]
  },
  {
    icon: 'Globe',
    title: 'Guest Suite',
    description: 'Build and publish your wedding website',
    articles: [
      { title: 'Adding sections to your website', time: '3 min read' },
      { title: 'Choosing a theme and typography', time: '2 min read' },
      { title: 'Setting up your RSVP page', time: '4 min read' },
      { title: 'Publishing and sharing your site', time: '2 min read' },
    ]
  },
  {
    icon: 'Mail',
    title: 'Guest Suite',
    description: 'Your invitation and print collection',
    articles: [
      { title: 'What is the Guest Suite?', time: '2 min read' },
      { title: 'Choosing and switching universes', time: '3 min read' },
      { title: 'Editing your Save the Date', time: '3 min read' },
      { title: 'Downloading and printing assets', time: '2 min read' },
    ]
  },
  {
    icon: 'Users',
    title: 'Guest Management',
    description: 'Managing your RSVPs and seating',
    articles: [
      { title: 'Importing guests from a spreadsheet', time: '3 min read' },
      { title: 'Tracking RSVPs and responses', time: '2 min read' },
      { title: 'Setting up your seating chart', time: '4 min read' },
      { title: 'Sending emails to your guest list', time: '3 min read' },
    ]
  },
  {
    icon: 'Wallet',
    title: 'Budget & Vendors',
    description: 'Keeping your finances on track',
    articles: [
      { title: 'Setting up your wedding budget', time: '2 min read' },
      { title: 'Adding and tracking vendors', time: '3 min read' },
      { title: 'Recording payments and deposits', time: '2 min read' },
      { title: 'Using the budget breakdown view', time: '2 min read' },
    ]
  },
];

function ArticlePanel({ article, onClose }) {
  const content = ARTICLES[article.title];
  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 520, maxWidth: '100vw',
      background: '#FFFFFF', boxShadow: '-8px 0 40px rgba(0,0,0,0.1)',
      zIndex: 1000, padding: '32px 36px', overflowY: 'auto', boxSizing: 'border-box',
    }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', marginBottom: 24, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'block', padding: 0 }}>← Back to Help Centre</button>
      <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, margin: '0 0 10px' }}>{article.category}</p>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 4, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>{article.title}</h2>
      <p style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 32, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 4 }}>{article.time}</p>
      <div style={{ fontSize: 15, color: '#333', lineHeight: 1.8, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {content || (
          <p style={S.p}>Content for this article is coming soon.</p>
        )}
      </div>
      <div style={{ borderTop: '1px solid #EEEEEE', marginTop: 40, paddingTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <p style={{ fontSize: 13, color: '#888', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Was this helpful?</p>
        <button style={{ padding: '6px 16px', border: '1px solid #EEEEEE', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Yes</button>
        <button style={{ padding: '6px 16px', border: '1px solid #EEEEEE', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No</button>
      </div>
    </div>
  );
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;
    const q = searchQuery.toLowerCase();
    return helpCategories.map(cat => ({
      ...cat,
      articles: cat.articles.filter(a => a.title.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)),
    })).filter(cat => cat.articles.length > 0);
  }, [searchQuery]);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{
        width: '100%', height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingLeft: 32, paddingRight: 32, boxSizing: 'border-box', position: 'relative',
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          Help centre
        </span>
      </div>
      <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Guides, tutorials, and FAQs</span>
      </div>

      <div style={{ padding: '40px 40px 80px', maxWidth: 1100, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 600, margin: '0 auto 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', marginBottom: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>How can we help?</h2>
          <p style={{ fontSize: 15, color: '#888', marginBottom: 24 }}>Search our guides, tutorials, and FAQs</p>
          <div style={{ position: 'relative' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              style={{ width: '100%', border: '1px solid #EEEEEE', padding: '14px 20px 14px 44px', fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            />
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filteredCategories.map((cat, ci) => {
            const Icon = ICON_MAP[cat.icon];
            return (
              <div
                key={ci}
                style={{ border: '1px solid #EEEEEE', padding: 24, background: '#FFFFFF', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0A0A0A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EEEEEE'}
              >
                <div style={{ marginBottom: 12, color: '#E03553' }}>
                  {Icon && <Icon size={20} strokeWidth={1.5} />}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 4, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>{cat.title}</p>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 20, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>{cat.description}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {cat.articles.map((article, ai) => (
                    <div
                      key={ai}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #F5F5F5', cursor: 'pointer' }}
                      onClick={() => setSelectedArticle({ ...article, category: cat.title })}
                    >
                      <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }}>{article.title}</span>
                      <span style={{ fontSize: 11, color: '#AAAAAA', whiteSpace: 'nowrap', marginLeft: 8 }}>{article.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid #EEEEEE', paddingTop: 40, marginTop: 40 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', marginBottom: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>Still need help?</p>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Our team is here Monday to Friday, 9am–5pm AEST</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" style={{ padding: '12px 24px', fontSize: 13 }}>
              Contact Support
            </button>
            <button className="btn-editorial-secondary" style={{ padding: '12px 24px', fontSize: 13 }}>
              ✦ Ask Ava
            </button>
          </div>
        </div>
      </div>

      {selectedArticle && (
        <ArticlePanel article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </div>
  );
}