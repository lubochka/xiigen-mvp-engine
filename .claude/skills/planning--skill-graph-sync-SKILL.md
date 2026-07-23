---
name: skill-graph-sync
sk_number: SK-519
version: "1.0.0"
priority: MEDIUM
load_order: 3
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  How the skill library and the decision graph stay in sync bidirectionally.
  Skills seed the graph at bootstrap. The graph learns from runtime. When they
  diverge, GraphDriftDetector classifies the drift and routes to resolution.
  Without this skill, the graph silently overrides skill knowledge (or vice versa)
  with no reconciliation mechanism.
triggers:
  - "skill says X but graph says Y"
  - "drift detected"
  - "GraphDriftDetector"
  - "GOVERNS_SEED"
  - "update skill or graph"
  - "SkillCompiler"
  - "reseed"
  - "skill-graph divergence"
---

# Skill-Graph Sync (SK-519)

> **MVP scope banner (read first).** The drift **engine** described below —
> `GraphDriftDetector` (0.3 divergence / 0.8 surface / 0.5 reseed), `GOVERNS_SEED` edges,
> `SkillCompiler` → `DomainModelRegistry`/`xiigen-decision-graph`, `ConfidencePreseeder`,
> `GraphBootstrapper` — is the core ML decision graph. By R5/R6 it stays in `llm_mvp_core`
> and is **not replicated in this MVP**: the MVP builds no `DomainModelRegistry`, no decision
> graph, and seeds no `GOVERNS_SEED` edges, so there is no local drift loop to run. Sections
> "THE LINK MECHANISM", "GraphDriftDetector PROTOCOL", "SkillCompiler ON THE BOOTSTRAP
> BOUNDARY", and "COMPILATION PIPELINE" are **reference-only** here; do not stand up that
> machinery locally.
>
> **What IS active for the MVP** is the one portable, non-ML governance facet: the
> **§4 "SKILL AUTHORING FOR COMPILER COMPATIBILITY"** discipline. Apply it to both skill
> libraries (`.claude/skills/` and `.agents/skills/`) so every skill is machine-parseable
> regardless of any graph: `❌` on its own line (never inline in prose), specific matchable
> triggers, machine-executable verification commands, and a `## WHAT THIS SKILL PREVENTS`
> block. In the MVP those verification commands are TypeScript idioms (`grep ... --include="*.ts"`
> over `server/src` and `client/src`, `npm`/`jest`/`playwright`), **not** `*.cs`/`dotnet` and
> **not** Elasticsearch `curl`. If a versioned drift check is ever needed, it runs in the
> `llm_mvp_core` core engine (G12), not in MVP code.

## WHEN TO INVOKE

When a skill version is bumped. When drift is detected between skill positions
and graph edge weights. When designing the SkillCompiler pipeline. When
reviewing whether a graph-learned value should update the skill or vice versa.

---

## WHAT THIS SKILL PREVENTS

- Graph silently diverging from skill library (15 runs override author knowledge)
- Skill updates not propagating to graph (author corrects a belief, graph ignores it)
- Neither system telling the other when it changes
- SkillCompiler output being seeded without confidence calibration

---

## THE LINK MECHANISM

Two entity types connect skills to the graph:

```json
{ "entityType": "SKILL_NODE", "id": "SK-442", "version": "2.0.0",
  "governs": ["ARBITER_ROLE", "REQUIRES_MINIMUM"],
  "lastSyncedAt": "2026-03-26T00:00:00Z" }

{ "edgeType": "GOVERNS_SEED",
  "from": "SKILL_NODE:SK-442",
  "to": "ARCHETYPE:ROUTING",
  "syncPolicy": "NOTIFY_ON_DRIFT" }
```

Every graph entity seeded from a skill has a `GOVERNS_SEED` edge linking back
to its source skill. This edge is how `GraphDriftDetector` knows which skills
to check when graph values change, and which graph entities to check when
skills are updated.

---

## GraphDriftDetector PROTOCOL

When a skill is updated (new version committed):

1. Find all `GOVERNS_SEED` edges from this skill
2. Compare skill's new position against current graph edge weight
3. If divergence > 0.3:

