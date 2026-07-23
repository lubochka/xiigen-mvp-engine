# UX Review — Feature Registry (`feature-registry`)

**PNGs reviewed:** 27 | **Blockers:** 0 | **High:** 2 | **Medium:** 4 | **Low:** 21
**Overall verdict:** Shippable (for an ENGINE_INTERNAL flow), with operator polish needed

## Summary

Feature Registry is correctly scoped as `ENGINE_INTERNAL` — the CRUD panel shows FT-XXX feature records with a dedicated Feature ID column, Status (proposed/active), and descriptive subtitle "FT-XXX feature records — porting decisions, cost estimates, platform adapters." This is a meaningful upgrade over a generic admin table because the schema is tailored to the domain. The state-N captures follow the same "mock state N" honest framing as platform-agent, so there is no state-fidelity deception. The weak point is the same as platform-agent: the state cards are too minimal to help an engineer understand a porting decision and several render empty `(retry)` or bare transition strings with no diagnostic context.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `c-03-before.png` | LOW | Duplicate | Same CRUD table with 4 rows including one debug row (`debug-1776451935`, no Feature ID, `—` notes). | Hide or filter `debug-*` rows in production views. |
| 2 | `crud-after-create.png` | LOW | Polish | CRUD list post-create showing `FT-TEST-1776602685103 / E2E Round-Trip Test / proposed`. Correct feedback. | No change. |
| 3 | `crud-initial-load.png` | LOW | Polish | Baseline table. Rows are a mix of `UI Round-Trip Test` (proposed) and a `debug` row (active). | Consistent naming — why is the debug row `active` while the UI rows are `proposed`? Looks like seed-data inconsistency; explain or remove. |
| 4 | `crud-list-with-test-row.png` | LOW | Duplicate | Identical to `crud-after-create.png`. | Deduplicate. |
| 5 | `default.png` | LOW | Duplicate | Identical to `crud-initial-load.png`. | Deduplicate. |
| 6 | `state-1-featureextractor-processing.png` | LOW | Polish | "State 1 / featureExtractor processing". Minimal but legible. | Add tenant + runId context. |
| 7 | `state-2-featuresignalaggregator-processing.png` | LOW | Polish | Same minimal card. | Same. |
| 8 | `state-3-portingcostestimator-processing.png` | LOW | Polish | Same. | Same. |
| 9 | `state-4-portingdecisiongate-processing.png` | LOW | Polish | Same. | Same. |
| 10 | `state-5-platformadaptergenerator-processing.png` | LOW | Polish | Same. | Same. |
| 11 | `state-6-platformsimulator-processing.png` | LOW | Polish | Same. | Same. |
| 12 | `state-7-featureportingorchestrator-processing.png` | LOW | Polish | Same. | Same. |
| 13 | `state-8-featureextractionrequested-featureextractor.png` | LOW | Polish | "featureExtractionRequested → featureExtractor". Transition label fine. | Show payload shape. |
| 14 | `state-9-featureextractor-featureextractioncompleted.png` | LOW | Polish | "featureExtractor → featureExtractionCompleted". Fine. | Same. |
| 15 | `state-10-signalingested-featuresignalaggregator.png` | LOW | Polish | "SignalIngested → featureSignalAggregator". Fine. | Same. |
| 16 | `state-11-portingrequested-featureportingorchestrator.png` | LOW | Polish | Same clean transition. | Same. |
| 17 | `state-12-featureportingorchestrator-portingdecisiongate.png` | MEDIUM | Info density | Reaches the Decision Gate — the most consequential step in this flow — but the card shows only the transition name. An engineer would want to see the decision inputs (cost, risk, confidence). | Render decision input summary on the gate state. |
| 18 | `state-13-portingdecisiongate-portingprohibited.png` | HIGH | Critical state under-represented | "portingDecisionGate → PortingProhibited" — a terminal refusal outcome with no reason shown. This is the most important state for an engineer diagnosing why a feature cannot be ported. | Show the rejection reason(s), the arbiter that fired, and any remediation hints. |
| 19 | `state-14-portingdecisiongate-portingcostestimator.png` | MEDIUM | Info density | Re-routes to cost estimator. Fine as a mock but no cost signal visible. | Show current cost estimate + threshold. |
| 20 | `state-15-portingcostestimator-portingdecisiongate.png` | MEDIUM | Info density | Cost estimator returns to gate — no estimate shown. | Show cost result and confidence. |
| 21 | `state-16-portingdecisiongate-portingapproved.png` | HIGH | Critical state under-represented | Approval is a terminal positive outcome — same problem as state-13. No reasons, no platform targets, no timeline. | Render approval summary: platforms approved, estimated effort, next step. |
| 22 | `state-17-portingdecisiongate-portingdeferred.png` | MEDIUM | Info density | Deferred — no reason, no re-evaluation date. | Show deferral reason + next-eval timestamp. |
| 23 | `state-18-portingdecisiongate-portingblocked.png` | MEDIUM | Copy | "portingBlocked" is distinct from "portingProhibited" in filename, but there is no UI copy explaining the difference. An engineer cannot tell which blocker applies. | Differentiate blocked (transient) vs prohibited (policy) in the card copy and icon. |
| 24 | `state-19-portingapproved-platformadaptergenerator.png` | LOW | Polish | Approval → adapter generation handoff. Transition clear. | Show target platform list. |
| 25 | `state-20-platformadaptergenerator-platformsimulator.png` | LOW | Polish | Adapter generator → simulator. Fine. | Same. |
| 26 | `state-21-platformsimulator-portingcomplete.png` | LOW | Polish | Simulator → porting complete. Fine. | Show simulation result summary. |
| 27 | `state-22-platformsimulator-platformadaptergenerator.png` | LOW | Polish | Simulator bounces back to generator with "(retry)". Retry counter and reason absent. | Show retry attempt # and reason for retry. |

