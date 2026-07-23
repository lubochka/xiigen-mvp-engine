# FLOW-01 Layer 3 + Cascade Visual Evidence Readiness

**Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v1.1 → Layer 3 + Phase 3 + Phase 4 + Phase 5
**Status**: visual-evidence infrastructure not yet available. This document declares what Claude Code must read and capture when the infrastructure lands, so every cascade point can be executed mechanically.

This document is **reference-only**. It never describes FLOW-01 business logic, expected phases, expected roles, or expected states. All of that is defined in the source files listed below. Claude Code reads those files at execution time; this document tells it where to look.

---

## Why six cascade points (not one)

Per v1.1 (1) § Phase 5 Visual-evidence summary: Req-3 is not PROVEN by unit tests alone. Visual evidence is required at **six distinct handoff points** in the cascade, each with a passing SK-549 Axis D verdict. A unit test proves the code does the right thing; a PNG at every handoff point proves the right thing actually renders at every stop of the cascade.

Skipping any one of the six points leaves an undetectable break: a profile that serializes correctly but renders wrong; a marketplace listing that says "v1.0.1" but ships v1.0.0 files; a consumer that receives the adapted code but shows the original UI. Only the PNG answers this.

---

## The six cascade points (v1.1 summary table)

| # | Point | When | Required PNGs | Axis D check |
|---|---|---|---|---|
| **P1** | Platform source (Layer 3) | Before any tenant forks | C1–C7 for each client page | Original domain fields from functional spec |
| **P2** | Tenant A (acme-pro-members) adapted | After adaptation applied, before publish | C2, C4, C6 per affected page | Acme's change visible in UI |
| **P3** | Tenant A marketplace listing | Before publish to marketplace | 1 listing PNG | Version + changelog visible |
| **P4** | Tenant B (northwind-guild) installed | After install, before adapting | C2, C4, C6 per affected page | Acme's change still visible |
| **P5** | Tenant B adapted + exported | After Tenant B's own change applied | C2, C4, C6 per affected page | Both Acme's AND Tenant B's changes visible |
| **P6** | Tenant B marketplace listing | Before publishing v1.0.2 | 1 listing PNG | v1.0.2 + both changelog entries |

**If any row has no PNG with a passing SK-549 Axis D verdict, Req-3 is not PROVEN for this flow.**

---

## Ground-truth files — read these before capturing any PNG

Per v1.1 § Step 0:

