# Active Authority Map

Scope: final evidence refresh for `C:\Projects\xiigen-mvp-universal-skills-work`.

This file classifies authority and evidence paths observed after the worker outputs landed. It does not create runtime guidance, does not authorize edits outside the current allowlist, and does not promote legacy roots.

## Discovery Summary

- Final active guidance is present at the repository root and under `.claude\skills`.
- `AGENTS.md` is the root authority for this worktree and explicitly identifies the project as the active NestJS/TypeScript XIIGen MVP codebase.
- `CLAUDE.md`, `.claude\skills\HOW-TO-USE-SKILLS.md`, `.claude\skills\SKILL-INDEX.md`, `.claude\skills\XIIGEN-SESSION-START-PROMPT.md`, and 24 `.claude\skills\universal\*\SKILL.md` files are active/current guidance.
- `docs\state\STATE.json`, `server\src\kernel\data-process-result.ts`, and `server\src\kernel\build-search-filter.ts` are active source/state evidence used by the guidance load order.
- `docs\ai-skills` contains evidence artifacts only. It is not an active skill root.
- Final skill routing evidence: 24 active universal skills, 24 active `SKILL-INDEX.md` rows, 21 unique HOW-TO skill refs, and 0 missing refs.
- Coverage ledger evidence now records all 107 universal-add source candidates as either direct active targets or consolidated into the 24 active universal skills.
- Active universal skills have no stale .NET/C# deny hits after cleanup. Any stale/source terms remaining in coverage or denylist evidence are not active guidance.
- Optional legacy roots that are still absent are classified as absent/out-of-scope, not as active route failures.
- No git operation is authorized or required by this evidence refresh.

## Active Authority Table

| Exact path | Role | Status | Decision |
|---|---|---|---|
| `C:\Projects\xiigen-mvp-universal-skills-work\AGENTS.md` | Root worktree authority | active/current | Load first for worktree rules; it supersedes old .NET-era guidance for this NestJS/TypeScript worktree. |
| `C:\Projects\xiigen-mvp-universal-skills-work\CLAUDE.md` | Claude entry guidance | active/current | Points to `AGENTS.md`, state/source evidence, and the local skill index/HOW-TO. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\state\STATE.json` | Project state artifact | active/current evidence | Confirms the active project state from the current `origin/main` layout. |
| `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\data-process-result.ts` | Result contract source | active/current source evidence | Defines `DataProcessResult<T>` and local `success`, `failure`, and `error` constructors. |
| `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\build-search-filter.ts` | Search-filter source | active/current source evidence | Defines `buildSearchFilter`, `buildSearchFilterFlat`, and empty-value skipping. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\HOW-TO-USE-SKILLS.md` | Skill routing guide | active/current | Maps task triggers to universal skills and resolves exact files through the local index. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | Skill registry | active/current | Lists 24 active universal skills with exact local paths. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\XIIGEN-SESSION-START-PROMPT.md` | Session start prompt | active/current | Mirrors the final load order and active local rules. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\universal\*\SKILL.md` | Universal skill package | active/current | 24 files present; use as process guidance only and do not edit unless explicitly allowed. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\ACTIVE-AUTHORITY-MAP.md` | Evidence packet | evidence-only | Final authority classification; editable in this workstream. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\REFERENCE-UPDATE-ALLOWLIST.md` | Evidence packet | evidence-only | Final reference/update allowlist; editable in this workstream. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\CANONICAL-ROUTE-GRAPH.md` | Evidence packet | evidence-only | Final route graph; editable in this workstream. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\EXECUTION-VERIFICATION-PACKET.md` | Evidence packet | evidence-only | Final verification packet; editable in this workstream. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\SOURCE-SKILL-COVERAGE-LEDGER.md` | Coverage evidence | evidence-only | Updated to separate pre-execution source classification from final adapted target status. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\SOURCE-DERIVED-DENYLIST.md` | Denylist evidence | evidence-only/read-only in current blocker repair | Rejected old/source terms are not active guidance. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v3.md` | Plan evidence | evidence-only | Updated to use active NestJS/TypeScript XIIGen MVP gates and reject stale historical targets. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.github\workflows\ci.yml` | CI metadata | out-of-scope | Present but not AI guidance. |

## Absent Or Out-Of-Scope Legacy Roots

| Path family | Status | Decision |
|---|---|---|
| `C:\Projects\xiigen-mvp-universal-skills-work\agent.md` | absent/out-of-scope | Lowercase legacy root not used; `AGENTS.md` is active. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.agents\**` | absent/out-of-scope | No active route uses `.agents`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.codex\**` | absent/out-of-scope | No active route uses `.codex`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.cursor\**` | absent/out-of-scope | No active route uses `.cursor`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.windsurf\**` | absent/out-of-scope | No active route uses `.windsurf`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\context\interfaces.cs` | absent/out-of-scope | Old .NET authority path is not active in this NestJS/TypeScript worktree. |
| `C:\Projects\xiigen-mvp-universal-skills-work\skills\INDEX.md` | absent/out-of-scope | Old skill-index path is not active; local active index is `.claude\skills\SKILL-INDEX.md`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\SKILLS_INDEX.md` | absent/out-of-scope | Old/alternate filename not used; active index is `.claude\skills\SKILL-INDEX.md`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\.claude\XIIGEN-SESSION-START-PROMPT-v4.md` | absent/out-of-scope | Old/alternate filename not used; active prompt is `.claude\skills\XIIGEN-SESSION-START-PROMPT.md`. |
| `C:\Projects\xiigen-mvp-universal-skills-work\DOCUMENT_INDEX.md` | absent/out-of-scope | No active route requires it. |

## Canonical Load Order

| Load item | Resolved path | Status | Decision |
|---|---|---|---|
| Root authority | `C:\Projects\xiigen-mvp-universal-skills-work\AGENTS.md` | active/current | Load first. |
| State | `C:\Projects\xiigen-mvp-universal-skills-work\docs\state\STATE.json` | active/current evidence | Load as project state evidence. |
| Result contract | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\data-process-result.ts` | active/current source evidence | Load for local `DataProcessResult<T>` behavior. |
| Search filter | `C:\Projects\xiigen-mvp-universal-skills-work\server\src\kernel\build-search-filter.ts` | active/current source evidence | Load for empty-value search filtering. |
| Skill index | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\SKILL-INDEX.md` | active/current | Resolve exact local skill files here. |
| HOW-TO | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\HOW-TO-USE-SKILLS.md` | active/current | Use for task-trigger skill selection. |
| Session prompt | `C:\Projects\xiigen-mvp-universal-skills-work\.claude\skills\XIIGEN-SESSION-START-PROMPT.md` | active/current | Claude-facing session start guidance. |

## Final Decision

Result: PASS for this docs-only integration packet. The final active `.claude\skills` set exists and is active/current: 24 active skills, 24 active index rows, 21 HOW-TO refs, and 0 missing refs. Coverage ledger evidence maps all 107 universal-add source candidates to direct or consolidated active targets. Absent legacy roots remain absent/out-of-scope and are not treated as active route targets; coverage/denylist mentions are evidence-only.
