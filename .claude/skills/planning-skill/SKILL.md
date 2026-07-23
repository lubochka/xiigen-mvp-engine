---
name: planning-skill
version: "1.0.0"
sk_number: SK-408
priority: MANDATORY
load_order: 6
---

# Planning Skill — 8-Gate Pre-Code Validation

Run all 8 gates in order before writing any code. A plan that fails any gate does not proceed. Record gate results in STATE-Pn.json.

## The Rule

No code is written without a plan that passes all 8 gates AND receives Luba's written approval.

## When to Invoke

- Before every phase that involves code or skill file creation
- **At phase completion** — run gates on Phase N+1 spec BEFORE issuing ⛔ STOP, so Luba sees the reviewed plan at the stop point
- Any time a plan element is changed after initial approval

## Phase Transition Protocol

At the end of every phase, after STATE-Pn.json is saved:

```
Step 1: Read Phase N+1 spec from the plan file
Step 2: Run Gate 0 — fresh infrastructure discovery (not cached from Phase N)
Step 3: Run Gates 1–7 — DNA safety, fabric blast radius, test matrix, P1–P8
Step 4: Run plan-review-skill FC-1–FC-12 — spot-check Phase N+1 deliverable list
Step 5: EnterPlanMode → present two sections to Luba:
          SECTION A — Phase N Execution Summary:
            - Skills/files delivered, test gate results, zero-regression delta
            - Any deviations from plan spec
          SECTION B — Phase N+1 Reviewed Plan:
            - Gate table (G0–G7: PASS/FAIL/N/A)
            - FC battery (FC-1–FC-12: PASS/FAIL/FIX-AT-WRITE)
            - Write-time fixes, file count, deliverable list
          ⛔ STOP inside plan mode — await Luba written approval
Step 6: ExitPlanMode (on Luba approval)
Step 7 (on approval): Begin Phase N+1
```

**This runs proactively at phase completion — not after Luba asks.**
The reviewed plan is presented as part of the STOP, so Luba can approve or
adjust in a single review step rather than two rounds.

---

## Gate 0 — Infrastructure Discovery (Pre-requisite)

**Run infrastructure-discovery (SK-407) first.** This gate is the gate check that discovery completed.

Verify:
- [ ] `preExistingFailures[]` captured and stored
- [ ] Artifact numbers read from live docs (not plan file)
- [ ] Every plan file reference has a verified `file:line`
- [ ] v17-skill-library-reference consulted for new patterns

**If discovery is incomplete → stop here. Do not continue to Gate 1.**

---

## Gate 1 — DNA Regression Safety

For every new pattern the plan introduces, verify it does not break DNA-1 through DNA-9.

| DNA | Check |
|-----|-------|
| DNA-1 | New code uses `Record<string,unknown>` — no typed model classes |
| DNA-2 | New queries use `BuildSearchFilter` — no hardcoded field names |
| DNA-3 | New methods return `DataProcessResult` — no `throw` in business logic |
| DNA-4 | New services extend `MicroserviceBase` |
| DNA-5 | TenantId from `AsyncLocalStorage` — never as method parameter |
| DNA-6 | No entity-specific `@Controller` — use `DynamicController` |
| DNA-7 | Queue consumers implement dedup ID |
| DNA-8 | `storeDocument()` always BEFORE `enqueue()` |
| DNA-9 | Queue events use CloudEvents envelope |

**Detection:**
```bash
grep -r "class.*Model {" server/src/   # DNA-1 violation
grep -r "throw new Error" server/src/  # DNA-3 violation (business logic)
grep -r "import.*anthropic" server/src/ | grep -v provider  # fabric-first violation
```

**Gate 1 passes when:** zero new DNA violations in plan scope.

---

## Gate 2 — Fabric Resolution Map

List every fabric layer the plan touches. For each:

| Fabric | Provider Used | Interface | COMPLETE? |
|--------|--------------|-----------|-----------|
| DATABASE | elasticsearch | IDatabaseService | ✓/✗ |
| QUEUE | sqs | IQueueService | ✓/✗ |
| AI ENGINE | anthropic | IAiProvider | ✓/✗ |
| RAG | in-memory | IRagService | ✓/✗ |
| SECRETS | env-var | ISecretsService | ✓/✗ |
| FLOW | — | IFlowOrchestrator | ✓/✗ |

**Red flags:**
- Plan imports provider SDK directly instead of using fabric interface → DNA violation
- Plan adds a new fabric layer → almost always wrong; use existing 6
- Plan bypasses `IExternalServiceFactory.createAsync()` → MACHINE violation

**Gate 2 passes when:** all touched fabrics have complete interface mapping.

---

## Gate 3 — Flow Template Validation

For any new flow or task type in the plan:

1. Verify AF-9 (Judge) quality gate still applies. New task types must have a judge score threshold.
2. Verify flow DAG has no circular dependencies.
3. Verify all factory IDs referenced in the template exist in ENGINE_ARCHITECTURE_MERGED.
4. Verify backward compatibility: FLOW-01 through FLOW-31 are not broken by new factory registrations.

```bash
grep -r "FLOW-[0-9]" server/src/engine-contracts/ | grep "taskType: T${new_task_type}"
```

**Gate 3 passes when:** all factory IDs verified, AF-9 threshold defined, no circular deps.

---

## Gate 4 — Decision Log

