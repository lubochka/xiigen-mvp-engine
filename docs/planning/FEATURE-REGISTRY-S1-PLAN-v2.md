# FEATURE-REGISTRY-S1 — Addendum Plan v2
## Groundwork for Feature-as-First-Class-Entity + XIIGen Self-Referential Capability Tracking
## Runs after FLOW-33 exits, before FLOW-35 starts
## Version: v2.0 | Date: 2026-03-20

---

## WHAT CHANGED FROM v1

| What v1 had | What v2 adds |
|-------------|-------------|
| platformId enum: third-party tools only (figma, canva...) | Extended with 4 XIIGen product variant targets |
| FeatureSignals: single schema for all features | productScope discriminator + XiigenVariantSignals third mode |
| S1-B: produces only Figma plugin manifest | S1-B: produces TWO manifests — Figma plugin + XIIGen capabilities |
| Feature Registry tracks client capabilities only | Feature Registry is self-referential: tracks XIIGen's own capabilities across product variants |
| solution-bundle.schema.json not in scope | Added to S1-A (solution bundles are schema-only, same session) |

**Why the self-referential extension must be in S1-A, not FLOW-36:**
FLOW-35 builds meta-arbitration (SK-402..406). FLOW-36 Phase B (FeatureExtractor)
will scan FLOW-35 and need to classify SK-402 as `productScope: "xiigen-capability"`.
If the schema doesn't support this field when FLOW-36 runs, extraction produces
malformed records requiring another migration. The schema must be complete before
FLOW-35 executes.

---

## PURPOSE

This bounded addendum (same pattern as SKILL-GRAPH-S1) does not interrupt
the engine sequence. It lands the minimum necessary groundwork so that
FLOW-35, FLOW-36, and FLOW-00 can build on a stable schema foundation.

```
FLOW-31 → FLOW-33
            ↓
  FEATURE-REGISTRY-S1 (S1-A + S1-B) ← this addendum
            ↓
         FLOW-35
```

---

## UPDATED EXECUTION ORDER

```
FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30 → FLOW-26
→ FLOW-31 → FLOW-33
→ FEATURE-REGISTRY-S1 (S1-A + S1-B)
→ FLOW-35
→ FLOW-36 (Feature Registry)
→ FLOW-00 (Bundle Activation)
→ FLOW-34
→ FLOW-01 through FLOW-24 (any order, Waves 0–3)
```

---

## SCOPE CONSTRAINTS

```
MUST NOT add:
✗ New ContractArchetype enum values
✗ New T-XXX task types
✗ New F-XXXX factory registrations
✗ New CF-XXX BFA rules
✗ New Elasticsearch indexes
✗ Any changes to running service code

MUST produce (v2):
✓ FT-XXX namespace entry in DECISIONS-LOCKED.md (D-FT-1)
✓ feature-manifest.schema.json v2.0 (with productScope + xiigen variants)
✓ solution-bundle.schema.json v1.0 (solution bundles schema)
✓ bundle-catalog-v1.json (4 initial bundle stubs)
✓ feature-manifest-figma-plugin-v1.json (FT-001 through FT-00N)
✓ feature-manifest-xiigen-capabilities-v1.json (all planned XIIGen capabilities)
✓ One paragraph added to FLOW-34-REFERENCE-PLAN.md (thin adapter scope lock)
✓ Updated INFRASTRUCTURE-FLOWS-STATE-v4.json
✓ STATE-S1.json checkpoint
```

---

## PHASE S1-A — Namespace + Schemas + Decisions (~2h)

### Objective
Reserve FT-XXX namespace. Define the complete feature-manifest schema v2.0
with productScope discriminator and xiigen product variants. Define the
solution-bundle schema. Lock all architectural decisions.

---

### Deliverable 1: DECISIONS-LOCKED.md entries

**D-FT-1: Feature Registry Namespace (unchanged from v1)**
```
FT-001 onwards reserved for Feature Registry artifacts.
FT-IDs assigned by FLOW-36 FeatureExtractor.
FEATURE-REGISTRY-S1 assigns provisional FT-001–FT-099 (Figma plugin)
and FT-100+ (XIIGen capabilities). Confirmed by FLOW-36 Phase A.
FT-IDs stable across platforms — same feature = same FT-ID.
```

**D-FT-2: productScope is MACHINE — never tenant-tunable**
```
productScope: "xiigen-capability" = this is XIIGen's own infrastructure.
productScope: "client-capability" = capability generated for client flows.
Classification is determined at extraction time by FeatureExtractor.
Tenants cannot reclassify. No API for changing productScope.
```

