# Push notifications for the Openinvite mobile app: backend proposal

Status: **proposal, for approval. Nothing here has been applied.** No entity,
RLS rule, function, cron, env var or secret has been changed on this branch.
Schema discipline applies: every definition below is written exactly as it
would be pushed, so it can be reviewed as a diff.

Written against the platform as documented in `BASE44_PLATFORM_NOTES.md` and
the code as it stands: `api/_lib/notify.js` (the one server-side writer of
`Notification` rows), `base44/entities/Notification.jsonc`, the three endpoints
that call `notify()` (`api/rsvp-submit.js`, `api/collaborator-accept.js`,
`api/questionnaire-answer-submit.js`), the Vercel crons in `vercel.json` and
`api/cron/*`, and the app side in `src/mobile/notifications/`.

## 1. What exists today

- **`Notification` entity** (`base44/entities/Notification.jsonc`): `recipient_user_id, type, title, body, link, read, is_test`. RLS: `create: null`, `read` / `update` / `delete` scoped to `data.recipient_user_id == {{user.id}}`. Written by the admin key through `notify()`; read by the desktop bell (`src/lib/useNotifications.js`) and merged into the mobile feed (`src/mobile/notifications/useNotifications.js`).
- **Writers**: `rsvp_received` (from `api/rsvp-submit.js`), `collaborator_joined`, `questionnaire_answered`. The enum also lists `task_due` and `system`, unused.
- **Derived on the client** (mobile only, `src/mobile/notifications/feed.js`): guest messages, song requests, poll votes, gifts, tasks due or overdue, payments due, the morning briefing. These have no row and no push today.
- **Crons**: `0 9 * * *` (`send-onboarding-emails`, `send-weekly-digest`) and `*/15 * * * *` (`check-activation-mismatch`), all `GET /api/cron/*` guarded by `CRON_SECRET`.
- **Settings**: per-group toggles and quiet hours, stored on the phone (`src/mobile/notifications/store.js`), not on the server.

## 2. Design in one paragraph

Keep `Notification` as the single feed table and widen its `type` enum; add one new entity, `DeviceToken`, owner-scoped, written by the app itself. Every event that should notify writes a `Notification` row server-side (the existing `notify()` helper, extended), and one new fan-out function reads rows it has not yet sent, applies the recipient's settings and quiet hours, and pushes through APNs and FCM. The app's `useNotifications` hook stops deriving and reads rows only. Guest-writable data stays where it is: guests never write to either table; the append-only entities they do write to (`RsvpResponse`, `GuestMessage` via the guest endpoint, `SongRequest`, `PollVote`, `GuestbookEntry`, `ReceivedGift` via the registry endpoint) become the *triggers*, in the server functions that already handle those submissions.

## 3. Schema: exact definitions

### 3.1 `Notification` (modified: enum widened, four columns added)

File: `base44/entities/Notification.jsonc`. Additions are marked `// NEW`. Nothing existing changes shape, so every current row stays valid.

