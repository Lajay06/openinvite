# CI cancellation ticket — investigation

Read-only. 2026-08-19. No code.

---

## Headline: this is not runner degradation, and I filed it wrong

I reported "three spontaneous cancellations, likely runner degradation". The
logs say otherwise. **Every cancellation was `concurrency: cancel-in-progress`
firing, triggered by my own next push, force-push or re-run.** There is a
separate, real infrastructure problem — runner *queue* starvation — but it never
cancelled anything.

Two distinct phenomena, conflated in my ticket:

| | What I claimed | What the logs show |
|---|---|---|
| Cancellations | spontaneous, infra | **self-inflicted via config** |
| ~20–25 min "stalls" | hung steps | **queue time; steps total ~145s** |

---

## Finding 1 — the cancellations are the workflow's own config

`.github/workflows/ci.yml`:

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

On `main`, every push shares one ref, so **the next push to main cancels the
previous main run mid-flight**. Correlated to the second:

| Cancelled run | Ended | Next run started | Relationship |
|---|---|---|---|
| `f5d3d72` | 11:08:41 | `1ec55f9` @ **11:08:24** | started **17s before** the cancel |
| `ea22f30` | 10:10:01 | `5acbc0c` @ **10:09:38** | started **23s before** the cancel |

Both "next runs" were **my own docs commits pushed straight to main** right
after a merge — the erasure-ledger entry and the pack summary.

The other two match the same mechanism on non-main refs:
- PR #497's run: I **force-pushed** the Pricing revert; same PR ref, same
  concurrency group, in-progress run cancelled.
- `136b44f`: I **triggered a re-run** while the original was still queued.

**Zero of the four cancellations were spontaneous.** Every one has a
me-shaped cause.

Durations are the giveaway I should have read: 68s, 206s, 521s, 1218s. A
timeout cancels at a constant duration. These are simply "how long the run had
been alive when I pushed again".

## Finding 2 — the real infrastructure issue is queue starvation

Step timings on the 25-minute main run (which **succeeded**):

```
  60s  Install Playwright OS dependencies
  31s  Marketing-routes smoke test
  18s  Build
  15s  Install dependencies
   6s  Lint
   ... everything else ≤5s
  ---  ~145s of actual work
```

Against three normal runs: `executing=104s / 98s / 103s`, `queued=25s / 3s / 3s`.

So the job does ~2 minutes of work. The 25-minute run spent **~22 minutes
waiting for a GitHub-hosted runner**. That is real, it is outside our control,
and it is worth knowing — but it degrades *latency*, not correctness.

## Finding 3 — `timeout-minutes: 20` never fired

`timeout-minutes` measures execution, not queue. Execution is ~2 minutes, so the
cap is 10× headroom and was never approached. My guess that the ~20-minute stall
point matched the 20-minute timeout was **coincidence** — the stall point was
queue time, and 20 minutes of queue happened to resemble the cap.

---

## The sharper question: what could watch main?

The ticket's framing survives even though its cause changed: **a merge can leave
main unverified and nothing announces it.** Three mechanisms, in order of value.

### 1. Stop cancelling main (the actual fix)

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

PR runs keep cancelling on force-push, which is what the setting is for and
where the CI-minute savings are. Main runs always run to completion. This
removes the root cause rather than detecting it, and costs a handful of extra
minutes per day.

**Caveat worth stating:** two main runs can then overlap when merges land close
together. They are independent commits and both should be verified, so that is
correct behaviour rather than a side effect — but it is a behaviour change.

### 2. A watchdog on non-success conclusions

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
```

Fires on every CI completion; if `conclusion != 'success'` **and** the head
branch is `main`, it announces. Catches cancelled, timed-out and failed alike,
including causes we have not seen yet. This is the piece that makes silence
impossible — the current gap is not that main goes unverified, it is that
nothing says so.

### 3. A scheduled main-health check

A daily cron that resolves main's current SHA, asks the API for its latest run
conclusion, and fails loudly if it is anything but success. Slower than (2), but
it catches the case (2) cannot: a run that never started at all.

### Not the answer: required status checks

Branch protection gates **merging**, which is already covered — `pr:green` at
merge time is the standing rule and it worked correctly throughout (it treats
CANCELLED as not-green, which is why I never merged on one). Branch protection
would not have caught any of these, because every failure here was **after** the
merge.

## Proposed fix, in order

1. **Change `cancel-in-progress` to exempt main.** One line, removes the cause.
2. **Add the `workflow_run` watchdog.** Small, catches the whole class.
3. Leave `timeout-minutes: 20` alone — it is not implicated and the headroom is
   healthy.
4. Optionally revisit the daily cron once (1) and (2) have run for a while; it
   may prove redundant.

## What I got wrong, and why it matters

I filed "runner degradation" from four data points I never opened. The evidence
to disprove it — run durations varying 68s to 1218s — was in the same list I
quoted in the ticket. A fixed-cause theory cannot produce an 18× spread in
duration, and I did not check.

The same shape as this session's other misses: I had the artefact, drew the
conclusion from its surface, and did not follow it to the mechanism. In this
case the correction is favourable — nothing is wrong with the infrastructure we
depend on — but it was equally likely to have gone the other way.
