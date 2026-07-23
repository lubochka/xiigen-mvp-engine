---
name: capability-measurement
sk_number: SK-465
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Systematic protocol for scoring XIIGen capabilities against M1-M5 + P1-P22
  + D-EXT-001..009. Two sections: (1) file-agnostic methodology that survives
  refactoring — teaches how to locate evidence by capability class; (2) current
  capability manifest with specific grep commands, score scale, and paired runtime
  checks (SK-445 queries) to catch the "wired but not triggering" failure class.
  Distinct from SK-441 (forward-looking scenario trace); this is backward-looking
  code measurement.
triggers:
  - "capability measurement"
  - "capability audit"
  - "measure against principles"
  - "score the codebase"
  - "what is implemented"
  - "audit the engine"
  - "35% complete"
  - "what's wired"
---

# Capability Measurement Skill (SK-465) v1.0

## SECTION 1: METHODOLOGY (file-agnostic)

When specific file paths are unknown or may have changed, locate evidence by class:

```
Class                   Where to look                        What to look for
────────────────────────────────────────────────────────────────────────────────
FABRIC WIRING           Handler constructor arguments         @Inject(FABRIC_TOKEN)
                        (not the interface definition)        + method call on injected service

SIGNAL EMISSION         After-generation handlers             this.[service].record(...)
                        (feedback.handler, score.handler)     + the field being written to ES

FIELD COMPLETENESS      The actual .record() or .store()      Which fields are passed at the call
                        call site                              site — NOT what the interface accepts

FREEDOM CONFIG READ     Any service making a tenant-varying   freedomConfig.get('key') at call time
                        decision                               vs hardcoded default at class level

SCORE COMPUTATION       The method returning a score value    heuristic (field.length > 0 → 1.0)
                                                              vs AI call (await ai.generate(...))

INDEX INITIALIZATION    Bootstrapper / init service           seedXxx() with index name literal
```

### Score scale

```
0%     Not started — capability class absent from any handler
10–40% Schema or interface defined — no implementation in running handlers
40–70% Partially wired — service injected but not always called, or incomplete fields
70–90% Wired with gaps — works in normal path, fails in fallback or edge cases
90–100% Verified working — correct call path, all required fields, testable
```

### Evidence citation format

```
File:       [relative path from server/src]
Line:       [line number]
Found:      [exact excerpt ≤20 words]
vs:         [what was expected]
Score:      [0–100%]
Confidence: HIGH (direct code) | MEDIUM (inferred) | LOW (not found)
```

### Paired runtime check (Doc 8 correction)

A codebase scoring 75% on signal wiring can still produce 100% corrupted data.
After each static measurement, run the paired SK-445 query to confirm the
static finding matches live ES data. Discrepancy = "wired but not triggering."

```
Static 80% + runtime 0 records = wired but not triggering (highest priority)
Static 0%  + runtime data     = code lives elsewhere — search again
Static 70% + runtime 50%      = partial path — both correct
```

---

## SECTION 2: CAPABILITY MANIFEST (current as of 2026-03-26)

### TIER 1 — Generation mechanics (75–95%)

| Capability | Principle | Grep command | Expected | Score | Runtime check |
|-----------|-----------|-------------|----------|-------|--------------|
| Multi-model blind generation | M1, P17 | `grep -n "shuffle\|blind\|Fisher" server/src/engine/generic-node-executor.ts` | Fisher-Yates shuffle + label-based blind judging | 95% | triple count with fabricProviders = total |
| DPO validity gate | P17 | `grep -n "sameModel\|PENDING_INDEX\|chosen.model" server/src/learning/dpo-validation.ts` | cross-model check routing to pending index | 90% | pending index count visible |
| Shadow run placeholders seeded | P21 | `grep -n "seedShadowRun\|xiigen-shadow-runs" server/src/engine/engine-bootstrapper.ts` | seedShadowRunPlaceholders() at startup | 85% | `curl localhost:9200/xiigen-shadow-runs/_count \| jq .count` ≥3 |
| prompt.system capture | M1, P18 | `grep -n "xiigen-prompts\|promptType.*genesis" server/src/engine/node-handlers/feedback.handler.ts` | ES query for genesis text | 90% | SK-445 DPO valid triple count |
| fabricProviders populated | P17 | `grep -n "resolvedProviders\|fabricProviders" server/src/engine/generic-node-executor.ts` | populated from ctx or runtimeHints | 80% | triple count with fabricProviders |
| curriculumTier assigned | P18 | `grep -n "resolveCurriculumTier\|curriculumTier" server/src/engine/node-handlers/feedback.handler.ts` | 5-tier table lookup | 90% | `curl localhost:9200/xiigen-training-data/_count -d '{"query":{"bool":{"must_not":{"exists":{"field":"curriculumTier"}}}}}' \| jq .count` → 0 |

