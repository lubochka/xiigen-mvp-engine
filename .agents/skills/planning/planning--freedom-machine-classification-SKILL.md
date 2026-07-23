---
name: freedom-machine-classification
sk_number: SK-451
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before writing any value into code or config, classify it: MACHINE (must be
  hardcoded, invariant) or FREEDOM (configurable per tenant). The classification
  test: does a tenant changing this value change what the system guarantees?
  Yes → MACHINE. No → FREEDOM. MACHINE constants that appear configurable are the
  most dangerous class: they silently become FREEDOM territory, breaking guarantees
  without a compile error. This skill eliminates recurring FC-31 violations.
triggers:
  - "is this MACHINE or FREEDOM"
  - "should this be configurable"
  - "hardcode or config"
  - "FREEDOM config key"
  - "machine constant"
  - "FC-31"
  - "can tenants change this"
  - "scoring threshold"
  - "model name"
  - "timeout value"
  - "classify this value"
---

# FREEDOM vs MACHINE Classification Skill (SK-451) v1.0

## WHEN TO INVOKE

Before writing any value into code, a contract, a schema, or a config key.
Before determining whether a value needs a FREEDOM config key.
When FC-31 check returns hits (model names or endpoints hardcoded).

---

## THE CLASSIFICATION TEST

One question:

> **Does a tenant changing this value change what the system guarantees?**

```
YES → MACHINE. The value enforces a system invariant.
      Hardcode it. Test for its presence. Never put it in FREEDOM config.
      Tenants cannot override MACHINE constants — doing so would break guarantees.

NO  → FREEDOM. The value is a configurable parameter.
      Put it in FREEDOM config with a safe default.
      Tenants may override it within the declared bounds.
```

---

## FIVE CANONICAL MACHINE VALUES

These are always MACHINE regardless of how they look:

| Value | Why MACHINE |
|-------|-------------|
| DNA pattern enforcement (outbox before queue) | Violating this breaks partial failure recovery for ALL tenants |
| Minimum arbiter panel size per archetype | Safety guarantee — ROUTING must have at least 3 arbiters |
| Score threshold for AF-9 PASS gate | System integrity — lowering this lets bad code through the quality gate |
| Idempotency key format | Data integrity — changing format invalidates all existing idempotency records |
| Cross-flow event schema version pinning | Contract integrity — changing breaks downstream consumers |

---

## FIVE CANONICAL FREEDOM VALUES

These are always FREEDOM regardless of how they look:

| Value | Why FREEDOM |
|-------|-------------|
| AI model selection (judge model, generator model) | Different tenants may have different API keys and cost constraints |
| Rate limiting windows and counts | Business policy — different tenants have different traffic patterns |
| Onboarding step list | Product variation — different tenant deployments require different onboarding |
| Resend rate limit minutes | UX policy — acceptable wait time varies by tenant context |
| OSS target model family | Learning infrastructure — different deployments optimize for different models |

---

## THE BORDERLINE CASES

### Thresholds that enforce invariants vs thresholds that configure behavior

```
MACHINE: AF-9 score threshold for "PASS" verdict
  → Lowering this allows code with DNA violations to pass
  → System guarantee changes: code quality is no longer enforced at N
  → Must be hardcoded. AF_PASS_THRESHOLD = 0.85 in code.

FREEDOM: Resend rate limit window
  → Changing from 15min to 30min changes user experience, not system integrity
  → Both values enforce the "rate-limit resend" rule (which is MACHINE)
  → The specific window is FREEDOM: flow01_resend_rate_limit_minutes
```

The split: the RULE is MACHINE, the PARAMETERS of the rule may be FREEDOM.

### Model names (the FC-31 case)

Model names are ALWAYS FREEDOM. Never hardcode them.

```typescript
// WRONG (FC-31 violation):
const result = await this.judgeProvider.generate(prompt, { model: 'claude-sonnet-4-6' });

// RIGHT:
const judgeModel = await this.freedom.getConfig(tenantId, XIIGEN_FREEDOM_KEYS.JUDGE_MODEL);
const result = await this.judgeProvider.generate(prompt, {
  ...(judgeModel.data?.value ? { model: judgeModel.data.value } : {}),
});
```

Why: different tenants have different API access, different cost budgets, and the
OSS model switch (REPLACE layer of M3) requires changing the model without code deployment.

### Arbiter minimum panel size

```
MACHINE: The MINIMUM panel size per archetype
  → An ORCHESTRATION capability with fewer than 7 arbiters has weaker safety guarantees
  → This minimum cannot be tenant-configurable

FREEDOM: Whether optional arbiters beyond the minimum are included
  → A tenant might add a domain-specific arbiter for their specialized domain
  → The additional arbiter is FREEDOM; the minimum panel is MACHINE
```