```jsonc
{
  "name": "Notification",
  "type": "object",
  "properties": {
    "recipient_user_id": { "type": "string" },
    "type": {
      "type": "string",
      "enum": [
        "rsvp_received",
        "collaborator_joined",
        "questionnaire_answered",
        "task_due",
        "system",
        "rsvp_attending",      // NEW: one row per reply, so the phone can say who
        "rsvp_declined",       // NEW
        "rsvp_maybe",          // NEW
        "message",             // NEW: a GuestMessage arrived
        "guestbook",           // NEW: a GuestbookEntry arrived
        "song_request",        // NEW: a SongRequest arrived
        "poll_vote",           // NEW: votes on a poll, batched per poll per hour
        "gift",                // NEW: a ReceivedGift arrived
        "task_overdue",        // NEW: a Note (view_type todo) is past its date
        "payment_due",         // NEW: an unpaid Budget row is within 7 days of payment_date
        "briefing"             // NEW: Ava's morning line
      ]
    },
    "title": { "type": "string" },
    "body": { "type": "string" },
    "link": { "type": "string" },
    "read": { "type": "boolean", "default": false },
    "is_test": { "type": "boolean", "default": false },
    "source_key": {            // NEW
      "type": "string",
      "description": "Idempotency key: '<type>:<source entity id>[:<bucket>]'. The fan-out and the triggers both dedupe on it, so a retried webhook or a re-run cron never writes or sends twice. Example 'message:6f1a…', 'poll_vote:p1:2026-09-21T09', 'briefing:2026-09-21'."
    },
    "push_state": {            // NEW
      "type": "string",
      "enum": ["pending", "sent", "skipped", "failed"],
      "default": "pending",
      "description": "pending: written, not yet fanned out. sent: at least one device accepted it. skipped: the recipient's settings or quiet hours held it back (still shows in the app). failed: every device rejected it after retries."
    },
    "push_sent_at": {          // NEW
      "type": "string",
      "format": "date-time"
    },
    "data": {                  // NEW
      "type": "object",
      "description": "The small payload the phone needs to deep-link precisely: { guestId, messageId, pollId, budgetId, taskId, songRequestId }. Never a name, email or free text: those live in title/body, already scoped to the recipient."
    }
  },
  "required": ["recipient_user_id", "type", "title"],
  "rls": {
    "create": null,
    "read":   { "data.recipient_user_id": "{{user.id}}" },
    "update": { "data.recipient_user_id": "{{user.id}}" },
    "delete": { "data.recipient_user_id": "{{user.id}}" }
  }
}
```

**Why `create: null` stays.** `BASE44_PLATFORM_NOTES.md` confirms the admin key is evaluated against RLS like any caller and has no `{{user.id}}`, so the only way the server can write a row *for* a couple is an open create. That is the existing design and it is safe for the same reason the notes give: the row carries nothing sensitive beyond what the recipient is allowed to read, and `read` is scoped to the recipient. Guests never call this entity: they submit through the server endpoints, which write here with the admin key.

**Indexes.** Base44 does not expose index definitions. The reads the fan-out and the app make are `recipient_user_id` (RLS-scoped, already the read path) and `push_state == 'pending'` (admin, unscoped list, filtered server-side). At the row counts a wedding produces (hundreds, not millions) a filter on `push_state` is fine; if Base44 later exposes indexes, add `(push_state, created_date)` and `(recipient_user_id, created_date)`.

### 3.2 `DeviceToken` (new entity)

File: `base44/entities/DeviceToken.jsonc`. Written by the app after registering for push, on the couple's own session (their token, their `created_by_id`), so ordinary owner-scoped RLS works with no admin path.

```jsonc
{
  "name": "DeviceToken",
  "type": "object",
  "properties": {
    "platform": {
      "type": "string",
      "enum": ["ios", "android"],
      "description": "Which push service the token belongs to."
    },
    "token": {
      "type": "string",
      "description": "The APNs device token (hex) or the FCM registration token, verbatim. Rotates; the app re-registers on every launch and the server upserts by (created_by_id, platform, token)."
    },
    "app_version": { "type": "string" },
    "device_name": {
      "type": "string",
      "description": "The user-facing name from Capacitor Device.getInfo().name, for the Account screen's 'Devices' row. Optional."
    },
    "last_seen_at": { "type": "string", "format": "date-time" },
    "disabled_at": {
      "type": "string",
      "format": "date-time",
      "description": "Set by the fan-out when APNs returns 410 Unregistered or FCM returns UNREGISTERED / INVALID_ARGUMENT. A disabled token is skipped and cleaned up after 30 days."
    },
    "is_test": { "type": "boolean", "default": false }
  },
  "required": ["platform", "token"],
  "rls": {
    "create": { "created_by_id": "{{user.id}}" },
    "read":   { "created_by_id": "{{user.id}}" },
    "update": { "created_by_id": "{{user.id}}" },
    "delete": { "created_by_id": "{{user.id}}" }
  }
}
```

**The admin key and `DeviceToken`.** Owner-scoped `read` returns an empty array to the admin key (platform notes, table row 1). The fan-out therefore reads tokens through a server endpoint that lists them *as the recipient*, which the platform cannot do either, so the practical design is: the fan-out lists `DeviceToken` with `read: null`? **No.** Tokens are credentials for pushing to someone's phone; they must not be listable by any API token. Instead:

- `read` stays owner-scoped.
- The fan-out reads tokens from a **server-side mirror keyed by user** kept in `Notification`'s sibling: when the app registers, it calls `POST /api/push/register` (Bearer, the couple's own session) and the endpoint writes the `DeviceToken` row *with the user's own token* (owner-scoped create works) **and** records `{ userId → [tokens] }` in a server-only store the admin key can read. The smallest such store on this stack is a second entity, `PushSubscription`, with `create: null` / `read: null` and the identifying fields HMAC-hashed exactly as `api/_lib/pollAuth.js` hashes guest identifiers, the token itself AES-256-GCM encrypted with `BASE44_ADMIN_KEY` as `api/_lib/questionnaireCrypto.js` does for answers.

That is the honest cost of owner-scoped RLS plus an admin key with no identity: two rows per device, one the couple can see and manage, one the server can read but nobody can decode without the key. The alternative, a single open-read table of raw tokens, is ruled out.

```jsonc
// base44/entities/PushSubscription.jsonc (new, server-only)
{
  "name": "PushSubscription",
  "type": "object",
  "properties": {
    "user_hash": { "type": "string", "description": "HMAC-SHA256(BASE44_ADMIN_KEY, recipient_user_id). The fan-out looks up by this." },
    "platform": { "type": "string", "enum": ["ios", "android"] },
    "token_enc": { "type": "string", "description": "AES-256-GCM(token), keyed from BASE44_ADMIN_KEY, same construction as QuestionnaireResponse.encrypted_answers." },
    "token_hash": { "type": "string", "description": "HMAC-SHA256 of the token, the upsert key. Never the token." },
    "disabled_at": { "type": "string", "format": "date-time" },
    "is_test": { "type": "boolean", "default": false }
  },
  "required": ["user_hash", "platform", "token_enc", "token_hash"],
  "rls": { "create": null, "read": null, "update": null, "delete": null }
}
```

Open on every operation because only the server ever touches it and every field is a digest or ciphertext; there is nothing to protect by RLS that the key does not already protect. Cleanup of disabled rows runs in the cron.

### 3.3 Settings on the server (so the fan-out can respect them)

No new entity. `User` already carries preference JSON (`src/lib/notificationPrefs.js` reads `DEFAULT_NOTIFICATION_PREFS` off the user). The app's `setSettings` gains one line: `base44.auth.updateMe({ push_prefs: settings })`, the same call `Account.jsx` uses for profile fields. **This adds a field to `User`.** It is listed under "needs approval" below; until it is approved, the fan-out treats absent prefs as all on and no quiet hours.

Shape of `push_prefs`, exactly what `src/mobile/notifications/store.js` writes locally today:

```json
{ "groups": { "rsvps": true, "messages": true, "requests": true, "gifts": true, "tasks": true, "briefing": true },
  "quietHours": { "enabled": false, "from": "22:00", "to": "07:00" },
  "timezone": "Australia/Sydney" }
```

`timezone` is new and needed: quiet hours and the 7am briefing are local times.

## 4. What generates each notification

All writes go through `notify()` in `api/_lib/notify.js`, extended with `sourceKey` and `data`, and made idempotent: before creating, it lists `Notification` where `source_key == sourceKey` (admin key, `read` is recipient-scoped so this needs the row to carry the recipient... it does not, so the dedupe is done in the fan-out instead: see 5). The trigger functions are the endpoints that already receive the events, so no database triggers are needed and none are available on this platform.

