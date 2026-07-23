# PLANNING SKILLS V4 → V5 UPGRADE GUIDE
## What changed, what to replace, what to keep
## Date: 2026-03-20

---

## WHY V5

v4 was built after FLOW-33. It covers P1-P8 (8 principles, 32 checklist items),
15 FC classes, and the 5-skill pipeline. It works correctly for server-side
planning.

What v4 didn't know about (because the decisions hadn't been made yet):
- Mode C event-first architecture (all decisions D1-D10)
- NestJS + React SDK as primary platform SDKs
- Client-side state machines (parallel to server flows)
- Meta-arbitration layer (FLOW-35, SK-402–SK-415)
- 10 new planning session skills (SK-416–SK-425)
- DECISIONS-LOCKED.md as the authoritative decision source
- Project artifact boundaries post-FLOW-35

v5 adds all of this while keeping every working piece of v4.

---

## FILES TO REPLACE (drop v5 version over v4)

| File | v4 location | v5 location | What changed |
|------|------------|------------|--------------|
| xiigen-core-principles-skill/SKILL.md | v4 package | v5 package | Added P9 (Mode C) + P10 (Client Architecture). 8→10 principles, 32→44 checklist items. |
| how-to-prepare-a-plan-skill/SKILL.md | v4 package | v5 package | Updated artifact numbers to post-FLOW-35. Added SK-416-425. Added 7-skill pipeline. Added mandatory document reads. |
| plan-review-skill/SESSION-0-PLAN-REVIEW-TEMPLATE.md | v4 package | v5 adds v2 | Keep original template (FC-1 through FC-12). Add v2 template sections (FC-13, FC-14, FC-15). |
| NEW-TASK-PLANNING-PROMPT.md | root of v4 | v5 package | Updated to v2.0: P9, P10, DECISIONS-LOCKED.md reads, post-FLOW-35 numbers, 7-skill load order. |

---

## FILES TO ADD (new in v5)

| File | Where to put it | What it does |
|------|----------------|--------------|
| flow-reexamination-skill/SKILL.md | .claude/skills/ | 7-pass algorithm for updating server-only flows to Mode C |
| SK-416-SKILL.md through SK-425-SKILL.md | .claude/skills/SK-{N}/ | 10 planning session skills from the architecture session |
| SKILL-REGISTRATION-MANIFEST.md | sessions/ or .claude/skills/ | How to register SK-416-425 in SkillGraphService |

---

## FILES TO KEEP UNCHANGED (v4 is correct, no update needed)

```
agent-output-format-skill/          ← unchanged, still correct
blast-radius-tagger/                ← unchanged
chain-arithmetic-audit/             ← unchanged
api-shape-verification/             ← unchanged
audit-protocol/                     ← unchanged
plan-execution-feedback/            ← unchanged
context-overflow-skill/             ← unchanged
debug-session-skill/                ← unchanged
defense-in-depth/                   ← unchanged
docker-debugger/                    ← unchanged
root-cause-tracing/                 ← unchanged
systematic-debugging/               ← unchanged
v17-skill-library-reference/        ← unchanged
verification-before-completion/     ← unchanged
plan-review-skill/references/       ← keep all reference files, add v5 template
```

---

## INTEGRATION: HOW THE TWO SKILL SETS WORK TOGETHER

### At planning session start
```
OLD pipeline (v4):
  1. agent-output-format
  2. xiigen-core-principles (P1-P8)
  3. infrastructure-discovery
  4. planning-skill
  5. plan-review-skill

NEW pipeline (v5):
  1. agent-output-format            ← unchanged
  2. xiigen-core-principles (P1-P10) ← UPDATED (replace SKILL.md)
  3. SK-416 PlanningSessionStartup  ← NEW (read STATE.json + DECISIONS-LOCKED.md)
  4. infrastructure-discovery       ← unchanged
  5. planning-skill                 ← unchanged
  6. plan-review-skill (FC-1-15)    ← UPDATED (replace SESSION-0 template)
  7. flow-reexamination-skill       ← NEW (user-facing flows only)
```

### The 10 new planning skills (SK-416-425) are contextual
They don't run sequentially. AF-4 retrieves them when relevant:
- SK-416: every session start
- SK-417: when challenging a locked decision
- SK-418: before producing session files for any flow
- SK-419: when designing event schemas
- SK-420: when examining client perspective
- SK-421: when building test matrices
- SK-422: when escalation decision from meta-arbiter arrives
- SK-423: before creating any new document
- SK-424: before any engine modification
- SK-425: when model fitness signals need interpretation

---

## THE KEY PRINCIPLE ADDITIONS (P9 and P10 answers required for every plan)

### P9 — Mode C Event-First

Every plan now needs to answer:
```
□ Event contract schemas in contracts/events/FLOW-XX/?
□ Flow topology in contracts/topologies/FLOW-XX.topology.json?
□ correlationId + tenantId + traceparent on every event?
□ No PII in any event payload?
□ Integration boundary per factory (INJECTABLE vs PLATFORM-ONLY)?
□ QUEUE FABRIC is the only inter-service communication?
□ Compensation events for all non-terminal forward events?
□ SLA per event gate?
```

**The test:** Can a Go developer implement this flow using only the event schemas?
If no → P9 is incomplete.

### P10 — Client Architecture

Every plan now needs to answer:
```
□ Client state map: what screen each DAG node shows?
□ Human timescale documented per step?
□ FlowStateSnapshot defined?
□ App-reopen behavior per step?
□ Optimistic UI 3-part contracts for user actions?
□ Offline queue behavior documented?
□ SDK: @xiigen/sdk-nestjs + @xiigen/sdk-react?
```

**The test:** Can a React developer implement the client using only the clientStateMap and event schemas?
If no → P10 is incomplete.

---

## UPDATED FC CLASS SUMMARY (v4 FC-1-12 + v5 FC-13-15)

| FC | Class | New in v5? |
|----|-------|-----------|
| FC-1 | Count drift | No |
| FC-2 | Path errors | No |
| FC-3 | Phantom skills | No |
| FC-4 | Duplicate numbers | No |
| FC-5 | Missing from list | No |
| FC-6 | Stale numbers | No |
| FC-7 | Wrong phase | No |
| FC-8 | Wrong format | No |
| FC-9 | Undefined requirement | No |
| FC-10 | Propagation failure | No |
| FC-11 | Overview≠detail | No |
| FC-12 | Principles missing | No (but now 10 principles, not 8) |
| FC-13 | Mode C contract completeness | **YES — new in v5** |
| FC-14 | Client-side completeness | **YES — new in v5** |
| FC-15 | DECISIONS-LOCKED compliance | **YES — new in v5** |

---

## ARTIFACT BOUNDARY CORRECTION

The v4 template has these numbers (post-FLOW-33):
```
Next Factory:   F641
Next Task Type: T254
Next Skill:     SK-154
```

The v5 template has these numbers (post-FLOW-35):
```
Next Factory:   F1491
Next Task Type: T567
Next Skill:     SK-426
```

**Both are reference values only. ALWAYS verify against INFRASTRUCTURE-FLOWS-STATE-v4.json.**
The STATE.json is the authoritative source. These numbers in skill files are floor estimates.
