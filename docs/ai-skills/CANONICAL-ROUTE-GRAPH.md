# Canonical Route Graph

Scope: final active guidance and universal-skills routing for `C:\Projects\xiigen-mvp-universal-skills-work`.

This graph uses the final active source files present in the worktree. Evidence-only docs under `docs\ai-skills` are not active guidance routes.

## Discovery Inputs

- `rg --hidden --glob '!/.git/**' --files`
- `git status --short`
- `git status --short --untracked-files=all`
- `git diff --name-status`
- Backtick-token extraction from `AGENTS.md`, `CLAUDE.md`, `.claude\skills\HOW-TO-USE-SKILLS.md`, `.claude\skills\SKILL-INDEX.md`, and `.claude\skills\XIIGEN-SESSION-START-PROMPT.md`
- Source-leak and unresolved-marker sweeps scoped to `AGENTS.md`, `CLAUDE.md`, and `.claude\skills`

## Active Source Files

| Source family | Resolved source path | Status | Decision |
|---|---|---|---|
| Root authority | `C:\Projects\xiigen-mvp-universal-skills-work\AGENTS.md` | active/current | Primary worktree guidance. |
| Claude entry | `C:\Projects\xiigen-mvp-universal-skills-work\CLAUDE.md` | active/current | Claude-facing pointer to root authority and local skills. |
| HOW-TO | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\HOW-TO-USE-SKILLS.md` | active/current | Task-trigger skill routing guide. |
| SKILL-INDEX | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | active/current | Exact local universal skill path registry. |
| SESSION-START | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\XIIGEN-SESSION-START-PROMPT.md` | active/current | Session load prompt. |
| Universal skill package | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\*\SKILL.md` | active/current | 24 indexed process-guidance files. |

## Resolved Path Routes

Duplicate references are shown once per source/target pair. Protective mentions of `llm_mvp_core` are source-boundary warnings, not active routes.

| Source | Outbound reference | Resolved target | Exists | Target status | Decision |
|---|---|---|---:|---|---|
| `AGENTS.md` | `docs/state/STATE.json` | `C:\Projects\xiigen-mvp-universal-skills-work\docs\state\STATE.json` | yes | active/current evidence | Valid route. |
| `AGENTS.md` | `server/src/kernel/data-process-result.ts` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\data-process-result.ts` | yes | active/current source | Valid route. |
| `AGENTS.md` | `server/src/kernel/build-search-filter.ts` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\build-search-filter.ts` | yes | active/current source | Valid route. |
| `AGENTS.md` | `.claude/skills/SKILL-INDEX.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | yes | active/current guidance | Valid route. |
| `AGENTS.md` | `.claude/skills/HOW-TO-USE-SKILLS.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\HOW-TO-USE-SKILLS.md` | yes | active/current guidance | Valid route. |
| `AGENTS.md` | `server/src` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src` | yes | active/current source root | Valid route. |
| `AGENTS.md` | `client/src` | `C:\Projects\xiigen-mvp-universal-skills-work\client\src` | yes | active/current source root | Valid route. |
| `AGENTS.md` | `.claude/skills/universal/**` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal` | yes | active/current skill root | Valid route. |
| `CLAUDE.md` | `AGENTS.md` | `C:\Projects\xiigen-mvp-universal-skills-work\AGENTS.md` | yes | active/current guidance | Valid route. |
| `CLAUDE.md` | `docs/state/STATE.json` | `C:\Projects\xiigen-mvp-universal-skills-work\docs\state\STATE.json` | yes | active/current evidence | Valid route. |
| `CLAUDE.md` | `server/src/kernel/data-process-result.ts` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\data-process-result.ts` | yes | active/current source | Valid route. |
| `CLAUDE.md` | `server/src/kernel/build-search-filter.ts` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\build-search-filter.ts` | yes | active/current source | Valid route. |
| `CLAUDE.md` | `.claude/skills/SKILL-INDEX.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | yes | active/current guidance | Valid route. |
| `CLAUDE.md` | `.claude/skills/HOW-TO-USE-SKILLS.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\HOW-TO-USE-SKILLS.md` | yes | active/current guidance | Valid route. |
| `HOW-TO-USE-SKILLS.md` | `.claude/skills/SKILL-INDEX.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | yes | active/current guidance | Valid route. |
| `HOW-TO-USE-SKILLS.md` | `AGENTS.md` | `C:\Projects\xiigen-mvp-universal-skills-work\AGENTS.md` | yes | active/current guidance | Valid route. |
| `HOW-TO-USE-SKILLS.md` | `docs/state/STATE.json` | `C:\Projects\xiigen-mvp-universal-skills-work\docs\state\STATE.json` | yes | active/current evidence | Valid route. |
| `HOW-TO-USE-SKILLS.md` | `client/src` | `C:\Projects\xiigen-mvp-universal-skills-work\client\src` | yes | active/current source root | Valid route. |
| `XIIGEN-SESSION-START-PROMPT.md` | `AGENTS.md` | `C:\Projects\xiigen-mvp-universal-skills-work\AGENTS.md` | yes | active/current guidance | Valid route. |
| `XIIGEN-SESSION-START-PROMPT.md` | `docs/state/STATE.json` | `C:\Projects\xiigen-mvp-universal-skills-work\docs\state\STATE.json` | yes | active/current evidence | Valid route. |
| `XIIGEN-SESSION-START-PROMPT.md` | `server/src/kernel/data-process-result.ts` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\data-process-result.ts` | yes | active/current source | Valid route. |
| `XIIGEN-SESSION-START-PROMPT.md` | `server/src/kernel/build-search-filter.ts` | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\build-search-filter.ts` | yes | active/current source | Valid route. |
| `XIIGEN-SESSION-START-PROMPT.md` | `.claude/skills/SKILL-INDEX.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | yes | active/current guidance | Valid route. |
| `XIIGEN-SESSION-START-PROMPT.md` | `.claude/skills/HOW-TO-USE-SKILLS.md` | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\HOW-TO-USE-SKILLS.md` | yes | active/current guidance | Valid route. |

## Indexed Universal Skill Routes

`SKILL-INDEX.md` references these exact active targets:

| Indexed target | Exists | Target status |
|---|---:|---|
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\agent-output-format\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\authority-requirement-binding\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\claim-verification\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\code-examination\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\coverage-completeness-gate\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\dev-safety\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\documentation-sync\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\goal-delivery-completeness\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\implementation-integrity\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\multi-reviewer-design\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\output-readability-gate\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\phase-planning\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\planning-session-startup\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\plan-review\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\plan-self-validation\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\reconnaissance-gate\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\root-cause-tracing\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\session-execution-log\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\session-output-contract\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\specificity-calibration\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\systematic-debugging\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\test-integrity\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\verification-before-completion\SKILL.md` | yes | active/current |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\work-scope-inventory\SKILL.md` | yes | active/current |

## HOW-TO Skill Label Resolution

`HOW-TO-USE-SKILLS.md` contains task-trigger skill refs as exact active skill slugs. Exact file routes are resolved through `SKILL-INDEX.md`.

| Verification item | Count | Resolution |
|---|---:|---|
| Universal skill directories | 24 | Existing active directories under `.claude\skills\universal`. |
| Active `SKILL-INDEX.md` rows | 24 | Each indexed path resolves to an existing active `SKILL.md`. |
| Unique HOW-TO skill refs | 21 | Each ref matches an indexed active skill slug. |
| Missing HOW-TO skill refs | 0 | No HOW-TO skill ref routes to an absent or stale skill. |
| Coverage ledger universal-add target coverage | 107 | Every universal-add/add source candidate is either a direct active target or consolidated into one of the 24 active skills. |

HOW-TO refs observed: `authority-requirement-binding`, `claim-verification`, `code-examination`, `coverage-completeness-gate`, `dev-safety`, `documentation-sync`, `goal-delivery-completeness`, `implementation-integrity`, `multi-reviewer-design`, `output-readability-gate`, `phase-planning`, `plan-review`, `plan-self-validation`, `planning-session-startup`, `reconnaissance-gate`, `root-cause-tracing`, `session-output-contract`, `systematic-debugging`, `test-integrity`, `verification-before-completion`, `work-scope-inventory`.

## Active Rejected-Historical Guidance Sweep

| Sweep scope | Result | Decision |
|---|---|---|
| `.claude\skills\universal\*\SKILL.md` | No stale .NET/C# deny hits after cleanup for rejected historical guidance patterns such as .NET-specific result, cancellation, service-extension, search API, logging, or static index guidance. | PASS. |
| `docs\ai-skills\SOURCE-SKILL-COVERAGE-LEDGER.md` and `docs\ai-skills\SOURCE-DERIVED-DENYLIST.md` | May mention rejected/source terms as coverage or denylist evidence. | Evidence-only, not active guidance. |

## Out-Of-Scope Legacy Routes

| Reference family | Status | Decision |
|---|---|---|
| `.agents\**` | absent/out-of-scope | No active source routes here. |
| `context\interfaces.cs` | absent/out-of-scope | Old .NET authority path; not active in this NestJS/TypeScript worktree. |
| `skills\INDEX.md` | absent/out-of-scope | Old index path; active local index is `.claude\skills\SKILL-INDEX.md`. |
| `.claude\SKILLS_INDEX.md` | absent/out-of-scope | Alternate old filename; no active source routes here. |
| `.claude\XIIGEN-SESSION-START-PROMPT-v4.md` | absent/out-of-scope | Alternate old filename; no active source routes here. |
| Patch, archive, old, stale, snapshot, temporary route families | absent/out-of-scope | No active source routes here. |

## Route Graph Result

Active path references to patch targets: zero.

Active path references to stale targets: zero.

Active path references to absent targets: zero.

Final status: PASS for active path routing. HOW-TO skill routing now references only existing active skill slugs: 24 active skills, 24 active index rows, 21 HOW-TO refs, and 0 missing refs. Coverage evidence does not require adding 83 more skills; those source candidates are consolidated into the active 24-skill package.
