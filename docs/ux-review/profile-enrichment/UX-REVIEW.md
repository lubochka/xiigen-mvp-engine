# UX Review — Profile Enrichment (`profile-enrichment`)

**PNGs reviewed:** 15 | **Blockers:** 4 | **High:** 3 | **Medium:** 4 | **Low:** 3
**Overall verdict:** ⚠️ Needs fixes

## Summary

This is the strongest flow in the batch: it actually ships tenant-facing, purposefully-designed
UI (Business Questionnaire → Finding Your Matches → Your Feed) rather than a generic admin CRUD.
Copy is user-friendly ("Tell us about your business", "Analysing compatibility across your
network…", "4 of 4 personalisation signals applied"). However, the captures for four back-end
phases (`profileenrichmentfanin`, `matchingconvergencegate`, `onboardingcompletionbroadcast`,
`onboardingcompleted`) all show the IDENTICAL "Finding Your Matches" spinner — the UI has
no visible representation of the orchestration phase boundaries, so four screenshots named
for distinct business events tell the user nothing different.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-questionnaire-form.png` | 🔵 | Affordance | Form ships with 2 text inputs and one primary CTA. Clear. Placeholders good. But no help text explains what "Business Stage" means beyond "e.g. Startup, Growth, Enterprise"; no required-field markers. | Add small hint text or `*` on required fields. |
| 2 | `01-profileenrichmentfanin-fan-in-step-enter.png` | 🔴 | State fidelity | Filename claims "fan-in step enter" but PNG is the same "Finding Your Matches" spinner used for 3 other phase captures. The user cannot distinguish "fan-in entering" from "matching running". | Either render a phase-specific surface, or drop the screenshot since it adds no UX signal. |
| 3 | `02-matchingconvergencegate-convergence-step.png` | 🔴 | State fidelity | Identical spinner PNG; claims to depict a convergence gate. | Same as above — gate PNG behind a state that actually differs (e.g. "Converging 2/3 signals…"). |
| 4 | `03-onboardingcompletionbroadcast-broadcast.png` | 🔴 | State fidelity | Identical spinner; purports to show a broadcast moment. User has no feedback that broadcast fired. | Show a brief success toast or state card, then transition. |
| 5 | `04-onboardingcompleted-profileenrichmentfan.png` | 🔴 | State fidelity | Identical spinner; filename promises "onboarding completed" but UI is mid-analysis spinner. | Capture the actual completion surface (feed ready), not the pre-completion spinner. |
| 6 | `02-validation-error.png` | 🟠 | Error copy | "Please review your submission." — no specifics. User cannot tell which field is invalid. Fields show no red border, no inline message. | Surface field-level errors ("Industry is required", "Must be one of…"). Use inline + summary. |
| 7 | `03-debounce-pending.png` | 🟡 | Copy | "Your questionnaire is being processed. Please wait a moment before resubmitting." — reasonable, but form disappears entirely. User loses context of what they submitted. | Keep the form visible, disable/grey it out, and show the pending banner above or below. |
| 8 | `04-processing.png` | 🔵 | Polish | "Processing your business profile… This may take a few moments." — nice. But no progress indicator or ETA; could feel stuck on slow networks. | Add a subtle indeterminate bar or step indicator ("1/3: analysing"). |
| 9 | `05-matching-in-progress.png` | 🔵 | Polish | Clean loading card with animated spinner + "Analysing compatibility across your network…". Good. | None — ship as is. |
| 10 | `06-matching-partial.png` | 🟠 | Affordance | Shows "Matches still being refined" amber banner + 2 result cards (Acme Corp 94, Beta Ventures 87). No CTA to view match detail, no explanation of what 94/87 means. Score is opaque. | Make rows clickable → match detail. Add a tooltip "Score = compatibility 0–100". |
| 11 | `07-matching-complete.png` | 🟡 | Hierarchy | 3 result cards render with "Connections found: 3". Score numbers repeat in small grey type; no sort affordance, no filter, no "why this match". | Expose match reasons on hover or inline chip ("Industry match", "Stage match"). |
| 12 | `08-personalization-feed.png` | 🟠 | Affordance | "Your Feed" shows 4 card labels ("Getting started with integrations", "Top workflows for your industry" etc.) but each card is blank apart from a category tag. Nothing opens. The green `PersonalizationCompleted` event card at bottom is engine-internal leakage into tenant UI. | Fill cards with actual content; hide the internal event card — it's an engineering signal, not UX content. |
| 13 | `09-personalization-completed-event.png` | 🟡 | Redundancy | Visually identical to `08-personalization-feed.png`. Same capture, different filename. | Drop one of the two captures, or differentiate state (e.g. capture feed BEFORE event fires). |
| 14 | `10-personalization-degraded.png` | 🔵 | Polish | Amber banner "Showing trending content — Personalisation signals are not yet available" then 3 "Trending:" items. Good graceful-degradation pattern. Copy is clear. | Ship as is. Consider making "Trending" chip higher-contrast. |
| 15 | `q-02-before.png` | 🟡 | Redundancy | Visually identical to `01-questionnaire-form.png`. Two captures of the same empty form. | Drop duplicate or use it to show filled-in state (pre-submit). |

## Cross-PNG patterns (flow-level)

- **4 PNGs show the identical "Finding Your Matches" spinner** (items 2–5 above). Four phase
  names map to one rendered surface. The orchestration layer has four distinct events but the
  UI has one loading card. This is the single biggest state-fidelity failure in the flow.
- **Engine-internal event name leaked into tenant UI** (`PersonalizationCompleted` card on
  Your Feed) — a clear layering violation from the end-user POV.
- **Validation error surface is generic** — contradicts the thoughtful copy elsewhere.

## Business-logic phase coverage

Topology nodes for FLOW-02: questionnaire intake → fan-in → convergence gate → matching →
broadcast → completion → personalization → feed.

Covered with distinct visuals: intake (01), validation error (02), debounce (03), processing
(04), matching in progress (05), matching partial (06), matching complete (07), personalized
feed (08, 09 dup), degraded feed (10).

Covered with indistinguishable placeholders: fan-in enter, convergence gate, broadcast moment,
onboarding-completed moment (all share the spinner PNG).

Missing: the POST-match "start an intro" action the feed cards imply but don't deliver.
