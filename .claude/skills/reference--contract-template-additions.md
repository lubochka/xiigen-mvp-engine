---
name: contract-template-additions
version: "2.0.0"
updated: "2026-03-26"
applies_to: reference--contract-template.md
source: "XIIGEN-SKILLS-GAP-DOCUMENT EDIT 8 + Skills Overhaul S2/S6"
description: >
  Two additions to the EngineContract template: (1) the node: field for
  stack-neutral NODE representation built during convergence, and (2) the
  arbiterConfig field for P17/P20 arbiter panel configuration. Both are
  required for every topology that uses convergence or multi-generate handlers.
---

# Contract Template Additions — node + arbiterConfig

## ADDITION 1: node field (add after stackCoupling)

```typescript
// NODE — stack-neutral verified representation of this capability.
// Built during planning phase convergence BEFORE genesis prompt.
// Genesis prompt DERIVES FROM this node, not the other way around.
node: {
  structure: {
    inputShape:   Record<string, unknown>;
    outputShape:  Record<string, unknown>;
    dependencies: string[];    // taskTypeIds this depends on
    triggers:     string[];    // events/conditions that start this
    emits:        string[];    // events this produces
  };
  intent: {
    purpose:        string;       // ONE sentence, plain language, NO stack names
    invariants:     string[];     // always true about behavior (not implementation)
    failureModes:   string[];     // how it fails and what happens
    domainConcepts: string[];     // abstract concepts → bridge to stackCoupling
  };
  convergenceHistory?: {
    rounds:                  number;
    contextRequestsEmitted:  string[];
    consensusReachedAt:      string;
    verifiedBy:              string[];
  };
}
```

**Bridge rule:** Each `domainConcepts[]` entry SHOULD have a corresponding entry
in `stackCoupling[stack].neutralConcepts[]`. Missing = incomplete stack profile.

**INCOMPATIBLE abstraction:** When any stack has `tier: 'INCOMPATIBLE'`, include
`incompatibilityLevel: 'mechanism' | 'design'` and `mitigation`. Missing = P14 violation.

---

## ADDITION 2: arbiterConfig (add after qualityGates)

```typescript
// ARBITER CONFIG — required for every topology using multi-generate.handler
// or arbiter-panel.handler (P17/P20)
//
// Minimum arbiters by archetype:
//   ROUTING:       business_logic, key_principles, iron_rules
//   DATA_PIPELINE: business_logic, security, key_principles, iron_rules
//   VALIDATION:    business_logic, key_principles, iron_rules, completeness
//   TRANSACTION:   all 7 arbiters
//   ORCHESTRATION: all 7 arbiters
//   SCHEDULED:     business_logic, security, key_principles, iron_rules, completeness
arbiterConfig: {
  evaluatorArbiters: {
    business_logic:      { modelToken: string; expertise: string; blind: true; };
    security?:           { modelToken: string; expertise: string; blind: true; };
    skills_patterns?:    { modelToken: string; expertise: string; blind: true; };
    prompts_compliance?: { modelToken: string; expertise: string; blind: true; };
    key_principles: {
      modelToken: string;
      expertise: "M1-M5 + P1-P22 + DNA-1..9 full text — isolated";
      blind: true;
      isolated: true;    // REQUIRED — P20: no domain context
    };
    iron_rules:          { modelToken: string; expertise: string; blind: true; };
    completeness?:       { modelToken: string; expertise: string; blind: true; };
  };
  blockSemantics: "ANY_BLOCK_CLASS_REJECTS";  // REQUIRED — never MAJORITY
  escalationGate: {
    maxCycles:     number;
    onMaxCycles:   "HUMAN_JUDGMENT_REQUIRED" | "BLOCK";
    onConsensus:   "ACCEPT";
    onSingleBlock: "RETRY_WITH_CONTEXT" | "BLOCK";
  };
  upperJudge?: {
    modelToken: string;
    activateWhen: "TWO_OR_MORE_ARBITERS_DISAGREE";
  };
};
```

---

## VALIDATION RULES (enforced by FC-26)

1. Every topology using `multi-generate.handler` or `arbiter-panel.handler` MUST have `arbiterConfig`
2. `key_principles` arbiter MUST have `isolated: true`
3. `blockSemantics` MUST be `"ANY_BLOCK_CLASS_REJECTS"`
4. Minimum arbiters for the contract's archetype (see table above)

## ANTI-PATTERNS

❌ arbiterConfig absent from multi-generate topology → FC-26 BUILD_FAILURE
❌ blockSemantics: "MAJORITY_WINS" → P17 violation (BLOCK can be averaged away)
❌ key_principles.isolated missing → P20 violation (arbiter receives domain context)
❌ Same model token for all arbiters → no genuine evaluation diversity
