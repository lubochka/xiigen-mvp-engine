# UX Review — Event Management (`event-management`)

**PNGs reviewed:** 25 | **Blockers:** 9 | **High:** 2 | **Medium:** 5 | **Low:** 3
**Overall verdict:** Needs fixes

## Summary

Event Management has the strongest tenant-facing design in this batch. The Events list, empty state, error state, Create Event form, success card, duplicate-submission guard, and validation error all look like a real product. The form is cleanly labeled, has placeholder examples, handles unlimited-capacity intelligently, and confirms creation with an Event ID. The flow breaks down, however, in its proof-of-business-phase captures: nine PNGs claim to show distinct orchestration / engine / tracker / registrar / analytics phases but all render the same Create Event form (no phase differentiation). The single biggest user-facing defect is the non-specific validation error copy ("Please review your submission") — users cannot tell which field is invalid.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-event-list.png` | LOW | Polish | Exemplary. ACTIVE / PROMOTED badges, dates, attendance counts, Promote/View actions, + Create Event CTA top-right. | No change. |
| 2 | `01-eventcreationorchestrator-orchestration.png` | BLOCKER | State fidelity | Claims orchestrator step — shows the Create Event form. Identical to #4, #5, #6, #7, #8, #9 form captures. | Gate capture behind a recognizable orchestration state (progress toast, step indicator) or remove claim. |
| 3 | `02-event-list-empty.png` | LOW | Empty state | Good — "No events yet. Create your first event →" with proper empty-state affordance. | No change. |
| 4 | `02-eventpromotionengine-processing-step-ent.png` | BLOCKER | State fidelity | Claims promotion-engine step — shows unrelated Create Event form. | Same as row 2. |
| 5 | `03-event-list-error.png` | MEDIUM | Error copy | "Failed to load events. Please refresh or try again." — no retry button, no error detail, no support link. User has nothing to do but refresh the whole page. | Add a Retry button inline and a Support/Help link; optionally display an error code for diagnosis. |
| 6 | `03-eventanalyticstracker-observability-step.png` | BLOCKER | State fidelity | Claims analytics/observability state — shows the Create Event form. | Same as row 2. |
| 7 | `04-eventcreationrequested-eventcreationorch.png` | BLOCKER | State fidelity | Duplicate of the Create Event form. | Same. |
| 8 | `04-navigate-to-create.png` | LOW | Polish | Same form, expected content since the filename says "navigate-to-create". OK. | No change. |
| 9 | `05-event-creation-form.png` | LOW | Polish | Clean form. Field labels, placeholders, Private/Paid checkboxes. | Consider making Start Date native input more visually prominent. |
| 10 | `05-eventcreationorchestrator-eventregistrat.png` | BLOCKER | State fidelity | Claims orchestrator→registration handoff — shows blank form. | Same. |
| 11 | `05b-form-submitted.png` | LOW | Success state | "Event created successfully. Event ID: evt-1776602754667" with Back-to-Events link. Good. | Show Event title and link to detail page, not just ID. |
| 12 | `06-eventcreationorchestrator-eventpromotion.png` | BLOCKER | State fidelity | Claims orchestrator→promotion handoff — shows blank form. | Same. |
| 13 | `06-validation-error.png` | HIGH | Error specificity | Generic red-box copy "Please review your submission." No per-field error message, no highlight on offending input. User has no idea which field failed. | Show per-field inline errors (under each input) + summary referencing field names. This is the biggest UX bug in this flow. |
| 14 | `07-eventregistrationmanager-eventanalyticst.png` | BLOCKER | State fidelity | Claims registration-manager phase — shows empty Create Event form. | Same. |
| 15 | `07-unlimited-checked.png` | LOW | Polish | Capacity input grayed when "Unlimited" is checked — correct disabled-field affordance. | No change. |
| 16 | `08-event-created.png` | LOW | Polish | Minimal success card with "Event created successfully" and "Back to Events". | Link straight into the new event's detail page. |
| 17 | `08-eventpromotionengine-eventanalyticstrack.png` | BLOCKER | State fidelity | Promotion-engine handoff capture — shows unrelated form. | Same. |
| 18 | `09-event-creation-error.png` | MEDIUM | Error copy | "Event creation failed. Please try again or contact support." No error code, no actionable field-specific guidance. | Show error code; if possible, show which field / constraint caused failure. |
| 19 | `09-eventanalyticstracker-eventlifecyclecomp.png` | BLOCKER | State fidelity | Claims lifecycle-complete event — form only. | Same. |
| 20 | `10-event-duplicate.png` | MEDIUM | Copy | "An event with this key already exists. Your previous submission was received." — good idempotency message, but doesn't offer to navigate to the existing event. | Add "View existing event" link to resolve user's next question. |
| 21 | `em-04-before.png` | LOW | Duplicate | Identical to `04-navigate-to-create.png` / Create Event form. | Deduplicate; rename to describe variant. |
| 22 | `em-05b-before.png` | LOW | Duplicate | Identical form capture. | Same. |
| 23 | `em-06-before.png` | LOW | Duplicate | Identical form capture. | Same. |
| 24 | `em-07-after.png` | LOW | Duplicate | Identical to event list with populated events (same as `01-event-list.png`). | Deduplicate. |
| 25 | `em-07-before.png` | LOW | Duplicate | Identical form capture. | Same. |

## Cross-PNG patterns (flow-level)

- **Nine "service / phase" captures are visually identical** to the Create Event form. These do not prove distinct business states — they are just the form page. The test harness likely re-captures the form route while waiting for a cross-service event that never becomes visible in the UI.
- **The validation story is weak.** `06-validation-error.png` says only "Please review your submission." — no per-field inline error, no field highlight, no indication of WHICH field is invalid. This is the biggest real UX bug visible in this flow.
- **Error/failure copy is generic.** Both `03-event-list-error.png` and `09-event-creation-error.png` give the user no error code, no diagnostic, and limited recovery actions (no retry on list load, no field-specific failure on create).
- **Success feedback is thin.** `05b` / `08` show Event ID and a Back link, but no link into the newly-created event's detail/promote path, which is the user's next likely action.
- **Idempotency is correctly handled** (`10-event-duplicate.png`) — rare and good.

## Business-logic phase coverage

Topology surfaces referenced by filenames:
- EventCreationOrchestrator, EventPromotionEngine, EventAnalyticsTracker, EventRegistrationManager, EventLifecycleComplete.

**Visually covered:** list (`01`), empty list (`02`), list error (`03`), navigate to create (`04`), form (`05`, `07-unlimited`), validation error (`06`), success (`05b`, `08`), creation error (`09`), duplicate guard (`10`).

**Missing/misrepresented:** every capture claiming to show an orchestrator→service handoff or lifecycle-completion renders only the Create Event form. There is no evidence in the UI of promotion-engine-active, analytics-tracker-emitted, registration-opened, or lifecycle-closed states. The engine side of this flow is invisible to a user reviewing these captures.
