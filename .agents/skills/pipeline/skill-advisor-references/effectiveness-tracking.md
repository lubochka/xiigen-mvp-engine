# Effectiveness Tracking — AF-11

## What Is Tracked

```typescript
interface SkillEffectivenessRecord {
  skillKey: string;           // 'SK-PLAN' | 'SK-TEST' | 'SK-DNA' | 'SK-BFA' | 'SK-DOCS'
  taskType: string;           // 'T-516', 'T-321', etc.
  archetype: string;          // 'ORCHESTRATION' | 'DATA_PIPELINE' | 'AI_GENERATION' | etc.
  scoreDelta: number;         // quality score change: post - pre
  passedDNACheck: boolean;
  passedBFACheck: boolean;
  iteration: number;
  tenantId: string;           // scoped per tenant
  timestamp: string;          // ISO8601
}
```

## getSkillEffectiveness(skillKey: string): number

Returns the rolling average `scoreDelta` for the given skill key across all records for the current tenant.

Formula: `avg(scoreDelta) over last N=20 records for this skillKey + tenantId`

- Positive delta → skill injection improved output quality
- Negative delta → skill injection did not help (or judge rejected)
- Zero or near-zero → skill is being injected when not needed (review activation rules)

## How AF-4 Uses Effectiveness Data

The effectiveness score adjusts priority within each priority tier:
- If SK-DNA effectiveness is very high → prefer SK-DNA over SK-BFA when both are active
- If SK-PLAN effectiveness drops below 0 for an archetype → flag to Luba (may indicate activation rule needs review)

**Effectiveness data does NOT change activation rules.** It only adjusts priority within the allowed 3-block budget. Activation thresholds remain MACHINE constants until Luba approves a change.

## Multi-Tenant Isolation

Records are strictly scoped by `tenantId`. Tenant A's skill effectiveness does NOT influence Tenant B's selections:
- `getSkillEffectiveness('SK-DNA', tenantId)` — always pass tenantId
- Global averages are NOT computed (different tenants have different use cases)
- Records for tenant-A are invisible when processing tenant-B requests

## Storage Pattern

AF-11 stores effectiveness records using the RAG fabric (in-memory provider for tests):
```typescript
// Write
await ragService.storeDocument({
  collection: 'skill-effectiveness',
  id: `${tenantId}-${skillKey}-${timestamp}`,
  content: JSON.stringify(record),
  metadata: { tenantId, skillKey, archetype }
});

// Read (rolling average)
const records = await ragService.query({
  collection: 'skill-effectiveness',
  filter: { tenantId, skillKey },
  limit: 20,
  sort: 'desc'
});
```

This follows the RAG fabric pattern — same `storeDocument`/`query` interface regardless of which RAG provider is active.

## What AF-11 Does NOT Track

- Which specific model was used (that's FREEDOM config, not skill governance)
- Token count per block (out of scope for current implementation)
- Cross-tenant aggregate effectiveness (privacy + multi-tenancy principle)
