# FLOW-41 STEP 1 Invariants

## Flow

C5 Canva Text Elements Adapter (`canva-text-adapter`)

## Machine Constraints

- The adapter remains a split-workspace external package, separate from the XIIGen NestJS server.
- The runtime event model is Canva callback driven, not CloudEvents.
- Text reads are pure: Canva selection data is mapped into the shared Figma-shaped element contract without storage or side effects.
- Text writes are user-triggered and must translate shared style fields back to Canva-compatible payloads.
- All Canva enum translation stays in `src/canva-adapter.ts`.
- The shared pipeline remains platform-neutral and must not import Canva SDKs.
- Persistence, when added, uses `@canva/app-storage`; browser storage APIs are not permitted.
- `npm run typecheck`, `npm test`, and `npm run build` are hard gates before publication.

## Freedom Surface

- Package display name and description can be adapted for tenant marketplaces.
- Storage namespace can vary by tenant when write-side storage is added.
- Adapter documentation can describe tenant-specific review and publishing practices.

## Required Checks

- `NO_LOCALSTORAGE`: no `localStorage`, `sessionStorage`, or IndexedDB calls in `src`.
- `NO_FIGMA_RUNTIME`: no `figma.*` runtime calls in the Canva adapter.
- `SDK_BOUNDARY`: no Canva SDK imports in the shared mapping test path.
- `STEP_1_IN_PACKAGE`: this file must be included in the published package.
- `LOCAL_REGISTRY_READBACK`: the local registry must return the published package version.
