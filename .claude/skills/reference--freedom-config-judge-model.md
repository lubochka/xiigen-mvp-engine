---
name: freedom-config-judge-model
version: "2.0.0"
updated: "2026-03-26"
applies_to: reference--freedom-config-schema.md + fabrics.module.ts
description: >
  Judge model and generator model FREEDOM config selection. Architecture
  decision D-EXT-009. Locked decision for judge model independence.
---


## ARCHITECTURAL DECISION D-EXT-009

**Decision:** Judge model and generator model selection MUST be resolved from FREEDOM
config at runtime, not hardcoded in source files.

**Context:** `fabrics.module.ts` previously hardcoded `claude-opus-4-5-20251101` as
`AI_JUDGE_PROVIDER`. This is a P17 violation (MACHINE constant — a model name is
configuration, not a magic number, but it makes model selection require a code change
rather than a config change) and a practical problem: performance characteristics
change between model generations. The judge model must be swappable without touching
code.

**Proposed (wrong):** Hardcode `claude-opus-4-5-20251101` as judge, `claude-sonnet-X`
as generator.

**Challenge:** Model names in source files create deploy cycles to change model
selection. Evaluation sessions showed Sonnet 4.x outperforms Opus 4.x for detailed
checking tasks in the XIIGen domain — the hardcoded choice was already wrong. The
mistake would recur with the next model generation.

**Resolution:** Three FREEDOM config keys (see below). Default values baked in as
fallbacks. Operator overrides via FREEDOM config without code change.

**Principle applied:** D-EXT-003 (derive from system state) extended to AI model
selection: model selection is runtime configuration, not design-time constant.

---

## HOW TO APPLY

### Pre-flight (verify before touching any code)

```bash
# Check 1: FREEDOM_CONFIG token and IFreedomConfig interface are importable
grep -rn "FREEDOM_CONFIG\|IFreedomConfig" server/src/fabrics/ | grep -v ".spec."
# Expected: at least 1 hit showing the import path

# Check 2: Verify fabrics.module.ts current AI_JUDGE_PROVIDER registration
grep -A 8 "AI_JUDGE_PROVIDER" server/src/fabrics/fabrics.module.ts
# Expected: shows current factory (hardcoded model name — this is what we are fixing)

# Check 3: Verify AnthropicProvider constructor accepts config parameter
grep -A 3 "constructor" server/src/fabrics/ai-engine/anthropic.provider.ts
# Expected: constructor accepts optional config with defaultModel

# Check 4: baseline test count
cd server && pnpm test -- --passWithNoTests 2>&1 | tail -3
# Record exact count — this is the delta gate baseline
```

Expected state before change: fabrics.module.ts has hardcoded 'claude-opus-4-5-20251101'
in AI_JUDGE_PROVIDER factory. FREEDOM_CONFIG is importable. Tests pass.

---

### Part 1 — Add to FREEDOM config schema (reference--freedom-config-schema.md)

Add the following entries to the `xiigen.*` namespace section:

```typescript
// AI model selection — overridable without code change
'xiigen.judge_model':               string  // default: 'claude-sonnet-4-5'
'xiigen.generator_primary_model':   string  // default: 'claude-sonnet-4-5'
'xiigen.generator_secondary_model': string  // default: resolved from env keys at startup
                                            // priority: OPENAI_API_KEY → gpt-4o-mini
                                            //           GEMINI_API_KEY → gemini-1.5-flash
                                            //           absent → PENDING (single-provider fallback)
'xiigen.oss_target_model':          string  // default: 'deepseek-coder-v2'
                                            // used in DPO triple targetModelFamily field (P18)
'xiigen.oss_instruction_format':    string  // default: 'deepseek-coder'
                                            // used in DPO triple instructionFormat field (P18)
```

### Part 2 — Update fabrics.module.ts AI_JUDGE_PROVIDER factory

**Before applying Parts 2 and 3, verify this import is resolvable in `fabrics.module.ts`:**
```typescript
import { FREEDOM_CONFIG, IFreedomConfig } from '../fabrics/interfaces/freedom-config.interface';
```
If this import path does not resolve, add it first. Do not proceed with the factory
changes until the import compiles cleanly (`npx tsc --noEmit` shows 0 new errors).
The downstream effect: if `FREEDOM_CONFIG` token is not injectable, NestJS will throw
at startup on every environment — not just when the judge model config key is used.

Replace hardcoded model string:

```typescript
// BEFORE (hardcoded — P17 violation):
{
  provide: AI_JUDGE_PROVIDER,
  useFactory: (keyResolver: TenantKeyResolver) => {
    const provider = new AnthropicProvider(keyResolver);
    (provider as any).defaultModel = 'claude-opus-4-5-20251101';  // ← wrong, hardcoded
    return provider;
  },
  inject: [TenantKeyResolver],
}

// AFTER (FREEDOM config — correct):
{
  provide: AI_JUDGE_PROVIDER,
  useFactory: (keyResolver: TenantKeyResolver, freedomConfig: IFreedomConfig) => {
    const judgeModel = freedomConfig.get('xiigen.judge_model') ?? 'claude-sonnet-4-5';
    return new AnthropicProvider(keyResolver, { defaultModel: judgeModel });
  },
  inject: [TenantKeyResolver, FREEDOM_CONFIG],
}
```

