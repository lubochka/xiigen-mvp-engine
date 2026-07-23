# AF Pipeline Reference

## Overview

The AF (Artificial Factory) pipeline is the 11-station AI code generation pipeline. It takes a task type specification as input and produces generated, validated, scored code as output.

## Pipeline Architecture

```
StationInput → INVENTORY → SYNTHESIS → JUDGMENT → PipelineResult
```

### Sub-Engine 1: INVENTORY (Extract)

| Station | File | Purpose |
|---------|------|---------|
| AF-3 | af3-prompt-library.ts | Retrieves domain-specific prompts from versioned store |
| AF-4 | af4-rag-context.ts | Searches skill library for reusable patterns (quality-weighted) |

Input: raw task type spec
Output: enriched input with prompts + RAG patterns

### Sub-Engine 2: SYNTHESIS (Generate)

| Station | File | Purpose |
|---------|------|---------|
| AF-2 | af2-planning.ts | Decomposes task into implementation steps |
| AF-1 | af1-genesis.ts | Generates code from spec using AI Engine Fabric |
| AF-5 | (multi-model) | Runs competing models in parallel |
| AF-10 | (merge) | Combines multi-model outputs via consensus |

Input: enriched input from INVENTORY
Output: generated code artifacts

### Sub-Engine 3: JUDGMENT (Validate)

| Station | File | Purpose |
|---------|------|---------|
| AF-6 | af6-code-review.ts | Automated code review |
| AF-7 | (via dna-validator) | DNA pattern enforcement (all 9) |
| AF-8 | af8-security.ts | Security vulnerability scan |
| AF-9 | (judge) | Quality gates + iron rules + scoring |
| AF-11 | af11-feedback.ts | Stores quality metrics for learning loop |

Input: generated code
Output: pass/fail + score + violations list

---

## StationInput (shared input object)

```typescript
interface StationInput {
  taskTypeId: string;           // e.g., 'T516'
  contractSpec: EngineContract; // full engine contract
  tenantId: string;             // from TenantContext
  generatedCode?: string;       // populated by AF-1
  prompts?: string[];           // populated by AF-3
  ragPatterns?: string[];       // populated by AF-4
  planSteps?: string[];         // populated by AF-2
  reviewNotes?: string[];       // populated by AF-6
  dnaViolations?: DnaViolation[]; // populated by AF-7
  securityIssues?: string[];    // populated by AF-8
  score?: number;               // populated by AF-9
}
```

---

## PipelineResult

```typescript
interface PipelineResult {
  passed: boolean;              // did it pass judgment?
  artifactId: string;           // unique ID for this generation run
  promotionLevel: string;       // GENERATED, INJECTED, MINIMAL, or CORE
  stages: StageLog[];           // per-stage timing + success/fail
  totalElapsedMs: number;
  enrichedInput: StationInput;  // final state after all stations
  judgment?: JudgmentResult;    // detailed judgment breakdown
  errors: string[];
  warnings: string[];
}
```

---

## PipelineConfig

Stations can be enabled/disabled via config:

```typescript
interface PipelineConfig {
  enabledStations: string[];    // e.g., ['AF-1','AF-3','AF-4','AF-6','AF-9']
  modelHints: Record<string, string>;  // station → model preference
  qualityThreshold: number;     // minimum score to pass (0.0–1.0)
  maxRetries: number;           // retry failed generation
}
```

---

## Promotion After Pipeline

- Pipeline creates artifact at `GENERATED` level
- If judgment passes (score >= threshold, 0 DNA errors) → promotes to `MINIMAL`
- Manual promotion to `INJECTED` (after integration tests) and `CORE` (after production hardening)

---

## Learning Loop Integration

AF-11 (Feedback) stores:
- Which model generated the code
- Which prompts were used
- Which RAG patterns were retrieved
- The quality score
- DNA compliance results

This feeds back into:
- ModelPreference → future model selection
- PromptEvolver → prompt improvements
- RagWeightIntegrator → pattern weight adjustments
