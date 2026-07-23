# UX Review — Meta Flow Engine (`meta-flow-engine`)

**PNGs reviewed:** 23 | **Blockers:** 17 | **High:** 4 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Meta Flow Engine (FLOW-26) is about flow orchestration: inspecting a flow, wiring event
schemas, observing flow lifecycles. None of that is visible. Instead the 23 PNGs split into
two groups that both miss the flow's own subject. Group A (`01-09-dna-*.png` + numbered state
captures `state-N-dna-*`) are the same kind of generic admin list ("Meta Flow Engine, FLOW-26
admin console backed by /api/dynamic/xiigen-meta-flow-engine") with machine IDs and Delete
actions. Group B (`state-1` … `state-9`) are distinct-content mock cards that each claim a
"State N" but the content is a static **DNA principle description** — "State 1: DNA-1:
Record<string, unknown> (no typed models)", "State 2: DNA-2: BuildSearchFilter", …, "State 9:
DNA-9: CloudEvents envelope". These are engine-architecture talking points, not meta-flow
business states. A user inspecting a meta-flow would expect to see orchestrator status,
event routing, cycle graph — none of which appear. Same 9 DNA-cards will be reused by other
flows, making the capture set meaningless for per-flow state fidelity.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-dna-1-record-string-unknown-no-typed-mod.png` | 🔴 | State fidelity | "Meta Flow Engine" admin list; nothing about DNA-1 | Gate the capture behind the actual meta-flow state; or rename file if intent was the admin list |
| 2 | `02-dna-2-buildsearchfilter-dynamic-queries.png` | 🔴 | State fidelity | Identical admin list | Same |
| 3 | `03-dna-3-dataprocessresult-t-no-throws-for.png` | 🔴 | State fidelity | Identical admin list | — |
| 4 | `04-dna-4-microservicebase-19-inherited-comp.png` | 🔴 | State fidelity | Identical admin list | — |
| 5 | `05-dna-5-scope-isolation-via-asynclocalstor.png` | 🔴 | State fidelity | Identical admin list | — |
| 6 | `06-dna-6-dynamiccontroller-all-crud-via-api.png` | 🔴 | State fidelity | Identical admin list | — |
| 7 | `07-dna-7-idempotency-via-queue-deduplicatio.png` | 🔴 | State fidelity | Identical admin list | — |
| 8 | `08-dna-8-outbox-pattern-storedocument-befor.png` | 🔴 | State fidelity | Identical admin list | — |
| 9 | `09-dna-9-cloudevents-envelope-for-inter-ser.png` | 🔴 | State fidelity | Identical admin list | — |
| 10 | `state-1-dna-record.png` | 🔴 | State fidelity | Shows a mock card: "State 1 — DNA-1: Record<string, unknown> (no typed models)". This is an engine principle, not a meta-flow business state | Replace with real n1..n9 topology states (e.g., flow-received, validated, propagated) |
| 11 | `state-2-dna-buildsearchfilter.png` | 🔴 | State fidelity | Mock card: "State 2 — DNA-2: BuildSearchFilter (dynamic queries)" | Same |
| 12 | `state-3-dna-dataprocessresult.png` | 🔴 | State fidelity | "DNA-3: DataProcessResult<T> (no throws for business logic)" | Same |
| 13 | `state-4-dna-microservicebase.png` | 🔴 | State fidelity | "DNA-4: MicroserviceBase (19 inherited components)" | Same |
| 14 | `state-5-dna-scope.png` | 🔴 | State fidelity | "DNA-5: Scope Isolation via AsyncLocalStorage" | Same |
| 15 | `state-6-dna-dynamiccontroller.png` | 🔴 | State fidelity | "DNA-6: DynamicController (all CRUD via /api/dynamic/{indexName})" | Same |
| 16 | `state-7-dna-idempotency.png` | 🔴 | State fidelity | "DNA-7: Idempotency via queue deduplication" | Same |
| 17 | `state-8-dna-outbox.png` | 🔴 | State fidelity | "DNA-8: Outbox pattern (storeDocument before enqueue)" | Same |
| 18 | `state-9-dna-cloudevents.png` | 🔴 | State fidelity | "DNA-9: CloudEvents envelope for inter-service events" | Same |
| 19 | `crud-after-create.png` | 🟠 | Copy / privacy | Shows `e2e-1776602978560 / active / created by meta-flow-engine-crud.spec.ts` — raw spec filename leaks into user-facing Notes | Strip test-origin metadata |
| 20 | `crud-initial-load.png` | 🟠 | Information appropriateness | Admin list with only machine IDs as names; no domain affordances | Add Title/Description, domain verbs |
| 21 | `crud-list-with-test-row.png` | 🟠 | Affordances | Only Delete action; no View / Inspect / Pause / Resume | Add meta-flow domain verbs |
| 22 | `default.png` | 🟡 | Consistency | Default landing = same admin list | Add welcome or metadata header |
| 23 | `c-03-before.png` | 🟠 | Utility | Identical to `default.png`; unclear purpose of the `c-03-before` naming | Remove or rename the duplicate |
| 24 | Persistent banner | 🔵 | Chrome | Yellow "Missing provider keys" top 48px present on all; doesn't obscure here | Collapse banner once acknowledged |

## Cross-PNG patterns (flow-level)

- **Identity confusion:** 9 "state" PNGs show DNA-principle content borrowed from engine
  architecture, not meta-flow business states. These are a **stub of engine-internal
  concepts** re-purposed as flow evidence. For FLOW-26 users, this gives no signal about
  whether Meta Flow Engine actually works.
- **17 of 23 PNGs fail state fidelity** (9 `NN-dna-*.png` + 8 state cards showing DNA not
  meta-flow states; plus `default.png`, `c-03-before.png` that are just admin lists).
- **Same DNA cards recycled across flows** — human-interaction-gate uses the identical
  9 cards. The per-flow capture set is therefore not flow-specific.
- **Spec-name leak** in `crud-after-create.png` (`meta-flow-engine-crud.spec.ts` appears in
  the Notes column visible to end users).
- The only actual "Meta Flow Engine" branding in the whole set is the admin-list page title.

## Business-logic phase coverage

Meta Flow Engine is supposed to cover flow-lifecycle states (flow-proposed, flow-generated,
flow-bundled, flow-activated, flow-degraded, flow-restored, etc. per FLOW-26 topology).

| Phase | Visually covered? |
|--|--|
| Flow proposed | ❌ |
| Flow generated | ❌ |
| Flow bundled | ❌ |
| Flow activated | ❌ |
| Flow degraded | ❌ |
| Flow restored | ❌ |
| Cross-flow governance (via BFA) | ❌ |
| Any inspection/monitoring surface | ❌ |

**Zero meta-flow business phases are visually evidenced.** The capture set substitutes
engine-architecture principles for business states, which is semantically unsound.