```
Graph confidence > 0.8 → GRAPH_LIKELY_CORRECT
  "Skill says X but 15 runs showed Y. Is the skill outdated?"
  → Surface to Luba as a structured question.
  → Resolution: update the skill OR mark graph edge as exception
    with EXCEPTION_ACKNOWLEDGED relationship.

Graph confidence < 0.5 → SKILL_LIKELY_CORRECT
  "Skill updated and graph has insufficient evidence."
  → Auto-reseed graph from skill. No human needed.
  → Resets confidence to the ConfidencePreseeder value for the new skill version.

Graph confidence 0.5..0.8 → CONFLICTING_EVIDENCE
  "Both have moderate support."
  → Schedule for Top Manager investigation at next wave completion.
  → Neither auto-reseeds nor surfaces immediately.
```

---

## SkillCompiler ON THE BOOTSTRAP BOUNDARY

Per SK-426: SkillCompiler compiles skills into graph entities. The graph is what
teaches the AF pipeline. SkillCompiler CANNOT be a flow topology — it is Phase A
manual bootstrap work.

**Two-pass hybrid extraction:**
```
Pass 1 (YAML frontmatter — deterministic):
  triggers, sk_number, category, priority, description
  → TRIGGER_CONDITION nodes
  → archetypeScope derivation (for ConfidencePreseeder)

Pass 2 (Markdown body — AI-extracted):
  anti-patterns (❌ lines), step sequences, prevention statements,
  verification commands (bash code blocks)
  → ANTI_PATTERN nodes with AVOID edges
  → DECISION_STEP nodes with SEQUENCE edges
  → FAILURE_MODE_PREVENTED nodes
```

**Re-run triggers:**
- Skill version bump (any skill)
- New skill added to the library
- Drift detected with threshold > 0.3

---

## COMPILATION PIPELINE

```
Skill committed → SkillCompiler parses → CompiledSkill objects
→ ConfidencePreseeder assigns initial confidence per entity
→ GraphBootstrapper seeds compiled entities to xiigen-decision-graph
→ SKILL_NODE entity created with version tracking
→ GOVERNS_SEED edges link skill to seeded entities
→ GraphDriftDetector watches for divergence
```

---

## SKILL AUTHORING FOR COMPILER COMPATIBILITY

To maximize what SkillCompiler extracts, follow these conventions:

**TRIGGERS:** Use specific phrases that map to graph TRIGGER_CONDITION nodes.
  ✓ `"score-0 on a named check"` → specific, matchable
  ✗ `"when things go wrong"` → vague, unmatchable

**ANTI-PATTERNS:** Always prefix with ❌ on its own line.
  ✓ `❌ Using the same threshold value everywhere without annotation`
  ✗ "You shouldn't use the same threshold everywhere" (buried in prose)

**VERIFICATION COMMANDS:** Always in bash code blocks with curl/grep/jq.
  ✓ ````bash\ngrep -rn "SPEC-001" server/src/ | head -5\n````
  ✗ "Check that SPEC-001 is registered" (not machine-executable)

**PREVENTION STATEMENT:** Always under `## WHAT THIS SKILL PREVENTS` as a list.

**MVP APPLICATION (the active facet here):** apply the four conventions above to every skill
in both `.claude/skills/` and `.agents/skills/`, keeping the two libraries reconciled to one
canonical body per skill. Verification commands use TypeScript idioms over the MVP source,
never C#/dotnet and never an Elasticsearch query:

````bash
# ✓ MVP-idiom verification command (machine-executable, TS source)
grep -rn "buildSearchFilter" server/src --include="*.ts" | head -5
npx jest server/src/flow01 --runTestsByPath   # exact "N passed, 0 failed"
````

This authoring discipline is what makes the MVP skill libraries indexable by the unified
`HOW-TO-USE-SKILLS.md`; it does not require any local graph, registry, or drift engine.

---

## ANTI-PATTERNS

❌ Auto-reseeding when graph confidence is high (> 0.8).
   The graph has accumulated genuine evidence. Overriding it with a skill update
   without Luba's review discards that evidence.

❌ Ignoring drift when graph confidence is low (< 0.5).
   Low confidence means the graph doesn't have evidence to disagree. The skill
   author's knowledge should prevail automatically.

❌ SkillCompiler running as a flow topology.
   It produces the graph that all topologies depend on. Bootstrap boundary (SK-426).

❌ GOVERNS_SEED edges marked as immutable.
   The governance relationship itself should be updatable (skill versions change).
   The GOVERNED entity may have immutable properties, but the link is not immutable.
