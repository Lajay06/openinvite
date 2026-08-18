# Phase 0 — the Layout double-mount

Prepared 2026-08-18 against main `b3bec41`. **Report only. No code.**

---

## 0. One correction before anything else

I could not find the ticket or the instance-id trace on file. Nothing in
`scratchpad/`, and nothing in the root or `docs/` markdown matches. The nearest
thing is `AUDIT_2026-07.md` **S5**, which is a *different* double-fetch —
`useCollaboratorContext()` called independently from `Layout.jsx` and from the
page, firing `/api/collaborator-context` twice. That one is a duplicated hook
call, not a duplicated tree, and this fix will not address it.

So everything below is derived from the code rather than from the trace. If the
trace exists somewhere I haven't looked, it is worth diffing against my numbers
before we build.

---

## 1. The defect, located exactly

`src/Layout.jsx` renders `{children}` **twice**, in two sibling containers that
are both always mounted:

```
:638   <div className="hidden lg:block page-content"   style={{ marginLeft: 200, paddingTop: contentTopOffset, … }}>
:648   <div className="lg:hidden page-content"          style={{ paddingTop: 64, … }}>
```

`hidden` and `lg:hidden` are **CSS-only**. React mounts both subtrees
unconditionally, so on every dashboard page view:

- the page component mounts **twice**, with two independent state trees
- every `useEffect` fires **twice** — 34 pages under `src/pages/` have a
  `load*` function, so this is the 2× `loadData` in the report
- both copies keep running: timers, subscriptions, and refetches all double

**Scope: 94 routes.** Every dashboard page passes through `LayoutShell`.

### What is actually different between the two containers

Nothing structural. The children are byte-identical — same `Suspense`, same
fallback, same `canViewCurrentPage` branch. They differ in exactly three
values:

| | desktop | mobile |
|---|---|---|
| `marginLeft` | `200` (`SIDEBAR_WIDTH`) | absent (0) |
| `paddingTop` | `contentTopOffset` (computed: top bar + banners) | `64` |
| `--page-content-top` | `${contentTopOffset}px` | `64px` |

**`--page-content-top` is never read.** Two writes, zero `var()` reads
anywhere in `src/` or the Tailwind config. It is dead, and worth deleting with
this change rather than carrying it into the new structure.

That leaves **two** genuinely differing values, both pure layout.

---

## 2. Three approaches

### A. Single tree, CSS-driven breakpoint — **recommended**

Render `{children}` once, in one container, and move the two differing values
into a media query. The computed desktop offset rides in as a CSS custom
property, which is the only part that needs JS:

```
<div className="page-content" style={{ '--content-top-desktop': `${contentTopOffset}px` }}>
```
```css
.page-content { padding-top: 64px; margin-left: 0; }
@media (min-width: 1024px) {
  .page-content { padding-top: var(--content-top-desktop); margin-left: 200px; }
}
```

**Why this is the right shape here:** the two trees were never structurally
different. They are one layout with two paddings. Reaching for JS breakpoint
state to solve a CSS problem would add a state machine where a media query
does the job.

| | |
|---|---|
| mounts per page view | **1**, at every width |
| remount on resize | **never** — no JS breakpoint state exists to change |
| state across resize | **fully preserved**, by construction |
| transition cost | **none.** `.page-content` has a 0.35s `pageFadeIn` on mount; today crossing 1024px does not re-trigger it (both trees are already mounted), and it will not after either |
| risk | lowest — no new state, no new hook, no new render path |
| 1024px consistency | the media query matches Tailwind `lg:` and the existing `matchMedia('(min-width: 1024px)')` in `main.jsx:44` |

**The one real cost:** `marginLeft` and `paddingTop` move from inline style
into `index.css`, so a future reader changing `SIDEBAR_WIDTH` in JS must also
change the CSS. Mitigated by feeding the sidebar width through as a second
custom property, so JS stays the single source of truth for both numbers.

### B. Conditional mount on a JS breakpoint hook

A `useIsDesktop()` hook backed by `matchMedia`, rendering one container or the
other.

- mounts per page view: 1 ✔
- **remounts the entire page on every 1024px crossing** — resizing a desktop
  window across the breakpoint, or an iPad rotation, destroys and rebuilds the
  page: unsaved form state lost, scroll position lost, every `loadData` re-fires