**D-FT-3: XIIGen product variants are first-class platformId values**
```
xiigen-saas, xiigen-oss, xiigen-enterprise, xiigen-lean are valid platformId values.
Same PortingDecisionGate logic applies. Same portingCandidate flag.
Same signal tracking. The Feature Registry is self-referential by design.
```

**D-34-1: FLOW-34 covers thin adapters only — not runtime transpilation**
```
FLOW-34 PlatformAdapterGenerator produces thin Mode B adapters.
A thin adapter calls XIIGen's canonical Mode A service via QUEUE FABRIC.
It assumes business logic stays on XIIGen infrastructure.
Enterprise clients running their own infrastructure (e.g. .NET Core desktop)
need full runtime reimplementation — this is out of scope for FLOW-34.
Full runtime transpilation is reserved for a future flow (tentatively FLOW-37).
The NestJS reference implementation ships alongside bundles as guidance only.
FLOW-34 Phase E's PlatformSimulator covers thin adapters only.
```

---

### Deliverable 2: feature-manifest.schema.json v2.0

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://xiigen.io/schemas/feature-manifest/v2",
  "title": "XIIGen Feature Manifest v2",
  "type": "object",
  "required": ["schemaVersion", "features"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "2.0" },
    "sourceFlow":    { "type": "string" },
    "extractedAt":   { "type": "string", "format": "date-time" },
    "features": {
      "type": "array",
      "items": { "$ref": "#/definitions/Feature" }
    }
  },

  "definitions": {
    "Feature": {
      "type": "object",
      "required": ["ftId", "name", "description", "productScope",
                   "portingCandidate", "canonicalImplementation", "platforms"],
      "properties": {
        "ftId": {
          "type": "string",
          "pattern": "^FT-[0-9]{3,6}$"
        },
        "name":        { "type": "string" },
        "description": { "type": "string" },

        "productScope": {
          "type": "string",
          "enum": ["xiigen-capability", "client-capability"],
          "description": "MACHINE field. xiigen-capability = XIIGen's own infrastructure feature. client-capability = generated for client flows."
        },

        "portingCandidate": {
          "type": "boolean",
          "description": "MACHINE field. false = engine-internal, porting PROHIBITED."
        },
        "portingCandidateReason": {
          "type": "string",
          "description": "Required when portingCandidate=false."
        },

        "canonicalImplementation": {
          "type": "object",
          "properties": {
            "flowId":       { "type": "string" },
            "taskTypeId":   { "type": "string" },
            "serviceClass": { "type": "string" },
            "status": {
              "type": "string",
              "enum": ["confirmed", "pending-flow-execution"]
            }
          }
        },

        "platforms": {
          "type": "array",
          "items": { "$ref": "#/definitions/PlatformAdapter" }
        },

        "signals": { "$ref": "#/definitions/CanonicalSignals" },

        "portingConstraints":      { "type": "array", "items": { "type": "string" } },
        "platformIncompatibilities": { "type": "array", "items": { "type": "string" } }
      },

      "if": { "properties": { "portingCandidate": { "const": false } } },
      "then": {
        "required": ["portingCandidateReason"],
        "properties": {
          "platforms": { "type": "array", "maxItems": 0 }
        }
      }
    },

    "PlatformAdapter": {
      "type": "object",
      "required": ["platformId", "status", "adapterPath", "adapterMode"],
      "properties": {
        "platformId": {
          "type": "string",
          "enum": [
            "figma", "canva", "miro", "webflow", "framer",
            "atlassian", "shopify", "wix", "chrome", "vscode",
            "monday", "notion", "google-workspace",
            "xiigen-saas",        "xiigen-oss",
            "xiigen-enterprise",  "xiigen-lean"
          ]
        },
        "status": {
          "type": "string",
          "enum": ["implemented", "planned", "porting-in-progress",
                   "incompatible", "not-started"]
        },
        "version":     { "type": "string" },
        "adapterPath": { "type": "string" },
        "adapterMode": {
          "type": "string",
          "enum": ["MODE_A", "MODE_B"],
          "description": "MODE_A: runs on XIIGen. MODE_B: ships to platform."
        },
        "signals": { "$ref": "#/definitions/ModeBSignals" }
      }
    },

    "CanonicalSignals": {
      "type": "object",
      "description": "Signals at the canonical implementation level. Schema determined by productScope.",
      "required": ["signalMode"],
      "properties": {
        "signalMode": {
          "type": "string",
          "enum": ["MODE_A", "MODE_B", "XIIGEN_VARIANT"],
          "description": "MODE_A = engine execution metrics. MODE_B = marketplace metrics. XIIGEN_VARIANT = XIIGen capability deployment metrics."
        }
      },
      "if": { "properties": { "signalMode": { "const": "MODE_A" } } },
      "then": {
        "properties": {
          "executionCount":      { "type": "integer", "minimum": 0 },
          "successRate":         { "type": "number",  "minimum": 0, "maximum": 1 },
          "avgCostPerRunUsd":    { "type": "number",  "minimum": 0 },
          "avgLatencyMs":        { "type": "number",  "minimum": 0 },
          "tenantAdoption":      { "type": "integer", "minimum": 0 },
          "improvementVelocity": { "type": "number",  "minimum": 0 },
          "portingThresholdMet": { "type": "boolean" },
          "lastUpdated":         { "type": "string",  "format": "date-time" }
        }
      },
      "else": {
        "if": { "properties": { "signalMode": { "const": "MODE_B" } } },
        "then": {
          "properties": {
            "installs":            { "type": "integer", "minimum": 0 },
            "activeUsers30d":      { "type": "integer", "minimum": 0 },
            "likes":               { "type": "integer", "minimum": 0 },
            "citations":           { "type": "integer", "minimum": 0 },
            "signalScore":         { "type": "number",  "minimum": 0, "maximum": 100 },
            "portingThresholdMet": { "type": "boolean" },
            "lastUpdated":         { "type": "string",  "format": "date-time" }
          }
        },
        "else": {
          "properties": {
            "deployedInVariants": {
              "type": "array",
              "items": { "type": "string",
                         "enum": ["xiigen-saas","xiigen-oss","xiigen-enterprise","xiigen-lean"] },
              "description": "Which XIIGen product variants have implemented this capability"
            },
            "enterpriseAdoptionCount": {
              "type": "integer", "minimum": 0,
              "description": "Number of enterprise deployments using this capability"
            },
            "leanCompatible": {
              "type": "boolean",
              "description": "Can this capability run in the lean React Native + Python build?"
            },
            "ossIncluded": {
              "type": "boolean",
              "description": "Is this capability included in the open source build?"
            },
            "signalScore":         { "type": "number", "minimum": 0, "maximum": 100 },
            "portingThresholdMet": { "type": "boolean" },
            "lastUpdated":         { "type": "string", "format": "date-time" }
          }
        }
      }
    },

    "ModeBSignals": {
      "type": "object",
      "description": "Per-platform-adapter signals (marketplace metrics).",
      "properties": {
        "installs":            { "type": "integer", "minimum": 0 },
        "activeUsers30d":      { "type": "integer", "minimum": 0 },
        "likes":               { "type": "integer", "minimum": 0 },
        "citations":           { "type": "integer", "minimum": 0 },
        "signalScore":         { "type": "number",  "minimum": 0, "maximum": 100 },
        "portingThresholdMet": { "type": "boolean" },
        "lastUpdated":         { "type": "string",  "format": "date-time" }
      }
    }
  }
}
```

---

### Deliverable 3: solution-bundle.schema.json v1.0

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://xiigen.io/schemas/solution-bundle/v1",
  "title": "XIIGen Solution Bundle",
  "type": "object",
  "required": ["schemaVersion","bundleId","name","tier",
               "requiredFlows","defaultFreedomConfig","minFlowVersions"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "1.0" },
    "bundleId": { "type": "string", "pattern": "^B-[0-9]{3,6}$" },
    "name":        { "type": "string" },
    "description": { "type": "string" },
    "tier": {
      "type": "string",
      "enum": ["ATOMIC", "SOLUTION", "VERTICAL"]
    },
    "requiredFlows": {
      "type": "array", "minItems": 1,
      "items": { "type": "string", "pattern": "^FLOW-[0-9]{2}$" }
    },
    "optionalFlows": {
      "type": "array",
      "items": { "type": "string", "pattern": "^FLOW-[0-9]{2}$" }
    },
    "minFlowVersions": {
      "type": "object",
      "additionalProperties": { "type": "string", "pattern": "^v[0-9]+$" }
    },
    "defaultFreedomConfig": {
      "type": "object",
      "description": "Pre-populated on activation. Additive only — never overwrites existing tenant values."
    },
    "tenantAdaptationGuide": { "type": "string" },
    "incompatibilities": {
      "type": "array",
      "items": { "type": "string", "pattern": "^B-[0-9]{3,6}$" }
    },
    "signals": {
      "type": "object",
      "properties": {
        "activeTenants":   { "type": "integer", "minimum": 0 },
        "avgActivationMs": { "type": "number",  "minimum": 0 },
        "degradationRate": { "type": "number",  "minimum": 0, "maximum": 1 },
        "lastUpdated":     { "type": "string",  "format": "date-time" }
      }
    }
  },
  "if": { "properties": { "tier": { "const": "VERTICAL" } } },
  "then": {
    "required": ["tenantAdaptationGuide"],
    "properties": {
      "defaultFreedomConfig": { "minProperties": 3 }
    }
  }
}
```