### Part 3 — Update AI_ENGINE factory (generator primary)

```typescript
// AFTER (FREEDOM config):
{
  provide: AI_ENGINE,
  useFactory: (keyResolver: TenantKeyResolver, freedomConfig: IFreedomConfig) => {
    const generatorModel = freedomConfig.get('xiigen.generator_primary_model')
      ?? 'claude-sonnet-4-5';
    return new AnthropicProvider(keyResolver, { defaultModel: generatorModel });
  },
  inject: [TenantKeyResolver, FREEDOM_CONFIG],
}
```

### Part 4 — Add to .env defaults (for local development)

**Notation note:** `.env` uses UPPER_SNAKE_CASE. FREEDOM config uses `dot.case.keys`.
These are NOT the same system. The FREEDOM config resolver maps env vars to config keys
via a transform: `XIIGEN_JUDGE_MODEL` → `xiigen.judge_model`. Verify this transform
exists in `FreedomConfigService` (or equivalent) before adding these env vars. If the
FREEDOM config service does not auto-transform env vars, the keys must be set via
the existing FREEDOM config mutation API, not via `.env`.

**To verify the mapping exists:**
```bash
grep -n "XIIGEN_\|xiigen\." server/src/fabrics/freedom-config*.ts | head -20
# If you see transform logic: env vars will work
# If absent: use the FREEDOM config API to set values instead
```

```bash
# AI Model Selection — set via env var IF transform exists in FreedomConfigService
# (see note above — verify before using)
XIIGEN_JUDGE_MODEL=claude-sonnet-4-5
XIIGEN_GENERATOR_PRIMARY_MODEL=claude-sonnet-4-5
# XIIGEN_GENERATOR_SECONDARY_MODEL=   # resolved automatically from OPENAI_API_KEY / GEMINI_API_KEY
XIIGEN_OSS_TARGET_MODEL=deepseek-coder-v2
XIIGEN_OSS_INSTRUCTION_FORMAT=deepseek-coder
```

---

## WHY SONNET AS JUDGE (not Opus)

Evaluation sessions on XIIGen domain tasks (iron rule checking, principles compliance,
contract validation) showed Sonnet 4.x produces more precise, more detailed verdicts
than Opus 4.x for this specific task profile. Opus 4.x general capability is higher,
but Sonnet 4.x's attention allocation is better suited to the structured checklist
style of arbiter evaluation.

This is a domain-specific observation, not a general capability statement. As model
generations advance, the correct judge model will change. FREEDOM config makes this
change a one-line edit, not a code deployment.

**Locked decision:** Judge model = `claude-sonnet-4-5` (current default).
Override via FREEDOM config `xiigen.judge_model` when a better model is identified.
This decision should be reviewed at: (a) each new Anthropic model release, (b) when
shadow run data shows the judge model is causing systematic mis-scoring.

---

### Post-flight (verify after all changes)

```bash
# Check 1: TypeScript compiles cleanly — no new errors in changed files
cd server && npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep "error TS" | head -20
# Expected: 0 errors in fabrics.module.ts and related files
# Pre-existing errors in test-af-station.ts are excluded from tsconfig — ignore them

# Check 2: Absolute test gate (P19/HEALTH-001 — not delta gate)
cd server && pnpm test 2>&1 | tail -5
# Expected: failures === 0 AND each skip has documented justification
# "0 regressions" is insufficient — total failures must be zero

# Check 3: Server starts with judge model from config
grep "xiigen.judge_model\|XIIGEN_JUDGE_MODEL" .env
# Expected: key present or confirm fallback 'claude-sonnet-4-5' is acceptable

# Check 4: Seed D-EXT-009 to RAG (run the command below)
```

---

## DESIGN_REASONING SEED COMMAND

After applying this patch and updating fabrics.module.ts, seed the decision to RAG:

```bash
curl -X POST localhost:9200/xiigen-rag-patterns/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "patternType": "ARCHITECTURE_DECISION",
    "decisionId": "D-EXT-009",
    "flowId": "GLOBAL",
    "context": "fabrics.module.ts hardcoded claude-opus-4-5-20251101 as judge model",
    "proposed": "Hardcode Opus as judge in source file",
    "challenge": "Model performance characteristics change between generations. Hardcoded name requires code deployment to change. Sonnet 4.x outperforms Opus 4.x for XIIGen structured checking tasks.",
    "resolution": "FREEDOM config keys xiigen.judge_model, xiigen.generator_primary_model. Default claude-sonnet-4-5. Override without code change.",
    "principleApplied": "D-EXT-003 extended to AI model selection: model names are runtime config not design-time constants",
    "teachingPoint": "Before hardcoding any model name: add FREEDOM config key with the name as default. The model name is always configuration."
  }'
```
