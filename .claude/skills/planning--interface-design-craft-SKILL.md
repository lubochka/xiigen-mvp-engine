---
name: interface-design-craft
sk_number: SK-506
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
layer: product
author: luba
updated: "2026-06-29"
contexts: ["web-session", "claude-code"]
description: >
  The CONTRACT-design craft (not the visual UI craft). Every TS interface, NestJS
  DI token, and DTO is a deliberate contract, not a default: intent-first (who
  calls it, what for, why), one coherent responsibility per contract, and a "swap
  test" that proves any implementation can be replaced behind the interface. This
  is the TS adaptation of the universal interface-design-craft skill. The visual
  dashboard/UI craft lives separately in interface-design-SKILL.md — do not
  conflate the two.
triggers:
  - "design this interface"
  - "should this be an interface or a class"
  - "DI token contract"
  - "result type design"
  - "DTO shape"
  - "swap test"
  - "is this contract coherent"
  - "split this interface"
  - "immutable DTO"
---

# Interface Design Craft Skill — Contract Half (SK-506)

> **Scope split (binding).** This skill is the **contract** craft: TS `interface`s,
> DI tokens, and DTOs as deliberate contracts. It is NOT the visual UI craft.
> The visual dashboard/admin-panel/component craft (typography, color world,
> elevation, signature) lives in `interface-design-SKILL.md` and must not be
> touched or overwritten by this one. When the task is "design the contract a
> service exposes", use THIS skill; when the task is "make this screen feel
> crafted", use the visual one.

## WHAT THIS SKILL PREVENTS

Contracts that arrive as defaults instead of decisions: a `Service` interface that
mirrors one implementation's methods 1:1 (so no second implementation could ever
satisfy it), a DTO that leaks mutable internal state across a boundary, a "manager"
interface that bundles five unrelated responsibilities, or a return type that is a
bare value/`null` instead of a typed Result the caller can branch on. In NestJS,
the contract is the seam where implementations are swapped via DI — a weak contract
welds the caller to one concrete class.

---

## PRINCIPLE 1 — INTENT FIRST (who / what / why)

Before writing a contract, answer out loud:

```
WHO calls this?      the concrete consumer(s) — which module/provider, in what flow
WHAT do they need?   the verb — "rank these candidates", "persist this draft"
WHY a contract?      what must be swappable behind it (in-memory ↔ elastic, mock ↔ real)
```

If nothing must be swappable and there is exactly one consumer with no state and a
shared lifecycle, you may not need an interface at all — it is a method on an
existing class (see `planning--service-boundary-design-SKILL.md`, method-vs-class
threshold). A contract with no swap and no second consumer is often a default, not
a decision.

---

## PRINCIPLE 2 — ONE COHERENT RESPONSIBILITY

A contract names one capability. If you cannot describe it in a single sentence
without "and", split it.

```typescript
// ❌ bundled — "ranks AND notifies AND audits"
interface IFeedManager {
  rank(posts: Post[]): Promise<DataProcessResult<RankedPost[]>>;
  notifyFollowers(postId: string): Promise<DataProcessResult<void>>;
  writeAudit(event: string): Promise<DataProcessResult<void>>;
}

// ✅ three coherent contracts, each swappable on its own
interface IPostRanker        { rank(posts: Post[]): Promise<DataProcessResult<RankedPost[]>>; }
interface IFollowerNotifier  { notify(postId: string): Promise<DataProcessResult<void>>; }
interface IAuditWriter       { write(event: AuditEvent): Promise<DataProcessResult<void>>; }
```

---

## PRINCIPLE 3 — THE SWAP TEST (the core craft check)

> A contract is well-designed only if you can name **two genuinely different
> implementations** that both satisfy it without leaking either one's internals.

```
IPostRanker:
  impl A — InMemoryPostRanker (deterministic, for tests)
  impl B — ElasticPostRanker  (real, queries the index)
  Both satisfy `rank(posts) → Promise<DataProcessResult<RankedPost[]>>` with no
  Elastic-specific type in the signature.  → PASSES the swap test.

IFeedManager (the bundled one above):
  No second implementation could reasonably provide ranking + notification +
  audit as one unit.  → FAILS the swap test → split it.
```