### Deliverable 4: bundle-catalog-v1.json (4 stubs)

Four bundle stubs seeded — B-001 B2B Marketplace, B-002 Community Platform,
B-003 Content Creator, B-004 B2B SaaS. Full content per FEATURE-REGISTRY-S1-AMENDMENT.md.

### Deliverable 5: INFRASTRUCTURE-FLOWS-STATE-v4.json addendum

```json
"addenda": {
  "FEATURE-REGISTRY-S1": {
    "status": "COMPLETE",
    "runs_after": "FLOW-33",
    "runs_before": "FLOW-35",
    "ft_namespace": {
      "reserved_from": "FT-001",
      "client_provisional_range": "FT-001–FT-099 (Figma plugin)",
      "xiigen_provisional_range": "FT-100–FT-299 (XIIGen capabilities)",
      "confirmed_by": "FLOW-36 Phase A"
    },
    "schema_version": "2.0",
    "schema_location": "contracts/features/feature-manifest.schema.json",
    "bundle_schema": "contracts/bundles/solution-bundle.schema.json",
    "bundle_catalog": "contracts/bundles/bundle-catalog-v1.json",
    "next_bundle_id": "B-005"
  }
}
```

### Gate S1-A

```
□ D-FT-1, D-FT-2, D-FT-3, D-34-1 present in DECISIONS-LOCKED.md
□ feature-manifest.schema.json v2.0 — validates against its own $schema
□ productScope field present and required
□ XIIGEN_VARIANT signal mode in CanonicalSignals discriminator
□ xiigen-saas/oss/enterprise/lean present in platformId enum
□ solution-bundle.schema.json v1.0 — validates against its own $schema
□ VERTICAL tier validation: tenantAdaptationGuide required + ≥3 defaultFreedomConfig
□ contracts/bundles/bundle-catalog-v1.json — 4 stubs, all validate against schema
□ B-001 ↔ B-003 incompatibilities symmetric
□ INFRASTRUCTURE-FLOWS-STATE-v4.json addendum section added
□ No code changes — schema and document files only
□ STATE-S1-A.json saved

⛔ STOP — await approval before S1-B
```

