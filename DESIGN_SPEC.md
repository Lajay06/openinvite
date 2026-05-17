# Openinvite Design Specification

## Typography
- Font: Plus Jakarta Sans (already loaded via * selector in index.css)
- Base size: 16px (browser default)
- All text: sentence case only. No uppercase, no ALL CAPS anywhere.
- Headings: font-weight 700, letter-spacing -0.02em, color #0A0A0A
- Body: font-weight 400, color #0A0A0A
- Muted text: color rgba(10,10,10,0.4) — never #888888
- Labels/captions: font-size 11px, color rgba(10,10,10,0.4)

## Colours
- Brand red/pink: #E03553
- Purple: #9333ea  
- Gradient (Ava, avatar): linear-gradient(135deg, #ec4899, #9333ea)
- Black (top bar): #0A0A0A
- White: #FFFFFF
- Border: rgba(10,10,10,0.08)
- Background: #FFFFFF (pages), #F7F7F7 (right panel)
- Muted background: rgba(10,10,10,0.03)

## Spacing
- Page content padding: 32px horizontal, 24px vertical
- Section gap: 24px
- Card inner padding: 20px
- Form field gap: 16px

## Border radius
- Default: 0px (sharp corners everywhere)
- Pills/badges: 999px
- Buttons: 999px (pill shape)

## Layout
- Top bar: fixed, full width, 48px height, background #0A0A0A, z-index 50
  Left: logo + wedding name/date/countdown
  Center: search pill (background rgba(255,255,255,0.1), border-radius 999px, width 220px)
  Right: bell icon + avatar dropdown
- Sidebar: fixed, left 0, top 48px, width 200px, background #FFFFFF
- No sub-header bar — DashboardPageHeader is the page-level header
- Content: margin-left 200px, padding-top 48px
- Right panel (dashboard only): width 35%, background #F7F7F7

## Components

### DashboardPageHeader
- Used on every dashboard page
- Padding: 10px 32px
- Title: font-size 18px, font-weight 600, color #0A0A0A
- Subtitle: font-size 12px, color rgba(10,10,10,0.4), inline beside title

### Buttons
- Primary: background #E03553, color white, border-radius 999px,
  padding 6px 14px, font-size 12px, font-weight 600
- Secondary: background rgba(10,10,10,0.08), border 1px solid rgba(10,10,10,0.12),
  color #0A0A0A, border-radius 999px, padding 6px 14px, font-size 12px
- Ava floating button: pill shape, gradient bg linear-gradient(135deg,#ec4899,#9333ea),
  padding 10px 18px, shows Sparkles icon + "Ask Ava" text, bottom-right fixed

### Form inputs
- Underline style only: no box, border-bottom 1px solid rgba(10,10,10,0.15)
- On focus: border-bottom color #E03553
- Label: font-size 11px, font-weight 600, color rgba(10,10,10,0.4),
  letter-spacing 0.06em, sentence case
- Font-size: 14px, color #0A0A0A

### Cards
- Background: #FFFFFF
- Border: 1px solid rgba(10,10,10,0.08)
- Border-radius: 0px
- Padding: 20px
- No box-shadow

### Tabs
- Tab bar: border-bottom 1px solid rgba(10,10,10,0.08)
- Active tab: color #0A0A0A, font-weight 600, 
  border-bottom 2px solid #0A0A0A
- Inactive tab: color rgba(10,10,10,0.4), font-weight 400
- Tab label: font-size 13px, sentence case

### Badges/Pills
- Border-radius: 999px
- Font-size: 10px, font-weight: 600, letter-spacing: 0.02em
- Padding: 2px 7px
- Status colours:
  Confirmed/complete: background #dcfce7, color #166534
  Pending: background #fef9c3, color #854d0e
  Declined/cancelled: background #fee2e2, color #991b1b
  Default: background rgba(10,10,10,0.06), color #0A0A0A

### Accordion
- All items collapsed by default (defaultValue={[]})
- Header: font-size 14px, font-weight 600
- Border: 1px solid rgba(10,10,10,0.08) between items

### Sidebar navigation
- Item font-size: 12px
- Item padding: 7px 12px
- Active item: background rgba(224,53,83,0.08), color #E03553,
  border-left 2px solid #E03553
- Section label: font-size 10px, letter-spacing 0.06em,
  color rgba(10,10,10,0.4), sentence case
- Icon size: 14px
- Design studio is a regular NavItem (Sparkles icon), not a special red pill

## Rules
- No text-transform: uppercase anywhere
- No box-shadow on cards
- No rounded corners except buttons, pills, badges
- Every dashboard page must use DashboardPageHeader
- All data fetched via base44.entities.* authenticated client
- Sentence case everywhere — headings, labels, tabs, buttons
- Muted text minimum contrast: rgba(10,10,10,0.4), never #888888
