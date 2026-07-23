---
name: iron-rule-derivation
sk_number: SK-449
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Iron rules are derived from domain analysis, not invented or copied from templates.
  Every iron rule starts from a failure mode: what can go wrong silently?
  What invariant prevents it? Express that invariant as a CF-N constraint with a
  verifiable failure consequence. Rules derived this way are specific and testable.
  Rules copied from templates are vague and fail to guard the right failure modes.
triggers:
  - "what are the iron rules for"
  - "derive iron rules"
  - "what must always be true"
  - "CF rules for this domain"
  - "what invariants does this service need"
  - "write iron rules"
  - "iron rule for"
  - "what can go wrong"
  - "before writing genesis prompt"
---

# Iron Rule Derivation Skill (SK-449) v1.0

## WHEN TO INVOKE

Before writing any genesis prompt. After the NODE's `intent.failureModes[]` is populated.
Iron rules are derived from failure modes — they cannot be derived before failure modes exist.

If a genesis prompt is written without derived iron rules, the AF-9 judge evaluates
the generated code against rules that may not match the actual domain. DPO triples
from those evaluations carry incorrect quality signals.

---

## THE DERIVATION SEQUENCE

For each capability, apply this sequence exactly:

### Step 1: List failure modes

Start from the NODE's `intent.failureModes[]`. Add any not already listed:

```
Questions to ask:
  - What happens if this operation runs twice? (idempotency)
  - What if storage succeeds but the event doesn't fire? (outbox)
  - What if a token is replaced without revoking the old one? (lifecycle race)
  - What if a tenant change mutates data another tenant depends on? (isolation)
  - What if config changes at runtime break the invariant? (MACHINE vs FREEDOM)
  - What if the operation completes but the caller never finds out? (observability)
  - What if two users request the same resource simultaneously? (concurrency)
```

Write each failure mode as a sentence: "User registers twice with the same email,
creating duplicate records."

### Step 2: For each failure mode, find the invariant

Ask: "What condition, if always true, would prevent this failure?"

```
Failure:    Duplicate registration creates two user records
Invariant:  Email uniqueness must be verified before any user record is created
```

The invariant is not implementation-specific. No TypeScript, no SQL, no framework names.
It describes what must be true, not how to make it true.

### Step 3: Express as a CF-N constraint

Format:
```
CF-N: [subject] MUST [verb] [condition] — [failure consequence if violated]
```

Examples:
```
CF-1: Email uniqueness MUST be verified BEFORE user record creation
      — violation produces duplicate user records
CF-5: Existing token MUST be revoked before replacement token is issued
      — violation allows two valid tokens for the same user simultaneously
CF-8: No PII in emitted events — userId reference only, never email or credentials
      — violation exposes PII to any consumer of the event, including cross-tenant
```

The consequence clause is mandatory. A rule without a failure consequence cannot be
evaluated — the judge cannot determine if the rule is violated by looking at the code.

### Step 4: Classify as MACHINE or FREEDOM

Apply the MACHINE/FREEDOM classification test: does a tenant changing this value change what the system guarantees?

```
MACHINE: the invariant must always hold, tenant config cannot relax it
         → hardcode in code, test for presence, never in FREEDOM config
         Example: "storeDocument before enqueue" — cannot be tenant-configurable
                  because partial failure recovery requires the outbox pattern

FREEDOM: the mechanism that enforces the invariant is configurable
         → FREEDOM config key with safe default, per-tenant override allowed
         Example: resend rate limit minutes — the rule "rate-limit resend" is MACHINE,
                  but the specific limit (15 min vs 30 min) is FREEDOM
```

Annotate each rule:
```
CF-3: ResendVerificationRequested MUST be rate-limited per tenant              [MACHINE: rule]
      Rate limit window from FREEDOM config: flow01_resend_rate_limit_minutes  [FREEDOM: value]
```

---

## MVP STACK NOTES — FREEDOM ACCESS AND BEHAVIORAL ASSERTIONS

**FREEDOM values are read through the injected service, never raw config or env.**
In this MVP the subjects are NestJS services/providers. A FREEDOM-classed value (Step 4)
is read via `IFreedomConfigService.get(key)` — injected as a fabric interface — and never
through the raw Nest `ConfigService`, `process.env`, or a hardcoded inline literal. AF-station
guidance already encodes this (`server/src/af-stations/af2-planning.ts`: "read all config keys
via IFreedomConfigService.get() — never hardcode TTL/rate-limit/quota inline"; helper
`server/src/af-stations/helpers/freedom-gate.helper.ts`).

```
WRONG (MACHINE constant or FREEDOM value hardcoded / from raw config):
  const ttl = this.config.get('qrTokenTtl', 60);      // raw ConfigService
  const limit = 15;                                    // inline literal
CORRECT (FREEDOM value through the fabric interface):
  const limit = await this.freedom.get('flow01_resend_rate_limit_minutes');
```

**Each iron rule produces a Jest behavioral test — not a stub.** The test asserts the
domain outcome and tenant isolation, not merely `result.success`. This binds iron rules to
the already-accepted behavioral-assertion gate (`test-integrity` FM-6 / Rule 6 D2-F1): a
`result.success`-only assertion or an empty stub test is a failure class, so an iron rule
whose only "test" is a stub does not satisfy FC-9.