---

## PHASE S1-B — Two Manifests + FLOW-34 Annotation (~2h)

### Objective
Produce two manifests: (1) Figma plugin extraction (client capabilities),
(2) XIIGen capabilities (Option B — all planned capabilities including
NOT_STARTED stubs for FLOW-35+).

---

### Manifest 1: feature-manifest-figma-plugin-v1.json

Scan Figma plugin code, extract feature boundaries, assign FT-001–FT-00N.
Same as v1 process. All features: `productScope: "client-capability"`.

Expected features (provisional):

| FT-ID | Name | portingCandidate |
|-------|------|-----------------|
| FT-001 | DesignToCode | true |
| FT-002 | CSSGroupOptimizer | true |
| FT-003 | AICodeImprover | true |
| FT-004 | UserCorrections | true |
| FT-005 | DesignSystemRules | true |
| FT-006 | ComponentVariantHandler | true |
| FT-007 | AIPanel | true |

All: `productScope: "client-capability"`, `platforms[0].platformId: "figma"`,
`signals.signalMode: "MODE_B"`, `platforms[0].signals: {}` (empty).

---

### Manifest 2: feature-manifest-xiigen-capabilities-v1.json

**Option B confirmed:** all planned capabilities included, future ones as NOT_STARTED.

FT-IDs start at FT-100 (reserved range for XIIGen capabilities).

