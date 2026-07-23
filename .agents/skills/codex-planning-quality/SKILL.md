---
name: codex-planning-quality
version: "1.0.0"
sk_number: SK-566
priority: ADVISORY
load_order: 28
category: planning
contexts: ["web-session", "claude-code"]
origin: ported from llm_mvp_core/docs/skills/codex-planning-quality-GUIDE.md (Universal-Skills refresh, UpdateUniversalSkills)
---

# codex-planning-quality — Guide against shallow planning, focus drift, and dishonest claims

> Ported universal standard. The mvp planning library had no guide that (a) forces a plan/
> review to START from architecture decisions and the CURRENT target artifact (not from an
> old packet/plan), (b) requires dual-path host verification, and (c) bans dishonest
> planning claims (ledger rows != cycles; parent/self != sub-agent). TS adaptation for this
> mvp project: a "host" scenario is a real NestJS API / React UI / FastAPI path; the
> automated boundary is Jest/Playwright/contract evidence, not JSON-only.

## When to Invoke

- At the START of any plan/review session, before reading old packets or old plans.
- Whenever a planning answer feels shallow, or focus may have drifted to a foreign artifact.

## Principle 1 — Start from architecture + the current target artifact

```
Begin the plan/review with the ARCHITECTURE decisions and the CURRENT target artifact,
not with an old packet, an old plan, or another model's plan.
- The current target artifact comes from the CURRENT unquoted instruction.
- Old plans, old STATE next_action, sub-agent packets, and another model's plans are
  EVIDENCE ONLY — they cannot select or become the active target.
- Foreign/parallel artifacts (e.g. another model's files) are read-only evidence unless
  the current instruction explicitly assigns them.
```

## Principle 2 — Dual-path host verification (no single fragile chain)

```
For each scenario, require BOTH:
  Path A (automated boundary): adapter/API/core request → response → trace; for mvp this is
    a NestJS endpoint / service call covered by Jest, a contract check, or a Playwright e2e.
  Path B (local desktop): the same scenario run in the real host UI (React app / the real
    tool) by an agent on this machine, with screenshot/log evidence when possible.
A scenario is "covered" only when the SAME scenario passes both paths.
If Path B is blocked, record the exact screen/state + blocker reason + next repair —
do NOT convert the blocker into a stop, and do NOT claim readiness from Path A alone.
JSON-only / adapter-only / test-only evidence is Path A only; it never replaces Path B.
```

## Principle 3 — No dishonest planning claims

```
- "N review cycles" / "N passes" requires N INDEPENDENT evidence packets
  (reviewer id, before/after refs, loaded gates, findings, fix refs, recheck).
- A checklist row / ledger row / generated table row is NOT a cycle.
- Parent/self review is NOT an independent sub-agent review.
- Required downgrade language when evidence is narrower than the claim:
    "I did not verify this." / "This is a ledger/checklist, not a completed cycle."
    "The evidence supports only: <narrow claim>."
- Evidence boundaries must not be overclaimed:
    boundary/API evidence != host readiness; marker-only != full local desktop pass;
    trace != savings; schema != training; checkpoint candidate != promotion.
```

## Principle 4 — Plan-Not-Ready is a repair loop

```
NEEDS_FIX on a plan returns to plan repair, then re-review — it is NOT a stop and NOT
"executor may proceed". "Do not stop" / old next_action do not authorize execution while
Part A (FC-13) or simulations (FC-14) are incomplete. Repair continues until the packet is
a human-readable plan in the operator's working language with §0–§5 and concrete simulations.
```

## Quick self-check before producing a plan/review

```
□ Did I start from architecture + the CURRENT target artifact (not an old packet)?
□ Are old plans / other models' plans quarantined as EVIDENCE-ONLY?
□ Does each scenario have a Path A and a Path B (or an honest Path B blocker)?
□ Are all "N cycles" backed by N independent packets? Any narrow evidence downgraded?
□ Is Part A §0–§5 present with simulations, or is the plan honestly NEEDS_FIX?
```

## Integration

- Pairs with `planning-quality-forward-test` (the runnable regression prompt of this guide).
- Pairs with `plan-review` Gate 0 + Dishonest-Claim Rejection + FC-13/FC-14.
- Pairs with `planning-session-startup` (quote quarantine, sticky architect ownership).