| Type | Trigger | Where the call goes | `source_key` |
|---|---|---|---|
| `rsvp_attending`, `rsvp_declined`, `rsvp_maybe` | a guest submits | `api/rsvp-submit.js`, beside the existing `rsvp_received` call (which stays for the desktop bell) | `rsvp:<guestId>:<status>` |
| `message` | a guest writes from the site | the endpoint that creates `GuestMessage` (`api/guest-message-submit.js` or the guest-site handler that does today) | `message:<messageId>` |
| `guestbook` | a guest signs | the endpoint that creates `GuestbookEntry` | `guestbook:<entryId>` |
| `song_request` | a guest requests | the endpoint that creates `SongRequest` (`api/song-request-submit.js`) | `song_request:<requestId>` |
| `poll_vote` | a guest votes | `api/wedding-poll-vote.js`, `api/rsvp-poll-vote.js`; batched: one row per poll per hour, body updated with the count | `poll_vote:<pollId>:<YYYY-MM-DDTHH>` |
| `gift` | a gift is recorded | the registry endpoint that creates `ReceivedGift` | `gift:<giftId>` |
| `task_due`, `task_overdue` | scheduled | new `api/cron/notify-due.js`, daily 07:00 local per recipient (see 5.3) | `task_due:<noteId>:<YYYY-MM-DD>` |
| `payment_due` | scheduled | same cron, unpaid `Budget` rows with `payment_date` within 7 days | `payment_due:<budgetId>:<YYYY-MM-DD>` |
| `briefing` | scheduled | same cron, one per couple per day, body from `src/lib/dayState.js`'s `avaSentence` (already the desktop's) | `briefing:<userId>:<YYYY-MM-DD>` |

The cron needs to read every couple's `Note`, `Budget`, `Guest` and `WeddingDetails`. Those are owner-scoped, so the admin key cannot list them across couples (platform notes). The cron therefore iterates users (`User` is readable with the admin key, as `send-weekly-digest.js` already does) and, per user, calls the same server-side readers the digest uses. This is the existing digest pattern extended, not a new access path.

## 5. The fan-out function

`api/cron/push-fanout.js`, `GET`, guarded by `CRON_SECRET`, on `*/2 * * * *` (Vercel cron, added to `vercel.json`). It is a cron rather than a trigger so a burst of RSVPs produces one pass, retries are natural, and nothing sends from inside a guest-facing request.

```
1. list Notification where push_state == 'pending', oldest first, limit 200
     (admin key; Notification.read is recipient-scoped, so this needs
     read: null OR a server-only read path. See "needs approval": the
     proposal is to add "data.push_state" to a server-only allow rule if
     the platform supports $or in read RLS; if not, the cron reads via a
     PushOutbox entity with read: null that notify() writes in parallel,
     the same "append-only mirror" shape as PushSubscription.)
2. group by recipient_user_id; dedupe by source_key within the batch
3. per recipient:
     a. prefs = User.push_prefs (admin read of User is allowed today) or defaults
     b. if the type's group is off in prefs         -> push_state = 'skipped'
     c. if quiet hours cover now (recipient tz)     -> leave pending; cron picks it up after
     d. subscriptions = PushSubscription where user_hash == hmac(userId) and !disabled_at
     e. if none                                      -> push_state = 'skipped'
     f. payload = build(type, title, body, link, data)  (section 6)
     g. for each subscription: decrypt token, send
          ios:     APNs HTTP/2, token auth (p8), topic = au.com.openinvite.app
          android: FCM HTTP v1, OAuth service account
        410 / UNREGISTERED / INVALID_ARGUMENT -> set disabled_at on the subscription
        5xx / 429                              -> retry with backoff inside the run, then leave pending
     h. any 200                                  -> push_state = 'sent', push_sent_at = now
        all rejected                             -> push_state = 'failed'
4. delete PushSubscription rows disabled more than 30 days ago
```

Collapsing: iOS `apns-collapse-id` and FCM `notification.tag` are set to the `source_key` prefix (`poll_vote:<pollId>`, `rsvp`), so a burst of replies collapses on the lock screen into the latest, the way the mock at `/m/preview/push` shows.

Rate: at most one push per recipient per type per 60 seconds except `message` and `rsvp_*`; the rest are folded into the next row of that type (title kept, body replaced with a count). Implemented in step 3 by looking at `push_sent_at` on the recipient's last row of that type.

## 6. Payloads, per type

Titles and bodies come from `src/mobile/notifications/copy.ts` (`notificationCopy(type, data)`), so the lock screen, the in-app center and the email digest say the same thing. Deep links use the `openinvite://` scheme registered in goal 3 and map through `routeForDeepLink()` in `src/mobile/native.ts`. Examples, rendered exactly by that function:

**iOS (APNs HTTP/2 request body)**

