# Reference Update Allowlist

Scope: final integration workstream for `C:\Projects\xiigen-mvp-universal-skills-work`.

This file records the only files edited in this pass and the reference updates performed. It is evidence-only and does not authorize root-doc, skill-package, runtime, test, or git changes.

## Editable Files For This Pass

| Exact target path | Allowed operation | Reason |
|---|---|---|
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v3.md` | Update only | User explicitly named this file for stale-gate refresh. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\ACTIVE-AUTHORITY-MAP.md` | Update only | User explicitly named this file for final authority refresh. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\REFERENCE-UPDATE-ALLOWLIST.md` | Update only | User explicitly named this file for final allowlist refresh. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\CANONICAL-ROUTE-GRAPH.md` | Update only | User explicitly named this file for final route graph refresh. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\EXECUTION-VERIFICATION-PACKET.md` | Update only | User explicitly named this file for final verification refresh. |
| `C:\Projects\xiigen-mvp-universal-skills-work\docs\ai-skills\SOURCE-SKILL-COVERAGE-LEDGER.md` | Update only | User explicitly named this file for source/final target status refresh. |

## Final Observed Added Or Changed Documentation

The relevant documentation/guidance set observed for this evidence refresh is:

| Path or family | Final observed state | Classification |
|---|---|---|
| `AGENTS.md` | Added | active/current root authority |
| `CLAUDE.md` | Added | active/current Claude guidance |
| `.claude\skills\HOW-TO-USE-SKILLS.md` | Added | active/current skill routing guide |
| `.claude\skills\SKILL-INDEX.md` | Added | active/current skill registry |
| `.claude\skills\XIIGEN-SESSION-START-PROMPT.md` | Added | active/current session prompt |
| `.claude\skills\universal\*\SKILL.md` | 24 added files | active/current universal skill package |
| `docs\ai-skills\SOURCE-SKILL-COVERAGE-LEDGER.md` | Updated in this pass | evidence-only coverage ledger |
| `docs\ai-skills\SOURCE-DERIVED-DENYLIST.md` | Read-only in this pass | evidence-only denylist |
| `docs\ai-skills\ACTIVE-AUTHORITY-MAP.md` | Updated in this pass | evidence-only final authority map |
| `docs\ai-skills\REFERENCE-UPDATE-ALLOWLIST.md` | Updated in this pass | evidence-only final allowlist |
| `docs\ai-skills\CANONICAL-ROUTE-GRAPH.md` | Updated in this pass | evidence-only final route graph |
| `docs\ai-skills\EXECUTION-VERIFICATION-PACKET.md` | Updated in this pass | evidence-only final verification packet |
| `docs\plans\XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v3.md` | Updated in this pass | evidence-only plan |

## Reference Updates Performed

| File | Update performed | Result |
|---|---|---|
| `ACTIVE-AUTHORITY-MAP.md` | Reclassified `AGENTS.md`, `CLAUDE.md`, `.claude\skills\HOW-TO-USE-SKILLS.md`, `.claude\skills\SKILL-INDEX.md`, `.claude\skills\XIIGEN-SESSION-START-PROMPT.md`, and 24 universal skill files as active/current. | Clean target no longer claims the active `.claude\skills` set is absent. |
| `ACTIVE-AUTHORITY-MAP.md` | Reclassified old .NET and alternate Claude roots such as `context\interfaces.cs`, `skills\INDEX.md`, `.agents\**`, `.claude\SKILLS_INDEX.md`, and `.claude\XIIGEN-SESSION-START-PROMPT-v4.md` as absent/out-of-scope. | Absent legacy roots are not active route failures. |
| `REFERENCE-UPDATE-ALLOWLIST.md` | Restricted the allowlist to include the six current user-named docs/evidence files. | Scope matches the current user instruction. |
| `CANONICAL-ROUTE-GRAPH.md` | Rebuilt the active route graph from final active source files: `AGENTS.md`, `CLAUDE.md`, `HOW-TO-USE-SKILLS.md`, `SKILL-INDEX.md`, and `XIIGEN-SESSION-START-PROMPT.md`. | Active path references resolve to active/current targets or source/state evidence. |
| `CANONICAL-ROUTE-GRAPH.md` | Added all 24 indexed universal skill targets from `SKILL-INDEX.md`. | Every indexed skill path exists under `.claude\skills\universal`. |
| `CANONICAL-ROUTE-GRAPH.md` | Added final count evidence and active rejected-historical guidance sweep result. | 24 active skills, 24 active index rows, 21 HOW-TO refs, 0 missing; active skills have no stale .NET/C# deny hits after cleanup. |
| `SOURCE-SKILL-COVERAGE-LEDGER.md` | Split pre-execution source classification from final adapted target status. | All 107 universal-add source candidates are either direct active targets or consolidated into active `.claude\skills\universal\*\SKILL.md` targets. |
| `XIIGEN-MVP-UNIVERSAL-SKILLS-GUIDANCE-REFRESH-PLAN-v3.md` | Replaced stale historical acceptance gates with active NestJS/TypeScript XIIGen MVP gates and active authority roots. | Plan now points to `AGENTS.md`, `docs/state/STATE.json`, `server/src/kernel/data-process-result.ts`, `server/src/kernel/build-search-filter.ts`, `.claude/skills/SKILL-INDEX.md`, `.claude/skills/HOW-TO-USE-SKILLS.md`, `.claude/skills/XIIGEN-SESSION-START-PROMPT.md`, `DataProcessResult<T>`, `buildSearchFilter`/`buildSearchFilterFlat`, dynamic payloads, structured logging/local logger, NestJS providers/injection tokens, config helpers/defaults, and no expected/business throws. |
| `EXECUTION-VERIFICATION-PACKET.md` | Replaced pre-merge language with final scoped checks, route summary, source-leak sweep, unresolved-marker/patch sweep, XIIGen rule evidence, no-change rationale, and remaining decisions. | Final packet reflects the actual final state checked in this pass. |

## Explicitly Not Allowed In This Pass

| Path or family | Operation | Reason |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, root README, root indexes | No edit | User restricted edits to the six named docs/evidence files. |
| `.claude\skills\**` | No edit | User said not to touch skills. |
| `skills\**`, root docs, `docs\runtime\**`, `tests\**` | No edit | User explicitly excluded skills, root docs, runtime docs, and tests. |
| `server\**`, `client\**`, package files, generated files | No edit | Runtime/code changes are outside this verification-doc request. |
| Git staging, commit, branch, push, PR operations, or git state edits | No operation | User explicitly forbade git work. |

## No Generic Docs Cleanup

No generic docs cleanup was performed. The only edits were targeted evidence refreshes in the six user-named files, limited to stale-gate removal, source/final status separation, route/count evidence, allowlist scope, and verification evidence.
