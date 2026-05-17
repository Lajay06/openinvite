# Claude Code Instructions — Openinvite

## Read first
Before making ANY change, read DESIGN_SPEC.md in the 
project root. All changes must comply with it.

## Rules
- Sentence case everywhere — no ALL CAPS, no Uppercase Every Word
- No text-transform: uppercase anywhere in CSS or JSX
- No box-shadow on cards
- No rounded corners except buttons and pills (border-radius: 999px)
- Every dashboard page must use DashboardPageHeader component
- All data via base44.entities.* authenticated client only
- No imports from @/entities/* — use base44.entities.* instead
- Font: Plus Jakarta Sans, always
- Muted text: rgba(10,10,10,0.4) — never #888 or gray-400/500
- All accordions: defaultValue={[]} (collapsed by default)
- Primary colour: #E03553
- Black: #0A0A0A

## After every change
- Run npm run build and confirm exit 0
- Push to GitHub
- If a new pattern was introduced, update DESIGN_SPEC.md

## File structure
- Layout shell: src/Layout.jsx
- Sidebar: src/components/layout/AnimatedSidebar.jsx  
- Page header: src/components/layout/DashboardPageHeader.jsx
- Global styles: src/index.css
- Design tokens: src/styles/tokens.js
- Base44 client: src/api/base44Client.js
