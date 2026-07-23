# Flow UI examination — FLOW-37 design-system-governance

## Date: 2026-04-20 · Run: RUN-56 · Batch: B (Grammar 2 Verdict Grid + Grammar 3 Card List)

## One-sentence spec (F1)
> When the XIIGen engine plans a genesis prompt for a task type, apply the
> coupling taxonomy (CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED /
> INCOMPATIBLE) to each element across the 10 coupling dimensions, substitute
> stack-specific implementation patterns for IMPL_VARIES stacks, provide
> compatibility reporting for unsupported stacks.

**Important correction (from `SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md`):**
FLOW-37 is **NOT** a Figma-style design system governance. It's Multi-Stack
Porting / Engine Self-Awareness — coupling taxonomy for porting the engine
to different stacks.

## Roles (F3)
- **platform-admin** — primary; reviews coupling audits, approves porting jobs
- **platform-support** — read-only
- Engine-internal, no tenant / consumer roles

## State inventory (F2)
11 processes including T590-StackCouplingAuditor, T591-HybridGenesisPromptBuilder,
T592-StackCompatibilityReporter, T593-StackPortingOrchestrator,
design-system-governance-cluster.

Existing components (per addendum): `StackPortingScreen.tsx` at
`client/src/components/stack-coupling/`, `StackCouplingBadge.tsx`,
`CompatibilityReportCard.tsx`, `PortingStatusTag.tsx` — **ORPHANED**.
Page wrapper `DesignSystemGovernancePage.tsx` renders AdminCrudPanel default.

## Grammar (compound)
- **G2 Verdict Grid** for coupling audit — task-type × dimension × coupling level
- **G3 Card List with State Badge** for porting-job dashboard
- **G3 Card List** for compatibility reports per target stack

## Real-world reference
- Coupling audit: Flyway migration compatibility matrix, SonarQube dependency audit, Percy visual diff matrix
- Porting job dashboard: Dependabot PRs list, Renovate pending-upgrade list

## Classification (CFI-05 context)
- **Q1 CRUD?** ✅ YES — current page defaults to AdminCrudPanel; the purpose-built StackPortingScreen is orphaned in components dir. **Same CFI-05 pattern as FLOW-36/38/39/40.**
- **Q2 Error/empty?** Empty audit dashboard without a pending job should be neutral.
- **Q3 Engineering leak?** YES — task-type IDs (T590..T593) must not appear in UI.
- **Q4 Role-correct?** 2-role scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — rewrite `DesignSystemGovernancePage` to wire `StackPortingScreen` as default view (per FLOW-45 RUN-52 template).

## 18 existing PNGs
CRUD default + state mocks. See PNG-INVENTORY FLOW-37 section.

## Planned fixes (deferred)

**P0 — Page rewrite** per the FLOW-45 RUN-52 template:
```
?mock=<key>  → BusinessStateCard
no ?mock     → PlatformOpsPage wrapping StackPortingScreen with populated
                coupling audit + porting dashboard + compatibility reports
```

**P0 — Coupling audit verdict grid** (Grammar 2):
- Rows: 10 coupling dimensions (dependency / runtime / build / test / deployment / etc.)
- Columns: task types being audited
- Cells: CONCEPT_NEUTRAL (✅ green) / IMPL_VARIES (🟡 amber) / STACK_COUPLED (🟠 orange) / INCOMPATIBLE (❌ red)
- Colour + text + icon per cell (ui-ux-pro-max color-not-only)

**P0 — Compatibility report cards** (Grammar 3):
- One card per target stack (e.g., Node/Express, Python/FastAPI, Go/Fiber, Java/Spring)
- Summary badge: Fully compatible ✅ / Partial 🟡 / Incompatible ❌
- Expand → per-task-type compatibility list with reasons

**P0 — Porting job card list** (Grammar 3):
- One card per active porting job
- Badge: QUEUED / IN_PROGRESS / BLOCKED / COMPLETED / FAILED
- Progress bar + ETA + cancel/retry actions

**P2 — Delete CRUD / BFA mock PNGs.**
