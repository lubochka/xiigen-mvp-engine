---
name: implementation-doc-algorithms
version: "1.0.0"
sk_number: SK-561
priority: MANDATORY
load_order: 9
category: planning
contexts: ["web-session", "claude-code"]
origin: ported from llm_mvp_core/docs/skills/implementation-doc-algorithms-SKILL.md (Universal-Skills refresh, UpdateUniversalSkills)
---

# implementation-doc-algorithms — Part A §1 and §2 (algorithms in plain language)

> Ported universal standard. The mvp planning library did not require a plain-language
> §1/§2 where each algorithm is "class + method + parameters + actual steps". This skill
> adds that contract. TS adaptation for this mvp project: method/type names are
> TypeScript — NestJS `@Injectable` service methods with signature
> `Promise<DataProcessResult<T>>` (`server/src/kernel/data-process-result.ts`), React
> hooks, FastAPI route handlers; example values come from real DTOs/contracts
> (`server/src/engine-contracts/*.ts`). The domain return type is `DataProcessResult<T>`,
> never core-`OperationResult<T>`.

## When to Invoke

- When authoring Part A §1/§2 of any plan that touches code, AFTER §0 (the class diagram).

## §1 — Algorithm, plain language, NO code

For EACH algorithm the plan introduces or changes, §1 must state, in plain language:

```
□ The exact CLASS that implements the algorithm (TS: e.g. RegisterService)
□ The exact METHOD/function (e.g. register(dto: RegisterDto))
□ The PARAMETERS it accepts, and their types
□ The real STEP-BY-STEP algorithm (step 1, step 2, … — what happens, where, in what order)
```

A functional specification ("what the method should do") plus a class name alone is NOT
sufficient — that is the forbidden substitution. Name the implementing function and
its parameters and walk the actual steps.

### Example §1

```
Algorithm: user registration.
Class: RegisterService.  Method: register(dto: RegisterDto): Promise<DataProcessResult<RegisterOutcome>>.
Parameters: dto.email (string), dto.password (string); tenantId is taken from AsyncLocalStorage (NOT a parameter).
Steps:
  1. Normalize email (trim + toLowerCase).
  2. Ask IUserStore whether a user with this email exists in the current tenant.
  3. If it exists — return .failure("EMAIL_TAKEN") and stop.
  4. If not — assemble the user record {email, passwordHash, tenantId, status:"pending"}.
  5. storeDocument BEFORE enqueue (DNA-8): save the record in IUserStore.
  6. If the save failed — return .failure("STORE_DOWN"), with no partial record.
  7. Enqueue the confirmation email (IQueueService) with dedup-id = userId.
  8. Return .success({userId, status:"pending"}).
```

## §2 — Algorithm description (deeper layer)

For each algorithm, §2 adds:

```
□ A human analogy (what it resembles in real life).
□ What is stored during training/initialization — the NAMES of the fields and example values
  (for trainable units; for deterministic ones — which constants/configs and why).
□ Step-by-step inference with REAL values (a run on a concrete input).
□ A "What it does NOT do" section — explicit boundaries (what the algorithm deliberately does not cover).
□ A block of signatures and types with real examples:
```

```ts
// Signatures and data types (example values are real)
register(dto: RegisterDto): Promise<DataProcessResult<RegisterOutcome>>
// dto      = { email: "a@b.co", password: "Pa$$w0rd" }
// success  = DataProcessResult.success({ userId: "u_123", status: "pending" })
// failure  = DataProcessResult.failure("EMAIL_TAKEN")
```

### "What it does NOT do" — example

```
Does NOT send the email synchronously (only enqueues it).
Does NOT activate the account (a separate verify flow does that).
Does NOT perform a cross-tenant uniqueness check (uniqueness is within the tenant).
```

## Anti-patterns

- A functional spec instead of an algorithm ("the method registers a user") — FAIL.
- A class name without the method name and parameters — FAIL.
- §1/§2 not written as plain prose in the operator's working language (e.g. dropped into code or a bare functional spec) — FAIL.
- Inference without real values ("it returns a result") — a concrete run is required.
- A missing "What it does NOT do" section — algorithm boundaries are mandatory.

## Integration

- Builds on §0 (`implementation-doc-uml`) — algorithm operates over the diagram's classes.
- Feeds §3 (`implementation-doc-code-refs`) — the cited code blocks implement these steps.
- Checked by `plan-review` FC-13 (Part A §1/§2 present at full depth, in the operator's working language).
