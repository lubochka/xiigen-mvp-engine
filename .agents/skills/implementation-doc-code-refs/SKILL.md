---
name: implementation-doc-code-refs
version: "1.0.0"
sk_number: SK-562
priority: MANDATORY
load_order: 9
category: planning
contexts: ["web-session", "claude-code"]
origin: ported from llm_mvp_core/docs/skills/implementation-doc-code-refs-SKILL.md (Universal-Skills refresh, UpdateUniversalSkills)
---

# implementation-doc-code-refs — Part A §3 (WHY / HOW / WHAT code references)

> Ported universal standard. The mvp planning library had no §3 contract requiring
> WHY/HOW/WHAT with precise `file:line`. Code references in session documents were not
> obliged to explain "why" or the internals of called functions. This skill adds that
> contract. TS adaptation for this mvp project: citations are `.ts` with `path:line`
> reflecting the code AS ACTUALLY IMPLEMENTED; WHY explains thresholds/configs; HOW opens
> the internals of called NestJS providers / RAG FastAPI calls / React hooks.

## When to Invoke

- When authoring Part A §3 of any plan that touches code, AFTER §1/§2 (the algorithms).

## §3 — Three layers per cited code block

For EACH code block you cite, provide all three layers:

```
WHY  — why exactly this decision / this threshold / this constant exists
       (what would be bad without it; which invariant it protects).
HOW  — what happens inside the called function STEP BY STEP
       (not "calls X", but what X does internally; open up the body of the called method).
WHAT — concrete values in comments (real examples of input/output).
```

Plus: a precise `path:line` citation that matches the code as actually implemented, and
a short verbatim quote of the cited lines.

**Forbidden:** a comment that merely renames the call ("// calls register()") is not
an explanation. A `file:line` citation alone, with no WHY/HOW/WHAT, FAILS §3.

### Example §3

> `server/src/registration/register.service.ts:42`
> ```ts
> if (existing.success && existing.value) {
>   return DataProcessResult.failure('EMAIL_TAKEN');   // duplicate within the tenant
> }
> ```

```
WHY:  email uniqueness — a domain invariant within the tenant (P1 multi-tenant).
      Without this check two users of the same tenant could get the same email,
      which breaks login and password reset.
HOW:  existing = await this.userStore.findByEmail(email). Inside InMemoryUserStore.findByEmail
      a filter is built via BuildSearchFilter over {email, tenantId}, where tenantId is taken from
      AsyncLocalStorage (DNA-5), and a DataProcessResult is returned: .success(user) if found,
      .success(null) if not, .failure(code) on store failure.
WHAT: email="a@b.co", tenantId="t_42" → existing = .success({userId:"u_9"}) → failure branch;
      email="new@b.co" → existing = .success(null) → the check does not fire, we continue.
```

## Citation discipline

```
□ path:line points to a line that really exists (not to a plan, not to "future" code).
□ The quote is short and verbatim (1–6 lines), matches the file.
□ For thresholds/constants (0.85, limits, timeouts) WHY is mandatory.
□ For every external call HOW opens the body of the called method, not just its name.
□ The return type in quotes is DataProcessResult<T> (.success/.failure), not throw in business logic.
```

## Anti-patterns

- `file:line` without a WHY/HOW/WHAT explanation — FAIL (it is a pointer, not §3).
- Comment = renaming of the call — FAIL.
- A code quote "as planned" that diverges from the real file — FAIL.
- A threshold/constant without WHY — the reason for exactly this value must be explained.

## Integration

- Builds on §1/§2 (`implementation-doc-algorithms`) — §3 cites the code implementing the steps.
- Feeds §4 (`implementation-doc-status`) — what each cited component really does now.
- Checked by `plan-review` FC-13 (Part A §3 present; `file:line` matches real code).
