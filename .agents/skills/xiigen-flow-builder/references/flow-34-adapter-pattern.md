# FLOW-34: Marketplace Plugin Adapter Pattern

## What FLOW-34 Is

FLOW-34 generates **MODE-B-thin adapters** — marketplace plugins that call XIIGen via the AI Gateway. Business logic stays on XIIGen. The plugin is a thin UI + API bridge.

**Scope:** 65 marketplace plugins × 14 platform SDKs
**Prerequisite:** FLOW-36 (Feature Registry) must be complete — FT records must exist
**Test count per adapter:** 26 tests (READ×10, WRITE×8, Equivalence×4, Packaging×4)

---

## Three-Layer Architecture (Every Adapter)

```
Layer 1: CONCEPT_NEUTRAL — @xiigen/plugin-sdk
  Auth, AI Gateway, usage tracking, freemium gate
  IDENTICAL for all 65 plugins — changing it affects all

Layer 2: IMPL_VARIES — Shared core engines
  CSS engine (styles.ts, element-code.ts) — design platforms
  Diagram parser — FLOW family plugins
  Workflow generator — AUTO family plugins
  Changes per PLUGIN FAMILY, not per platform

Layer 3: STACK_COUPLED — Platform adapter
  canva-adapter.ts, shopify-adapter.ts, framer-adapter.ts, etc.
  ONLY this file differs between platforms
  What FLOW-34 generates
```

**The 90/10 rule:** 90% shared engine code is UNCHANGED. Only the ~100-line adapter file differs.

---

## Adapter File Structure (Layer 3 — 5 mandatory functions)

Every adapter exports exactly these 5 functions:

```typescript
// READ path
mapXxxToElement(item: PlatformItem): SharedElement        // Field-by-field map
mapXxxToStyle(item: PlatformItem): SharedStyle            // Style/config map

// WRITE path
mapStyleToXxx(style: SharedStyle): PlatformWritePayload   // Reverse map
readXxx(items: PlatformItem[]): AdapterReadResult          // Batch READ
writeToXxx(outputs: EnhancedOutput[], writer): Promise<WriteResult>  // Batch WRITE (injected writer)
```

**Injected writer pattern (testability):** `writeToXxx` NEVER imports platform SDK at module level. It accepts a `writer: (payload: Record<string, unknown>) => Promise<void>` function. This allows testing without platform SDK installed.

---

## Canonical API Mapping Table (for SESSION-0)

Before writing any code, produce this table:

| Platform Field | Shared Field | Notes |
|---------------|-------------|-------|
| `canva.content` | `shared.characters` | Canva text content |
| `canva.fontStyle.weight` 700 | `shared.fontWeight` "Bold" | Weight enum translation |
| `canva.textAlign` "start" | `shared.textAlignHorizontal` "LEFT" | Enum rename |
| `canva.color.r/g/b` (0–255) | `shared.color` "rgb(r,g,b)" | RGB to CSS string |
| `miro.type` "card" | `shared.type` "TASK" | Type vocabulary map |
| `notion.type` "heading_1" | `shared.type` "HEADING" + level:1 | Struct to discriminated union |
| `shopify.variants.length > 0` | `shared.includePricing` true | Derived field (not direct map) |
| `framer.width/height` | `shared.aspectRatio` "w/h" | Derived string field |
| `webflow.status` "draft" | `shared.status` "DRAFT" | Enum casing map |

---

## FC Checks for FLOW-34 Plugins (SESSION-0 Gate)

Beyond FC-1..FC-21, FLOW-34 adds:

| Check | Requirement |
|-------|-------------|
| FC-22 | FT record exists in Feature Registry with `adapterMode: "MODE-B-thin"` |
| FC-23 | stackCoupling has `@xiigen/plugin-sdk:platform` as CONCEPT_NEUTRAL |
| FC-24 | stackCoupling has platform client entry as STACK_COUPLED |
| FC-25 | Platform SDK StackCapabilityDeclaration exists (FLOW-00.2 Phase D) |
| FC-26 | API mapping table produced BEFORE any adapter code |
| FC-27 | Traffic mechanism documented (≥2 of: account-required, freemium-gate, powered-by-xiigen) |
| FC-28 | Review timeline noted — Shopify 2–4wk, Canva ~2wk, Figma 1–3d (buffer required) |

---

## Test Pattern (26 tests, always the same shape)

