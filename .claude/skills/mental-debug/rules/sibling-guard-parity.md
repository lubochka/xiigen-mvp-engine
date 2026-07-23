# Rule 9: Sibling Guard Parity

## What It Catches

A guard that exists in one AF station or fabric provider but is missing in its sibling — the sibling processes the same task type, event, or output, but without the protection. Creates a coverage gap where the bug only appears in the path through the unguarded sibling.

## The Problem

XIIGen has sibling stations: stations that process logically equivalent inputs but at different points in the pipeline. If a DNA compliance check, quality gate, or tenant isolation guard is added to one sibling and not the other, the bug manifests only when execution routes through the unguarded path.

## Known XIIGen Sibling Pairs

| Station A | Station B | What They Share |
|-----------|-----------|-----------------|
| `af1-genesis.ts` | `af11-feedback.ts` | Both process task output — guards on output shape must exist in BOTH |
| `af4-rag-context.ts` | `af7-rag-update.ts` | Both access the RAG fabric — tenant isolation required in BOTH |
| `ElasticsearchProvider` | `InMemoryDatabaseProvider` | Both implement `IDatabaseFabric` — same contract, same guards |
| `SqsQueueProvider` | `InMemoryQueueProvider` | Both implement `IQueueFabric` — dedup ID required in BOTH |

## Checklist

```
☐ If a guard is added to AF-1, is the same guard present in AF-11?
☐ If DNA-3 is checked in af1-genesis.ts, is it also checked in af11-feedback.ts?
☐ If tenant isolation is enforced in ElasticsearchProvider, is it in InMemoryDatabaseProvider?
☐ If dedup ID is required in SqsQueueProvider, is it also enforced in InMemoryQueueProvider?
☐ For any new guard added: grep for ALL sibling implementations and check each one.
```

## Detection Command

```bash
# Find all implementations of a shared interface
grep -r "implements IDatabaseFabric" server/src/
grep -r "implements IQueueFabric" server/src/

# Find all AF stations and check for a specific guard
grep -rn "dna_check\|dnaCompliance\|tenantId" server/src/af-stations/

# After adding a guard to one station, find its sibling:
grep -rn "taskType === 'SAME_TYPE'" server/src/af-stations/
```

## Trace Protocol

1. Identify the guard just added or suspected missing
2. Find the station/provider where it exists
3. Identify all sibling stations/providers that share the same interface or task type
4. Grep for the guard in each sibling
5. If absent in any sibling: add and test

## Example — DNA-3 Sibling Gap

```
Guard added: af1-genesis.ts — checks DNA-3 (no business logic in throw statements)
                                     before generating service code

Gap created: af11-feedback.ts — also generates updated service code during feedback loop
                                  but DNA-3 check was NOT added

Result: feedback-path generated code can contain DNA-3 violations that genesis-path cannot
```

## Anti-Pattern

"I added the guard to the main station — the sibling uses the same logic." Siblings often diverge over time. Verify by reading the sibling code directly, not by assumption.
