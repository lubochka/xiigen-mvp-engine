---
name: product-variant-router
sk: SK-435
description: >
  Routes any feature-related decision to the correct implementation path
  based on productScope, adapterMode, and target platformId. Enforces
  D-34-1 (FLOW-34 thin adapters only) and the MODE-B-thin vs MODE-B-full
  split. Prevents FLOW-34 from being planned or executed for enterprise
  full-reimplementation scenarios.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-416]
complements: [SK-418, SK-422, SK-424]
---

# ProductVariantRouter [SK-435]

## Purpose

Three decisions that keep getting re-derived from first principles:

1. Is this feature client-facing or an XIIGen capability?
2. Does this adapter call XIIGen (thin) or run standalone (full)?
3. Is the target a third-party platform or an XIIGen product variant?

These questions have locked answers. This skill reads the FT record's
`productScope` and `adapterMode`, checks D-34-1, and gives the routing
decision in one pass — so FLOW-34 planning sessions never accidentally
design for enterprise .NET clients, and PortingDecisionGate always
checks the right signal type.

## When AF-4 RAG Retrieves This Skill

- Planning a FLOW-34 session
- Creating or reviewing an FT record
- PortingDecisionGate evaluation
- "Which product variant does this target?"
- "Is this thin or full?"
- "Can FLOW-34 handle this?"

## Pattern — Three Routing Decisions

### Decision 1: productScope

```
Read FT record's productScope field.

"client-capability":
  → Feature generated for a client flow (FLOW-01..24)
  → Signals tracked as MODE_A (engine execution metrics)
    or MODE_B (marketplace metrics) depending on deployment
  → FT extraction: FLOW-36 Phase B handles retroactively
  → Training traces: tag with productScope: "client-capability"

"xiigen-capability":
  → XIIGen's own feature tracked across product variants
  → Signals tracked as XIIGEN_VARIANT (deployedInVariants[], etc.)
  → portingCandidate may be false (engine-internal task types)
  → Check portingCandidate BEFORE any porting decision
```

### Decision 2: adapterMode routing

```
Read FT record's platforms[target].adapterMode.

"MODE-A":
  → Feature runs on XIIGen infrastructure
  → No adapter needed
  → FLOW-34 does NOT handle this

"MODE-B-thin":
  → Feature ships to platform, calls XIIGen home via QUEUE FABRIC
  → Business logic stays on XIIGen
  → FLOW-34 handles this ✅ (D-34-1: this is FLOW-34's scope)
  → Examples: Figma plugin, Canva app, Chrome extension

"MODE-B-full":
  → Feature ships standalone — no runtime dependency on XIIGen
  → Business logic moves to target runtime
  → FLOW-34 does NOT handle this ❌ (D-34-1: out of scope)
  → What enterprise clients get instead:
      FlowBundle: contracts + iron rules + test matrix + API specs
      Reference implementation: generated NestJS (guidance only)
      Professional services engagement for reimplementation
  → FLOW-37+ handles this in the future
```

### Decision 3: platformId routing

```
Read FT record's platforms[target].platformId.

Third-party platforms (figma, canva, miro, webflow, chrome, vscode, etc.):
  → FLOW-34 may generate an adapter (if adapterMode = MODE-B-thin)
  → Signals: MODE_B (installs, likes, citations)
  → PortingDecisionGate evaluates: signal_score, cost, compatibility

XIIGen product variants (xiigen-saas, xiigen-oss, xiigen-enterprise, xiigen-lean):
  → Not a FLOW-34 concern
  → FEATURE-REGISTRY-S1 xiigen-capabilities manifest tracks these
  → Signals: XIIGEN_VARIANT (deployedInVariants[], leanCompatible, etc.)
  → PortingDecisionGate evaluates: variant adoption metrics, not installs
  → Enterprise (.NET): MODE-B-full applies → D-34-1 routes to FlowBundle
  → Lean (React Native + Python): MODE-B-full → separate implementation
  → OSS: MODE-B-full → contributor-driven, FlowBundle as spec
  → SaaS: MODE-A → canonical implementation, already running
```

## Decision Matrix

```
productScope         adapterMode     platformId           → Route
─────────────────────────────────────────────────────────────────
client-capability    MODE-B-thin     figma/canva/etc      → FLOW-34 ✅
client-capability    MODE-B-full     xiigen-enterprise    → FlowBundle ❌ FLOW-34
client-capability    MODE-B-full     xiigen-lean          → FlowBundle ❌ FLOW-34
client-capability    MODE-B-full     xiigen-oss           → FlowBundle ❌ FLOW-34
client-capability    MODE-A          xiigen-saas          → Already running
xiigen-capability    MODE-A          xiigen-saas          → Already running
xiigen-capability    MODE-B-full     xiigen-lean          → FlowBundle, lean impl
xiigen-capability    portingCandidate=false  any          → PortingProhibited ⛔
```

## portingCandidate Guard (always check first)

Before any porting decision, regardless of adapterMode:

```
If FT.portingCandidate = false:
  → Emit PortingProhibited immediately
  → No signal evaluation, no cost estimation, no FLOW-34 call
  → This is permanent (D-36-5 classification: MACHINE, not tenant-tunable)
  → Examples: T516 BootstrapOrchestrator, T519 ImplementFamilyMetaLoop,
              T520 FiveArbiterConsensusGate, T521 RegressionImpactAnalyzer
```

## Positive Example

```
Planning: FLOW-34 session for DesignToCode feature (FT-001)

CORRECT:
  1. Read FT-001: productScope = "client-capability"
  2. Read target adapter: platformId = "canva", adapterMode = "MODE-B-thin"
  3. Check portingCandidate = true
  4. Decision: FLOW-34 handles this ✅
  5. FLOW-34 generates thin Canva adapter that calls XIIGen's
     canonical DesignToCode service via QUEUE FABRIC
```

## Negative Example

```
Planning: FLOW-34 session for enterprise .NET deployment

WRONG:
  → Proceeding to generate a .NET service from FLOW-01 contracts
  → FLOW-34 was designed to call XIIGen home — .NET desktop can't call home

CORRECT:
  1. Check target: platformId = "xiigen-enterprise", adapterMode = "MODE-B-full"
  2. D-34-1: FLOW-34 scope is MODE-B-thin only
  3. Decision: FLOW-34 does NOT handle this ❌
  4. Route: produce FlowBundle (contracts + iron rules + test matrix)
     + NestJS reference implementation labeled "guidance, not runtime"
  5. Note: FLOW-37+ will handle MODE-B-full generation in the future
```

## Integration

```
requires:    SK-416 (session startup — checks D-34-1 in DECISIONS-LOCKED.md)
complements: SK-418 (completeness checker — V14 productScope on DPO triples)
             SK-422 (MetaEscalationRouter — escalate when adapterMode unclear)
             SK-424 (BlastRadiusAssessor — assess impact of MODE-B-full scope decision)
```

## Test

```
Given: FT record with adapterMode = "MODE-B-thin", platformId = "figma"
Expected: FLOW-34 route confirmed ✅

Given: FT record with adapterMode = "MODE-B-full", platformId = "xiigen-enterprise"
Expected: FlowBundle route, FLOW-34 explicitly excluded ❌

Given: FT record with portingCandidate = false
Expected: PortingProhibited — no routing evaluation at all

Given: FT record with productScope = "xiigen-capability", platformId = "xiigen-lean"
Expected: XIIGEN_VARIANT signals, lean build FlowBundle, MODE-B-full path
```