| # | File | Status | Purpose |
|---|---|---|---|
| 1 | `docs/screen-examination/user-registration-examination.md` | ✅ EXISTS | WHO / VERB / GRAMMAR per screen |
| 2 | `docs/flow-coverage/user-registration/P1-business-logic-inventory.md` | ✅ EXISTS | Business-logic phases + states |
| 3 | `docs/flow-coverage/user-registration/P5-ui-specs.md` | ✅ EXISTS | Expected screen states per phase |
| 4 | `docs/design-context/user-registration/.impeccable.md` | ❌ MISSING | Grammar type (G1–G7) + design signature |
| 5 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-*.md` | ✅ EXISTS (8 files, grep for user-registration) | Role scopes + tier branches |
| 6 | `docs/business-flows/01-user-registration.md` | ✅ EXISTS | Functional spec — domain fields per phase |

Claude Code reads these six files before capturing any cell. This document does not describe what they contain — that is the flow's own documentation.

**Blocker for full execution**: the `.impeccable.md` file for FLOW-01 does not exist in the repo. Axis A (Shell) and Axis F Layer 5 (Design signature) cannot be evaluated without it. Produce this file before running Layer 3, or document why it is intentionally absent.

---

## P1 — Platform source mandatory cell matrix

| Cell | Role | Language | State | Resolution |
|---|---|---|---|---|
| C1 | Primary role | en | empty | 1280px |
| C2 | Primary role | en | populated | 1280px |
| C3 | Primary role | en | error | 1280px |
| **C4** | **Primary role** | **he-RTL** | **populated** | **1280px** |
| C5 | Secondary role (if exists) | en | populated | 1280px |
| **C6** | **Primary role** | **en** | **populated** | **375px mobile** |
| **C7** | **Primary role** | **en** | **populated** | **768px tablet** |

FLOW-01 has 6 client pages. Total minimum cells for P1 = 6 × 7 = **42**. Each cell needs a PNG and a completed SK-549 block in `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json`.

PNG storage:
```
docs/e2e-snapshots/user-registration/platform-source-v1.0.0/[page]/[cell-id]-[description].png
```

---

## P2 — Tenant A (acme-pro-members) adapted

After applying `tenant-profile-acme-pro-members.json`, recapture the three mandatory cells per affected page (cells that render any of the overridden keys):

| Cell | Scope |
|---|---|
| C2 — en, populated, 1280px | Adapted value visible in the UI (not just in config) |
| C4 — he-RTL, populated, 1280px | Adaptation renders correctly in RTL direction |
| C6 — en, populated, 375px mobile | Adaptation readable and usable at mobile resolution |

Affected pages (for the 4 freedom-config overrides acme applies):
- Invitation email preview page (renders `flow01_invitation_inviter_name` + `flow01_invitation_community_name`)
- Verification-pending page (references `flow01_email_verification_ttl_seconds` in copy)
- Resend-verification page (references `flow01_resend_rate_limit_minutes` in copy)

PNG storage:
```
docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/[page]/[cell-id]-[description].png
```

Run SK-549 on each. **Axis D expected value source**: `docs/portability/flow-01/tenant-profile-acme-pro-members.json` overrides map + functional spec for the page's phase+state. Any BLOCK → adaptation is not done. Fix before proceeding to P3.

---

## P3 — Tenant A marketplace listing

Before acme publishes v1.0.1, capture the marketplace listing card for FLOW-01:

```
docs/e2e-snapshots/marketplace/user-registration-tenant-a-v1.0.1-listing.png
```

SK-549 requirements:
- **Axis B**: listing shows acme's adapted description, not the platform original
- **Axis D**: version number (`1.0.1`), changelog summary, and category (`freedom-config`) visible
- **Axis E**: no internal IDs (T47/T48/T49, CF-*) or camelCase internals in the listing copy

Source of expected values: `docs/portability/flow-01/ADAPTATION-CHANGELOG.md` v1.0.0-acme-pro-members.1 block + marketplace listing layout (TBD — marketplace UI not yet built).

---

## P4 — Tenant B (northwind-guild) installed

After northwind-guild installs `user-registration@1.0.1` from the marketplace (or local Verdaccio), capture the three mandatory cells per affected page **before** northwind applies any of its own changes:

| Cell | Expected Axis D outcome |
|---|---|
| C2 — en, populated, 1280px | acme's adapted values visible (not platform originals) |
| C4 — he-RTL, populated, 1280px | acme's values render in RTL |
| C6 — en, populated, 375px mobile | acme's values render at mobile resolution |

PNG storage:
```
docs/e2e-snapshots/user-registration/tenant-b-northwind-installed-v1.0.1/[page]/[cell-id]-[description].png
```

**Critical Axis D check**: if these PNGs show the platform original values, acme's adaptation did NOT propagate through the package. This is a packaging defect — investigate before allowing northwind to adapt.

---

## P5 — Tenant B adapted + exported

After northwind applies its own additional freedom-config override on top of acme's baseline, capture the three mandatory cells per affected page. PNG storage:

```
docs/e2e-snapshots/user-registration/tenant-b-northwind-v1.0.2/[page]/[cell-id]-[description].png
```

**Critical Axis D check**: both adaptation layers must be visible simultaneously:
- acme's original change (from v1.0.1) still present where not overridden
- northwind's own change visible where northwind overrides

If acme's change disappears when northwind applies theirs, the cascade broke (northwind's profile overwrote acme's instead of merging additively). If northwind's change does not appear, northwind's profile was not applied. Either is a packaging defect.

---

## P6 — Tenant B marketplace listing

Before northwind publishes v1.0.2, capture the marketplace listing card:

```
docs/e2e-snapshots/marketplace/user-registration-tenant-b-v1.0.2-listing.png
```

SK-549 requirements:
- **Axis D**: version `1.0.2` displayed, BOTH changelog entries (v1.0.1 acme + v1.0.2 northwind) visible in version history
- **Axis B**: listing shows northwind's description, with acme's upstream attribution

Source of expected values: `docs/portability/flow-01/ADAPTATION-CHANGELOG.md` (updated with northwind's v1.0.2 entry + retained v1.0.0-acme-pro-members.1 entry).

---

## Per-axis source references (v1.1 Step 2 axis table)

Claude Code uses these references for every cell at every cascade point — **never** inlines the expected content:

| Axis | Source file(s) |
|---|---|
| A — Shell | `docs/design-context/user-registration/.impeccable.md` (MISSING — must create first) |
| B — Role branching | `docs/flow-coverage/user-registration/P1-business-logic-inventory.md` + `docs/design-reviews/ROLE-ANALYSIS-BATCH-*.md` |
| C — Language/RTL | `docs/flow-coverage/user-registration/P5-ui-specs.md` + grep in `client/src/pages/user-registration/*.tsx` for physical direction classes |
| D — Phase + state | `docs/flow-coverage/user-registration/P1-business-logic-inventory.md` + `docs/business-flows/01-user-registration.md` (+ tenant profile JSON for P2/P4/P5) |
| E — Human-friendliness | Grep for engineering leaks (T-numbers, CF-numbers, camelCase) in rendered copy |
| F — UX (5 layers) | SK-541 template + `.impeccable.md` |
| G — Follow-ups | `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json` |

---

## RTL-specific commands for C4 cells (all cascade points)

When C4 capture is ready, run from the fork repo:

```bash
# No physical direction classes — logical CSS properties only
grep -rn "text-left\|text-right\| ml-\| mr-\|left-0\|right-0" \
  client/src/pages/user-registration/*.tsx | grep -v "// "
# Expected: 0

# No hardcoded LTR direction
grep -rn 'dir="ltr"\|direction: ltr' client/src/pages/user-registration/*.tsx
# Expected: 0

# Hebrew localization strings present
ls client/public/locales/he/user-registration*.json 2>/dev/null
# Expected: >= 1 file (before any C4 can be captured at any cascade point)
```

---

## Resolution-specific checks for C6/C7 cells

Per v1.1 § Axis F Layer 1:
- Touch targets >= 44x44px — verify in mobile PNG
- No horizontal scroll at 375px — verify in mobile PNG
- Content readable without zoom at 768px — verify in tablet PNG

---

## Prerequisites before visual evidence can be captured

**Blocking for P1 (platform source)**:
1. GAP-24 Layer 3 infrastructure — Playwright `?mock=` harness per cell, viewport presets, deterministic state seeding
2. GAP-27 visual regression matrix — capture harness + SK-549 invocation
3. `.impeccable.md` for FLOW-01 — missing file blocks Axis A + Axis F Layer 5
4. Hebrew (he) localization fixtures for 6 client pages — blocks all C4 cells
5. `client/e2e/user-registration.spec.ts` (Layer 2) — Layer 3 captures run from Layer 2's harness

**Blocking for P2/P4/P5 (tenant-scoped captures)**:
6. Per-tenant Docker isolation (GAP-26) — each tenant's own app instance
7. Local npm registry (Verdaccio) — so adapted packages can be published and installed
8. FREEDOM config override loading at app startup per tenant profile

**Blocking for P3/P6 (marketplace listings)**:
9. Marketplace UI exists with listing-card rendering (FLOW-32 work)
10. Marketplace listing data pipeline reads the published package's `adaptationChangelog` field
11. `client/e2e/marketplace-visual.spec.ts` exists

Until all 11 conditions hold, FLOW-01 visual evidence at cascade points stays at `NOT_YET_CAPTURED` in `FLOW-01-PLAN-STATE.json`.

---

## Exit criteria for Layer 3 + cascade visual evidence PASS (FLOW-01)

All six cascade points complete:

- [ ] **P1 — Platform source**: all 42 cells captured (6 pages × 7), SK-549 PASS on each, 0 BLOCK verdicts
- [ ] **P2 — Tenant A adapted**: all 3 cells captured for each affected page, Axis D shows acme's overridden values
- [ ] **P3 — Tenant A marketplace listing**: 1 listing PNG, Axis D shows v1.0.1 + acme changelog entry
- [ ] **P4 — Tenant B installed**: all 3 cells captured, Axis D shows acme's values present (proves packaging worked)
- [ ] **P5 — Tenant B adapted + exported**: all 3 cells captured, Axis D shows BOTH acme's and northwind's changes
- [ ] **P6 — Tenant B marketplace listing**: 1 listing PNG, Axis D shows v1.0.2 + BOTH changelog entries in history

Total minimum captures for FLOW-01 full cascade visual evidence:
- P1: 42 cells
- P2: 3 cells × N affected pages (N = 3 per current acme profile scope)
- P3: 1 listing
- P4: 3 cells × N affected pages
- P5: 3 cells × N affected pages
- P6: 1 listing

All stored under `docs/e2e-snapshots/` in cascade-point-labelled subdirectories.

---

## Honest current status for FLOW-01 (v1.1 reconciliation)

Under the **v1.1 (1) bar**, Req-3 PROVEN requires all six cascade points complete.

What FLOW-01 currently has:
- **Layer 1 unit-test proof** of the adaptation cycle (5 freedom-config + 6 third-tenant-install tests) — COMPLETE
- **Phase 1–5 completed at unit layer** (surface → propose → apply → export → third-tenant install) — COMPLETE
- **Visual evidence at any of the 6 cascade points** — NOT_YET_CAPTURED

**Req-3 at Layer 1 only** is PROVEN. **Req-3 at full v1.1 bar** (Layer 1 + visual evidence at all 6 cascade points) is PENDING.

`FLOW-01-PLAN-STATE.json` reflects this split explicitly — see `requirementEvidence.R3_aiAdaptation` + `cascadeVisualEvidence` block.