```typescript
// Fixture
function makePlatformItem(overrides = {}) { return { ...defaults, ...overrides }; }

const CANONICAL_ELEMENT: SharedElement = { ... };  // Expected READ output
const CANONICAL_STYLE: SharedStyle = { ... };       // Expected STYLE output

// READ: mapXxxToElement (5 tests) + mapXxxToStyle (5 tests) = 10
// WRITE: mapStyleToXxx (4 tests) + writeToXxx (4 tests) = 8
// Equivalence: E-1 element==canonical, E-2 style==canonical, E-3 readXxx batch, E-4 round-trip = 4
// Packaging: P-1 exports, P-2 importable without SDK, P-3 package name convention, P-4 manifest = 4
```

**Equivalence tests are the proof of 90/10:** `expect(mapXxxToElement(item)).toEqual(CANONICAL_ELEMENT)` must match the Figma/canonical equivalent output exactly.

**Test location:** `server/test/flow34/{ft-id}-{plugin-name}.spec.ts` — uses server's ts-jest setup (adapter has no node_modules yet).

---

## Type File Pattern

```typescript
// src/types.ts — required interfaces
export interface PlatformItem { id: string; /* ... platform-specific fields */ }
export interface SharedElement { type: string; /* ... shared model */ }
export interface SharedStyle { /* ... shared style model */ }
export interface PlatformWritePayload { /* ... named type for write config */ }
export interface AdapterReadResult { elements: SharedElement[]; styles: SharedStyle[]; sourceItems: PlatformItem[]; }
export interface AdapterWriteResult { written: number; failed: number; }
export interface EnhancedOutput { element: SharedElement; style: SharedStyle; /* generated data */ }
```

**Anti-pattern:** Using `Partial<PlatformItem>` as return type for write config. This fails when the write payload contains fields not in `PlatformItem` (fontSize, fontWeight, etc.). Always use a named `PlatformWritePayload` interface.

---

## Build Config (All FLOW-34 Adapters)

```json
// package.json — naming convention
{ "name": "@xiigen/{platform}-{plugin-name}", ... }
// Pattern: @xiigen/canva-*, @xiigen/miro-*, @xiigen/shopify-*, @xiigen/framer-*, @xiigen/notion-*, @xiigen/webflow-*
```

```javascript
// webpack.config.js — all platform SDKs are externals
externals: { '@canva/design': 'canvaDesign', '@shopify/polaris': 'shopifyPolaris', ... }
```

**Canva/Shopify/Miro/Framer/Notion/Webflow:** All require webpack (not Vite). Vite is NOT supported in any platform sandbox.

---

## Platforms Completed (Waves 1–3)

| Platform | Adapter | FT ID | Commit |
|----------|---------|-------|--------|
| canva | Text Elements | FT-C5 | 135ad11 |
| canva | Background Remover | FT-C6 | 8e8caab |
| miro | AI Architect | FT-M1 | 135ad11 |
| miro | Sprint Planner | FT-M2 | 8e8caab |
| notion | Doc Generator | FT-N1 | 8e8caab |
| shopify | Product Copy | FT-S1 | 92e1081 |
| framer | Component Namer | FT-F3 | 92e1081 |
| webflow | CMS Generator | FT-W1 | 92e1081 |
| canva (F1) | Site Generator | FT-F1 | 135ad11 |

**Jira:** DEV-76 (Epic), DEV-77 (Wave 1), DEV-78 (Wave 2), DEV-79 (Wave 3)

---

## Known Gaps vs Original Spec

1. **FT naming:** Plan says FT-C1..FT-C65 (all client plugins). We used platform-prefix naming (FT-C5, FT-F1, FT-M1, etc.). Reconcile when FLOW-36 Phase B formally produces all 65 FT records.

2. **XIIGEN-MARKETPLACE-MASTER-PLAN.md:** Referenced in FLOW-34-REFERENCE-PLAN-v1.md but does not exist in the repo. Plugin wave selection was based on platform breadth. Create this file before Wave 4+ to ensure correct ordering.

3. **Test location:** Adapter `__tests__/` stubs exist as documentation but live tests run from `server/test/flow34/`. This is by design (no node_modules in adapter packages yet).

4. **FC-28 buffer:** Shopify (2–4 weeks), Webflow (1–2 weeks) review timelines are noted in manifest `portingConstraints` but not scheduled. Buffer needed at submission time, not implementation time.
