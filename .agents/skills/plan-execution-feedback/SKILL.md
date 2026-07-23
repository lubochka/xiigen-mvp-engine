---
name: plan-execution-feedback
version: "1.0.0"
sk_number: SK-428
priority: ADVISORY
load_order: 27
---

# Plan Execution Feedback Skill

After each session, compares planned vs actual (write-time fixes, test counts, API assumptions). Tracks discovery rate over time. When discovery rate consistently exceeds 120%, flags the planning process as under-investing in G0 infrastructure discovery.

## When to Invoke

- At session end, after Section A is written
- Before writing the next session's plan (to calibrate G0 depth)

## Metrics

```
WF discovery rate = (WF actual) / (WF planned) × 100%
Test delivery rate = (tests delivered) / (tests planned) × 100%
```

## Interpretation Table

| WF Discovery Rate | Signal | Required Action for Next Plan |
|-------------------|--------|------------------------------|
| ≤ 120% | Normal | Proceed with standard G0 |
| 121–200% | G0 under-invested | Add explicit api-shape-verification table to next plan |
| > 200% | API assumptions are guesses | Do NOT write plan without live source reads first |

## XIIGen Execution History

| Session | WF Planned | WF Actual | Discovery Rate | Signal |
|---------|-----------|-----------|----------------|--------|
| S1 | 0 | 0 | — | Normal |
| S2 | 0 | 5 | ∞% | G0 missed API shapes entirely |
| S3 | 4 | 7 | 175% | G0 under-invested |
| S4 | 7 | ? | TBD | Must complete api-shape-verification table at G0 |

**Pattern**: Sessions 2 and 3 both had high discovery rates. This means the planning process consistently underestimates API mismatches. Root cause: plan authors write tests against assumed APIs without reading source files first.

## Rules

1. Record WF planned vs actual in STATE.json after every session
2. If discovery rate > 120% for two consecutive sessions: the next session plan MUST include a completed api-shape-verification table before any code blocks are written
3. If test delivery rate < 80%: investigate whether the plan's test count was based on counting describe blocks vs it() blocks (common source of over-counting)
4. Report the discovery rate metric as part of Section A: `WF planned: N, WF actual: M, discovery rate: M/N×100%`

## Integration

- Invoked by agent-constitution at Session End (after Section A)
- Feeds into planning-skill G0 depth calibration for the next session
- Results stored in STATE.json under `phases.N.wf_discovery_rate`

---

## UNIVERSAL STANDARD ADDENDUM — Human-Readable Log Gate + User Prompt Source update (ported from llm_mvp_core)

> Added by the Universal-Skills refresh (UpdateUniversalSkills). The 120%/200%
> thresholds above are kept. The universal layer adds a readability gate on the
> feedback record and a per-phase update to the User Prompt Source Ledger, so the
> metric is never machine-only.

### Human-Readable Plan/Execution Log Gate (Section A is not just machine rows)

A per-phase feedback record FAILS this gate if a human cannot tell from it: what
the phase did, what is done, what remains, which claims stayed closed and why, and
the next bounded action. Numbers (discovery rate, test delivery rate) are
secondary evidence — they appear AFTER a plain-language line.

```
Phase N of M: <human-readable name>. Done: <…>. Remaining: <…>.
Discovery rate: WF planned N, WF actual M, M/N×100%.   # machine row AFTER the human line
Test delivery: delivered/planned ×100%.
Next action: <next bounded step, or NONE>.
```

A discovery rate / test delivery row with no preceding human sentence is a
machine-only record and does not satisfy Section A.

### User Prompt Source Ledger — update each phase

After each phase, append to the User Prompt Source Ledger any requirement that was
discovered or strengthened at write-time (a wrong assumption about a NestJS service
shape, a missing React/FastAPI contract, a DTO mismatch). A write-time fix that
revealed a new requirement is recorded as its source so the next plan's Gate-0
discovery covers it. This closes the loop between `plan-execution-feedback` and
`planning-session-startup` (Authority/Source/Delta ledgers).

### Discovery-rate over-investment signal (>120% restated as a learning signal)

`WF discovery rate > 120%` for two consecutive phases is not just "add an
api-shape-verification table". It is evidence that Gate-0 discovery under-read live
TS source (`server/src/**.ts`, `server/src/engine-contracts/*.ts`). The next plan
MUST read those sources live before writing test code (Jest/Playwright), and the
feedback record must say so in plain language.
