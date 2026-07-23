# Flow UI examination — FLOW-21 dynamic-forms-workflows

## Date: 2026-04-20 · Run: RUN-61 · Batch: G (Grammar 7 Form Builder + Grammar 5 Respondent)

## One-sentence spec (F1)
> When a user submits a dynamic form on the XIIGen platform, evaluate the
> conditional logic, advance the workflow state machine to the next step,
> and trigger any dependent form renders.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-05.md`)
- **tenant-admin (builder)** — builds forms with conditional logic
- **tenant-user (respondent)** — fills out forms
- **anonymous** — public form responder (when form is public)

## Grammar (compound)
- **G7 Form Builder** for builder view (left field palette + centre preview + right field properties)
- **G5 Kiosk** for respondent view (one question group at a time, progress indicator)

## Reference
**Typeform, Google Forms, Jotform, Airtable Forms** (builder);
**Typeform respondent** (kiosk one-field-at-a-time).

## Classification
- **Q1 CRUD?** 🟡 `DynamicFormsWorkflowsPage` likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty form list: "Create your first form" CTA.
- **Q3 Engineering leak?** "Conditional logic", "workflow state machine" — builder audience may accept "conditional logic" but "state machine" should be "Flow steps".
- **Q4 Role-correct?** ✅ 3-role split.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — three-column builder layout + kiosk respondent.

## 25 existing PNGs

## Planned fixes
- **Builder** (tenant-admin): left field palette (Short text / Long text / Choice / Date / File / Rating) + centre form preview (click to edit field) + right field properties panel
- Drag-drop to reorder fields
- Conditional logic: "Show this field only if X is Y" inline per field (Typeform pattern)
- **Respondent** (tenant-user / anonymous): one-question-per-screen kiosk, progress indicator top, "Submit" primary on last step, no sidebar for anonymous (RUN-49 G3)

---

## Post-fix verification — MANDATORY Axis D check (added 2026-04-21)

**Per PER-IMAGE-VALIDATION-TEMPLATE Axis D** (flow flagged NEEDS_PURPOSE_BUILT_UI) **and VISUAL-REEXAMINATION-PLAN dual convergence criterion**, this flow requires a verified Axis D block before it can count as converged. The V-R4..V-R8 automated score cannot substitute — it measures grep-countable surface quality only.

### Pilot capture (RUN-167, 2026-04-21, commit 0655f993 + pilot PNGs)

Captured 9 PNGs at `/dynamic-forms-workflows?role=<role>&mock=published` across 3 roles × 3 viewports. Subagent scored each cell against Axis A (framing), Axis B (role branching), Axis D (business-logic phase + state), and FLOW-21 business spec module coverage (A–J).

### Finding: `post_fix_verification_status = NOT_SHIPPED`

All 9 cells render the same generic `BusinessStateCard` metadata stub (`schemaId`, `version`, `publishedAt`, `publicUrl`). None of the purpose-built surfaces from the Planned Fixes section above have shipped.

| Cell | Axis B verdict | Axis D verdict | Purpose-built surface shipped? |
|------|----------------|----------------|--------------------------------|
| tenant-admin × desktop | BLOCK (no Edit / Add Field / Publish CTA) | BLOCK (no three-column builder; only state metadata) | NO |
| tenant-admin × tablet | BLOCK | BLOCK | NO |
| tenant-admin × mobile | BLOCK | BLOCK | NO |
| tenant-user × desktop | BLOCK (no form input, no Submit, admin metadata leaked) | BLOCK (no Typeform kiosk) | NO |
| tenant-user × tablet | BLOCK | BLOCK | NO |
| tenant-user × mobile | BLOCK | BLOCK | NO |
| anonymous × desktop | BLOCK (admin `schemaId`+`publishedAt` publicly exposed) | BLOCK (no public respondent UI) | NO |
| anonymous × tablet | BLOCK | BLOCK | NO |
| anonymous × mobile | BLOCK | BLOCK | NO |

### Business-spec module coverage (FLOW-21 A–J)

| Module | Spec capability | Implementation state |
|--------|-----------------|----------------------|
| A | Form Definition & UI Builder (drag-drop + conditional rules) | MISSING |
| B | Form Runtime Renderer (public UI + admin preview) | MISSING |
| C | Submission Pipeline (intake → validate → persist → post-process → confirm) | MISSING |
| D | Entry Storage (submissions + meta, CSV export, lifecycle) | MISSING |
| E | Notification Engine (email/SMS templates, merge tags) | MISSING |
| F | Feeds / Integration Add-ons | MISSING |
| G | Payments Module | MISSING |
| H | File Uploads & Media | MISSING |
| I | Admin Ops (audit, RBAC, resend) | MISSING |
| J | Extensibility Layer (hooks, REST, webhooks) | MISSING |

**Coverage: 0 / 10 modules (0%). Axis 12 verdict: BLOCKER.**

### Critical security / trust leak surfaced by Axis B

Anonymous + tenant-user respondent captures expose admin-only metadata (`schemaId`, `publishedAt`, `publicUrl`) because the route has no role-branched rendering — every role gets the same `BusinessStateCard`. This is not just a UX problem; it is an information-disclosure leak (Axis A = PASS on shell but Axis B = BLOCK on role-content boundary).

### axis_D_conclusion: **NOT_CONVERGED**

V-R4..V-R8 declared this flow PASS on the automated score because the engineering-identifier leaks were cleaned up and the subtitle was humanized. The post-fix verification demonstrates the underlying functional implementation was never built. The PASS was against surface-quality axes only; Axis D had never been run.

### Recommended actions (no autonomous implementation — blocks requires product decision)

1. **Product decision required**: does FLOW-21 ship with the RUN-61 planned fixes (three-column builder for tenant-admin + Typeform kiosk for tenant-user/anonymous), or is the scope reduced? This is not a mechanical edit — it is a feature build.
2. **Immediate hardening**: remove `schemaId`, `publishedAt`, `publicUrl` from the respondent (tenant-user / anonymous) render path. These are admin metadata and must not appear on non-admin views. This is a P0 trust leak independent of the larger build decision.
3. **Axis D tracking**: `coverage_NOT_YET_EXAMINED += 1` until the purpose-built surfaces ship and re-verification passes.

### Pilot artifact paths

- Spec: `client/e2e/visual-audit-flow-21-pilot.spec.ts`
- PNGs: `docs/e2e-snapshots/visual-audit/chromium-{desktop,tablet,mobile}/dynamic-forms-workflows/populated-{tenant-admin,tenant-user,anonymous}.png`
- Scoring result: captured in this record (above)
- Rubric applied: PER-IMAGE-VALIDATION-TEMPLATE v1.1 + FLOW-21 business spec (business_flows/21 - forms and flows.md modules A–J)
