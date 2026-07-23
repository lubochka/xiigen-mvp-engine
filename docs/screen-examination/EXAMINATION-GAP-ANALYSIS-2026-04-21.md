# EXAMINATION GAP ANALYSIS — why the V-R4..V-R8 convergence was incomplete

**Date:** 2026-04-21
**Branch:** claude/pensive-tereshkova-baf347
**Triggered by:** Luba 2026-04-21 challenge — "where did we lose a tones of functionality?", "where are the translations for hebrew for instance?", "where are the roles?"
**Verdict:** The V-R4..V-R8 convergence was measured against the WRONG criteria. The claim "CONVERGED at 0.85%" was for RENDERING QUALITY on a narrow primary-role capture, not for SPEC COVERAGE or ROLE × LANGUAGE × STATE matrix.

---

## 1. What the convergence rubric actually measured

The 11-axis rubric (UX-P1/P2/P4/P5/P6/P8/P9 + G/R/H/S) scored:
- Accessibility, touch targets, style, responsive, typography, forms, navigation
- Grammar fit, real-world reference parity, human language, state legibility

It did **not** score:
- **Functional coverage** — does the page actually implement what the business spec describes?
- **Role completeness** — does the flow render for every applicable role?
- **Language completeness** — does the flow render correctly in he-RTL?
- **Business-state completeness** — does the flow cover every state in its lifecycle (empty/loading/populated/error/success per phase)?

## 2. Capture coverage: actual vs target

### The VISUAL-REEXAMINATION-PLAN.md original target

| Axis | Target values | Count |
|------|---------------|-------|
| Flows | 45 (48 minus FLOW-41/42/43 INTERNAL_ONLY) | 45 |
| Roles per flow | 4–6 depending on flow | avg 5 |
| Languages | en + he-RTL | 2 |
| Viewports | mobile + tablet + desktop | 3 |
| Phase states | empty / loading / populated / error / success (per business phase) | 3–6 |
| **Target PNGs** | sampled strategically | **~600** |

### What's actually in the tree

```
docs/e2e-snapshots/visual-audit/
  chromium-desktop/  → 69 PNGs (one role per flow avg)
  chromium-tablet/   → 69 PNGs
  chromium-mobile/   → 69 PNGs
  = 207 PNGs total, 1–4 roles per flow, zero Hebrew

docs/e2e-snapshots/c6-role-coverage/  → 112 PNGs
  flat role-coverage sweep, desktop only, zero Hebrew

docs/e2e-snapshots/<slug>/  → 539 PNGs across per-flow dirs
  business-state PNGs (e.g. state-1-form-draft, state-2-no-fields)
  NOT scored in V-R4..V-R8 rubric at all
```

**Coverage gap vs plan:**
- Languages: **he-RTL = 0 / 45 flows** (the plan called for per-page visual audit; it never happened)
- Per-flow role variants: **27 of 45 flows have only 1 role captured** in visual-audit
- Business-state captures EXIST in `docs/e2e-snapshots/<slug>/` but were **never cross-referenced** against visual-audit during V-R4..V-R8 scoring

## 3. The FLOW-21 case — what Luba spotted

### The business spec (from `business flows/21 - forms and flows.md`)

FLOW-21 is a **complete Forms + Workflow/Automation platform** à la Gravity Forms. The spec describes **10 modules**:

- **A. Form Definition & UI Builder** — drag-drop fields, sections, pages, repeaters, calculations, conditional rules
- **B. Form Runtime Renderer** — public form UI + admin preview, client-side show/hide + wizard steps
- **C. Submission Pipeline** — intake, normalize, validate, spam/security, persist, post-process, confirm
- **D. Entry Storage** — submissions + meta, CSV export, partial entries, admin edits, entry lifecycle
- **E. Notification Engine** — email/SMS templates with merge tags, routing rules, attachments
- **F. Feeds / Integration Add-ons** — per-form rules for CRM, mail, payments, Slack
- **G. Payments Module** — payment fields, pricing, coupons, gateways
- **H. File Uploads & Media** — secure uploads, virus scan, storage, permissions
- **I. Admin Ops** — audit logs, resend notifications, re-run feeds, RBAC
- **J. Extensibility Layer** — hooks/events, REST API, webhooks

### The existing examination record (2026-04-20, RUN-61)

`docs/screen-examination/dynamic-forms-workflows-examination.md` correctly identified:
- 3 roles: tenant-admin (builder) / tenant-user (respondent) / anonymous (public responder)
- Compound grammar G7 (builder: field palette + preview + properties) + G5 (respondent: kiosk one-field-at-a-time)
- References: Typeform, Google Forms, Jotform, Airtable Forms
- **Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — three-column builder + kiosk respondent

