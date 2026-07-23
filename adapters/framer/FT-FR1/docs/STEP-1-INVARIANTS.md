# FLOW-44 STEP 1 Invariants

## Package Boundary

- Adapter package: `@xiigen/framer-text-elements-adapter`.
- Flow slug: `framer-adapter`.
- Source boundary: `adapters/framer/FT-FR1/src`.
- Framer runtime access is represented by typed facades so tests do not require a live plugin runtime.

## Named Checks

- `CF-804_TEXT_NODE_FILTER`: only Framer text nodes are read into the shared text model.
- `CF-805_TEXT_STYLE_MAPPING`: font weight, color paint, size, line-height, and letter-spacing mappings are deterministic.
- `CF-806_PLUGIN_DATA_STORAGE`: persistence uses `getPluginData` and `setPluginData`; no browser storage fallback is allowed.
- `NO_FIGMA_RUNTIME`: no Figma runtime calls in package source.
- `BUILD_PASSES`: `npm run typecheck`, `npm test`, and `npm run build` must pass.

## Functional Invariants

- `styles.ts` and `element-code.ts` stay outside this package and are not modified.
- All property translation lives in `framer-adapter.ts`.
- Package publication evidence must use the local registry at `http://localhost:4873`.