```json
{
  "schemaVersion": "2.0",
  "sourceFlow": "FEATURE-REGISTRY-S1",
  "features": [

    {
      "ftId": "FT-100",
      "name": "FlowBFAGovernance",
      "description": "BFA conflict detection and governance across flow registrations",
      "productScope": "xiigen-capability",
      "portingCandidate": true,
      "canonicalImplementation": { "flowId": "FLOW-25", "status": "confirmed" },
      "platforms": [
        { "platformId": "xiigen-saas", "status": "implemented", "adapterMode": "MODE_A",
          "adapterPath": "src/engine/bfa/", "signals": {} },
        { "platformId": "xiigen-oss", "status": "planned", "adapterMode": "MODE_A",
          "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-enterprise", "status": "not-started", "adapterMode": "MODE_B",
          "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-lean", "status": "planned", "adapterMode": "MODE_A",
          "adapterPath": "", "signals": {} }
      ],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": ["xiigen-saas"], "leanCompatible": true, "ossIncluded": true }
    },

    {
      "ftId": "FT-101",
      "name": "PromptEvolutionEngine",
      "description": "PromptAsset versioning, PromptPatch cycle, A/B promotion",
      "productScope": "xiigen-capability",
      "portingCandidate": true,
      "canonicalImplementation": { "flowId": "FLOW-30", "status": "confirmed" },
      "platforms": [
        { "platformId": "xiigen-saas", "status": "implemented", "adapterMode": "MODE_A",
          "adapterPath": "src/engine/prompt-evolution/", "signals": {} },
        { "platformId": "xiigen-oss", "status": "planned", "adapterMode": "MODE_A",
          "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-enterprise", "status": "not-started", "adapterMode": "MODE_B",
          "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-lean", "status": "planned", "adapterMode": "MODE_A",
          "adapterPath": "", "signals": {} }
      ],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": ["xiigen-saas"], "leanCompatible": true, "ossIncluded": true }
    },

    {
      "ftId": "FT-102",
      "name": "AdaptiveRAGRetrieval",
      "description": "Dual-tier RAG with ES global and local docker tier",
      "productScope": "xiigen-capability",
      "portingCandidate": true,
      "canonicalImplementation": { "flowId": "FLOW-29", "status": "confirmed" },
      "platforms": [
        { "platformId": "xiigen-saas",       "status": "implemented", "adapterMode": "MODE_A", "adapterPath": "src/engine/rag/", "signals": {} },
        { "platformId": "xiigen-oss",        "status": "planned",     "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-enterprise", "status": "not-started", "adapterMode": "MODE_B", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-lean",       "status": "planned",     "adapterMode": "MODE_A", "adapterPath": "", "signals": {} }
      ],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": ["xiigen-saas"], "leanCompatible": true, "ossIncluded": true }
    },

    {
      "ftId": "FT-103",
      "name": "ImplementFamilyBootstrap",
      "description": "Self-building bootstrap: GraphRAG seeding, implement-family loop, 5-arbiter gate",
      "productScope": "xiigen-capability",
      "portingCandidate": false,
      "portingCandidateReason": "Core engine self-building loop. Porting to another runtime would expose XIIGen's internal generation architecture to an untrusted environment.",
      "canonicalImplementation": { "flowId": "FLOW-33", "status": "confirmed" },
      "platforms": [],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": ["xiigen-saas"], "leanCompatible": false, "ossIncluded": false }
    },

    {
      "ftId": "FT-104",
      "name": "MetaArbitrationEngine",
      "description": "Meta-arbitration layer: spend governor, security gate, improvement detector, model fitness, round controller",
      "productScope": "xiigen-capability",
      "portingCandidate": false,
      "portingCandidateReason": "XIIGen's quality decision engine. Exporting it would allow external parties to manipulate generation quality decisions.",
      "canonicalImplementation": { "flowId": "FLOW-35", "status": "pending-flow-execution" },
      "platforms": [],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": [], "leanCompatible": false, "ossIncluded": false }
    },

    {
      "ftId": "FT-105",
      "name": "FeatureRegistry",
      "description": "FT-ID system, signal tracking, PortingDecisionGate, PlatformAdapterGenerator",
      "productScope": "xiigen-capability",
      "portingCandidate": true,
      "canonicalImplementation": { "flowId": "FLOW-36", "status": "pending-flow-execution" },
      "platforms": [
        { "platformId": "xiigen-saas",       "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-oss",        "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-enterprise", "status": "not-started", "adapterMode": "MODE_B", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-lean",       "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} }
      ],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": [], "leanCompatible": true, "ossIncluded": true }
    },

    {
      "ftId": "FT-106",
      "name": "BundleActivation",
      "description": "Solution bundle selection, multi-flow provisioning, FREEDOM config pre-population",
      "productScope": "xiigen-capability",
      "portingCandidate": true,
      "canonicalImplementation": { "flowId": "FLOW-00", "status": "pending-flow-execution" },
      "platforms": [
        { "platformId": "xiigen-saas",       "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-oss",        "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-enterprise", "status": "not-started", "adapterMode": "MODE_B", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-lean",       "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} }
      ],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": [], "leanCompatible": true, "ossIncluded": true }
    },

    {
      "ftId": "FT-107",
      "name": "SessionOutputInfrastructure",
      "description": "SK-426–429: EXECUTION-LOG, PHASE-COMPLETE, SESSION-BRIEF, git report",
      "productScope": "xiigen-capability",
      "portingCandidate": true,
      "canonicalImplementation": { "flowId": "FLOW-35", "taskTypeId": "SK-426..429", "status": "pending-flow-execution" },
      "platforms": [
        { "platformId": "xiigen-saas",       "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-oss",        "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} },
        { "platformId": "xiigen-lean",       "status": "not-started", "adapterMode": "MODE_A", "adapterPath": "", "signals": {} }
      ],
      "portingConstraints": ["Requires git installed", "Requires sessions/ directory convention"],
      "signals": { "signalMode": "XIIGEN_VARIANT",
        "deployedInVariants": [], "leanCompatible": true, "ossIncluded": true }
    }
  ]
}
```

