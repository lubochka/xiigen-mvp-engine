---
name: ui-testing
version: "1.0.0"
sk_number: SK-562
priority: MANDATORY
load_order: 6.0
category: ui-ux
stack: ["react", "vite", "tailwind", "typescript", "jest", "testing-library", "playwright"]
contexts: ["web-session", "claude-code"]
description: >
  The UI testing contract for XIIGen mvp: split-responsibility (logic in
  services, thin UI), Dual-Path Same-Scenario UI Proof (Path A automated
  boundary + Path B real host-UI), the UX-automation standard (accessible names,
  help/tooltips, example I/O, human-readable empty/error states, no jargon on
  the primary path), and the ban on marker-only / JSON-only / log-only evidence
  standing in for UI proof.
triggers:
  - "ui testing"
  - "dual-path"
  - "Path A"
  - "Path B"
  - "ux automation"
  - "accessible name"
  - "playwright"
  - "testing-library"
  - "marker is not proof"
---

# SK-562 UI Testing — Dual-path proof + UX automation (Jest + Playwright)

A UI is tested on two axes: it works at the boundary (automated), and a real
user can read and operate it in the real app (UX automation through the real
host). One marker, one JSON blob, or one log line is **not** UI proof.

## Why this skill exists (the gap it closes)

mvp already has a strong Playwright PNG harness (`e2e/`, `client/e2e/`,
`client/playwright.config.ts`, `scripts/ux-quality-score.sh`) and Jest +
`@testing-library/react` unit tests. What it lacked was an explicit **skill
contract** that (a) names the split-responsibility boundary, (b) defines
**Dual-Path Same-Scenario UI Proof** as a proof boundary (Path A vs Path B), and
(c) defines a **UX-automation standard** that checks *readability and
accessibility*, not only clickability. SK-562 is that contract laid over the
existing tests. The universal version was written for WinForms/WPF
(`AutomationProperties.Name`, `MainForm.cs`); this is the React/TS form.

## When to Invoke

- When adding or changing any `client/src` page/component that a user operates.
- At Phase 6 (QA + PNG capture) and Phase 7 (UX compliance).
- Before claiming a scenario is covered — the dual-path table below must be
  filled.

---

## Section 1 — Split responsibility (thin UI)

Business logic, validation, and orchestration live in services / the engine, not
in components. The React layer is a thin view that calls a typed service and
renders the typed `DataProcessResult<T>` it gets back.

- **Logic** → service module / engine handler, unit-tested with Jest in
  isolation, returns a typed union or `DataProcessResult<T>`.
- **UI** → component that calls the service and renders states (loading / empty /
  populated / error). No business branching invented in the component.

A component that contains business rules a service should own is a
split-responsibility violation: move the rule down, test it at the service.

---

## Section 2 — Dual-Path Same-Scenario UI Proof

For each user scenario, both paths must pass for the **same** scenario and the
**same** intent. One path alone never closes the scenario.

### Path A — Automated boundary (Jest + Testing Library + Playwright assertions)

The adapter/service/component request → response → rendered DOM state, asserted
programmatically.

```ts
// Jest + @testing-library/react — component renders the service result
import { render, screen } from "@testing-library/react";
// 1) service is called with the scenario input
// 2) typed DataProcessResult<T> is returned (mock the service)
// 3) the DOM reflects the result:
expect(screen.getByRole("heading", { name: /…/ })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /…/ })).toBeEnabled();
```

Playwright (`client/playwright.config.ts`, `e2e/playwright.config.ts`) drives the
running app for the same scenario and asserts visible state and captures a PNG in
the **populated** state (use `?mock=<state>` per FC-18 UX-06b).

### Path B — Real host-UI (the running app, human-readable evidence)

The same scenario performed in the real running mvp client (Vite dev/preview or
built app) with a visible marker and **screenshot/video/log** evidence, not just
an assertion. Path B proves a real user can see and operate the surface.

### Proof-boundary rules

- A **marker alone is not Path B proof**; a screenshot/PNG alone is not Path A
  proof.
- JSON output, a console log, a process/window list, or a synthetic helper UI
  **cannot** replace either path.
- If Path B cannot be reached (host/auth/route limitation), record the exact
  blocker (screen/state + reason) and the next repair; continue Path A and other
  scenarios. A blocked Path B is a logged work item, not a stop.

```
DUAL-PATH UI PROOF — [scenario] / [page]
  Path A (automated boundary): [PASS — test file:case | FAIL | blocked: reason]
  Path B (real host-UI):       [PASS — screenshot/video/log ref | blocked: screen/state + reason]
  Same scenario + same intent: [yes]
  Populated PNG (UX-06b):      [captured with ?mock=… | n/a]
  Scenario closed:             [yes only if BOTH PASS | no — next action]
```

---

## Section 3 — UX-automation standard (readability + accessibility, not only clicks)

Clickability is necessary but not sufficient. The automated UX layer asserts the
surface is *understandable* by a real user on the primary path.

| UX-automation check | React/TS assertion |
|---------------------|--------------------|
| Accessible name on every actionable element | `getByRole('button'/'link', { name })`; `aria-label`/visible text present |
| Help / tooltip where an action is non-obvious | `aria-describedby` target exists and is non-empty; tooltip text rendered |
| Example input / output shown for inputs that need a format | placeholder/help text with a concrete example (e.g. date, email) |
| Human-readable empty state with a guiding CTA | empty render shows what the section is for + a primary action (FC-18 UX-06) |
| Human-readable error copy (no raw HTTP codes) | error render shows a sentence, not `400`/`500` (FC-18 UX-17) |
| No internal jargon on the primary path | no `T-####`, `F####`, `CF-###`, `.spec.ts`, flow IDs in visible copy (FC-18 UX-21) |
| Status uses label + colour, not colour alone | badge has text, asserted by `getByText` (FC-18 UX-10) |

These overlap FC-18 (SK-539) by design — SK-562 makes them *executable* test
assertions rather than review-time prose.

---

## Section 4 — Test layers and Gate-B

| Layer | Tool (mvp) | What it proves |
|-------|-----------|----------------|
| Unit | Jest + `@testing-library/react` | service logic + component renders states from typed result |
| Integration | Jest (service + component wired) | request → response → DOM for the scenario |
| e2e / host | Playwright (`client/playwright.config.ts`, `e2e/`) | Path A app run + populated PNG |
| UX automation | Playwright + Testing Library | accessible names, help, empty/error readability (Section 3) |
| Negative | Jest / Playwright | invalid input, error state, denied role |
| Real host-UI | running app + screenshot/video/log | Path B |

**Gate-B (mvp is a pure TS stack — no `dotnet`):** the relevant Jest suites and
the Playwright run for the touched scenario must be green before the UI change is
claimed done. PNGs must show the populated state.

## Section 5 — What this skill does NOT do

- It does not define visual BANs (SK-560) or grammar (SK-561); it tests that the
  built surface works and is readable.
- It does not train or evaluate a model. Any trainable UI-quality scoring model
  is `llm_mvp_core` (G12 / R5/R6); SK-562 is client test discipline only.
- It does not accept synthetic-helper-UI, marker-only, or JSON-only evidence as
  a substitute for Path A *or* Path B.