### What was actually built

`client/src/pages/dynamic-forms-workflows/DynamicFormsWorkflowsPage.tsx`:
- **1 hard-coded DEMO_FORM_SCHEMA with 6 fields** showing role-conditional visibility
- Renders a single form with `viewerRole`-conditional field show/hide
- Has AdminCrudPanel below for form schemas (raw DB browser)
- NO three-column builder layout
- NO drag-drop, NO field palette, NO field properties panel
- NO form list / NO "Create new form" CTA
- NO kiosk respondent view captured in visual-audit
- NO payments / notifications / feeds / uploads / admin ops / extensibility

### Coverage ratio: 2 of 10 spec modules present (20%). 8 of 10 modules are missing.

### Why the rubric didn't catch this

The V-R4..V-R8 rubric's "G — Grammar fit" axis checked whether the page renders in its assigned grammar category (G7 = "settings tabs" here). It asked "does this look like a settings-tabs page?" — and the demo form does, so it scored PASS. The axis did not ask "does this page cover modules A–J of the FLOW-21 business spec?"

## 4. Every flow needs the same audit

If FLOW-21 delivered 20% of its spec and scored PASS on the rubric, the same gap almost certainly exists elsewhere. The rubric greenlit narrow implementations across the product.

## 5. What a proper examination must add

### Axis 12 — FUNCTIONAL COVERAGE (new, missing from V-R4..V-R8 rubric)

For each flow: list the modules/capabilities named in the business spec (FLOW-21 has A–J; other flows will have their own). For each module, classify the current implementation:
- **PRESENT** — implemented and visible in the relevant PNG(s)
- **STUB** — minimal placeholder, not functional
- **MISSING** — no render, no hint of it on the page

Per-flow coverage = PRESENT / (PRESENT + STUB + MISSING). **Any flow below 70% coverage is an H-axis BLOCKER** regardless of how clean the rendering is.

### Axis 13 — ROLE COMPLETENESS

For each flow, read `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` + the role-analysis batch file for the canonical role list. Every applicable role must have at least one PNG in visual-audit.

- Gap for FLOW-21: captured `tenant-admin` + `tenant-user`; missing `anonymous` (public form responder per the examination record).

### Axis 14 — LANGUAGE COMPLETENESS

Every flow must capture both `en` and `he-RTL`. The he-RTL capture verifies:
- `document.dir = 'rtl'` flipped the shell
- text-start / margin-inline-start alignments flipped
- Hebrew translations present for all visible strings
- Numbers stay LTR inside RTL text (tabular-nums)

**Current: 0 / 45 flows have he-RTL captures.** The plan called for this; it never shipped.

### Axis 15 — BUSINESS-STATE COMPLETENESS

For each flow's process list (from `UI-REFLECTION-STATE.md`), capture every `.` (missing) state in the per-process verdict table. A flow with 6 processes × 5 states = 30 state cells; the visual-audit primary-<role>.png captures only 1 of those 30.

- FLOW-21 has 8 `?mock=<key>` states in the per-flow dir (form-draft, no-fields, published, occ-conflict, submission-received, submission-rejected, automation-triggered, analytics-updated). These were **never scored** by V-R4..V-R8.

## 6. Honest scorecard — where we really are

| Quality dimension | V-R8 score | True score |
|-------------------|-----------|-----------|
| Rendering quality (primary role × en × populated state) | 0.85% fix rate | **confirmed on 28/45 flows** |
| Role completeness | — | **27/45 flows have only 1 role captured** |
| Language completeness (he-RTL) | — | **0/45 flows** |
| Business-state completeness | — | **spec-level states captured in per-flow dirs but never cross-scored** |
| Functional coverage vs business spec | — | **FLOW-21 at 20%, others unknown — likely similar** |

## 7. Proposal

This session now produces three outputs:

1. **This gap analysis** (EXAMINATION-GAP-ANALYSIS-2026-04-21.md) — the honest assessment above.
2. **PROPER-EXAMINATION-PLAN-v1.md** — the full rubric + execution plan for axes 12–15, with sampling strategy to make the work tractable (~500–800 PNGs achievable in ~5 hours of work).
3. **Pilot execution on FLOW-21** — demonstrate the new rubric against the flow Luba surfaced, so she can see the axis-12 coverage gap concretely and decide whether to authorise the full 45-flow re-audit.

No further "converged" claims until axes 12–15 are run and every flow has been directly scored (no extrapolation).
