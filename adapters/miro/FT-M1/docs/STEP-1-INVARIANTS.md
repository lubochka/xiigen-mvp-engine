# FLOW-42 STEP 1 Invariants

## Package Boundary

- Adapter package: `@xiigen/miro-ai-architect`.
- Flow slug: `miro-shape-adapter`.
- Source boundary: `adapters/miro/FT-M1/src`.
- Runtime SDK imports are optional peer dependencies; pure mapping modules must remain importable without Miro SDK packages installed.

## Named Checks

- `NO_FIGMA_CALLS`: no `figma.*` runtime calls in `src`.
- `NO_WEBFLOW_CALLS`: no `webflow.*` runtime calls in `src`.
- `ADAPTER_ONLY_TRANSLATION`: Miro-to-shared property translation remains in `miro-adapter.ts`; classifier and spatial analyzer provide signals only.
- `WRITEBACK_PATTERN`: direct Miro write-back uses property assignment plus `sync()`.
- `BUILD_PASSES`: `npm run typecheck`, `npm test`, and `npm run build` must pass.

## Functional Invariants

- Shape classification is deterministic and rule-based, not AI-based.
- Classification exposes rule id and confidence for R1 through R10.
- Spatial analysis uses 5dp tolerance for containment checks.
- Package publication evidence must use the local registry at `http://localhost:4873`.
