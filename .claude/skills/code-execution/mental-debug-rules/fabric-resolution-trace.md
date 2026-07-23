# Rule 13: Fabric Resolution Trace (NEW)

## What It Catches

The wrong provider is selected during fabric resolution, typically because `fabricType` string in the factory contract does not exactly match the key registered in the provider registry. Silent fallback to the in-memory provider occurs.

## The Problem

The XIIGen engine resolves a fabric provider by matching the `fabricType` field from the factory contract against the provider registry. Case sensitivity is exact. `"ELASTICSEARCH"` does NOT match `"elasticsearch"`. When no match is found, the engine silently falls back to the in-memory provider — no error, no warning. The call succeeds but produces wrong data (in-memory is empty or returns test fixtures).

## Resolution Chain

```
FactoryContract.factoryDependencies.fabricType
         ↓
FabricProviderRegistry.resolve(fabricType, tenantId)
         ↓ (exact string match)
  "elasticsearch" → ElasticsearchProvider
  "postgresql"    → PostgreSQLProvider
  "sqs"           → SqsQueueProvider
  "in-memory"     → InMemoryDatabaseProvider  ← SILENT FALLBACK if no match
         ↓
DataProcessResult<T>  (correct shape, wrong data)
```

## Checklist

```
☐ What is the EXACT fabricType string in the factory contract? (case-sensitive)
☐ What are the EXACT keys registered in FabricProviderRegistry?
☐ Do they match exactly? ("elasticsearch" vs "ELASTICSEARCH" vs "Elasticsearch")
☐ What provider is actually selected? (add log: registry.resolve(fabricType))
☐ Is the result shape correct but data wrong? → likely in-memory fallback
☐ Is this tenant configured for a specific provider? Check tenant-level config.
```

## Detection

```bash
# Find all fabricType usages in contracts
grep -rn "fabricType" server/src/engine-contracts/

# Find all provider registrations
grep -rn "register\|provide.*Provider" server/src/fabrics/

# Find the exact registry keys
grep -rn "\"elasticsearch\"\|\"postgresql\"\|\"sqs\"\|\"in-memory\"" server/src/fabrics/
```

## Trace Protocol

1. Read the factory contract — note exact `fabricType` value
2. Read the provider registry — note exact registered keys
3. Compare: are they identical (case, spelling, hyphenation)?
4. If mismatch found: fix the contract `fabricType` value (Class F bug) not the registry
5. If match correct: trace deeper — is the tenantId correct? Is the provider initialized?

## Common Mismatches

| Contract value | Registry key | Type |
|----------------|-------------|------|
| `"ELASTICSEARCH"` | `"elasticsearch"` | Case mismatch |
| `"elastic-search"` | `"elasticsearch"` | Hyphen vs no-hyphen |
| `"postgres"` | `"postgresql"` | Abbreviation mismatch |
| `"aws-sqs"` | `"sqs"` | Prefix mismatch |
| `"memory"` | `"in-memory"` | Naming convention |

## Bug Classification

Fabric type mismatch is a **Class F (Engine Contract)** bug — the wrong value in the contract — NOT a Class A (Fabric Provider) bug. Fix the contract, not the provider.

Exception: if the registry accepts multiple aliases (`"postgres"` and `"postgresql"` both valid), that is a Class A improvement but must not be done unilaterally — it changes provider-matching semantics for all tenants.

## Anti-Pattern

"The code returns valid data so the provider must be correct." In-memory provider returns valid-shaped data. Always verify which provider is actually selected, not just whether the shape is correct.
