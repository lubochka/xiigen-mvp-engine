# PATCH: contract-template.md — Add node: field
## Applies to: reference--contract-template.md
## Version: v1.0.3 | Date: 2026-03-24
## Source: XIIGEN-SKILLS-GAP-DOCUMENT.md — EDIT 8

---

## HOW TO APPLY

Add the `node:` field to the EngineContract template after the `stackCoupling:` field.

---

## NEW FIELD: node

```typescript
// NODE — the stack-neutral verified representation of this capability.
// Built during planning phase convergence BEFORE the genesis prompt is written.
// The genesis prompt DERIVES FROM this node, not the other way around.
//
// Until convergence.handler infrastructure exists (Task 7 — pre-FLOW-01):
//   Populate manually during the planning session.
//   Capture as DESIGN_REASONING triples at Gate C.
node: {
  structure: {
    inputShape:   Record<string, unknown>;   // what this capability receives
    outputShape:  Record<string, unknown>;   // what this capability produces
    dependencies: string[];                  // taskTypeIds this depends on
    triggers:     string[];                  // events/conditions that start this
    emits:        string[];                  // events this produces
  };
  intent: {
    purpose:        string;       // ONE sentence, plain language, NO stack names
    invariants:     string[];     // always true about behavior (not implementation)
    failureModes:   string[];     // how it fails and what happens
    domainConcepts: string[];     // the abstract concepts this capability implements
  };
  // constraints = ironRules (already defined above — do not duplicate)
  // quality = qualityGates (already defined above — do not duplicate)
  convergenceHistory?: {
    rounds:                  number;
    contextRequestsEmitted:  string[];
    consensusReachedAt:      string;   // ISO timestamp
    verifiedBy:              string[]; // model roles that reached consensus
  };
}
```

---

## BRIDGE RULE: domainConcepts → stackCoupling

`node.intent.domainConcepts[]` is the bridge between the NODE and the stack profiles.

Each concept in `domainConcepts` SHOULD have a corresponding entry in
`stackCoupling[stack].neutralConcepts[]`.

If a concept appears in `domainConcepts` but not in any stack's `neutralConcepts`:
the stack profile is incomplete.

Example alignment:
```typescript
node.intent.domainConcepts: ["idempotency check", "rate limiting concept", "token generation"]

stackCoupling['php-wordpress'].neutralConcepts: ["token generation", "rate limiting concept", "SETNX idempotency"]
// "idempotency check" should also be in neutralConcepts — gap detected
```

---

## INCOMPATIBLE ABSTRACTION RULE

When any stack entry has `tier: 'INCOMPATIBLE'`, the contract MUST include:

```typescript
stackCoupling['php-example'] = {
  tier: 'INCOMPATIBLE',
  incompatibilityLevel: 'mechanism' | 'design',
  // mechanism → fabric interface planned (see fabricInterface field)
  // design → the concept itself cannot exist in this environment
  mitigation: string,    // what to do instead
  fabricInterface?: string, // if mechanism-level: name of IXxxService to introduce
}
```

Missing `incompatibilityLevel` = P14 violation (FC-25 will catch it).
