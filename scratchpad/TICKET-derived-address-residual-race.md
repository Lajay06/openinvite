# TICKET — the residual race on a derived address (CLOSED to guests, not eliminated)

## The race

Two WeddingDetails records can derive the same address at the same moment. The
platform makes this impossible to prevent: **no entity schema in this app
declares uniqueness, and the REST surface offers no conditional write.** So a
collision can only be DETECTED, never refused at write time.

## Why it cannot reach a guest

`PublishModal.togglePublish` now **awaits `syncWeddingAddress` before enabling
the site** (#595). Guests only exist after publish, so the address a guest is
ever given has already been settled.

The earlier answer — "it converges on the next load" — was not good enough, and
the advisor named why: convergence that requires a visit is not convergence for
a couple who does not visit, and the harmful case is exactly a couple who
publishes, sends invitations, and never returns.

## Why it settles rather than oscillating

The deterministic tie-break: earliest `created_date` wins, id breaks the tie.
Both sides compute it identically with no coordination, so exactly one moves.
Without it, both would see the other holding "their" address and both would
yield, forever — a livelock built out of good manners. See
STANDING-RULES.md, "A symmetric resolution is not a resolution".

## What remains open

Two unpublished records can hold the same address indefinitely. Nothing is
harmed by this — neither site is reachable by a guest with that address until
publish, and publish settles it — but the state is reachable and should be
named rather than assumed away.

**Would close it entirely:** a uniqueness constraint at the platform level, if
Base44 ever offers one. Nothing at our layer can.
