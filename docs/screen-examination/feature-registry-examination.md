# Flow UI examination — FLOW-36 feature-registry

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List with State Badge)

## One-sentence spec (F1)
> When the XIIGen platform evaluates a feature for porting to a new platform,
> classify each FT-ID as engine-internal (portingCandidate=false) or portable
> (portingCandidate=true), accumulate usage signals to detect porting readiness,
> and when porting is initiated, gate it through a cost estimation and decision
> flow that produces a PortingDecision stored in the feature registry.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-08.md`)
- **platform-admin** — primary; manages FT records, porting decisions, signals
- **platform-support** — read-only

## Grammar
**G3 Card List with State Badge** — FT-ID cards with porting candidate + signal count + decision status.
**Reference:** **LaunchDarkly feature flags dashboard**, **Split.io**, **Unleash**.

## CFI-05 status
**Orphaned screen** — `FeatureMatrixScreen.tsx`, `FeatureMatrixRow.tsx`, `PortingProhibitedScreen.tsx` exist at `client/src/components/feature-registry/` but `FeatureRegistryPage.tsx` renders `AdminCrudPanel` default. **FLOW-45 RUN-52 template applies for the Page rewrite.**

## Classification
- **Q1 CRUD?** ✅ YES — current page is AdminCrudPanel default path + BusinessStateCard mock fallbacks.
- **Q2 Error/empty?** Empty state for first-run ("No features registered yet").
- **Q3 Engineering leak?** "FT-ID", "portingCandidate", "PortingDecision" — internal. User-facing: "Feature", "Portable to other platforms", "Porting decision".
- **Q4 Role-correct?** 2-role scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — rewrite Page to wire `FeatureMatrixScreen` as default (per FLOW-45 RUN-52 template).

## 34 existing PNGs (largest FLOW-36 inventory in fleet)

Densest admin-console PNG directory. Sweep needed.

## Planned fixes (Page rewrite template from FLOW-45 RUN-52)

```
?mock=<key>  → BusinessStateCard with canonical feature states
no ?mock     → PlatformOpsPage wrapping FeatureMatrixScreen with populated
                feature list (6-10 FT-ID seed records covering engine-internal
                + portable + porting-in-progress + deprecated)
```

Feature card layout (FeatureMatrixRow — verify component has this):
- Feature name (human-readable, not FT-XXX)
- Source flow (which flow owns it)
- Portability badge: Portable ✅ / Engine-internal 🔒 / Porting in progress 🟡 / Deprecated ⚫
- Usage signal count (tenants using it)
- Porting decision action (if applicable)

**PortingProhibitedScreen** renders when user tries to initiate porting on a
non-portable feature.
