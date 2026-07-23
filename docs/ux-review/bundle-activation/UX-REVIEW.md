# UX Review — Bundle Activation (`bundle-activation`)

**PNGs reviewed:** 25 | **Blockers:** 20 | **High:** 3 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

The flow ships a functional but generic admin CRUD table ("Bundle Activation" backed by
`/api/dynamic/xiigen-bundle-activation`) and **nothing else**. Out of 25 PNGs, 20 are
byte-identical renders of the same three-row table — despite filenames claiming they depict
10 distinct step transitions (`bundlevalidator-processing`, `bundleactivationorchestrator`,
`bundlestatustracker-bundledegraded`, `bundlestatustracker-bundlerestored`, …). None of the
business-logic phases described by the filenames are actually visible to a user. From an
end-user's perspective, there is no "bundle activation" experience here — only a raw
Name/Status/Notes/Actions table with UI-generated IDs like `ui-1776451823105`, status
`active`, and note `created via UI form`. The `e2e-1776602499348` row in `crud-after-create`
exposes the raw spec file name (`bundle-activation-crud.spec.ts`) to the end user, which is a
content-leak BLOCKER.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-bundlevalidator-processing-step-entered.png` | 🔴 | State fidelity | Claims "validator processing" step, shows generic admin list | Render validator state badge + progress indicator or gate screenshot |
| 2 | `02-bundleactivationorchestrator-processing.png` | 🔴 | State fidelity | Identical byte copy of PNG #1 | Capture after orchestrator kicks off — show job card, in-progress state |
| 3 | `03-bundlestatustracker-processing-step-ente.png` | 🔴 | State fidelity | Identical byte copy; no "status tracker" UI exists | Tracker should render timeline / badge |
| 4 | `04-bundleactivationrequested-bundlevalidato.png` | 🔴 | State fidelity | Identical copy; no transition evidence | Capture the event handoff visually |
| 5 | `05-bundlevalidator-bundleactivationorchestr.png` | 🔴 | State fidelity | Identical copy | Same as above |
| 6 | `06-bundlevalidator-bundlevalidationcomplete.png` | 🔴 | State fidelity | Identical copy; completion should show green badge / next step | Introduce lifecycle state pills |
| 7 | `07-bundleactivationorchestrator-bundleactiv.png` | 🔴 | State fidelity | Identical copy; "bundleactivated" should show success UI | Add success toast or state chip |
| 8 | `08-flow-lifecycle-regenerated-bundlestatust.png` | 🔴 | State fidelity | Identical copy; "lifecycle regenerated" is invisible | Render lifecycle timeline |
| 9 | `09-bundlestatustracker-bundledegraded-when.png` | 🔴 | State fidelity | Identical copy; degraded state shown = no distinguishable warning | Red/amber badge + degradation reason copy |
| 10 | `10-bundlestatustracker-bundlerestored-when.png` | 🔴 | State fidelity | Identical copy; restored state shown = no success indicator | Green badge + restore timestamp |
| 11 | `state-1-bundlevalidator-processing.png` | 🔴 | State fidelity | Same generic list | — |
| 12 | `state-2-bundleactivationorchestrator-processing.png` | 🔴 | State fidelity | Same generic list | — |
| 13 | `state-3-bundlestatustracker-processing.png` | 🔴 | State fidelity | Same generic list | — |
| 14 | `state-4-bundleactivationrequested-bundlevalidator.png` | 🔴 | State fidelity | Same generic list | — |
| 15 | `state-5-bundlevalidator-bundleactivationorchestrator.png` | 🔴 | State fidelity | Same generic list | — |
| 16 | `state-6-bundlevalidator-bundlevalidationcompleted.png` | 🔴 | State fidelity | Same generic list | — |
| 17 | `state-7-bundleactivationorchestrator-bundleactivated.png` | 🔴 | State fidelity | Same generic list | — |
| 18 | `state-8-flow-lifecycle.png` | 🔴 | State fidelity | Same generic list | — |
| 19 | `state-9-bundlestatustracker-bundledegraded.png` | 🔴 | State fidelity | Same generic list | — |
| 20 | `state-10-bundlestatustracker-bundlerestored.png` | 🔴 | State fidelity | Same generic list | — |
| 21 | `crud-after-create.png` | 🟠 | Copy / privacy | A row exposes raw spec filename `bundle-activation-crud.spec.ts` in the Notes column — visible to end users | Strip test-origin metadata from Notes; keep "created via test harness" at most |
| 22 | `crud-initial-load.png` | 🟠 | Information appropriateness | The only human-meaningful column (Name) is a machine ID like `ui-1776451823105`; nothing hints what a bundle is or does | Add Title/Description columns; store a business name |
| 23 | `crud-list-with-test-row.png` | 🟠 | Affordances | Only action is `Delete` (destructive). No View/Activate/Retry/Deactivate actions | Provide row-level actions matching bundle lifecycle |
| 24 | `default.png` | 🟡 | Consistency | Identical to the numbered captures — default landing adds no context | Add empty-state or welcome hero above the list |
| 25 | `c-03-before.png` | 🟡 | Utility | Unexplained capture name; shows identical list; no clear diagnostic value | Rename or remove duplicate captures |
| 26 | Persistent banner | 🔵 | Chrome | Yellow "Missing provider keys: openai, gemini" banner eats top 48px — present but not obscuring primary content here | Collapse to a dismissible toast once acknowledged |

## Cross-PNG patterns (flow-level)

- **State-fidelity collapse:** 20/25 PNGs are pixel-identical to the base admin list even though
  filenames span 10 distinct workflow transitions. The capture harness appears to call the same
  URL without triggering or rendering any of the named state transitions.
- **No domain-specific UI exists for "bundle activation."** The admin console surface uses the
  generic dynamic-CRUD template. A business user cannot see what activating a bundle means,
  what happens during validation, or what a degraded/restored bundle looks like.
- **Machine IDs everywhere:** `ui-1776451823105`, `ui-1776452095602`, etc. are the only
  identifiers in the Name column — no human-readable names.
- **Only Delete as row action:** no domain verbs (Validate, Activate, Restart, Suspend, Restore).
- **Leak of test infra:** `crud-after-create.png` shows `created by bundle-activation-crud.spec.ts`
  in user-facing Notes. That note should never escape the test environment.

## Business-logic phase coverage

Per FLOW-00 topology naming in filenames:

| Phase claimed by filename | Visually covered? |
|--|--|
| n1 Bundle activation requested | ❌ not visible |
| n2 BundleValidator processing | ❌ generic list only |
| n3 BundleValidationCompleted | ❌ |
| n4 BundleActivationOrchestrator processing | ❌ |
| n5 BundleActivated | ❌ |
| n6 Flow lifecycle regenerated | ❌ |
| n7 BundleStatusTracker processing | ❌ |
| n8 BundleDegraded | ❌ |
| n9 BundleRestored | ❌ |

**Zero business-logic phases are visually evidenced.** The flow passes e2e harness coverage
but fails user-evidence coverage entirely.
