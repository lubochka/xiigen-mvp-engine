# XIIGen MVP Universal Skills / Guidance Refresh Plan v3

Version: v3 execution-gate repair
Status: PLAN ONLY now; execution gate for subsequent execution through subagents
Date: 2026-06-19
Plan file: `C:\Projects\xiigen-mvp-universal-skills-work\docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v3.md`
Allowed worktree for the current step: `C:\Projects\xiigen-mvp-universal-skills-work`
Read-only reference, if structure verification is needed: `C:\Projects\xiigen mvp\docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v2.md`

## 1. Absolute boundary of the current step

The current step creates only this v3 plan. Right now it is forbidden to update the skills themselves, guidance, indexes, prompts, runtime code, tests, branches, commits, push, PR, privacy, or repository settings.

| Object | Action allowed now |
|---|---|
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v3.md` | create or replace the human-readable Russian Markdown plan |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\plans\` | create the directory if it does not exist |
| `C:\Projects\xiigen mvp\docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v2.md` | read only as historical reference |
| `C:\Projects\xiigen mvp` | do not touch |

Subsequent execution is allowed only after this v3 plan exists and only in `C:\Projects\xiigen-mvp-universal-skills-work`, unless the user explicitly specifies a different worktree. Git operations are not part of the current step.

## 2. Goal of v3

v2 passed sanity, but the full 20-review returned `6 PASS / 14 FAIL`. v3 closes the blockers from that review not through a textual declaration, but through mandatory execution gates. After v3, subagents must execute not "by meaning", but by verifiable packets: discovery, source coverage, canonicalization, route graph, diff-to-ledger, final acceptance.

The main rule of v3: if evidence is absent, ambiguous, empty, contains `unknown`, `pending`, `unreviewed`, overlapping ranges, a gap, or an unresolved ref, the gate result equals `FAIL`.

## 3. Authority and non-negotiables

The highest-priority source for v3: the user instruction from 2026-06-19.

Non-negotiable constraints:

- No "relevant source" loophole. Every admitted source file must be covered by all sections and line ranges. Within an admitted source file, unclassified lines, gaps, or overlaps are not allowed.
- Any missing source file, missing section, missing line range, gap, overlap, unknown row, pending row, or unreviewed row in Phase 2 is `FAIL`.
- Any future add/update must be an XIIGen-compatible adaptation, not a copy of source architecture, source algorithms, runtime markers, storage indexes, or stack-specific internals.
- Root docs, README, INSTRUCTIONS, or the flow-design family must not be updated for general cleanup. Only an exact allowlist row with a proven blocking need for universal skills/guidance routing or canonicalization.
- A missing skill must not be added before the Section 12 canonicalization decision and equivalent search.
- Final outputs must be human-readable Russian Markdown. Raw review dumps, patch fragments, semantic diff language, machine garbage, and unclear ledger dumps are forbidden.

## 4. Phase 0: Discovery, base gate, active authority

Phase 0 is a blocking admission. Until a full `PASS`, skills/guidance must not be changed.

### 4.1 Branch/base gate

The executor must perform a read-only check of branch/base/worktree state before changes. A silent switch is forbidden. If the expected base is not confirmed, execution blocks and asks the user; subagents must not fix this themselves.

The plan does not require git operations. The branch/base gate remains enforced as a read-only admission condition.

### 4.2 Hidden roots and repo-wide discovery

Discovery must cover ordinary and hidden roots. Minimal mechanism: `rg --hidden` plus explicit path discovery for `.claude` and `.agents`, if they exist.

Mandatory discovery families:

| Family | Discovery requirement |
|---|---|
| Root/inbound guidance | `agent.md`, `.clinerules`, `.cursorrules`, `.impeccable.md`, `DOCUMENT_INDEX.md` |
| Claude guidance | `.claude/AGENTS.md`, `.claude/SKILLS_INDEX.md`, `.claude/XIIGEN-SESSION-START-PROMPT-v4.md`, `.claude/skills/**` |
| Agents guidance | `.agents/skills/**`, `.agents/**` active registries/prompts/docs |
| Main skills | discovered exact active skill roots; treat historical `skills/INDEX.md` as absent/out-of-scope unless separately proven active; it is not preferred |
| Active docs/indexes/prompts | discovered exact paths only; no guessed canonical paths |
| Patch/version/legacy families | `*patch*`, `PATCH*`, `*-PATCH-*`, `legacy`, `archive`, `archived`, `old`, `stale`, `v[0-9]`, `v[0-9].[0-9]`, `v[0-9]_[0-9]` |
| Nested stale dirs | `.claude/worktrees`, `.clone`, `.tmp_scoring`, `tmp`, `New folder`, `snapshots` |

Nested stale dirs are out-of-scope/evidence-only unless an active table explicitly selects a file inside them as active. Active routing to those dirs without an active table row is `FAIL`.

### 4.3 No assumed canonical paths

Executor must not assume historical/out-of-scope roots such as `context/interfaces.cs` or `skills/INDEX.md`, root README, prompt paths or skill roots exist. All canonical and propagation targets must be discovered exact paths.

If expected authority path is absent, mark it `missing` and select active-current replacement only with file:line evidence. If replacement cannot be proven, Phase 0 blocks.

### 4.4 Active XIIGen authority files

Controlled-add architecture fit requires active XIIGen authority evidence. The preferred authority files for this worktree are the active NestJS/TypeScript roots discovered here:

- `AGENTS.md`
- `docs/state/STATE.json`
- `server/src/kernel/data-process-result.ts`
- `server/src/kernel/build-search-filter.ts`
- `.claude/skills/SKILL-INDEX.md`
- `.claude/skills/HOW-TO-USE-SKILLS.md`
- `.claude/skills/XIIGEN-SESSION-START-PROMPT.md`

Historical roots `context/interfaces.cs` and `skills/INDEX.md` are absent/out-of-scope rejected old roots for this NestJS/TypeScript worktree; they must never be preferred active roots. If any preferred active root above is absent, Phase 0 must select active-current replacement(s) with file:line evidence before any controlled add or adaptation. Without these authority files or replacements, controlled add is blocked.

Required Active Authority Table:

| Authority role | Exact discovered path | Exists | Evidence file:line | Status | Decision |
|---|---|---:|---|---|---|
| Root worktree authority | `AGENTS.md` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active authority proven |
| State authority | `docs/state/STATE.json` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active state evidence proven |
| Result contract authority | `server/src/kernel/data-process-result.ts` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active source evidence proven |
| Search-filter authority | `server/src/kernel/build-search-filter.ts` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active source evidence proven |
| Skill/index authority | `.claude/skills/SKILL-INDEX.md` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active authority proven |
| Skill usage authority | `.claude/skills/HOW-TO-USE-SKILLS.md` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active routing proven |
| Session prompt/root guidance | `.claude/skills/XIIGEN-SESSION-START-PROMPT.md` or active-current replacement | required future artifact | required future artifact | required future artifact | PASS only if active prompt/root guidance proven |

This table is a required future artifact, not proof. Acceptance cannot pass until executor fills it with actual paths and line evidence.

### 4.5 Canonical load order as separate truth

Phase 0 and Phase 4 must build a Canonical Load Order Packet. For this worktree the packet must identify the active order for the concrete local roots:

1. `AGENTS.md`
2. `docs/state/STATE.json`
3. `server/src/kernel/data-process-result.ts`
4. `server/src/kernel/build-search-filter.ts`
5. `.claude/skills/SKILL-INDEX.md`
6. `.claude/skills/HOW-TO-USE-SKILLS.md`
7. `.claude/skills/XIIGEN-SESSION-START-PROMPT.md`

Any mismatch between active docs/prompts/indexes and this load order must be classified and fixed, legacy-labeled, excluded, or blocked. Silent inconsistency is `FAIL`.

## 5. Phase 1: Source index and runtime count packet

Phase 1 produces a runtime count packet before source classification. No hardcoded count such as `176 rows` is allowed.

Required Runtime Count Packet:

| Metric | Required evidence |
|---|---|
| Index row occurrences | count generated from actual source index parsing |
| Unique index skill names | generated unique list and count |
| Docs/skills file count | generated from filesystem discovery |
| Duplicate index names | generated duplicate report |
| Files missing from index | generated path list or explicit none |
| Index rows missing files | generated row list or explicit none |
| Parsing boundary used | exact heading/line evidence |
| Included secondary tables | exact decision and evidence |

### 5.1 `## Skill index` parsing boundary

The active source index boundary is:

- Start: exact `## Skill index` heading.
- End: the next heading with the same or higher Markdown level, unless active source authority explicitly defines a narrower/larger boundary with file:line evidence.

The table titled `New skills added by authority/self-reflection repair` is active source index only if it is inside the accepted `## Skill index` boundary or an active source authority explicitly includes it as part of the source index. Otherwise it is controlled-add candidate evidence only, not an accepted index row set.

Executor must state this decision in the runtime count packet.

### 5.2 Known reconciliation blockers

These known blockers must be checked explicitly:

| Blocker | Required treatment |
|---|---|
| `translation-domain-mindset-reset-SKILL.md` exists but is absent from source index | mark mismatch, reconcile by include/exclude/block with evidence |
| `translation-domain-reality-check-SKILL.md` exists but is absent from source index | mark mismatch, reconcile by include/exclude/block with evidence |
| duplicate `human-readable-architecture-audit-SKILL.md` at source lines 638 and 704 | duplicate index row must be reconciled; no silent merge |

Coverage ledger must include `Mismatch type` and `Reconciliation status`.

## 6. Phase 2: Exhaustive source classification ledger

Phase 2 admits source material only through an exhaustive ledger. The ledger must cover every admitted source file and every section/line range in each admitted source file. No admitted file may contain unclassified lines, gaps or overlaps.

Required Source Classification Ledger columns:

| Column | Rule |
|---|---|
| Source file exact path | required |
| Source file status | `admitted`, `excluded`, or `block` |
| Section / line range | required for every admitted section |
| Classification | `universal intent`, `source architecture`, `source algorithm`, `stack-specific`, `runtime marker`, `storage/index marker`, `XIIGen-owned`, `evidence-only`, `block` |
| Target action | `adapt`, `rewrite`, `exclude`, `block`, `evidence-only` |
| Excluded fragments | explicit line ranges plus reason, or exact text `none reviewed`; never blank |
| XIIGen-owned rules preserved | exact preserved XIIGen rules for adapt/rewrite rows, or `N/A because excluded/block`; never blank |
| Source-derived denylist terms | every excluded class/path/storage-index/runtime marker/architecture term |
| Evidence file:line | required |
| Reviewer status | must be `reviewed`; any other value is `FAIL` |

Hard fail conditions:

- missing source file row
- missing section or line range
- overlapping ranges
- line gaps in admitted files
- blank `Excluded fragments`
- blank `XIIGen-owned rules preserved`
- any `unknown`, `pending`, or `unreviewed` row
- any admitted source with unclassified lines

## 7. Source-derived denylist gate

After Phase 2, executor must generate a source-derived denylist from the classification ledger. Every excluded source fragment, class name, path, storage index, runtime marker and architecture term becomes final sweep input.

Denylist rows must include:

| Term / pattern | Source ledger row | Why denied | Sweep scope | Final result |
|---|---|---|---|---|
| required future artifact | required future artifact | required future artifact | final active target set + active registries/prompts | PASS only if no source leak |

Only terms proven as XIIGen-owned or forbidden-list context can survive, and they must be classified under the Forbidden Hits Gate.

## 8. XIIGen-owned active rules preservation gate

For every file touching services, async behavior, provider registration, persistence, search, logging, config, or dynamic payload boundaries, executor must produce per-file evidence that active XIIGen MVP rules remain intact.

Required preserved XIIGen rules:

| Rule family | Required evidence |
|---|---|
| Service result contract | Active service/fabric/provider docs and skills preserve `DataProcessResult<T>` where local interfaces use it; expected validation and business outcomes are `failure`, not expected throws. |
| Async | Active guidance preserves the local TypeScript `Promise<DataProcessResult<...>>` shape and passes through any existing local cancellation/`AbortSignal` control; .NET cancellation-token patterns and blocking async examples are rejected historical targets, not current guidance. |
| NestJS providers and injection tokens | Active guidance follows existing NestJS modules, providers, and injection tokens in `server/src`; .NET service-extension and middleware conventions are rejected historical targets, not current guidance. |
| Config | Examples stay close to existing config helpers/module defaults and boundary-level `process.env['KEY'] ?? defaultValue` reads. |
| Logging | Active server guidance prohibits new `console.*` logging and points to `StructuredLogger`, NestJS logging, or the existing local structured logger pattern with metadata objects. |
| Persistence dynamic payloads | Database/document guidance preserves `Record<string, unknown>` and `unknown` dynamic payload boundaries instead of introducing fixed schemas. |
| Search filtering | Search guidance uses `buildSearchFilter` or `buildSearchFilterFlat`; criteria skip `null`, `undefined`, blank strings, empty arrays, and empty objects. |
| Storage/index naming | No static historical index allowlist gate is active. Storage or index names may survive only with active XIIGen source evidence and source-leak classification. |

If a touched file lacks per-file evidence for the relevant rule families, final acceptance is `FAIL`.

## 9. Forbidden hits gate

Forbidden scan hits do not all fail automatically. Every hit must be classified as exactly one of:

- `source leak`
- `XIIGen-owned`
- `forbidden-list context`
- `evidence-only`

Only `source leak` fails. A hit may be marked `XIIGen-owned` only with active XIIGen authority file:line evidence. A hit may be marked `forbidden-list context` only if it appears inside a denylist, review rule, or other guardrail text that is not active implementation guidance.

Required Forbidden Hits Ledger:

| Hit | File:line | Classification | Evidence | Decision |
|---|---|---|---|---|
| required future artifact | required future artifact | required future artifact | required future artifact | PASS only if no source leak |

## 10. Reference Update Allowlist gate

Indexes, prompts and docs may be changed only through an explicit allowlist. The purpose must be limited to routing, canonicalization or contradiction removal for universal skills/guidance.

Required Reference Update Allowlist columns:

| Exact target path | Exact line/ref | Purpose | Allowed operation | Blocking evidence | No generic cleanup confirmation |
|---|---|---|---|---|---|
| required future artifact | required future artifact | `routing`, `canonicalization`, or `contradiction removal` only | `add ref`, `remove stale ref`, `rename canonical ref`, `legacy-label`, `no-op` | required file:line | required |

Rules:

- No generic cleanup.
- No style-only edits.
- No docs-root/README/INSTRUCTIONS/flow-design change unless an exact allowlist row proves a blocking universal-reference need.
- Non-routing contradiction sweep items are evidence-only or block unless proven to block universal skills/guidance routing/canonicalization.
- If a referenced path is patch, stale, missing or legacy without proper label, active routing to it is `FAIL`.

## 11. Contradiction sweep gate

Contradiction sweep is not a license to rewrite broad docs. It has two categories:

| Category | Allowed decision |
|---|---|
| Blocks universal skills/guidance routing/canonicalization | allowlisted fix, legacy-label, exclude or block |
| Does not block routing/canonicalization | evidence-only or block; no edit |

Docs root, README, INSTRUCTIONS and flow-design families are no-op unless exact allowlist row proves blocking universal-reference need.

## 12. Canonicalization decision gate

Section 12 canonicalization decision is mandatory input before any missing skill add. A target path/name cannot repeat a source/raw name unless there is proven XIIGen canonical match.

Required Canonicalization Ledger columns:

| Source/raw name rejected | XIIGen canonical skill name/slug | Naming evidence file:line | XIIGen layer evidence | Nearest existing XIIGen skill/interface evidence | Why not docs-only/runtime-layer | Decision |
|---|---|---|---|---|---|---|
| required future artifact | required future artifact | required future artifact | required future artifact | required future artifact | required future artifact | `update`, `add`, `exclude`, `block`, or `legacy-label` |

Hard fails:

- target path repeats source name without proven XIIGen canonical match
- target display name repeats source name without proven XIIGen canonical match
- missing naming evidence
- missing XIIGen layer evidence
- missing nearest existing skill/interface evidence
- missing explanation for why this is not docs-only or runtime-layer work

## 13. Existing-equivalent search gate

Before any `decision = add`, executor must run equivalent search across the target repository and stale families.

Required search scopes:

- target `skills`
- `.claude/skills`
- `.agents/skills`
- active docs
- active indexes
- active prompts
- versioned/stale/legacy docs
- `PATCH*` and patch-like files
- archive/archived/old/stale/vN/vN.N/vN_N families discovered in Phase 0

Required Equivalent Search Ledger columns:

| Candidate | Equivalent search scopes | Search terms/aliases | Matches with file:line | Equivalent verdict | Canonicalization decision |
|---|---|---|---|---|---|
| required future artifact | required future artifact | required future artifact | required future artifact | `active equivalent`, `stale equivalent`, `none`, or `block` | must match Section 12 |

Decision rules:

- If active equivalent exists, action is `update`, not `add`.
- If stale/versioned/patch equivalent exists, executor must promote/merge, legacy-label, exclude or block.
- If equivalent verdict is not complete, add is `FAIL`.

## 14. Controlled-add architecture fit gate

Controlled add is allowed only when all of these are true:

- Section 12 canonicalization decision is complete.
- Equivalent search gate is complete.
- Active XIIGen authority evidence exists for architecture fit.
- The skill is universal guidance/adaptation, not source runtime architecture.
- The skill belongs in skills/guidance rather than docs-only or runtime-layer.

Required Controlled Add Ledger:

| Candidate | Active XIIGen authority evidence | Skill/interface fit | Layer fit | Why controlled add is needed | Why update is insufficient | Decision |
|---|---|---|---|---|---|---|
| required future artifact | required file:line | required file:line | required file:line | required | required | `add`, `exclude`, or `block` |

If `AGENTS.md`, `docs/state/STATE.json`, `server/src/kernel/data-process-result.ts`, `server/src/kernel/build-search-filter.ts`, `.claude/skills/SKILL-INDEX.md`, `.claude/skills/HOW-TO-USE-SKILLS.md`, or active-current replacements are absent, controlled add blocks until replacements are selected with file:line evidence.

## 15. Active outbound route graph gate

Executor must build an active outbound route graph, not only inbound references.

Required Active Outbound Route Graph columns:

| Source file:line | Ref text | Ref type | Resolved absolute target | Target exists | Target status | Target family | Decision | Evidence after fix |
|---|---|---|---|---:|---|---|---|---|
| required future artifact | required future artifact | `skill`, `doc`, `prompt`, `index`, `state`, `how-to`, `route` | required future artifact | required future artifact | `active`, `legacy`, `patch`, `stale`, `missing`, `evidence-only` | required future artifact | required future artifact | required future artifact |

Hard fail conditions:

- unresolved outbound ref
- active ref to patch path
- active ref to stale path
- active ref to missing path
- active ref to legacy/compat path without strict non-active label and explicit non-active treatment
- outbound route graph absent

## 16. Legacy, compatibility and stale label gate

Any legacy/compatibility/non-active target must be labeled at the first heading or front matter. Acceptable first active marker must say one of:

- `non-active`
- `legacy`
- `compatibility`
- `archive`
- Russian equivalent that unambiguously means non-active

If an active route points to legacy/compat/stale content, execution is `FAIL`. If a stale file is kept as evidence, it must be excluded from active routing and included in the route graph as evidence-only.

## 17. Interface signature gate

All method/interface signatures mentioned in active docs, prompts or indexes must be checked against canonical interface source, not only `IndexExistsAsync`.

Required Interface Signature Ledger:

| Mentioned signature | Mention file:line | Canonical interface source file:line | Match status | Decision |
|---|---|---|---|---|
| required future artifact | required future artifact | required future artifact | `match`, `mismatch`, or `not interface` | mismatch is fix, legacy-label, exclude or block |

Any mismatch in active docs/prompts/indexes is `FAIL` until fixed, legacy-labeled, excluded or blocked.

## 18. Diff-to-ledger gate

Every added or modified hunk must map to one of:

- source classification ledger row
- controlled-add row
- XIIGen-owned rule preservation row
- reference update allowlist row
- route graph correction row
- legacy/compat label row

Required Diff-to-Ledger Ledger:

| Target file | Hunk summary | Hunk line range | Mapped ledger row | Mapping type | Decision |
|---|---|---|---|---|---|
| required future artifact | required future artifact | required future artifact | required future artifact | required future artifact | PASS only if every hunk maps |

If any added/modified hunk has no mapping, final acceptance is `FAIL`.

## 19. Registration propagation gate

Any accepted skill rename/add/update must propagate through active registries, prompts, indexes and route docs only through the Reference Update Allowlist and Route Graph.

Propagation evidence must include:

- old ref file:line
- new ref file:line
- canonical skill name/slug
- active outbound route graph row
- no-change/N/A rationale for every active registry/prompt/doc family that did not change

No-change is accepted only with explicit `N/A because ...` rationale.

## 20. Final Coverage Acceptance Packet

If the request requires final coverage acceptance proof before execution, v3 requires a generated Final Coverage Acceptance Packet before execution continues. If v3 is plan-only, execution must generate the packet before Phase 2 can pass.

No template row is proof. Required future artifact tables in this plan are instructions, not acceptance evidence.

Final Coverage Acceptance Packet must include:

| Packet section | Required content |
|---|---|
| Runtime count packet | actual counts and reconciliation status |
| Source classification coverage | every admitted file fully covered with no gaps/overlaps |
| Coverage ledger | includes `Mismatch type` and `Reconciliation status` |
| Known blockers reconciliation | explicit result for both translation-domain files and duplicate human-readable architecture audit rows |
| Source-derived denylist | generated from excluded fragments/classes/paths/storage/runtime/architecture terms |
| Canonicalization ledger | complete Section 12 decisions |
| Equivalent search ledger | complete search scopes, terms, matches and verdicts |
| Active outbound route graph | zero unresolved active refs |
| Diff-to-ledger ledger | every hunk mapped |
| XIIGen rules preservation | per-file evidence for affected rule families |
| Final quality sweeps | concrete proof, not assertion |

Final acceptance cannot pass with blank cells, template rows presented as proof, or statuses equivalent to unknown, pending or unreviewed.

## 21. Final C4 quality gate

The final acceptance must directly include concrete proof for zero active-target hits in these categories:

| Category | Proof required | Scope |
|---|---|---|
| Semantic patch snippets | patch marker scan and file:line results | final active target set + active registries/prompts |
| TODO/TBD/FIXME/placeholders | placeholder sweep results | final active target set + active registries/prompts only |
| Stale headers | stale header/version reconciliation | final active target set + active registries/prompts |
| Conflicting skill names | canonical skill-name map against active indexes/prompts/docs | final active target set + active registries/prompts |

Placeholder sweep is scoped only to the final active target set plus active registries/prompts. Plans, review artifacts and evidence artifacts are excluded unless they are active docs.

## 22. Human-readable output gate

All final docs/prompts/index outputs must be human-readable Russian Markdown. They must not contain:

- raw review dumps
- patch fragments
- semantic diff language
- machine garbage
- unclear ledger dumps
- unresolved template rows
- contradictory skill names
- stale active headers

Ledger artifacts may exist as verification packets, but active user-facing guidance must remain readable and purposeful.

## 23. Phase 3: Controlled update/adaptation rules

When Phase 0-2 gates pass, executor may adapt/update only universal skills/guidance that passed canonicalization and equivalent search.

Adaptation rules:

- Rewrite universal intent into XIIGen language.
- Preserve XIIGen-owned rules exactly where the target family touches them.
- Exclude source architecture, runtime internals, storage/index names, implementation details and source-specific vocabulary unless proven XIIGen-owned.
- Do not copy source file names, headings or slugs unless canonicalization proves they are valid XIIGen canonical names.
- Keep target docs concise and operational.

## 24. Phase 4: Reference propagation and active refs

Phase 4 applies only allowlisted reference updates and then rebuilds the active outbound route graph. It must prove:

- zero unresolved outbound refs
- zero active refs to patch/stale/missing paths
- zero active refs to legacy/compat paths
- canonical load order consistency
- no-change/N/A rationale for every untouched active registry/prompt/doc family

## 25. Phase 5: Final verification and summary

Final verification must run after all edits and include:

- Final Coverage Acceptance Packet
- Forbidden Hits Ledger
- Source-derived denylist sweep
- Interface Signature Ledger
- Active Outbound Route Graph
- Diff-to-Ledger Ledger
- C4 quality proof
- XIIGen rules preservation evidence

Post-execution summary must include:

- reference propagation and active refs result
- no-change/N/A rationale
- final PASS/FAIL by gate
- remaining user decisions explicit list, or exact text `none`

## 26. Work orders through subagents

All workstreams below are authorized after v3 repair, with branch/base gate still enforced.

Shared work order header for every subagent:

- model: `gpt-5.5`
- effort: `xhigh`
- implementation_authorized_now: `yes after v3 repair because user explicitly said proceed to execution without stops (translated from Russian)`
- branch/base gate: enforced; read-only mismatch blocks execution
- target worktree: `C:\Projects\xiigen-mvp-universal-skills-work`
- git operations: not part of this plan unless user separately authorizes

### Workstream 1: Phase 0 discovery / active authority / hidden roots

Mission: discover active repository truth before edits.

Inputs:

- v3 plan
- target worktree
- user instruction

Required actions:

- Run hidden-root discovery with `rg --hidden` and explicit `.claude` / `.agents` paths.
- Discover root/inbound guidance files listed in Phase 0.
- Discover patch/version/legacy/stale/archive families.
- Discover active authority files or active-current replacements.
- Build Canonical Load Order Packet.
- Classify nested stale dirs as out-of-scope/evidence-only unless selected by active table.

Deliverables:

- Active Authority Table
- Canonical Load Order Packet
- Discovery inventory with active/evidence-only/block decisions
- Phase 0 PASS/FAIL

Hard block:

- missing active authority with no replacement
- unresolved expected active root
- branch/base mismatch

### Workstream 2: Source index + source skills coverage packet

Mission: prove source inventory and coverage before any adaptation.

Required actions:

- Parse `## Skill index` using the v3 boundary rule.
- Decide whether `New skills added by authority/self-reflection repair` is active index or controlled-add evidence.
- Produce Runtime Count Packet without hardcoded counts.
- Reconcile known blockers: both translation-domain files and duplicate `human-readable-architecture-audit-SKILL.md` rows.
- Build exhaustive Source Classification Ledger.
- Generate source-derived denylist.

Deliverables:

- Runtime Count Packet
- Coverage Ledger with `Mismatch type` and `Reconciliation status`
- Source Classification Ledger
- Source-derived Denylist
- Phase 2 PASS/FAIL

Hard block:

- any missing source file/section/line range
- any gap or overlap
- any blank excluded-fragments or XIIGen-preserved-rules cell
- any unknown/pending/unreviewed classification

### Workstream 3: Target equivalent / canonicalization / route graph

Mission: prevent duplicate or source-named additions and prove active routing.

Required actions:

- Build Canonicalization Ledger with all Section 12 columns.
- Run existing-equivalent search across all required scopes before every add decision.
- Build Active Outbound Route Graph.
- Build Interface Signature Ledger.
- Classify patch/stale/legacy routes.

Deliverables:

- Canonicalization Ledger
- Equivalent Search Ledger
- Active Outbound Route Graph
- Interface Signature Ledger
- add/update/exclude/block decisions

Hard block:

- repeated source name without XIIGen canonical proof
- active equivalent treated as add
- unresolved outbound ref
- active route to patch/stale/missing/legacy target
- interface signature mismatch left active

### Workstream 4: Controlled update/adaptation of existing universal skills and allowed missing skills

Mission: perform only ledger-backed edits.

Required actions:

- Update active equivalents rather than adding duplicates.
- Add only candidates that passed controlled-add architecture fit.
- Preserve XIIGen rules per touched file.
- Exclude source internals and denylist terms.
- Maintain human-readable Russian Markdown.
- Build Diff-to-Ledger Ledger while editing.

Deliverables:

- Updated allowed skills/guidance
- Added allowed missing skills, if any
- XIIGen Rules Preservation Evidence
- Diff-to-Ledger Ledger
- Forbidden Hits Ledger draft

Hard block:

- unmapped hunk
- source leak
- XIIGen rule preservation not proven
- generic cleanup outside allowlist

### Workstream 5: Registry / prompt / docs reference propagation and final verification

Mission: propagate only allowed references and prove final acceptance.

Required actions:

- Apply Reference Update Allowlist only.
- Rebuild active outbound route graph after edits.
- Run source-derived denylist sweep.
- Run forbidden hits classification.
- Run C4 quality gate with concrete proof.
- Produce Final Coverage Acceptance Packet.
- Produce post-execution summary with no-change/N/A rationale and remaining user decisions.

Deliverables:

- Reference Update Allowlist final state
- Active Outbound Route Graph after fix
- Final Coverage Acceptance Packet
- C4 proof
- Post-execution summary

Hard block:

- unresolved active ref
- missing final coverage proof
- placeholder/stale/patch/conflicting-name hit in active target set
- raw dump or machine garbage in active output

## 27. Review protocol for v3 execution

Execution can pass only if each gate reports PASS with evidence. A reviewer must be able to trace:

1. every source line admitted or excluded;
2. every target hunk to a ledger row;
3. every new or changed reference to an allowlist row;
4. every canonical skill name to XIIGen evidence;
5. every active outbound ref to an existing active target;
6. every preserved XIIGen rule to per-file evidence.

Any reviewer finding one missing trace marks the execution `FAIL`.

## 28. Remaining decisions before execution

No user decision is required to proceed after v3 repair unless a blocking gate discovers one of these:

- branch/base mismatch;
- missing active XIIGen authority with no provable replacement;
- ambiguous active source index boundary;
- conflict between active load order sources;
- candidate add that cannot be canonicalized or mapped to XIIGen architecture.

If none occur, the required remaining user decisions list in the post-execution summary must be exactly `none`.