In NestJS the swap is concrete: the interface is a **DI token**, and `providers[]`
binds the token to whichever implementation the module chooses.

```typescript
export const POST_RANKER = Symbol('IPostRanker');           // DI token == the contract
// module: providers: [{ provide: POST_RANKER, useClass: ElasticPostRanker }]
// test:   providers: [{ provide: POST_RANKER, useClass: InMemoryPostRanker }]
// consumer: constructor(@Inject(POST_RANKER) private ranker: IPostRanker) {}
```

This is the mvp "fabric": DI tokens are the fabric interfaces; concrete providers
are swapped behind them. The contract never names a concrete class.

---

## PRINCIPLE 4 — TYPED RESULT, NOT BARE VALUE / NULL / THROW

Boundary methods return the project's typed `DataProcessResult<T>` (or a
discriminated `Result` union), so the caller branches on success/failure instead of
catching exceptions for expected business outcomes. (`DataProcessResult<T>` is the
mvp wrapper — NOT C# `OperationResult<T>`.)

```typescript
type DataProcessResult<T> =
  | { ok: true;  value: T }
  | { ok: false; error: string; code: string };

// ❌ caller cannot tell "no match" from "thrown error"
rank(posts: Post[]): RankedPost[] | null;

// ✅ explicit, branchable, no throw for an expected outcome
rank(posts: Post[]): Promise<DataProcessResult<RankedPost[]>>;
```

---

## PRINCIPLE 5 — IMMUTABLE DTOs ACROSS THE BOUNDARY

A DTO that crosses a contract is data, not a handle to mutable internal state. Make
it `readonly` (and arrays `ReadonlyArray<T>`), carry stable identifiers, and never
expose an internal entity that a consumer could mutate.

```typescript
// ✅ immutable, stable ids, no internal mutable entity leaked
interface RankedPost {
  readonly postId: string;
  readonly score: number;
  readonly reasons: ReadonlyArray<string>;
}
```

---

## THE CRAFT CHECKS (run before accepting any contract)

```
□ Swap test:   can you name two real implementations that satisfy it cleanly?
□ One sentence: can you state the responsibility without "and"?
□ Intent:      can you name the consumer, the verb, and what is swappable?
□ Result type: does every boundary method return DataProcessResult<T> (not bare/null/throw)?
□ Immutability: are DTOs readonly with stable ids, leaking no internal entity?
□ No concrete leak: does the signature avoid naming any concrete class / vendor type?
```

If the swap test fails, the contract is shaped around one implementation — redesign
or drop it to a method (service-boundary method-vs-class threshold).

---

## ANTI-PATTERNS

1. **Interface mirrors one class 1:1** → it is not a contract, it is that class's
   shape. No second implementation could satisfy it. Redesign around the need.
2. **"Manager"/"Helper"/"Util" interface with mixed responsibilities** → split per
   coherent responsibility.
3. **Bare value / `null` / thrown exception as the boundary result** → return a
   typed `DataProcessResult<T>`.
4. **Mutable entity exposed in a DTO** → return a `readonly` DTO with stable ids.
5. **Concrete/vendor type in the signature** (`ElasticResponse`, `PrismaUser`) →
   the contract leaks the implementation; map to a domain DTO instead.

---

## TEST STRATEGY

```
unit         — two implementations of the contract pass the SAME interface test
               suite (proves the swap test mechanically); DTOs are readonly.
negative     — a method returns { ok:false, code } (does not throw) on the expected
               failure path.
contract     — consumer compiles against the DI token only; swapping the bound
               provider in a test module requires no consumer change.
```

A single-implementation interface with no second implementation in any test is a
shaped-to-one-impl default, not a proven contract — report it as such.

---

## INTEGRATION

- `planning--service-boundary-design-SKILL.md` — method-vs-class threshold decides
  whether a contract is warranted at all (state / lifecycle / 3+ consumers).
- `interface-design-SKILL.md` — the SEPARATE visual UI craft; this skill never
  touches it.
- `planning--shared-infrastructure-design-SKILL.md` — a contract that crosses the
  ≥3-consumer line becomes a shared fabric interface built before its first consumer.
