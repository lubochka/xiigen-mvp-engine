# Source-Derived Denylist

Scope: static and source-derived terms/classes/paths that must not appear in copied or adapted XIIGen active guidance except inside explicit denylist, evidence-only, or forbidden-hit classification context. This file is evidence-only and is intended as final sweep input for later workstreams.

Rule: a term below is not automatically forbidden in runtime code if XIIGen already owns it; it is forbidden as a source leak in copied/adapted guidance unless a later Forbidden Hits Ledger proves XIIGen-owned or forbidden-list context.

## Denylist

| Term / pattern | Source ledger basis | Why denied | Sweep scope | Final result |
|---|---|---|---|---|
| OperationResult | Static user-required denylist term | Source result contract must not replace XIIGen DataProcessResult<T>. | Active target guidance, registries, prompts, adapted skills | Block if outside denylist/evidence context. |
| BaseService | Static user-required denylist term | Source service base pattern must not replace XIIGen service conventions. | Active target guidance, registries, prompts, adapted skills | Block if outside denylist/evidence context. |
| C:\Projects\llm_mvp_core | Source path | Source repository path must not become active XIIGen guidance. | Active target guidance and routing references | Block if outside evidence context. |
| llm_mvp_core | Source path/project identity | Source project identity must not be copied as XIIGen authority. | Active target guidance and prompts | Block if outside evidence context. |
| C:\Projects\llm_mvp_core\docs\skills | Source skill path | Source skill root is read-only evidence, not target route. | Active target route graph | Block if used as active route. |
| C:\Projects\llm_mvp_core\docs\HOW-TO-USE-SKILLS.md | Source HOW-TO path | Source index is evidence only; target must not load it as active guidance. | Active target load order and prompts | Block if used as active target HOW-TO. |
| Copied source `.claude/skills` routes not resolved through the local XIIGen index | Source-style route family | The active target now owns `.claude/skills`; copied routes are denied only when they bypass `.claude\skills\SKILL-INDEX.md` or point to missing/source-derived targets. | Active target route graph | Block only when not resolved through active local index evidence. |
| .claude/debug/active-session.md | debug-session-SKILL.md source pattern | Source debug session path is Claude-specific. | Adapted debugging/session guidance | Block unless rewritten to XIIGen-owned path. |
| .claude/worktrees | Plan stale-family discovery pattern | Nested stale worktree path is evidence-only. | Route graph and active prompts | Block as active route. |
| .agents/skills | Plan hidden-root discovery pattern | Agents skill root absent in target; not a canonical XIIGen route. | Route graph and active prompts | Block as active route unless later authority proves it. |
| DPO, DPO_TRIPLE, dpo-triple-format, planning-dpo-authoring | Excluded DPO/training skill rows | DPO/training data format is source-specific and not part of XIIGen guidance refresh. | Adapted skills and prompts | Block if copied as guidance. |
| checkpoint, checkpoints, active checkpoint, checkpoint writer | Source training/checkpoint governance | Training checkpoint protocol is source-specific. | Adapted skills and prompts | Block if copied as guidance. |
| TranslationDomain, translation-domain-*, [DIRECTION:BOOTSTRAP] | File-only translation-domain skill rows | Source domain-specific training/FAQ material. | Adapted skills and prompts | Block if copied as XIIGen guidance. |
| ILearningMachine, ILogicalOrchestrator, ILogicalFlow, ILogicalUnit, ILearningMachinePair | trainable-architecture-decision-SKILL.md, implementation-doc-hierarchy-SKILL.md | Source trainable architecture hierarchy. | Active guidance and architecture docs | Block unless later XIIGen-owned evidence proves it. |
| trainable architecture, adaptive learning, learning signal, learning loop, training-data-gap | Excluded learning/training skill rows | Source learning/training governance is out of scope for this refresh. | Adapted skills and prompts | Block if copied as guidance. |
| GraphRag, graph-backed-routing, graph-entity-schema, graph-extension-protocol, RoutingEdge | Excluded graph architecture rows | Source graph/routing architecture and schemas. | Adapted skills, route docs, prompts | Block unless rewritten to XIIGen-owned terms with evidence. |
| DomainModelRegistry, GraphDriftDetector, SkillCompiler, SkillGraphResolution | skill-graph-sync-SKILL.md source internals | Source skill-graph implementation details. | Adapted skills and registries | Block if copied. |
| arbiter, arbiter-panel, meta-arbiter, principles-arbiter, CheckId | Excluded arbiter rows | Source arbitration/check registry architecture. | Adapted governance guidance | Block if copied as active architecture. |
| ScoreInterpretation, score-zero, score-winner, score trajectory | Excluded score rows | Source scorer framework and thresholds. | Adapted skills and prompts | Block if copied as XIIGen scoring guidance. |
| CapabilityRepresentation, capability-state, capability fleet, capability convergence | Blocked capability rows | Ambiguous source capability framework needs human review before any transfer. | Adapted planning/governance guidance | Block until reviewed. |
| algorithm-as-service, ai-pipeline-topology, Pattern F, rag-retrieve, route.handler, feedback pattern | Excluded algorithm/pipeline topology rows | Source algorithm and pipeline design patterns. | Active skills, route docs, prompts | Block if copied. |
| IAgentMessageBus, ISessionStorage, PermissionGate, APP_GUARD, BM25+VectorSearch+GraphRag | Source stack reference in HOW-TO | Source internal stack names must not leak into XIIGen guidance. | Adapted guidance and route graph | Block if copied unless XIIGen-owned evidence exists. |
| Windows Forms, G1-G7, ui-screen-grammar | Blocked/excluded UI grammar rows | Source UI grammar stack/design conventions are not proven XIIGen-owned. | Adapted UI guidance | Block until reviewed. |
| FreedomMachine, freedom-machine, freedom source governance | freedom-machine-SKILL.md | Source project/domain identity. | Adapted skills and prompts | Block if copied as XIIGen guidance. |
| LearningLocalWikiData, CONSTITUTION-EXECUTOR-ARCHITECT-ROUND-CONTROL, PROTOCOL-ARCHITECT-PLAN-SKILL-AGENT-ROLE-REVIEW | Source HOW-TO governance references | Source governance documents are not target authority. | Active load order and adapted prompts | Block if routed as active target authority. |
| CLAUDE.md OP-*, AGENTS.md OP-*, DECISIONS-LOCKED.md, COMPONENT-INTERFACES | Source HOW-TO authority web | Source authority web does not exist in clean target and must not be copied blindly. | Active target guidance and prompts | Block unless target authority exists and is cited. |
| STOP, hard stop, wait for approval, must be on main, run dotnet test as source governance commands | Source HOW-TO local override text | Source session-control wording must not override current user instruction or XIIGen plan authority. | Adapted skills and prompts | Block if copied as user-facing command. |
| Parent Architect Subagent-Only Firewall, ARCHITECT_INTERNAL, executor slice, Luba as source governance identity | Source HOW-TO governance block | Source role/person-specific governance must not leak into XIIGen universal guidance. | Adapted governance/session docs | Block unless rewritten as XIIGen-neutral guidance. |
| human-readable-architecture-audit source slug | Duplicate source index rows | Reusable readability intent may be adapted, but source slug/name must not be reused without canonicalization. | New skill names, paths, registries | Block source-name reuse until canonicalization. |
| Any *-SKILL.md source filename reused as a target filename | Coverage ledger source rows | Plan Section 12 forbids repeating raw source names without proven XIIGen canonical match. | Target filenames, display names, registries | Block until canonicalization proves match. |
| Source storage/index names without active XIIGen ownership evidence | Source-derived storage/runtime rows | Source storage names must not become active guidance. This denylist no longer defines a static index allowlist; current storage/search wording must be proven from active XIIGen source. | Active persistence/search guidance | Block if copied as active guidance without source evidence. |
| Fixed-schema DB guidance | Rejected old/source-stack preservation target | Active XIIGen guidance preserves `Record<string, unknown>` and `unknown` dynamic payload boundaries; source fixed schemas must not override this. | Active persistence guidance | Block if copied as active guidance. |
| Throwing as normal service flow | Active XIIGen rule preservation | Active service/fabric guidance uses `DataProcessResult<T>` where local interfaces use it; expected validation/business outcomes are failures, not expected throws. | Active service guidance | Block if copied as active guidance. |
| Introducing .NET `CancellationToken` patterns into TypeScript async examples | Rejected historical target | Active XIIGen guidance preserves local TypeScript `Promise<DataProcessResult<...>>` shapes and existing local cancellation/`AbortSignal` controls only. | Active service/API guidance | Block if copied as active guidance. |
| .Result, .Wait(), .GetAwaiter().GetResult() | Rejected historical async pattern | These are rejected historical/source examples, not active TypeScript guidance. | Active service/API guidance | Block if copied as active guidance. |
| Console.WriteLine logging guidance or new server `console.*` guidance | Active XIIGen rule preservation plus rejected historical target | Active XIIGen server guidance prohibits new `console.*` logging and uses `StructuredLogger`, NestJS logging, or the existing local structured logger pattern with metadata objects. | Active service/API guidance | Block if copied as active guidance. |

## Sweep Rule For Later Workstreams

Every future copied/adapted guidance hunk must be swept against this denylist. A hit can pass only as one of:

- XIIGen-owned with active XIIGen authority evidence;
- forbidden-list context inside this denylist or another guardrail ledger;
- evidence-only in Phase 0/coverage artifacts;
- otherwise it is a source leak and blocks acceptance.