## Cross-PNG patterns (flow-level)

- **Honest mock framing, domain-tailored CRUD.** Unlike `completion-gamification`, these captures don't pretend to be real UI, and the CRUD panel uses a meaningful schema (Feature ID, Status, Notes). Good baseline.
- **Decision-gate outcomes are under-rendered.** `PortingProhibited`, `PortingApproved`, `PortingDeferred`, `PortingBlocked` are the four terminal/decision states in this flow, and the single most valuable views for an engineer. They are the thinnest captures here — none shows rationale, platforms, costs, or next steps. This is where engine-internal UX adds the most value.
- **Retry loops not distinguishable.** `state-22` shows a retry transition with no attempt count or retry reason. The loop visualization is missing from the UI.
- **Seed-data inconsistency.** The debug row `debug-1776451935` is `active` while all UI-created rows are `proposed`. An engineer opening the registry cold will find this confusing — either hide debug rows in the default view, or explain the state machine that takes a record from proposed → active.
- **No traceability to FT-NNN artifacts.** The subtitle promises "porting decisions, cost estimates, platform adapters" but a user cannot drill from a row into those artifacts. The registry appears to be a list without a detail page.

## Business-logic phase coverage

Topology surfaces referenced by filenames:
- FeatureExtractor, FeatureSignalAggregator, PortingCostEstimator, PortingDecisionGate, PlatformAdapterGenerator, PlatformSimulator, FeaturePortingOrchestrator.

**Visually covered:** CRUD list (initial, after-create, with-test-row, default, c-03-before variants), processing states for each service (states 1–7), and transitions/outcomes for each gate decision (states 8–22).

**Missing/misrepresented:** the four terminal gate decisions — Prohibited, Approved, Deferred, Blocked — render as generic transition cards with no rationale. For an ENGINE_INTERNAL flow whose whole purpose is to record *why* a porting decision was taken, this is the largest gap. The registry's subtitle promises more than the UI delivers.
