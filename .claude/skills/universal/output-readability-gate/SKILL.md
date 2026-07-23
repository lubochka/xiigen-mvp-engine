---
title: Output Readability Gate
purpose: Make final outputs concise, navigable, and useful to the next human or agent.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Output Readability Gate

## Purpose
Use this before delivering docs, plans, reports, indexes, and final responses.

## When to Use
Invoke when producing Markdown, handoff notes, review findings, or any artifact expected to guide future work.

## Actions
- Prefer short sections with concrete headings over long narrative blocks.
- Lead with status, changed artifacts, evidence, and blockers.
- Use consistent names, paths, and terms across all related outputs.
- Remove filler and process details that do not help execution.
- Check that tables and lists are readable in plain Markdown.

## XIIGen Adaptation
- Use XIIGen convention names exactly where relevant: DataProcessResult<T>, buildSearchFilter/buildSearchFilterFlat, Record<string, unknown>/unknown payloads, structured logging/local logger patterns, NestJS providers/injection tokens, and existing config helpers/defaults.
- Keep universal skills portable; mention XIIGen conventions as adaptation checks, not as copied source architecture.

## Avoid
- Do not bury completion status after long background.
- Do not use unexplained acronyms or source-project vocabulary.
- Do not include unfinished marker language or change-request phrasing in canonical docs.

## Completion Signal
- The output can be scanned quickly and still gives enough detail to execute or verify the work.

---

## Universal Bits (UUS G07) — forbidden shortcode prose, dashboard readability, human-readable board

These are the universal cross-project bits this gate must carry (imported from core via the universal-skills mapping), TS-adapted for the mvp stack (NestJS + React, Jest/Playwright). The `DataProcessResult<T>` domain wrapper is the mvp convention; the core `OperationResult<T>` stays in `llm_mvp_core`.

### Four forbidden patterns in prose outside backticks

Human-facing prose (outside code spans/backticks) must not use machine shortcodes as if they were words:

1. shortcodes / opaque labels (`QSG-28`, `ROW19_*`) used as the explanation;
2. ALL_CAPS_UNDERSCORE tokens (`GOAL_REACHED_TRUE`) used as prose;
3. letter-number tokens (`FC-33`, `D-15`) used without a human gloss;
4. raw status codes used as the headline instead of a sentence.

Each may appear only **after** a plain-language explanation, never instead of it.

### Dashboard / API-doc readability

Any dashboard or API documentation surface must show, per item: a **human name + an example input + the parameters + the expected output + the evidence boundary** (what the number does and does not prove). A table of opaque fields with no human gloss fails the gate.

### Human-Readable Execution Board

A long status must include a plain-language board: **Total / Done (names) / Now (+ executor) / Remaining (names) / Result type / Next action**. Check non-ASCII strings for mojibake before delivery.

### No-Machine-Log-To-User

A bare machine log / JSON / packet id / STATE code is not a human status by itself; it may follow the board but never replace it.

### mvp adaptation, and what is NOT ported (G12)

- Replace any inherited `.NET` example (`OperationResult` statuses, `CF-N` codes, `CLAUDE.md Rule N`) with the **TS projection**: typed `DataProcessResult<T>` status / error-code strings, NestJS DI tokens, Jest/Playwright output. Add the TS form of the four forbidden patterns above.
- **Do not port** the ML pipeline-signal example (`OUTCOME` / `DPO_TRIPLE`) — mvp has no DPO pipeline (RAG / LLM-judge is core-specific, G12). The readability board gate applies to **status messages**, not only to docs.
