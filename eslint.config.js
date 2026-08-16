import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  // A global-ignores entry (an object with ONLY `ignores`, no `files`) tells
  // ESLint to skip these files outright. Putting the same `ignores` list
  // inside the files-scoped object below instead only narrows which files
  // get THAT config's rules — it doesn't stop ESLint from still visiting
  // them, so an inline `eslint-disable-next-line react-hooks/exhaustive-deps`
  // comment in src/lib/a11y.js failed with "Definition for rule ... was not
  // found" (the react-hooks plugin was never registered for that file, so
  // its own disable comment couldn't be validated against it).
  { ignores: ["src/components/ui/**/*", "dist/**"] },
  // dist/** is build output. It is gitignored and untracked, but ESLint does
  // not read .gitignore, so without this entry it visits 238 emitted bundles.
  // prerendered/ IS tracked in git but holds only .html, which ESLint never
  // visits, so it needs no entry.
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
      // Previously matched by no config group at all, so entirely unlinted:
      // four dead imports had accumulated in App.jsx alone. src/api/** is the
      // BROWSER-side base44 client (import.meta.env) — not to be confused with
      // the top-level api/**, which is Node and is configured separately below.
      "src/App.jsx",
      "src/main.jsx",
      "src/api/**/*.{js,jsx}",
      "src/hooks/**/*.{js,jsx}",
      "src/integrations/**/*.{js,jsx}",
      "src/pagePreload.js",
      "src/pages.config.js",
      // src/lib was globally ignored until now — not because it is vendored
      // (all 66 files are hand-written app code: AuthContext.jsx,
      // resolveMyWedding.js, seatingChart.js, todoSort.js) but as a workaround
      // for a plugin-registration gap: an inline
      // `eslint-disable-next-line react-hooks/exhaustive-deps` in a11y.js:99
      // could not be validated because the react-hooks plugin was never
      // registered for that file, so the whole directory was skipped. Adding
      // it to THIS group registers the plugins and fixes the original problem
      // at its cause. It is browser code — 61 .js, 5 .jsx, 5 using React
      // hooks, zero using Node globals.
      "src/lib/**/*.{js,jsx}",
    ],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      // fix/silent-catch-family: bans a literally-empty catch block
      // (catch {} / catch (e) {}) anywhere in src/components or src/pages —
      // the exact shape of two of the bugs this PR fixed (Polls.jsx's
      // persist(), StudioHub.jsx's load()). Discovered while adding this
      // that eslint:recommended's own no-empty (and everything else in
      // ...pluginJs.configs.recommended/...pluginReact.configs.flat.recommended
      // spread above) was silently inert this whole time — object spread
      // doesn't merge a nested `rules` key, so this file's own explicit
      // `rules: {}` block below was overwriting the entire recommended
      // ruleset, not layering on top of it. Not fixed wholesale here
      // (unknown how many other now-dormant recommended-rule violations
      // exist across the whole src/ tree — that's its own audit), just
      // flagging the mechanism and turning this one specific rule back on
      // explicitly, since it's exactly what this PR needs enforced.
      // The rule this whole config exists to make possible. #406 shipped a
      // production crash — three declarations deleted by a range replace,
      // ReferenceError on /TodoList — that BOTH `npm run build` and
      // `npm run lint` passed, because no-undef was inert: the explicit
      // `rules` block below overwrites eslint:recommended rather than
      // layering on it (see the comment above). #410 is the other half of
      // the evidence: the same linter DID catch a dead import, because
      // unused-imports is registered. One rule on, one off, same session.
      "no-undef": "error",
      // Enabled after #429 took /Seating down in production with a temporal
      // dead zone: activeLabelForm (a useMemo, runs during render) read
      // eventAttendees ~60 lines above its `const` declaration. no-undef does
      // not model TDZ — the identifier IS defined, just not yet initialised —
      // so nothing caught it until the page crashed.
      //
      // functions: false deliberately. Function declarations hoist, that is a
      // language guarantee rather than an accident, and enabling it costs 9
      // more violations for a pattern the language explicitly supports.
      // classes: true costs nothing — zero violations in this codebase.
      "no-use-before-define": ["error", { "functions": false, "classes": true, "variables": true }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    // Server-side and tooling code. Node globals, not browser: api/** uses
    // process.env in 38 files and window/localStorage in none (the few matches
    // are prose in JSDoc). tests/persistence/** is plain Node too — no vitest,
    // jest or mocha anywhere, every test script invokes bare `node` — so no
    // test-runner globals are needed.
    files: ["api/**/*.{js,mjs}", "scripts/**/*.{js,mjs}", "tests/**/*.{js,mjs}", "*.config.js"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // "latest", NOT a pinned year. api/verify-signup.js:68 uses an import
        // attribute — `import x from '...json' with { type: 'json' }` — which
        // Node 20+ and Vercel run happily but ecmaVersion 2022 cannot parse,
        // producing a hard "Parsing error: Unexpected token with" that reads
        // exactly like a real lint finding. Do not "tidy" this back to a year.
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: { "unused-imports": pluginUnusedImports },
    rules: {
      // No react/react-hooks rules here — this code never renders.
      "no-undef": "error",
      // Enabled after #429 took /Seating down in production with a temporal
      // dead zone: activeLabelForm (a useMemo, runs during render) read
      // eventAttendees ~60 lines above its `const` declaration. no-undef does
      // not model TDZ — the identifier IS defined, just not yet initialised —
      // so nothing caught it until the page crashed.
      //
      // functions: false deliberately. Function declarations hoist, that is a
      // language guarantee rather than an accident, and enabling it costs 9
      // more violations for a pattern the language explicitly supports.
      // classes: true costs nothing — zero violations in this codebase.
      "no-use-before-define": ["error", { "functions": false, "classes": true, "variables": true }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["warn", { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }],
    },
  },
  {
    // Dual-runtime by nature, not by sloppiness. These are Node scripts, but
    // each contains Playwright `page.evaluate(() => ...)` callbacks whose
    // BODIES are serialised and executed inside the browser, where `document`
    // and `window` genuinely exist:
    //
    //   await page.evaluate(() => document.body.innerText)
    //   await page.evaluate(() => window.dispatchEvent(new Event('openAva')))
    //
    // So they get both global sets. Enabling no-undef without this produced 5
    // errors here and nowhere else in the repo — every one a false positive of
    // exactly this shape. Do not "tidy" this group away.
    //
    // Listed by name because there are only three. If a fourth Playwright file
    // appears, turn this into a directory pattern rather than growing the list.
    files: [
      "scripts/test-marketing-routes.mjs",
      "scripts/prerender.mjs",
      "scripts/capture/videos.mjs",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "unused-imports": pluginUnusedImports },
    rules: {
      "no-undef": "error",
      // Enabled after #429 took /Seating down in production with a temporal
      // dead zone: activeLabelForm (a useMemo, runs during render) read
      // eventAttendees ~60 lines above its `const` declaration. no-undef does
      // not model TDZ — the identifier IS defined, just not yet initialised —
      // so nothing caught it until the page crashed.
      //
      // functions: false deliberately. Function declarations hoist, that is a
      // language guarantee rather than an accident, and enabling it costs 9
      // more violations for a pattern the language explicitly supports.
      // classes: true costs nothing — zero violations in this codebase.
      "no-use-before-define": ["error", { "functions": false, "classes": true, "variables": true }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["warn", { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }],
    },
  },

  /**
   * no-use-before-define — KNOWN-VIOLATION CARVE-OUT. 56 files, and it may only
   * ever SHRINK.
   *
   * The rule is `error` everywhere else, which is the point: the next
   * render-time read of a `const` declared further down gets caught before it
   * ships. That is the bug that took /Seating down in production (#429) and the
   * one nothing else models — no-undef does not, because the identifier IS
   * defined, just not yet initialised.
   *
   * These 56 files violate it TODAY, and none of them is a live bug: 74 of the
   * 76 violations are function-valued consts referenced inside callbacks that
   * run after mount, and the other 2 are read by a hoisted function declaration
   * called at render. They are latent, not broken — exactly as #429's was, right
   * up until its call site started executing during render.
   *
   * WHY THEY ARE NOT SIMPLY REORDERED HERE: the fix is not mechanical. A trial
   * on one file produced an IDENTICAL multiset of lines and took it from 2
   * violations to 13, by moving a const above the multi-line import it reads.
   * Three context-sensitive failure modes showed up in that single file —
   * multi-line imports, dependency ordering, and statement-boundary detection —
   * which is the argument for an AST codemod (jscodeshift) rather than a text
   * transformation. That is scheduled as its own piece of work; see the handoff.
   *
   * THE LIST IS RATCHETED. scripts/test-no-use-before-define-ratchet.mjs fails
   * if a path appears here that is not already on it, or if the count rises.
   * Removing entries is free. Adding one means deliberately editing the guard.
   * Without that, an exclusions list is just a list that grows.
   */
  {
    files: [
      "src/components/event-details/VenueSearch.jsx",
      "src/components/games/GamesManager.jsx",
      "src/components/guest-experience/HotelRecommendations.jsx",
      "src/components/guest-experience/RestaurantRecommendations.jsx",
      "src/components/guest-experience/ThingsToDo.jsx",
      "src/components/guest-experience/TransportationOptions.jsx",
      "src/components/layout/AnimatedSidebar.jsx",
      "src/components/layout/CollaborateModal.jsx",
      "src/components/messages/WhatsAppCompose.jsx",
      "src/components/music/MusicSuggestionsModal.jsx",
      "src/components/notes/SuggestionsModal.jsx",
      "src/components/shared/AIWeddingAssistant.jsx",
      "src/components/vendors/VendorContactSection.jsx",
      "src/components/vendors/VendorDetailPanel.jsx",
      "src/lib/AuthContext.jsx",
      "src/pages/Accommodation.jsx",
      "src/pages/Beauty.jsx",
      "src/pages/Budget.jsx",
      "src/pages/Calendar.jsx",
      "src/pages/CeremonyDetails.jsx",
      "src/pages/DailyUpdate.jsx",
      "src/pages/Dashboard.jsx",
      "src/pages/EmergencyContact.jsx",
      "src/pages/EntertainmentDetails.jsx",
      "src/pages/EventDetails.jsx",
      "src/pages/FoodBeverage.jsx",
      "src/pages/GuestAccommodation.jsx",
      "src/pages/GuestExperience.jsx",
      "src/pages/Guests.jsx",
      "src/pages/Honeymoon.jsx",
      "src/pages/Invitations.jsx",
      "src/pages/LiveStreaming.jsx",
      "src/pages/Messages.jsx",
      "src/pages/Moodboard.jsx",
      "src/pages/Notes.jsx",
      "src/pages/Onboarding.jsx",
      "src/pages/OurStory.jsx",
      "src/pages/PhotoGallery.jsx",
      "src/pages/Photography.jsx",
      "src/pages/Policies.jsx",
      "src/pages/Polls.jsx",
      "src/pages/Registry.jsx",
      "src/pages/Schedule.jsx",
      "src/pages/ScheduleHub.jsx",
      "src/pages/Seating.jsx",
      "src/pages/StudioWebsite.jsx",
      "src/pages/Styling.jsx",
      "src/pages/TodoList.jsx",
      "src/pages/Tour.jsx",
      "src/pages/Transport.jsx",
      "src/pages/VendorMarketplace.jsx",
      "src/pages/Vendors.jsx",
      "src/pages/VowsSpeeches.jsx",
      "src/pages/WeddingFavours.jsx",
      "src/pages/WeddingParty.jsx",
      "src/pages/WeddingWebsite.jsx"
    ],
    rules: { "no-use-before-define": "off" },
  },
];
