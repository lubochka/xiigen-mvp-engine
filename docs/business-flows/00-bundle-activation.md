# Functional Spec - FLOW-00 Bundle Activation

**Flow slug:** `bundle-activation`
**Grammar:** G1 progress strip
**Primary roles:** tenant-admin, platform-admin
**Protocol purpose:** Provide the canonical functional spec file required by the fork bundle assembler.

## Summary

Bundle Activation lets a tenant activate a pre-defined feature bundle such as a community starter, commerce add-on, or analytics package. The system validates prerequisites, runs a dry run for each included flow, provisions the flows in dependency order, seeds additive FREEDOM defaults, and exposes progress in a clear activation timeline.

## Roles

| Role | Surface | Responsibility |
|---|---|---|
| tenant-admin | `/admin/bundle-activation?role=tenant-admin` | Choose a bundle, start activation, watch progress, retry, or rollback. |
| platform-admin | `/admin/bundle-activation?role=platform-admin` | Monitor validation, dry-run, activation, and status-tracker checkpoints across tenants. |
| platform-support | `/admin/bundle-activation?role=platform-support` | Read-only support view for blocked, degraded, or restored activations. |

## Core Workflow

1. Tenant selects a bundle and confirms activation.
2. BundleValidator reads the bundle manifest from the solution-bundles index.
3. BundleValidator verifies every required flow exists in flow-lifecycle and enqueues a cross-flow BFA validation request for the complete bundle.
4. BundleActivationOrchestrator refuses to continue unless validation returned `valid: true`.
5. BundleActivationOrchestrator calls DRY_RUN before FULL for every required flow.
6. FREEDOM defaults are pre-populated additively; existing tenant values are preserved.
7. Activation records are stored before BundleActivated events are emitted.
8. BundleStatusTracker listens for flow lifecycle regeneration and emits BundleDegraded or BundleRestored after persisting the status transition.

## Required Screens

- Tenant activation wizard with bundle selection, confirmation, progress, and recovery actions.
- Platform operations panel with validation queue, dry-run queue, activation queue, tracker checkpoint health, and status timeline.
- Support view that translates blocked/degraded/restored states into plain operational language.

## Problem States

| State | Expected behavior |
|---|---|
| Missing bundle id | Return DataProcessResult failure with `MISSING_BUNDLE_ID`. |
| Bundle not found | Return DataProcessResult failure with `BUNDLE_NOT_FOUND`. |
| Empty requiredFlows | Block activation with `EMPTY_REQUIRED_FLOWS`. |
| Missing required flow | Return invalid validation report and do not start dry-run. |
| Dry run fails | Stop before FULL and return `DRY_RUN_FAILED`. |
| Full activation fails | Return `ACTIVATION_FAILED` and keep prior persisted checkpoints. |
| Flow version below minimum | Persist degraded status, then emit BundleDegraded. |
| All versions restored | Persist active/restored status, then emit BundleRestored. |

## Acceptance Criteria

- Every service extends MicroserviceBase and uses fabric interfaces only.
- Every public service method returns DataProcessResult rather than throwing for business outcomes.
- All persisted state is tenant-scoped through the platform tenant context.
- DRY_RUN-before-FULL is enforced for every required flow.
- FREEDOM config changes are additive only.
- storeDocument completes before enqueue for activation, degradation, and restoration events.
- The role-aware UI exposes tenant-admin, platform-admin, and platform-support evidence cells.