- re-triggers the 0.35s `pageFadeIn` on each crossing — a visible flash that
  does not happen today
- adds a hook, an event listener, and an SSR/first-paint hydration question

It solves the mount count and introduces a worse bug in exchange. Not
recommended.

### C. Route-level split (`/m/*` or similar)

Genuinely separate desktop and mobile route trees.

- mounts per page view: 1 ✔
- an enormous change: 94 routes, duplicated navigation, two URL spaces, SEO and
  deep-link implications, and a redirect on every resize
- justified only if desktop and mobile were diverging into *different products*.
  They are not — they differ by 200px of margin.

Not recommended, and I would want a product reason rather than a technical one
before revisiting it.

---

## 3. Verification plan

The diff is small; the blast radius is 94 routes. So the plan is weighted
accordingly.

### 3.1 Instance-count trace — the primary evidence

A temporary instrumented build that assigns each mount a random instance id and
logs `[mount] <Page> <instanceId>` from a `useEffect(…, [])`, plus a counter on
the real network calls.

| assertion | today | required |
|---|---|---|
| mounts per page view @ 1440px | 2 | **1** |
| mounts per page view @ 390px | 2 | **1** |
| `/api/my-guests` calls per Guests page view | 2 | **1** |
| distinct instance ids per page view | 2 | **1** |

Captured **before and after** on the same pages, so the "1×" claim is a
measured change and not an assertion. Instrumentation is removed before the PR;
the numbers go in the report.

The network-call count matters more than the mount log: it is the
user-observable cost, and it is what an instance-id trace is really a proxy for.

### 3.2 Breakpoint-crossing behaviour — the leg most likely to be skipped

The failure mode approach B would introduce, checked explicitly on A:

1. load a dashboard page at 1440px
2. type into a filter or form field, scroll down
3. resize across 1024px in both directions
4. assert: **no remount** (instance id unchanged), typed value intact, scroll
   position intact, no `pageFadeIn` re-trigger, no additional network calls

This is the assertion that distinguishes A from B, so it is the one that has to
be run rather than reasoned about.

### 3.3 Painted-pixels pass

Every distinct dashboard layout at **1440px and 390px**, before and after,
compared visually:

Dashboard, Guests, Seating, Messages, Polls & games, Schedule, To do, Budget,
Checklist, Registry, Vendors, Moodboard, Styling, Music, Photography, Design
studio, Event details, Daily update, Overall, Wedding party, Account.

Watching specifically for: top offset with **and without** the trial/collaborator
banner (that is what `contentTopOffset` computes, and it is the value moving
into CSS), sidebar clearance at exactly 1024px, and the mobile top bar.

Seating (`S19`: fixed-pixel panels, no mobile handling) and the website builder
(`N9`: desktop-only) are known-unresponsive today. They must be **no worse**,
not fixed — fixing them is a separate scope.

### 3.4 Regression suite

`npm run build`, `npm run test:ci`, `npm run test:marketing-routes`. The last
matters here: `Layout.jsx` is imported by the public tree, and a component
referenced but not imported ships a blank error-boundary page.

### 3.5 Production verification

After merge: deployment fingerprint, then the instance-count trace re-run on
production at both widths, plus a spot-check of the banner-present offset.

---

## 4. What I would not do in this PR

- **`AUDIT_2026-07.md` S5** — the `useCollaboratorContext()` double-fetch. Real,
  adjacent, and a different cause. Folding it in would make the painted-pixels
  pass ambiguous about which change caused any regression.
- **Seating / builder responsiveness** (S19, N9) — out of scope, must be no worse.
- Deleting `--page-content-top` is the one extra I *would* include: it is dead,
  it lives in the exact lines being rewritten, and leaving it would carry a
  dead variable into the new structure.

---

## 5. Recommendation

**Approach A.** One tree, one mount, breakpoint in CSS. It fixes the double
mount without introducing the resize-remount that B would, and without the
scope of C.

The verification that decides whether it worked is **§3.1 (1× per page view,
measured before and after)** and **§3.2 (no remount across the breakpoint)**.
The painted-pixels pass is what protects the other 93 routes from the two
layout values moving into CSS.