```json
{
  "aps": {
    "alert": { "title": "Sarah and Tom are coming", "body": "2 guests attending. 46 of 80 have replied." },
    "sound": "default",
    "badge": 3,
    "thread-id": "rsvps",
    "category": "OI_RSVP"
  },
  "type": "rsvp_attending",
  "link": "openinvite://m/guests/6f1a2b",
  "notificationId": "nt_01H…",
  "sourceKey": "rsvp:6f1a2b:attending"
}
```

Headers: `apns-topic: au.com.openinvite.app`, `apns-push-type: alert`, `apns-priority: 10`, `apns-collapse-id: rsvp`.

**Android (FCM HTTP v1 message)**

```json
{
  "message": {
    "token": "<fcm token>",
    "notification": { "title": "Florist deposit due Friday", "body": "$450 to Wildflower Studio." },
    "android": { "priority": "HIGH", "notification": { "tag": "payment_due:bd_9c", "channel_id": "tasks", "click_action": "OPEN_LINK" } },
    "data": { "type": "payment_due", "link": "openinvite://m/plan/budget/flowers", "notificationId": "nt_01H…", "sourceKey": "payment_due:bd_9c:2026-09-25" }
  }
}
```

**One example per type** (title / body / link; all under 40 and 90 characters, from the catalog):

| Type | Title | Body | Link |
|---|---|---|---|
| rsvp_attending | Sarah and Tom are coming | 2 guests attending. 46 of 80 have replied. | `openinvite://m/guests/<guestId>` |
| rsvp_declined | Priya can't make it | 47 of 80 have replied so far. | `openinvite://m/guests/<guestId>` |
| rsvp_maybe | Leo isn't sure yet | They said maybe. 48 of 80 have replied. | `openinvite://m/guests/<guestId>` |
| message | New message from Amelia Nguyen | Is there parking at The Fig Tree or should we book a cab? | `openinvite://m/plan/messages/<messageId>` |
| guestbook | Amelia Nguyen signed your guestbook | Open it to read what they wrote. | `openinvite://m/plan/messages` |
| song_request | Song request from Jack Smith | Dancing in the Moonlight by Toploader | `openinvite://m/plan/music?segment=requests` |
| poll_vote | 6 new votes on Which song gets | September is ahead. | `openinvite://m/plan/polls` |
| gift | A gift from The Walkers | Le Creuset casserole, $420. | `openinvite://m/plan/registry?segment=received` |
| task_due | Confirm final numbers with… | Due tomorrow. | `openinvite://m/plan/checklist` |
| task_overdue | Overdue: Book the celebrant | 3 days past its date. Still doable. | `openinvite://m/plan/checklist` |
| payment_due | Florist deposit due Friday | $450 to Wildflower Studio. | `openinvite://m/plan/budget/flowers` |
| briefing | 180 days to go | 7 open tasks and 21 guests still to reply. | `openinvite://m` |

Android channels (created by the app on first launch, names in sentence case): `rsvps`, `messages`, `requests`, `gifts`, `tasks`, `briefing`. They mirror `NOTIFICATION_GROUPS` in `copy.ts` so the system settings and the in-app settings agree.

## 7. What is needed from the owner

| Item | Why | Where it lives |
|---|---|---|
| Apple Developer Program membership | APNs, TestFlight, the App Store | Owner's Apple ID |
| An APNs auth key (`.p8`), its Key ID and the Team ID | Token-based APNs auth, one key for dev and prod | Vercel env: `APNS_KEY_P8` (the file contents, base64), `APNS_KEY_ID`, `APNS_TEAM_ID`. Never in the repo. |
| Push Notifications capability on the `au.com.openinvite.app` App ID | Entitlement | Apple Developer portal; then `aps-environment` in `ios/App/App/App.entitlements` (a native-project edit, allowed) |
| A Firebase project with an Android app `au.com.openinvite.app` | FCM | `android/app/google-services.json` (native project, allowed) plus a service-account JSON for the server: Vercel env `FCM_SERVICE_ACCOUNT` (base64) |
| `CRON_SECRET` | Already exists for the other crons | Vercel env, unchanged |
| `BASE44_ADMIN_KEY` | Already exists; also keys the HMAC and AES for `PushSubscription` | Vercel env, unchanged |

Nothing new touches the browser bundle. `VITE_*` gains nothing.