```ts
it('rejects duplicate registration for the same tenant (CF-1)', async () => {
  await service.register({ email: 'a@x.io', tenantId: 'T1' });
  const second = await service.register({ email: 'a@x.io', tenantId: 'T1' });
  expect(second.success).toBe(false);
  expect(second.errorCode).toBe('DUPLICATE_EMAIL');   // domain outcome, not just success flag
});
```

---

## THE QUALITY TEST

A well-derived iron rule passes all four quality checks:

```
□ Can this rule be violated without the system throwing an error?
  If YES → the rule is important (silent violations are the dangerous ones)
  If NO  → it's already enforced structurally; doesn't need an iron rule

□ Is the rule expressed without stack or framework names?
  If NO  → rewrite: "storeDocument before enqueue" not "await db.save() before queue.add()"
  The rule must be readable by a WordPress developer, a Laravel developer, any stack

□ Does the rule have a testable failure consequence?
  If NO  → add the consequence: what breaks if the rule is violated?
  Without the consequence, AF-9 cannot verify compliance

□ Does the rule derive from a specific failure mode, not from a template?
  If NO  → trace it back: which failure does this prevent? If you can't answer, the rule
           may not apply to this domain
```

---

## RULES THAT COME FROM DNA PATTERNS

Nine DNA patterns apply universally. Do not repeat them as per-capability iron rules.
Reference them instead:

```
DNA-8 applies: storeDocument BEFORE enqueue on every state transition
→ Write in neutralIronRules: "DNA-8: [event name] storeDocument BEFORE enqueue"
→ Do NOT write a new CF-N rule for this — it's already enforced by the DNA validator
```

Domain-specific rules are the ones that require derivation. Universal rules are DNA.

The five DNA patterns most likely to need a domain-specific expression:
- DNA-3 (no throws): what specific error cases must return DataProcessResult.failure() in this domain?
- DNA-5 (tenantId on every DB call): what specific queries risk missing tenant scope here?
- DNA-8 (outbox): which specific events in this domain must have a matching storeDocument?
- DNA-7 (idempotency keys): what is the idempotency key format for this specific operation?
- DNA-1 (dict-only payloads): what typed objects might be introduced in this domain?

---

## EXAMPLE DERIVATION — FLOW-01 T47 (UserRegistrationInitiator)

**Failure modes identified:**
1. Registration runs twice → duplicate user records
2. Auth attempt retried with same inputs → duplicate processing
3. No PII in events not enforced → email address in event payload
4. SSO library imported directly → not testable, not swappable
5. FREEDOM config values hardcoded → cannot be tenant-customized

**Derivation:**

| Failure mode | Invariant | CF rule | Class |
|---|---|---|---|
| Duplicate registration | Email uniqueness before write | CF-1: Email uniqueness MUST be verified BEFORE user record creation | MACHINE |
| Duplicate processing | Idempotency key deduplicates | CF-2: Idempotency key "auth_attempt:{userId}:{correlationId}" MUST be checked before any write | MACHINE |
| PII in events | Events carry only references | CF-8: Emitted events MUST NOT contain PII — userId reference only | MACHINE |
| SSO lib direct import | Provider via fabric interface | Rule 1: SSO token validation MUST use ISSOAuthProvider — never import OAuth library directly | MACHINE |
| Config values hardcoded | Config via FREEDOM | FREEDOM: sso_providers_enabled and password_min_length MUST come from FREEDOM config | MACHINE: rule, FREEDOM: values |

**Result — 5 iron rules derived from 5 distinct failure modes.**
None copied from a template. Each traces to a specific failure consequence.

---

## ANTI-PATTERNS

```
❌ "Must handle errors correctly"
   → Not a rule. What specific error? What specific handling?
   → Correct: "MUST return DataProcessResult.failure('DUPLICATE_EMAIL') on email conflict"

❌ Copying iron rules from FLOW-01 for FLOW-02 without re-deriving
   → FLOW-02 has different failure modes. Rules that apply to auth may not apply to matching.
   → Run the derivation sequence for each capability. Similar rules may emerge — that's fine.
   → But they must trace to FLOW-02's failure modes, not be borrowed from FLOW-01.

❌ Listing DNA patterns as iron rules
   → DNA-8 is universal. Writing "storeDocument before enqueue" as CF-7 for this capability
     is noise. Reference DNA-8 in neutralIronRules instead.

❌ Iron rules with no failure consequence
   → "Token must be managed correctly" passes no gate and cannot be evaluated by AF-9.
   → Every rule must say what breaks if violated.

❌ Stack-specific rules in neutralIronRules
   → "Must use bcrypt for password hashing" is a NestJS/npm rule.
   → Correct neutral version: "Password storage MUST use a slow hash — PBKDF2 or equivalent"
   → The specific library goes in stackGenerationFrames, not neutralIronRules.
```

---

## INTEGRATION

```
Invoke after:  NODE intent.failureModes[] is populated
Invoke before: genesis prompt is written
Produces:      contract.ironRules[] + contract.neutralIronRules[] (for HybridGenesisPrompt)
Feeds into:    AF-9 judge evaluation (iron_rules evaluator)
               DPO triple quality (incorrect rules → corrupted training signal)
               FC-9 plan-review check (iron rules present)
References:    planning--freedom-machine-classification-SKILL.md — Step 4 classification
               code-execution--node-convergence-SKILL.md — NODE intent.failureModes source
               planning--node-design-review-SKILL.md — constraint integrity check
```