### TIER 2 — Learning loop (30–70%)

| Capability | Principle | Grep command | Expected | Score | Runtime check |
|-----------|-----------|-------------|----------|-------|--------------|
| AI judge independent | P17, D-EXT-009 | `grep -n "AI_JUDGE_PROVIDER\|heuristic.*1.0\|return 1.0" server/src/engine/node-handlers/score.handler.ts` | separate provider token, no 1.0 heuristic fallback | 60% | FLOW-01 Phase B scores — 1.0/1.0/1.0 = heuristic active |
| FREEDOM config for judge model | D-EXT-009 | `grep -rn "freedomConfig.*judge\|xiigen.judge_model" server/src/engine/` | freedom.get() at call time | 55% | `curl -H "X-Tenant-Id: xiigen-community" localhost:3000/api/engine/status \| jq .data.judgeModel` |
| Prompt evolver connected | M2 | `grep -n "PromptEvolver\|analyzeFailures\|evolvePrompt" server/src/engine/node-handlers/feedback.handler.ts` | analyzeFailures() called on score < 0.80 | 30% | `curl localhost:9200/xiigen-prompts/_count -d '{"query":{"term":{"version.keyword":"v2"}}}' \| jq .count` > 0 |
| RAG quality tracker wired | M2 | `grep -n "RagQualityTracker\|recordPatternUsage" server/src/engine/node-handlers/feedback.handler.ts` | recordPatternUsage() called after generation | 40% | SK-445 RAG patterns updated count |
| Arbiter specialization | M2, SK-442 | `grep -n "arbiterConfig\|evaluatorArbiters\|AI_DOMAIN_ARBITER" server/src/engine/node-handlers/score.handler.ts` | dispatch per arbiter role, isolated context | 15% | SK-445 ARBITER_VERDICT count |
| Escalation BLOCK semantics | SK-446 | `grep -n "BLOCK\|disposition\|verdict" server/src/engine/node-handlers/score.handler.ts` | BLOCK rejects without averaging | 5% | check any score that should BLOCK — does it pass? |

### TIER 3 — Design primitives (0–15%)

| Capability | Principle | Measurement | Score |
|-----------|-----------|------------|-------|
| NODE field in contracts | P14 | `grep -n "node:\|NodeRepresentation" server/src/engine/contracts/contract-schema.ts` | 0% |
| convergence.handler | P14 | `grep -rn "convergence.handler\|ConvergenceHandler" server/src/engine/` | 0% |
| DESIGN_REASONING capture | P15, SK-450 | `curl localhost:9200/xiigen-rag-patterns/_count -d '{"query":{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}}}' \| jq .count` ≥1 | 0% |
| Semantic RAG retrieval | Gap 2 | `grep -n "IRagService\|search(query" server/src/engine/node-handlers/rag-retrieve.handler.ts` | 10% |
| Typed context request protocol | Gap 5 | `grep -rn "CONTEXT_INSUFFICIENT\|DOWNSTREAM_CONTRACT" server/src/` | 0% |
| Key Principles Arbiter isolated | SK-444 | `grep -rn "key_principles\|AI_PRINCIPLES_ARBITER" server/src/` | 0% |

---

## HOW TO RUN A MEASUREMENT SESSION

```bash
# 1. Run all measurement commands from Tier 1–3 above
# 2. Record evidence citation for each row
# 3. Assign score from methodology scale
# 4. Run paired runtime check — flag any static/runtime discrepancy
# 5. Produce score table with confidence levels
# 6. Feed rows scoring < 70% into SK-466 for remediation session design
# 7. Feed learning loop rows into SK-467 for learning path audit
```

---

## INTEGRATION

```
Invoke at:    Start of any capability audit session
Produces:     Score table with evidence + paired runtime results
Feeds into:   planning--remediation-session-design-SKILL.md (SK-466) — gaps < 70%
              code-execution--learning-path-audit-SKILL.md (SK-467) — learning layer
References:   session-output--mission-progress-SKILL.md (SK-445) — paired runtime queries
Distinct from: planning--simulation-protocol-SKILL.md (SK-441) — forward scenario trace
```
