# Merge Protocol — Adding Flows to Canonical Documents

When a new flow is complete and validated, it must be merged into the 7 canonical documents.

## The 7 Canonical Documents

| Document | What to Add |
|----------|-------------|
| ENGINE_ARCHITECTURE_MERGED.md | Factory ranges, family ranges, flow entry in registry, fabric resolution table |
| TASK_TYPES_CATALOG_MERGED.md | Full engine contracts for all new task types |
| SKILLS_FACTORY_RAG_MERGED.md | New skill patterns extracted from the flow |
| V62_BFA_STRESS_TEST_MERGED.md | New BFA rules, stress tests for conflict scenarios |
| UNIFIED_SOURCE_INDEX_MERGED.md | Cross-reference entries for all new artifacts |
| MASTER_EXECUTION_PLAN_MERGED.md | Execution plan for the new flow |
| SESSION_STATE_MERGE.md | Session entry marking the merge |

## Merge Steps

### Step 1: Update Master Index

In ENGINE_ARCHITECTURE_MERGED.md, update the System State table:

```markdown
| Artifact | Count | Range |
|----------|-------|-------|
| Factories | [OLD+NEW] | F1–F[NEW_MAX] ([NEW_FAMILIES] families) |
| Task Types | [OLD+NEW] | T1–T[NEW_MAX] |
...
```

Update Next Available Numbers section.

### Step 2: Add Flow to Registry

Add the new flow row to the Complete Flow Registry table:

```markdown
| FLOW-32 | [Domain] | F[START]-F[END] | T[START]-T[END] | [FAMILIES] |
```

### Step 3: Merge Task Types

Append full engine contracts to TASK_TYPES_CATALOG_MERGED.md. Use the exact format from contract-template.md.

### Step 4: Merge BFA Rules

In V62_BFA_STRESS_TEST_MERGED.md:
- Add new conflict rules (CF-715+)
- Add stress tests verifying no conflicts with existing flows
- Test each entity, event, and route against all 31+ existing flows

### Step 5: Cross-Reference Index

In UNIFIED_SOURCE_INDEX_MERGED.md, add entries for:
- Each new factory (factoryId → flow, family, fabric, interface)
- Each new task type (taskTypeId → flow, archetype, factories)
- Each new BFA rule (ruleId → type, flows involved)

### Step 6: Validation Checklist

After merge, verify:

- [ ] All old artifact numbers unchanged
- [ ] New artifact numbers are contiguous (no gaps)
- [ ] Next Available Numbers updated correctly
- [ ] Flow registry row complete
- [ ] All task types in full format (no stubs)
- [ ] BFA stress tests pass for all 32+ flows
- [ ] Cross-reference index complete

---

## Numbering Integrity Rules

- **Never reuse** an artifact number
- **Never modify** an existing artifact's content (add new, don't edit old)
- **Contiguous ranges** within a flow (F1339-F1345, not F1339, F1341, F1343)
- **Family boundaries** align with factory ranges
- If merging a flow authored at an older baseline (e.g., has F-numbers that collide), build a renumbering engine first:
  - Calculate offsets per artifact type
  - Apply offsets to all references
  - Validate no collisions after renumbering

---

## Common Merge Failures

1. **Stale RAG index** — flow was designed against old artifact numbers. Fix: rebuild RAG index after merge.
2. **Number collision** — two flows authored in parallel used same F-numbers. Fix: renumber the later flow.
3. **Competing plan documents** — multiple documents claim to be authoritative. Fix: one canonical document per concern.
4. **Missing backward compat check** — old flows broken by new merge. Fix: run full validation suite after every merge.
