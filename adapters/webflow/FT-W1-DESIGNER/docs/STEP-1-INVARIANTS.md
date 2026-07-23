# FLOW-43 STEP 1 Invariants

## Package Boundary

- Adapter package: `@xiigen/webflow-designer-extension`.
- Flow slug: `webflow-designer-extension`.
- Source boundary: `adapters/webflow/FT-W1-DESIGNER/src`.
- Runtime Webflow SDK access must remain outside pure parser/adapter modules.

## Named Checks

- `CF-800_CSS_SHORTHANDS`: border, font, spacing, and shadow shorthand parsing must handle known edge cases.
- `CF-801_ELEMENT_CLASSIFICATION`: advanced Designer element types must map to non-empty property output.
- `CF-802_NO_DEPRECATED_WEBFLOW_API`: no direct `webflow.*` runtime calls in package source.
- `CF-803_VALIDATION_DIFF`: pipeline CSS output must be comparable against Webflow native CSS.
- `BUILD_PASSES`: `npm run typecheck`, `npm test`, and `npm run build` must pass.

## Functional Invariants

- `styles.ts` and `element-code.ts` stay outside this package and are not modified.
- All Webflow property translation lives in `webflow-designer-adapter.ts` plus `css-parser.ts`.
- Package publication evidence must use the local registry at `http://localhost:4873`.
