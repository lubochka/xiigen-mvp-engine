# UX Review — Human Interaction Gate (`human-interaction-gate`)

**PNGs reviewed:** 23 | **Blockers:** 17 | **High:** 4 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Human Interaction Gate (FLOW-27) is supposed to provide a human-in-the-loop gate where a
person reviews, approves, or rejects an AI decision. The end-user experience for that is
completely absent. 23 PNGs split into: (a) generic admin list titled "Human Interaction Gate"
with FLOW-27 banner and machine IDs (same 3-row pattern as bundle-activation and
meta-flow-engine), and (b) 9 mock "State N" cards which reuse the **same DNA-principle
content** that meta-flow-engine also ships. "State 1: DNA-1: Record<string, unknown>" makes
no sense to a human reviewer trying to understand what this gate decides, who triggered it,
what they're approving, or what the SLA is. One notable variant: `default.png` shows a **red**
banner ("No AI provider keys configured. Flows will use mock AI only.") — a distinct error
state worth preserving, but it appears only on that one capture and then disappears.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-dna-1-record-string-unknown-no-typed-mod.png` | 🔴 | State fidelity | "Human Interaction Gate" admin list; claims DNA-1; shows neither | Capture the actual gate UI (review queue, pending approvals) |
| 2 | `02-dna-2-buildsearchfilter-dynamic-queries.png` | 🔴 | State fidelity | Identical admin list | Same |
| 3 | `03-dna-3-dataprocessresult-t-no-throws-for.png` | 🔴 | State fidelity | Identical | — |
| 4 | `04-dna-4-microservicebase-19-inherited-comp.png` | 🔴 | State fidelity | Identical | — |
| 5 | `05-dna-5-scope-isolation-via-asynclocalstor.png` | 🔴 | State fidelity | Identical | — |
| 6 | `06-dna-6-dynamiccontroller-all-crud-via-api.png` | 🔴 | State fidelity | Identical | — |
| 7 | `07-dna-7-idempotency-via-queue-deduplicatio.png` | 🔴 | State fidelity | Identical | — |
| 8 | `08-dna-8-outbox-pattern-storedocument-befor.png` | 🔴 | State fidelity | Identical | — |
| 9 | `09-dna-9-cloudevents-envelope-for-inter-ser.png` | 🔴 | State fidelity | Identical | — |
| 10 | `state-1-dna-record.png` | 🔴 | State fidelity | Mock card "State 1 — DNA-1" — DNA principle, not a gate state | Replace with real gate states (pending-review, approved, rejected, escalated, timed-out) |
| 11 | `state-2-dna-buildsearchfilter.png` | 🔴 | State fidelity | DNA-2 principle | Same |
| 12 | `state-3-dna-dataprocessresult.png` | 🔴 | State fidelity | DNA-3 principle | Same |
| 13 | `state-4-dna-microservicebase.png` | 🔴 | State fidelity | DNA-4 principle | Same |
| 14 | `state-5-dna-scope.png` | 🔴 | State fidelity | DNA-5 principle | Same |
| 15 | `state-6-dna-dynamiccontroller.png` | 🔴 | State fidelity | DNA-6 principle | Same |
| 16 | `state-7-dna-idempotency.png` | 🔴 | State fidelity | DNA-7 principle | Same |
| 17 | `state-8-dna-outbox.png` | 🔴 | State fidelity | DNA-8 principle | Same |
| 18 | `state-9-dna-cloudevents.png` | 🔴 | State fidelity | DNA-9 principle | Same |
| 19 | `crud-after-create.png` | 🟠 | Copy / privacy | `created by human-interaction-gate-crud.spec.ts` appears in the Notes column visible to end users | Strip spec metadata |
| 20 | `crud-initial-load.png` | 🟠 | Information appropriateness | Machine IDs only, no domain info about what a gate case is | Add Subject / Decision Type / Requester columns |
| 21 | `crud-list-with-test-row.png` | 🟠 | Affordances | Only Delete; a review gate needs Approve / Reject / Escalate / Request Info | Add gate-decision verbs |
| 22 | `default.png` | 🟠 | Error state consistency | Shows a **red** banner "No AI provider keys configured. Flows will use mock AI only." distinct from the yellow banner on every other PNG — good that it exists, but it only appears here | Preserve red banner on every mock-mode capture, not just default |
| 23 | `c-03-before.png` | 🟡 | Utility | Redundant admin list; unclear purpose | Remove or rename |
| 24 | Persistent banner | 🔵 | Chrome | Yellow top banner on 22 of 23 PNGs; red on `default.png` | See row 22 |

## Cross-PNG patterns (flow-level)

- **Content collision with meta-flow-engine:** The 9 DNA state-cards are byte-identical in
  layout and copy to meta-flow-engine's 9 DNA state-cards. Two different business flows
  share the same "evidence." For reviewers, this confirms the cards are a stock stub, not
  per-flow state evidence.
- **Banner inconsistency:** `default.png` shows a **red** "No AI provider keys" banner while
  all other captures show the yellow "Missing provider keys" banner. Same underlying reality
  (no keys) but two different visual treatments; pick one.
- **No human-gate UI at all.** The flow name promises an end-user affordance (review, approve,
  reject, escalate). Nothing of the sort appears. The closest equivalent in this repo is in
  `user-groups-communities/05-admin-approval.png` (Alice / Bob / Carol with Approve/Reject).
  That pattern should be the template for Human Interaction Gate.
- **Spec-name leak** in `crud-after-create.png` (`human-interaction-gate-crud.spec.ts` in Notes).
- 17 of 23 PNGs fail state fidelity; 4 are only admin-CRUD templates; 2 are redundant.

## Business-logic phase coverage

| Phase | Visually covered? |
|--|--|
| Pending human review (item + context) | ❌ |
| Reviewer assigns / self-assigns | ❌ |
| Approve with comment | ❌ |
| Reject with reason | ❌ |
| Request more info | ❌ |
| Escalate to senior reviewer | ❌ |
| SLA timeout / auto-decision | ❌ |
| Audit trail of past decisions | ❌ |

**Zero gate-decision phases are visually evidenced.** Capture set is a dressed-up admin CRUD
with unrelated DNA cards as filler.