Every architectural decision in the plan must have a `DR-XXX` entry.

**What counts as an architectural decision:**
- New factory family
- New fabric provider
- New DNA pattern adaptation
- Changing a quality threshold or weight
- Adding a new skill to the load order
- Modifying an existing AF station signature

**Format:**
```
DR-XXX: <decision title>
Date: YYYY-MM-DD
Decision: <what was decided>
Alternatives: <what else was considered>
Rationale: <why this choice>
Affected: <which flows, factories, AF stations>
```

Write to `server/docs/DECISIONS.md` before marking Gate 4 passed.

**Gate 4 passes when:** zero undocumented architectural decisions.

---

## Gate 5 — Test Coverage Matrix

Before Phase 1 executes, define the full test matrix:

| Component | Unit Test | Simulation | E2E | Docker | Location |
|-----------|-----------|------------|-----|--------|----------|
| New service | ✓ | ✓ | ✓ | ✗ | test/unit/, test/sim/ |
| New provider | ✓ | ✓ | ✓ | ✓ | test/fabrics/ |
| New AF station mod | ✓ | ✓ | ✓ | ✗ | test/af-stations/ |

**Rules:**
- Unit tests: pure logic, no I/O
- Simulation: real DI with `@nestjs/testing`, in-memory providers
- E2E: `NestJS TestingModule` with AppModule (project convention — no Playwright)
- Docker: fabric providers that need real containers (ES, PG, Redis, SQS)

**Gate 5 passes when:** test matrix complete with file paths defined for every new component.

---

## Gate 6 — Canonical Doc Sync

Identify which of the 7 merged docs must be updated after this phase:

| Doc | Update trigger |
|-----|---------------|
| `ENGINE_ARCHITECTURE_MERGED.md` | New factory family or AF station change |
| `TASK_TYPES_CATALOG_MERGED.md` | New task type T-XXX |
| `BFA_CONFLICT_REGISTRY.md` | New BFA rule CF-XXX |
| `FLOW_TEMPLATES_MERGED.md` | New flow DAG |
| `SKILLS_INDEX.md` | New skill added to load order |
| `CLAUDE.md` | Artifact number boundaries updated |
| `DECISIONS.md` | New DR-XXX entry |

For each doc that needs updating: identify the exact section, the new content, and who updates it (Claude Code during session vs Luba review).

**Gate 6 passes when:** all doc updates identified and assigned.

---

## Gate 7 — Foundational Principles (P1–P8)

Every plan must explicitly answer all 8 questions from `xiigen-core-principles-skill` (SK-409). Any "no" requires either:
- A plan amendment that addresses the principle, OR
- Luba's explicit written sign-off that this principle is out of scope for this specific plan

| Principle | Gate Question | Plan Answer |
|-----------|--------------|-------------|
| P1: Multi-tenant | Does every new artifact have `tenantId` scope? No leak paths? | ☐ YES / ☐ N/A (Luba: ______) |
| P2: Safe configs | Are all configs via fabric? Per-tenant secrets? | ☐ YES / ☐ N/A (Luba: ______) |
| P3: Prompt improve | Are prompts versioned? Is there a Judge+improve cycle? | ☐ YES / ☐ N/A (Luba: ______) |
| P4: RAG storage | Is knowledge stored in RAG? Local RAG for testing? | ☐ YES / ☐ N/A (Luba: ______) |
| P5: Self-improve | Does the engine get better, not just the output? | ☐ YES / ☐ N/A (Luba: ______) |
| P6: BFA arbitrate | Are decision nodes arbitrated? Cross-flow conflicts checked? | ☐ YES / ☐ N/A (Luba: ______) |
| P7: Local test | Unit + sim + Docker for every new component? | ☐ YES / ☐ N/A (Luba: ______) |
| P8: OSS training | Cost tracked? Training data captured? Model routing? | ☐ YES / ☐ N/A (Luba: ______) |

See `xiigen-core-principles-skill/SKILL.md` for full principle definitions and negative examples.

**Gate 7 passes when:** all 8 answers are YES or have explicit Luba N/A sign-off.

---

## Passing Criteria

All 8 gates must pass before any code is written. Record in STATE-Pn.json:

```json
{
  "phaseGatesPassed": true,
  "gateResults": {
    "gate0_discovery": "PASS",
    "gate1_dna": "PASS",
    "gate2_fabric": "PASS",
    "gate3_flow": "PASS — N/A (no new task types this phase)",
    "gate4_decisions": "PASS",
    "gate5_tests": "PASS",
    "gate6_docs": "PASS",
    "gate7_principles": "PASS"
  }
}
```

---

## Anti-Patterns

**Anti-Pattern 1: Skip Gate 0 (Discovery First)**
Writing Gate 1 DNA check without running discovery. The DNA check is meaningless if the file paths are wrong.

**Anti-Pattern 2: Gate 3 "N/A — no new flows"**
Using N/A when the plan adds a new task type without a new flow. Task types still need AF-9 threshold.

**Anti-Pattern 3: Gate 7 "Checked — all applicable"**
Not filling in the actual answers. Gate 7 requires explicit YES or Luba-signed N/A per principle, not a blanket assertion.

**Anti-Pattern 4: Gates as Checkbox Theater**
Running gates after the plan is already written and marking them PASS without actually checking. Gates are pre-code, not post-code.
