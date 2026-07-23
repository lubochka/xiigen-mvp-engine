# UX Review — Form Builder Templates (`form-builder-templates`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 1 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

All 6 PNGs show the IDENTICAL "Form Builder Templates — FLOW-23" dashboard with four task-type cards (T637 Validate Schema, T638 Publish Version, T639 Instantiate Form, T640 Usage Metrics) and a "Recent Templates — No templates yet" section. Filenames encode assertion rules, not product states. The page itself is actually well-designed and informative — four colored CTAs with short technical blurbs — but leaks internal task-type IDs (T637–T640) that mean nothing to a form author. From a business-user POV, this looks like an engineer console disguised as a product page.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-every-task-type-in-t381-t420-has-at-leas.png` | 🔴 | State fidelity | Dashboard capture labeled as a test-assertion rule | Rename to `form-builder-dashboard-empty.png` |
| 2-5 | `02..05-*` | 🟡 | Redundant | Byte-identical to #01 | Replace with flow states (validation fail, version history, instance, metrics) |
| 6 | `06-focus-areas-covered-form-builder-templat.png` | 🟡 | Redundant | Byte-identical | Capture the actual form-builder canvas |
| — | Page content | 🟠 | Copy / jargon | T637, T638, T639, T640 prefixes expose internal task-type IDs to business users | Hide task IDs or move to collapsed "Technical details" tray |
| — | Page content | 🟡 | Empty state | "No templates yet. Create one to get started." is present but there's no CTA button in the empty-state card — user must find "Create Form Instance" elsewhere | Add "Create your first template" primary CTA to the empty state |
| — | Page content | 🔵 | Visual noise | 4 different bright button colors (blue, green, purple, amber) on one screen competes for attention | Reserve one primary color; secondary actions in neutral |

## Cross-PNG patterns (flow-level)

- **All 6 PNGs are byte-identical.** The page IS well-designed but captured once, labeled 6 ways.
- No captures of the 4 downstream actions (Validate Template, Publish Version, Create Form Instance, View Analytics) that the dashboard advertises — i.e., dashboard is a landing page with no follow-through evidence.
- T637/T638/T639/T640 codes in headlines signal "this is an engineering tool" not "form builder product".

## Business-logic phase coverage

Form-builder expected phases:
- ✅ Dashboard (empty) — captured
- ❌ Create template form / canvas
- ❌ Template validation outcome (pass / fail list)
- ❌ Publish version confirmation (v1→v2 diff, DRAFT→PUBLISHED)
- ❌ Instance created → filled out by end user
- ❌ Usage metrics chart