---

## THE ANNOTATION FORMAT

In code, annotate the classification explicitly:

```typescript
// MACHINE: AF pass threshold — do not make configurable (system integrity)
const AF_PASS_THRESHOLD = 0.85;

// FREEDOM: judge model — read from config, never hardcode (D-EXT-009)
const judgeModel = await this.freedom.getConfig(tenantId, XIIGEN_FREEDOM_KEYS.JUDGE_MODEL);
```

In contracts and schemas:

```typescript
// In ironRules (neutral):
'CF-3: ResendVerificationRequested MUST be rate-limited per tenant  [MACHINE: rule]',
'Rate limit window from FREEDOM config: flow01_resend_rate_limit_minutes [FREEDOM: value]',
```

In HybridGenesisPrompt neutralIronRules:

```typescript
'FREEDOM: Read sso_providers_enabled from FREEDOM config — never hardcode',
```

---

## FREEDOM CONFIG KEY FORMAT

Every FREEDOM value needs:
1. A key in `XIIGEN_FREEDOM_KEYS` constant (snake_case, prefixed with domain)
2. A safe default in `XIIGEN_FREEDOM_DEFAULTS`
3. A reference in code via `FreedomConfigManager.getConfig()`

```typescript
// In freedom/config-schema.ts:
export const XIIGEN_FREEDOM_KEYS = {
  // ... existing keys ...
  JUDGE_MODEL:        'xiigen.judge_model',         // D-EXT-009
  OSS_TARGET_MODEL:   'xiigen.oss_target_model',
  RESEND_RATE_LIMIT:  'xiigen.flow01_resend_rate_limit_minutes',
  // Pattern: {domain}.{descriptive_name}
};

export const XIIGEN_FREEDOM_DEFAULTS = {
  [XIIGEN_FREEDOM_KEYS.JUDGE_MODEL]:       'FREEDOM_MODEL_HINT',
  [XIIGEN_FREEDOM_KEYS.OSS_TARGET_MODEL]:  'FREEDOM_MODEL_HINT',
  [XIIGEN_FREEDOM_KEYS.RESEND_RATE_LIMIT]: 15,
};
```

`FREEDOM_MODEL_HINT` as a default signals: no specific model mandated; the AI provider
uses its configured default. Any non-null string that is not a real model name prevents
unintentional model selection while satisfying the type requirement.

---

## FC-31 PREVENTION

FC-31 fires when model names or endpoints are hardcoded. Running FC-31 periodically:

```bash
grep -rn "deepseek\|gpt-4\|claude-opus\|claude-sonnet\|gemini-pro\|api\.anthropic\.com\|openai\.com" \
  server/src/engine-contracts/ server/src/engine/ \
  --include="*.ts" \
  | grep -v "FREEDOM config\|FREEDOM_MODEL_HINT\|MODEL_HINT_FROM_FREEDOM\|xiigen\.\|default:\|# Check\|freedomConfig\.get\|// " \
  | grep -v ".spec."
# Expected: 0 hits
```

Every hit is a MACHINE/FREEDOM classification error where a FREEDOM value was hardcoded.

---

## ANTI-PATTERNS

```
❌ "It's just a default, we can change it later"
   → Defaults become dependencies. If it's a FREEDOM value, it needs a config key now.
   → Changing a hardcoded value later requires a code deployment + session files + reviews.

❌ "The threshold is internal, no tenant will ever care"
   → That's the definition of MACHINE territory — test it explicitly.
   → If a tenant COULD change it and it would be safe → FREEDOM config key now.
   → If changing it would break guarantees → MACHINE, document why it's fixed.

❌ Using the same threshold value everywhere without annotation
   → 0.85 appears in 12 places. Is it always the same invariant?
   → AF_PASS_THRESHOLD (MACHINE) vs resend_deduplication_confidence (FREEDOM)
   → Both might happen to be 0.85 but for completely different reasons.

❌ Putting model names in arbiterConfig templates
   → arbiterConfig.generators: ['AI_ENGINE', 'AI_OPENAI_PROVIDER'] — correct (token names)
   → arbiterConfig.generators: ['claude-sonnet-4-6', 'gpt-4o'] — wrong (literal names, FC-31)
   → Token names refer to registered providers; literal names are hardcoded FREEDOM values.
```

---

## WHAT THIS SKILL PREVENTS

- FC-31 violations: model names hardcoded in contract files (256 occurrences cleaned in Group C)
- System guarantees silently relaxed when MACHINE values are moved to config
- Group C sessions (FC-31 cleanup) being needed at all — classify correctly the first time
- FREEDOM config keys added reactively rather than designed proactively
