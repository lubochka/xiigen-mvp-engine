---
title: Human-Readable Architecture Audit
purpose: Make every architecture / design / trainable / code audit readable by a human architect first — plain-language summary, UML, no-code algorithm, file:line quotes with a concrete repair blueprint.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
sk_number: SK-UUS-HRAA
priority: HIGH
contexts: ["web-session", "claude-code"]
---

# Human-Readable Architecture Audit

Imported from core via the universal-skills mapping (G07). TS-adapted for the mvp stack (NestJS + React, Jest/Playwright). The `DataProcessResult<T>` domain wrapper is the mvp convention; the core `OperationResult<T>` stays in `llm_mvp_core` and never leaks here.

## Purpose

An architecture / planning / plan-review / code / code-review / documentation / audit artifact must be readable by a human architect **first**. A table-only, shortcode-heavy, schema-first, schema-only, or prompt/spec-for-a-future-executor artifact fails this gate, as does one whose human summary is not written in the operator's working language. Machine labels may appear, but they can never be the primary explanation.

This skill is distinct from `output-readability-gate`: that gate makes any output scannable; **this** gate governs **architecture and trainable/code audits specifically** — UML, no-code algorithm walkthroughs, code quotes with a concrete repair blueprint, and the breadth/severity gates that a readability gate does not cover.

## When to Use

Invoke when producing or reviewing: an architecture decision, a plan or plan review, a code review of a non-trivial slice, a trainable/learned-component audit (RAG retriever, LLM-judge, scorer, selector, classifier, dictionary/counter state), or any audit artifact a human architect must approve.

## Required format for an architecture / trainable / code audit artifact

1. **Human summary first** — a plain-language summary (in the operator's working language) before any machine label, packet id, or STATE code.
2. **UML importable to draw.io** — a Mermaid `classDiagram` (or PlantUML) with concrete data-flow simulations and the expected branch outcome for each branch. For mvp, diagram the NestJS modules / RAG pipeline and the React surface they feed.
3. **No-code algorithm explanation** — naming what happens, where, in what order, and which **classes and methods** are involved (not just a class name; the implementing method + parameters).
4. **Exact code quotes** — `file:line` + a short quote, each followed immediately by `now` (what it computes now), `why it is wrong/ok` (why it is weak or fine), `must become` (what it must become), the concrete files/classes/records/methods/data rows, how it trains/works, affected sets/checkpoints/manifests, the tests/e2e/QA that prove the fix, and the lifecycle. For mvp, quote `.ts` paths (`server/src/**`, `client/src/**`).

## Concrete Repair Blueprint Gate

Every suspicious **dictionary / counter / KNN / scorer / selector / private decision method** quote needs a **filled per-field/per-method blueprint** — not a prompt for a future executor. The blueprint names: the allowed architecture level, the typed trained state, the training-update algorithm (input row → state mutation → checkpoint save), KNN/nearest method signatures and their role, the source/license gate, concrete positive / rejected / quarantine DPO examples, the affected assets/tests, and the lifecycle: **user/cache state first → repo/common fallback second → backup/export/import/share → continue-training from an existing checkpoint.**

Generic text such as "create schema", "chosen/rejected/quarantine", "add KNN", "wrap in a unit", or "make typed state" is **not a decision** — it is a prompt for a future executor and fails the gate.

mvp note: where mvp consumes core models rather than training its own (G12), the deterministic-vs-learned boundary is still useful (mvp has RAG / LLM-judge), but for the ML models themselves the blueprint is **note-only** — mark the trainable-model internals `N/A (consumed from core, G12)` explicitly rather than inventing a local training lifecycle.

## Audit Sufficiency Boundary Gate

An audit may claim only the scope it checked. "v1 scope completed" is allowed only with an explicit bounded scope; "architecture audit sufficient/complete" is forbidden unless a breadth challenge pass is green. After focused findings, run a second pass over adjacent authority zones: confidence claims, export/accuracy claims, target-label leakage, runtime routing/confidence floors, source/path/provenance leakage, and fallback-to-first-entry/default-candidate shortcuts.

## Delta-Severity Feedback Gate

If the next audit in the same area finds BLOCKING/HIGH issues that should have been discoverable, treat it as a **retroactive review-skill failure**: record why the previous review missed it and patch the relevant skill/guide/index/agent rule **before** polishing the artifact. Parent review must ask: "What would a broader audit likely find that this artifact missed?"

## Iterative readability cycles (when requested)

If a human asks for iterative audit-readability improvement, run a **minimum of 6 review/fix cycles (preferably 10)**, recording per cycle: the skill/gate applied, the failure found, the fix, and the readability improvement. A requested cycle is a **real review action with its own inspectable evidence packet** (reviewer id, before/after refs, loaded skills/gates, findings or no-fix justification, fix refs, recheck) — **N rows in a ledger after one real review is a failed audit**, not N cycles.

## XIIGen / mvp Adaptation

- UML targets NestJS modules and the RAG pipeline; code quotes are `.ts` `file:line` (`server/src`, `client/src`).
- Allowed-level vocabulary and trainable-model lifecycle that are core/.NET-specific are **not** imported; the deterministic-vs-learned boundary is kept, the ML-training-lifecycle blueprint is `N/A (G12)` for consumed models.
- Status/error-code strings use `DataProcessResult<T>`; never the core `OperationResult<T>`.

## Avoid

- Do not deliver a table-only, schema-only, or shortcode-heavy artifact — or one not written in the operator's working language — as the primary explanation.
- Do not leave a suspicious dictionary/counter/scorer/selector quote with a generic "wrap this" instead of a filled blueprint.
- Do not claim "audit complete" without the breadth pass.
- Do not import source architecture, algorithms, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal

- A human architect can read the artifact top-to-bottom and understand the architecture, the data flow, what each suspicious mechanism computes now, what it must become, and how the fix is proven — without decoding machine labels.
