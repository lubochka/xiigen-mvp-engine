# PATCH: reference--contract-template.md — Add arbiterConfig field
## Applies to: reference--contract-template.md
## Version: v2.0.0 | Date: 2026-03-25
## Source: XIIGen Skills Overhaul S2/S6 — P17/P20 arbiter panel requirement

---

## HOW TO APPLY

### Pre-flight
```bash
□ Verify target file exists:
  find .claude/skills/reference -name "contract-template*" | head -1
□ Verify SK-442 (arbiter-panel-design) is installed:
  find .claude/skills -name "planning--arbiter-panel-design*" | head -1
```

### Change 1 — Add arbiterConfig field after qualityGates in EngineContract

Add the following after the `qualityGates:` field in `reference--contract-template.md`:

```typescript
// ARBITER CONFIG — required for every topology using multi-generate.handler
// or arbiter-panel.handler (P17/P20 — see planning--arbiter-panel-design-SKILL.md SK-442)
//
// Minimum arbiters by archetype:
//   ROUTING:       business_logic, key_principles, iron_rules
//   DATA_PIPELINE: business_logic, security, key_principles, iron_rules
//   VALIDATION:    business_logic, key_principles, iron_rules, completeness
//   TRANSACTION:   all 7 arbiters
//   ORCHESTRATION: all 7 arbiters
//   SCHEDULED:     business_logic, security, key_principles, iron_rules, completeness
//
// key_principles MUST have: isolated: true (P20)
// blockSemantics MUST be: ANY_BLOCK_CLASS_REJECTS (never averaged)
arbiterConfig: {
  evaluatorArbiters: {
    business_logic:     { modelToken: string; expertise: string; blind: true; };
    security?:          { modelToken: string; expertise: string; blind: true; };
    skills_patterns?:   { modelToken: string; expertise: string; blind: true; };
    prompts_compliance?: { modelToken: string; expertise: string; blind: true; };
    key_principles: {
      modelToken: string;
      expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated";
      blind: true;
      isolated: true;    // REQUIRED — no domain context in context package
    };
    iron_rules:         { modelToken: string; expertise: string; blind: true; };
    completeness?:      { modelToken: string; expertise: string; blind: true; };
  };
  blockSemantics: "ANY_BLOCK_CLASS_REJECTS";  // REQUIRED — never change to MAJORITY
  escalationGate: {
    maxCycles:       number;   // typically 3
    onMaxCycles:     "HUMAN_JUDGMENT_REQUIRED" | "BLOCK";
    onConsensus:     "ACCEPT";
    onSingleBlock:   "RETRY_WITH_CONTEXT" | "BLOCK";
  };
  upperJudge?: {
    modelToken: string;
    activateWhen: "TWO_OR_MORE_ARBITERS_DISAGREE";
  };
};
```

### Change 2 — Add arbiterConfig to example contract instance

In the example `EngineContract` instance in the template, add after `qualityGates`:

```typescript
arbiterConfig: {
  evaluatorArbiters: {
    business_logic: {
      modelToken: "AI_BUSINESS_ARBITER",
      expertise: "Domain-specific business rules and edge cases for this flow",
      blind: true,
    },
    key_principles: {
      modelToken: "AI_PRINCIPLES_ARBITER",
      expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated",
      blind: true,
      isolated: true,
    },
    iron_rules: {
      modelToken: "AI_IRON_RULES_ARBITER",
      expertise: "DNA-1..9 enforcement — no SETNX, idempotency, store-before-emit",
      blind: true,
    },
  },
  blockSemantics: "ANY_BLOCK_CLASS_REJECTS",
  escalationGate: {
    maxCycles: 3,
    onMaxCycles: "HUMAN_JUDGMENT_REQUIRED",
    onConsensus: "ACCEPT",
    onSingleBlock: "RETRY_WITH_CONTEXT",
  },
},
```

### Post-flight
```bash
□ npx tsc --noEmit → 0 new errors in contract files
□ grep -n "arbiterConfig" .claude/skills/reference/reference--contract-template.md
  # Expected: ≥ 2 hits (type definition + example instance)
□ grep -n "ANY_BLOCK_CLASS_REJECTS" .claude/skills/reference/reference--contract-template.md
  # Expected: ≥ 1 hit (never averaged)
□ grep -n "isolated: true" .claude/skills/reference/reference--contract-template.md
  # Expected: ≥ 1 hit (key_principles arbiter)
□ FC-26 check — run against any topology that already has arbiterConfig:
  python3 .claude/scripts/fc26-check.py
  # Expected: 0 violations
```

---

## VALIDATION RULES (enforced by FC-26 in plan-review-SKILL.md)

1. Every topology using `multi-generate.handler` or `arbiter-panel.handler` MUST have `arbiterConfig` in its contract
2. `key_principles` arbiter MUST have `isolated: true` — no other arbiter has this
3. `blockSemantics` MUST be `"ANY_BLOCK_CLASS_REJECTS"` — any other value is a P17 violation
4. Minimum arbiters for the contract's archetype (see table in comment above)

---

## ANTI-PATTERNS

```
❌ arbiterConfig absent from multi-generate.handler topology
   → FC-26 BUILD_FAILURE at Gate A

❌ blockSemantics: "MAJORITY_WINS" or absent
   → P17 violation — BLOCK verdicts can be averaged away
   → A principle violation with high scores from other arbiters is still a violation

❌ key_principles.isolated missing or false
   → P20 violation — principles arbiter receives domain context
   → May be biased toward domain-specific acceptable violations

❌ Same model token for all arbiters
   → No genuine diversity of evaluation
   → Defeats the purpose of the panel — single-judge with extra steps
```