## 8. How the app swaps over, with no screen changes

`src/mobile/notifications/useNotifications.js` exposes `items, unread, loading, error, reload, markAllRead, markRead, settings, setSettings, latestUnseen, bannerShown`. The screens, the bell and the banner read only that. The change is inside `load()`:

```
before:  entity rows  +  buildFeed(guests, messages, songRequests, …)   -> items
after:   entity rows (all types now)                                    -> items
```

- `buildFeed` keeps running for one release as a fallback for rows the server has not written yet (a guest message that predates the trigger), then is removed.
- Read state: today the derived rows use a local seen-timestamp; after the swap every row has `read` on the server, so `markRead` becomes `Notification.update(id, { read: true })` for every item, and the local timestamp is only used to gate the banner.
- Settings: `setSettings` also writes `push_prefs` to the user (section 3.3).
- Registration: on native launch, after the priming screen's "Turn on" and the system prompt, `native.ts` gains `registerPush()`: `PushNotifications.requestPermissions()`, `register()`, then `POST /api/push/register { platform, token, appVersion, deviceName }` with the couple's Bearer token. The endpoint writes `DeviceToken` (as the user) and `PushSubscription` (as the server). On `pushNotificationActionPerformed`, `routeForDeepLink(payload.link)` and navigate.
- The permission prompt is asked exactly where goal 3 put it: after the first reply arrives, from the priming screen, never on first launch.

## 9. Rollout order

1. **Approve the schema** (this document): widen `Notification.type`, add `source_key`, `push_state`, `push_sent_at`, `data`; add `DeviceToken` and `PushSubscription`; add `User.push_prefs`. Push with the merged `rls` block explicitly, per `BASE44_PLATFORM_NOTES.md` "schema drift".
2. **Triggers, app-invisible.** Extend `notify()` and the six trigger endpoints to write the new types with `push_state: 'pending'`. Nothing sends yet. Verify rows appear with the right `source_key` and no duplicates on a retried webhook.
3. **App reads rows.** Ship the `useNotifications` swap behind a flag (`VITE_MOBILE_PUSH_FEED=1` on the preview build only): the center shows server rows for the new types. Compare against the derived feed for a week.
4. **Registration.** Ship `registerPush()` and `/api/push/register` to TestFlight. Confirm `DeviceToken` rows appear for test devices and `PushSubscription` rows decrypt.
5. **Fan-out, sandbox.** Deploy `push-fanout.js` pointing at the APNs sandbox and a test FCM project, allow-listed to the owner's `recipient_user_id` only.
6. **Fan-out, production**, allow-list removed. The daily cron (`notify-due.js`) last, since it is the only one that can send to everyone at once.
7. Remove `buildFeed` and the flag.

## 10. Rollback

- Every step is independently reversible. The cron entries in `vercel.json` can be removed in one deploy; with no fan-out, rows stay `pending` and the app still shows them (that is today's behavior for the three existing types).
- The schema additions are additive with defaults; reverting the entity JSON leaves existing rows readable because unknown fields are dropped by Base44 on write and ignored on read (platform notes).
- If pushes misbehave in production: set `PUSH_FANOUT_PAUSED=1` in Vercel env (the cron checks it first and exits 200) before touching code. To silence one type, remove it from the recipient's group in `push_prefs` server-side; to silence one device, set `disabled_at` on its `PushSubscription`.
- Tokens can be revoked wholesale by rotating the APNs key or the FCM service account; the app re-registers on next launch.

## 11. Open questions for the approver

1. Does Base44 read RLS support `$or` so `Notification.read` can allow `push_state == 'pending'` to the admin key without opening reads to everyone? If not, the `PushOutbox` mirror in section 5 is the fallback and adds one more entity.
2. `User.push_prefs` is a field on the user record. Acceptable, or should prefs live in their own owner-scoped entity (`NotificationPreference`, one row per user) so `User` stays untouched?
3. Should `rsvp_received` (desktop bell) and `rsvp_attending` / `rsvp_declined` / `rsvp_maybe` (phone) be unified into the three specific types, with the desktop bell updated to render them? Two rows per reply is simple but wasteful.
4. Batch window for `poll_vote`: one hour proposed. Acceptable?