*Actual FT-100+ IDs confirmed and extended by FLOW-36 Phase A FeatureExtractor.*
*FLOW-36 Phase B will retroactively scan completed infra flows and fill in remaining capabilities.*

---

### FLOW-34 Reference Plan Annotation

Add to Phase A of FLOW-34-REFERENCE-PLAN.md:

> **Feature-Manifest Integration (FEATURE-REGISTRY-S1)**
> FLOW-34 generates thin Mode B platform adapters only. A thin adapter calls
> XIIGen's canonical Mode A service via QUEUE FABRIC — business logic stays on
> XIIGen infrastructure. Enterprise clients requiring full runtime reimplementation
> on their own infrastructure are out of scope for FLOW-34 (see D-34-1).
> Before generating any adapter, Phase A reads the source platform's
> `feature-manifest-{platform}-v{N}.json` from `contracts/features/`, extracts
> FT-IDs, and calls PortingDecisionGate (FLOW-36). FLOW-34 does NOT assign FT-IDs.

---

### Gate S1-B

```
□ feature-manifest-figma-plugin-v1.json in contracts/features/
  Validates against feature-manifest.schema.json v2.0
  ≥5 FT entries, all productScope: "client-capability"
  All platforms[0].platformId = "figma"
  portingCandidate and portingCandidateReason present per rule

□ feature-manifest-xiigen-capabilities-v1.json in contracts/features/
  Validates against feature-manifest.schema.json v2.0
  ≥7 FT entries (FT-100 through FT-107 minimum)
  All productScope: "xiigen-capability"
  FT-103 portingCandidate=false with portingCandidateReason
  FT-104 portingCandidate=false with portingCandidateReason
  FT-103/104/105+ have signals.signalMode: "XIIGEN_VARIANT"
  Pending flows have status: "pending-flow-execution"

□ FLOW-34-REFERENCE-PLAN.md has both paragraphs in Phase A:
  - Feature-Manifest Integration (thin adapter scope)
  - D-34-1 reference (runtime transpilation out of scope)

□ STATE-S1-B.json saved with:
  last_client_ft_assigned: "FT-00N"
  last_xiigen_ft_assigned: "FT-107" (or higher)

⛔ STOP — addendum complete, await approval before FLOW-35
```

---

## S1 COMPLETION SUMMARY

```
Artifacts produced:
  contracts/features/feature-manifest.schema.json v2.0
  contracts/features/feature-manifest-figma-plugin-v1.json
  contracts/features/feature-manifest-xiigen-capabilities-v1.json
  contracts/bundles/solution-bundle.schema.json v1.0
  contracts/bundles/bundle-catalog-v1.json (4 stubs)
  DECISIONS-LOCKED.md ← D-FT-1, D-FT-2, D-FT-3, D-34-1
  FLOW-34-REFERENCE-PLAN.md ← Phase A annotated
  INFRASTRUCTURE-FLOWS-STATE-v4.json ← addendum updated
  STATE-S1-A.json, STATE-S1-B.json

Engine state: UNCHANGED
FT namespace: FT-001–FT-099 client provisional, FT-100–FT-299 XIIGen provisional
Next flow: FLOW-35
```
