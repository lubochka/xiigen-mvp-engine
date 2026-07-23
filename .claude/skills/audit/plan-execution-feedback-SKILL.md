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
