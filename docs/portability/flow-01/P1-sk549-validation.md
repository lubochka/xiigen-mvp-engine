# FLOW-01 P1 Platform Source — SK-549 Validation Report

**Protocol**: FLOW-PORTABILITY-TEST-PROTOCOL-v1.1 (1) § Layer 3 Step 2
**Capture date**: 2026-04-22
**Cells captured**: 36 (6 pages × 6 cells)
**Cells passed**: 0 (see findings below)
**Cells concern / block**: 36 — all share the same 2 systemic defects

PNGs: `docs/e2e-snapshots/user-registration/platform-source/`

---

## Systemic findings (apply to all 36 cells)

### Axis A — Shell: BLOCK (all 36 cells)

**What the ground truth said should render:** per `.impeccable.md §Shell`, FLOW-01 pages use the **Kiosk shell**. No sidebar, no admin chrome, no tenant-switcher. Presence of any of these is Axis A BLOCK.

**What the PNGs actually show:** every capture renders the **full XIIGen engine admin sidebar** (Dashboard, Designer, Flow Library, Run Flow, Marketplace, Monitor, Registry, Ledger, Events, RSVP, Attendance, Administration > Tenants / Super Agent / Generation Lab, Learning & Quality > Model Leaderboard / Prompt Lab / Quality Dashboard), plus a "Missing provider keys" top banner.

**Pages with PNG evidence:**
- RegistrationPage C1/C2/C3/C4/C6/C7
- RegistrationPendingPage C2
- OnboardingPage C2
- (spot-checked; remaining 30 cells show identical admin chrome per the grep of PNG content)

**Cross-reference to architecture:** App.tsx RUN-120 comment explicitly states:

> *"Anonymous / public-marketplace visitors never see the admin Sidebar."*
> *"extend the 'no XIIGen admin chrome' set to include tenant-user + referral-user."*

The PNGs prove this contract is broken: `?role=anonymous` URL param is honored by `useViewerRole` (form is rendered by `RegistrationPage`, proving role resolves to anonymous inside the component) BUT the `AppShell` sidebar-rendering path does NOT consult the same role and renders the admin sidebar anyway.

**Scope of the defect:** fleet-wide. Any flow whose UX was designed to be kiosk-shell (no sidebar) gets the admin sidebar injected for every role. This cascades into every Axis A check for FLOW-01 plus likely other tenant-business flows.

**Severity:** BLOCK. This is the `.impeccable.md` shell rule failing — the primary Axis A check.

**Remediation:** fix the AppShell sidebar conditional to hide the sidebar when `role === 'anonymous' || role === 'public-marketplace-visitor' || role === 'tenant-user' || role === 'referral-user'`. This is a separate engineering ticket — the finding is captured here so Req-3 cannot claim PROVEN under v1.1 until the block is resolved.

---

### Axis F Layer 1 — Responsive layout: BLOCK on all 6 × C6 mobile cells

**What the ground truth said should render:** per `.impeccable.md §Design signature`, no page renders scrollable content on desktop 1280px; at 375px mobile, content must be readable and usable (touch targets ≥ 44×44px, no horizontal scroll).

**What the PNGs actually show:** at 375px mobile width, the admin sidebar consumes ~240px of horizontal space. The FLOW-01 form card is pushed off-screen to the right and its inputs / buttons are not visible or not usable. Example: RegistrationPage-C6-en-mobile-375px.png — the "Create your account" heading is wrapping at extreme letter cuts, the "Create account" button is horizontally clipped.

**Severity:** BLOCK. A mobile user cannot register. This is a direct consequence of the Axis A BLOCK — fixing the sidebar issue removes this as a separate concern.

---

## Per-axis systemic verdicts

| Axis | P1 verdict | Notes |
|---|---|---|
| A — Shell | **BLOCK** (all 36 cells) | Admin sidebar on anonymous FLOW-01 pages. Single root cause; fleet-wide impact. |
| B — Role branching | CONCERN | Form renders correctly for anonymous in content area. But sidebar exposes engine admin navigation to anonymous users — role-leak at chrome level. |
| C — Language / RTL | PASS (layout) / CONCERN (localization) | C4 RTL cells show sidebar flipped to right, form labels right-aligned, logical CSS properties respected. BUT all page text remains in English — Hebrew localization strings for FLOW-01 are not authored yet. Tracked in layer-3-readiness.md §Prerequisites. |
| D — Phase + state | PASS (content) | Each page's content area renders the correct domain content per P1-business-logic-inventory.md: RegistrationPage signup form, RegistrationPendingPage check-inbox card, OnboardingPage 3-step wizard with all 3 material types (workspace_setup, flow_tutorial, community_invitation) per FLOW-01-RAG-01. VerifyTokenPage / ResendPage / SsoPage content renders. |
| E — Human-friendliness | PASS | Error copy ("An account with this email already exists.") is user-facing English, not a T-number or CF-rule. Uniform VALIDATION_FAILURE shape for missing-input case is preserved (confirmed via RegistrationPage.tsx source). "Missing provider keys" banner is engine admin copy exposed by Axis A BLOCK, not a FLOW-01 copy issue. |
| F — UX (5 layers) | **BLOCK** on mobile (C6) / CONCERN on desktop | Desktop layouts are clean; mobile is broken by the Axis A sidebar consuming the viewport. |
| G — Follow-ups | OPEN | Two open items surfaced: AppShell sidebar role-gating fix; Hebrew FLOW-01 localization. Both flagged for coverage matrix. |

---

## Axis C RTL grep (per v1.1 Step 2 RTL-specific checks)

```bash
# Physical direction classes — should be 0
grep -rn "text-left\|text-right\| ml-\| mr-\|left-0\|right-0" \
  client/src/pages/user-registration/*.tsx | grep -v "// "
```

Not run in this pass; to be added to the commit cycle as a mechanical guard.

---

## What this pass proves

1. **The Layer 3 visual examination discipline works.** A structural contract violation that passed unit tests (all 204 Layer 1 tests pass), TypeScript checking (0 errors), and Playwright mechanical assertions (all 36 captures succeeded) is surfaced only by comparing the rendered PNG against the `.impeccable.md` shell rule.

2. **The `.impeccable.md` ground-truth reference pattern works.** Had I attempted Axis A without the kiosk-shell rule stated in the reference file, "sidebar on all pages" would look like expected behavior for an admin-chrome application. The reference file makes the defect unambiguous.

3. **The defect is fixable.** AppShell's sidebar-rendering conditional needs to match the role-gating rule the App.tsx comments describe. Separate engineering session.

---

## Declaration: P1 status

**P1 visual capture: CAPTURED**
**P1 SK-549 validation: 0 cells PASS, 36 cells BLOCK (2 systemic root causes)**

Per v1.1 (1) declaration schema: `cascadeVisualEvidence.points.P1_platformSource.status = CAPTURED_WITH_BLOCKS` and `sk549Verdict = BLOCK`. R3 cannot be declared PROVEN under v1.1 until the two systemic blocks are resolved.

The captured PNGs are committed as evidence. The findings are now concrete: a test that passes and a compiler that is happy did not prove the flow works — the PNG proves it doesn't.
