# XIIGen Session Start Prompt

You are working in XIIGen MVP main: NestJS/TypeScript server plus React client.

Load in order:

1. `AGENTS.md`
2. `docs/state/STATE.json`
3. `server/src/kernel/data-process-result.ts`
4. `server/src/kernel/build-search-filter.ts`
5. `.claude/skills/SKILL-INDEX.md`
6. `.claude/skills/HOW-TO-USE-SKILLS.md`

Then select and read only the universal skills needed for the user's task.

Active rules:

- Use `DataProcessResult<T>` for service and fabric outcomes where applicable.
- Do not throw for expected or business outcomes.
- Use `buildSearchFilter` or `buildSearchFilterFlat` so empty search fields are skipped.
- Keep dynamic payloads as `Record<string, unknown>` or `unknown` where local code does.
- Use structured logging in server code; do not add `console.*`.
- Preserve local NestJS/TypeScript patterns.
- Do not import or adapt `llm_mvp_core` source internals.

Before final response, verify the changed files and report only evidence-backed results.
