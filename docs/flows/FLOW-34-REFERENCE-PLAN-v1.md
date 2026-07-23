# FLOW-34: MARKETPLACE PLUGIN ADAPTER ENGINE — REFERENCE PLAN v1
## MODE-B-thin adapter generation for 65 plugins × 14 platform SDKs
## C5 (Canva Text Elements Adapter) is the canonical execution example
## Date: 2026-03-22
## Prerequisites: FLOW-00.2 complete, FLOW-36 complete (FT records exist)

---

## WHAT FLOW-34 IS

FLOW-34 generates MODE-B-thin adapters — plugins that live on a platform
(Figma, Canva, Miro, Shopify, etc.) and call XIIGen home via the AI Gateway.
Business logic stays on XIIGen. The plugin is the thin UI + API bridge.

This is the implementation of D-34-1 (DECISIONS-LOCKED.md):
**FLOW-34 scope: MODE-B-thin only. Enterprise full reimplementation = FLOW-37+.**

**All 65 marketplace plugins from XIIGEN-MARKETPLACE-MASTER-PLAN.md are
executed through FLOW-34.** The 14 platform SDKs are the stackTypes.
The @xiigen/plugin-sdk is the CONCEPT_NEUTRAL neutral layer (D-STACK-8).

---

## CANONICAL EXECUTION EXAMPLE: C5

C5 (Canva Text Elements Adapter) is the proof of concept for this entire flow.
It was planned in the web session (REFERENCE-PLAN-C5.md + 5 session files).
Key insight from C5: **90% of code is identical. Only the API surface
that touches the design host changes.**

This is the definition of IMPL_VARIES with dimension CLIENT_FRAMEWORK.
The `canva-adapter.ts` IS `stackImplementations['canva-app:client'].generationFrame`.
XIIGen's AF pipeline generates that adapter. The CSS engine is reused unchanged.

**Before planning any new FLOW-34 plugin, read C5 first.** It is the reference
implementation for the adapter pattern.

---

## THE THREE LAYERS OF EVERY FLOW-34 PLUGIN

```
Layer 1: CONCEPT_NEUTRAL — @xiigen/plugin-sdk ("@xiigen/plugin-sdk:platform")
  Auth (OAuth per platform)
  AI Gateway (rate-limited proxy, freemium enforcement)
  Usage tracker (per-user per-plugin counts)
  Brand kit (logo, colors, fonts stored server-side)
  Dashboard bridge (plugin → xiigen.com/plugins)

  This layer is IDENTICAL across all 65 plugins.
  Changing it affects all plugins simultaneously.
  Governed by D-STACK-8.

Layer 2: IMPL_VARIES — Shared core engines
  CSS generation engine (styles.ts, element-code.ts) — Figma + Canva + Framer
  Diagram parser + AF pipeline — all FLOW plugins
  Workflow generator — all AUTO plugins
  Video engine — all VIDEO plugins

  These change per PLUGIN FAMILY, not per platform.
  The platform adapter (Layer 3) calls these engines via the AI Gateway.

Layer 3: STACK_COUPLED — Platform adapter
  canva-adapter.ts   — reads/writes Canva canvas via @canva/design
  figma-adapter.ts   — reads/writes Figma nodes via Figma Plugin API
  miro-adapter.ts    — reads/writes Miro board via Miro Web SDK
  shopify-adapter.ts — reads/writes Shopify admin via Polaris + GraphQL

  Each adapter is a thin translation layer.
  It speaks the host platform's language.
  It calls Layer 2 engines via @xiigen/plugin-sdk.
  It is what FLOW-34 generates.
```

---

## PLUGIN FAMILIES AND THEIR ADAPTERS

| Family | Core Engine (Layer 2) | Adapter work (Layer 3) | Canonical example |
|--------|----------------------|----------------------|-------------------|
| Utility (41) | AI Gateway + per-tool prompt | Thin UI + API call | C5 CSS translator |
| FLOW (8) | Diagram Parser + AF Pipeline | Platform shape reader | F-FLOW → M-FLOW |
| AUTO (9) | Workflow Generator + Template Library | Workflow export format | n8n node adapter |
| VIDEO (7) | Video Engine (script+visual+voiceover) | Content reader | Canva → Video |

---

## STACK COUPLING FOR A FLOW-34 ADAPTER

Every adapter plan starts with a coupling annotation. Example for C5:

```typescript
// C5 — Canva Text Elements Adapter
stackCoupling: {
  entries: {
    '@xiigen/plugin-sdk:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'sdk-package',
      neutralConcepts: ['auth', 'AI gateway', 'usage tracking', 'freemium gate'],
      implementationNotes: 'npm install @xiigen/plugin-sdk — identical for all platforms',
    },
    'canva-app:client': {
      tier: 'STACK_COUPLED',
      stackCategory: 'design-platform-plugin',
      dimensions: ['CLIENT_FRAMEWORK', 'CLIENT_BUILD', 'PLUGIN_SANDBOX'],
      neutralConcepts: [
        'read text element properties',
        'produce CSS output via shared engine',
        'write modified text back to canvas',
      ],
      implementationNotes:
        'Read: @canva/design selection API → TextElement[]\n' +
        'Convert: canva-adapter.ts maps Canva properties → existing Element+Style model\n' +
        'Write: @canva/design addNativeElement / setContent\n' +
        'Storage: @canva/app-storage (replaces figma.clientStorage)\n' +
        'Build: webpack mandatory (Canva requirement)',
    },
    'figma-plugin:client': {
      tier: 'STACK_COUPLED',  // source of the shared engine — different API surface
      stackCategory: 'design-platform-plugin',
      dimensions: ['CLIENT_FRAMEWORK', 'PLUGIN_SANDBOX'],
      neutralConcepts: ['read text element properties', 'produce CSS output'],
      implementationNotes:
        'Read: figma.currentPage.selection → TextNode[]\n' +
        'Convert: existing styles.ts reads Figma TextNode directly — no adapter needed\n' +
        'Write: figma.currentPage node mutation\n' +
        'Storage: figma.clientStorage (user data) + setPluginData (flags only)',
    },
    'webpack:platform': {
      tier: 'STACK_COUPLED',
      stackCategory: 'build-tool',
      dimensions: ['CLIENT_BUILD'],
      neutralConcepts: ['bundle the plugin for distribution'],
      implementationNotes: 'webpack mandatory for Canva. Cannot substitute Vite.',
      note: 'This is a Canva sandbox constraint, not a project preference.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      neutralConcepts: ['unit test adapter logic', 'verify CSS output matches Figma equivalent'],
      implementationNotes: 'Jest + @testing-library/react. Same test runner as Figma plugin.',
    },
  },
  supportedServerStacks: ['node-nestjs'],  // AI Gateway backend
}
```

---

## FEATURE REGISTRY (FT) RECORDS FOR FLOW-34 PLUGINS

Every plugin gets a Feature Registry entry (FT-XXX) in FLOW-36.
Each FT record has `productScope: "client-capability"` and `adapterMode: "MODE-B-thin"`.

C5 example:
```json
{
  "ftId": "FT-C5",
  "name": "CanvaTextElementsAdapter",
  "description": "Adapts the Figma-to-Code CSS generation pipeline for Canva Apps SDK. Reads Canva text elements, runs them through the shared CSS engine, writes back to canvas. 90% shared code with Figma plugin.",
  "productScope": "client-capability",
  "portingCandidate": true,
  "portingCandidateReason": "Adapter pattern — core CSS engine is platform-independent. Only canva-adapter.ts (API surface) differs from Figma plugin.",
  "platforms": [{
    "platformId": "canva-app",
    "stackType": "canva-app",
    "stackCategory": "design-platform-plugin",
    "stackSide": "client",
    "adapterMode": "MODE-B-thin",
    "status": "planned",
    "version": "1.0.0",
    "signals": {
      "signalMode": "MODE_B",
      "trafficMechanism": "freemium-gate",
      "trafficStrength": "STRONG"
    }
  }]
}
```

---

## BUILD ORDER — WAVE STRUCTURE

Mirrors the marketplace plan's Wave 1–6 order.

### Wave 0 (Weeks 0–3): Shared Infrastructure
Before any plugin ships:
- @xiigen/plugin-sdk package (auth + AI gateway + usage tracker)
- xiigen.com/plugins landing page + dashboard
- Brand Kit Manager

### Wave 1 (Weeks 1–6): Foundation + Quick Wins
C5 Canva Text Adapter, F1 Figma Site Generator, M1 Miro AI Architect
These prove the adapter pattern and validate the shared SDK.

### Wave 2+ (Weeks 4–24): Scale per marketplace plan
Follow XIIGEN-MARKETPLACE-MASTER-PLAN.md Wave 2–6 order exactly.
Each plugin is a FLOW-34 execution using the adapter pattern from C5.

---

## HOW FLOW-34 SESSIONS ARE STRUCTURED

Every FLOW-34 plugin follows the C5 session structure:

```
SESSION-0: Plan review (FC checks adapted for MODE-B-thin plugins)
SESSION-1: API Map + Scaffold
  - Research platform SDK text/data APIs
  - Map platform API → shared engine model
  - Scaffold project (package.json, tsconfig, no code yet)
  - Gate: TypeScript compiles, empty adapter stub passes

SESSION-2: Adapter READ path
  - Implement platform-specific data reading
  - Map platform properties → shared model
  - Gate: unit tests prove output identical to canonical stack equivalent

SESSION-3: UI + WRITE path + SDK integration
  - Platform-specific canvas writes
  - @xiigen/plugin-sdk auth + AI gateway integration
  - Gate: end-to-end: select in platform → AI enhance → write back

SESSION-4: Tests + Packaging
  - Full test coverage
  - Platform submission bundle
  - Gate: all tests pass, bundle builds clean
```

This structure is FIXED for all Utility plugins.
FLOW and AUTO plugins add a parser session (SESSION-2.5).
VIDEO plugins add an assembler session.

---

## WHAT MAKES C5 THE CANONICAL EXAMPLE

1. **90/10 split proved in practice**: 90% shared CSS engine, 10% adapter. This is the
   IMPL_VARIES / STACK_COUPLED boundary in concrete code.

2. **Platform constraint discovered early**: webpack mandatory for Canva (not Vite).
   This is exactly what `StackCapabilityDeclaration.constraints[]` captures.

3. **Storage mapping documented**: `figma.clientStorage` → `@canva/app-storage`.
   This is the `CLIENT_STATE_MODEL` dimension in action.

4. **Property enum translation explicit**: Figma `"LEFT"` → Canva `"start"`.
   This is the Phase 1 API Map document — the coupling annotation in human form.

5. **5-session plan complete and verified**: All session files exist and were validated.
   Any new Utility adapter plan should match this session count (± 1 session).

---

## FC CHECKS FOR FLOW-34 PLUGIN PLANS (extends standard SESSION-0)

In addition to FC-1 through FC-21, FLOW-34 plugins add:

```
FC-22: FT record exists in Feature Registry with adapterMode: "MODE-B-thin"
FC-23: stackCoupling has "@xiigen/plugin-sdk:platform" entry as CONCEPT_NEUTRAL
FC-24: stackCoupling has platform client entry (e.g. "canva-app:client") as STACK_COUPLED
FC-25: Platform SDK StackCapabilityDeclaration exists in FLOW-00.2 Phase D output
FC-26: API mapping document (Phase 1 equivalent of C5) produced before any adapter code
FC-27: Traffic conversion mechanism documented (must have ≥ 2 of: account-required,
       dashboard-on-site, freemium-gate, powered-by-xiigen)
FC-28: Review timeline for target platform noted (Shopify = 2-4 weeks, Canva = ~2 weeks,
       Figma = 1-3 days) — build buffer into session planning
```

---

## INCOMPATIBILITY FLAGS FOR MARKETPLACE PLATFORMS

From XIIGEN-MARKETPLACE-MASTER-PLAN.md + StackCapabilityDeclaration analysis:

| Capability | WordPress | Joomla | Drupal | SAP ABAP |
|-----------|-----------|--------|--------|----------|
| asyncExecution | ✅ | ✅ | ✅ | ⚠️ degraded |
| parallelExecution | ⛔ | ⛔ | ⛔ | ⛔ |
| persistentConnection | ⛔ | ⛔ | ⛔ | ⛔ |
| localState | ⛔ server-rendered | ⛔ | ⛔ | ⛔ |
| backgroundRefresh | ⛔ | ⛔ | ⛔ | ⛔ |

These platforms are correctly flagged in XIIGEN-MARKETPLACE-MASTER-PLAN.md
as "Avoid" or "After Shopify established". The StackCapabilityDeclaration
makes this machine-readable: XIIGen auto-generates INCOMPATIBLE entries.

---

## ARTIFACT NUMBERS

FLOW-34 does not create new task types (T-numbers).
It executes existing task types (T516–T566 from FLOW-33/35) via the
AF Pipeline to generate each adapter.

New FT records: FT-C1 through FT-C65 (65 plugin feature registry entries).
These are produced in FLOW-36 Phase B and consumed by FLOW-34.

---

## RELATIONSHIP TO OTHER FLOWS

```
FLOW-36 (Feature Registry) — produces FT records for all 65 plugins
  ↓
FLOW-00.2 Phase D — StackCapabilityDeclarations for all 14 platform SDKs
  ↓
FLOW-34 Phase A (C5 canonical) — proves adapter pattern works
  ↓
FLOW-34 Wave 1+ — 64 remaining plugins in marketplace Wave order
  ↓
FLOW-37 (future) — MODE-B-full for enterprise self-hosted deployments
```
