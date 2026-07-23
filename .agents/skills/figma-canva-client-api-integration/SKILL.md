---
name: figma-canva-client-api-integration
doc_type: GUIDE
version: "1.0.0"
sk_number: SK-565
priority: HIGH
load_order: 6.3
category: ui-ux
stack: ["react", "nestjs", "typescript"]
contexts: ["web-session", "claude-code"]
description: >
  The thin-client boundary for design-source integration (FigmaToCode /
  CanvaToCode) in XIIGen mvp: the client only sends a payload and receives a
  result/artifacts; no client-side training, semantic ranking, visual scoring,
  DPO, or checkpoint mutation. Defines the payload contract (source_kind,
  payload_ref_or_inline_payload, selected_frame_or_page, viewport_state_request,
  tier_policy_id, privacy_scope, user_approval_refs), the privacy-gate, the
  debug-gate, and honest failed/quarantine statuses.
triggers:
  - "figma"
  - "canva"
  - "FigmaToCode"
  - "CanvaToCode"
  - "design source"
  - "thin client"
  - "payload contract"
  - "privacy scope"
---

# SK-565 Figma/Canva Client API Integration (GUIDE) — thin client (React/NestJS)

A design-source converter (Figma → code, Canva → code) is a **thin client**: it
ships a payload to a core endpoint and renders back the result/artifacts. All
intelligence — normalisation, scoring, ranking, DPO, training — lives in
`llm_mvp_core` behind that endpoint, never in the mvp client (R5/R6).

## Why this guide exists (the gap it closes)

mvp has no design-source integration yet, and it must be built as a *thin
adapter*, not as a place where model logic leaks into the agent/client layer.
mvp already calls Anthropic/OpenAI/Google SDKs on the server
(`server/package.json`: `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`)
and has an adapter catalogue (`adapters/`, `server/src/engine/adapters/`). The
Figma/Canva client is one more thin adapter: a typed `fetch` to a core endpoint,
plus a React artifact viewer. SK-565 defines that boundary and its gates.

## When to Invoke

- When adding FigmaToCode / CanvaToCode (or any design-source → code) capability.
- When reviewing an integration that risks doing model work client-side.

---

## Section 1 — Thin-client boundary (the hard line)

The client may ONLY:
- collect/select the design source and build a payload;
- POST that payload to the core endpoint;
- receive `result` + `artifacts` and render them (React viewer);
- show honest status (success / failed / quarantine).

The client may NOT:
- train, fine-tune, or update any model or checkpoint;
- run semantic ranking, visual scoring, or quality judgement;
- build DPO pairs;
- normalise/learn from the design corpus.

Those all happen in `llm_mvp_core` behind the endpoint. A converter that scores
or ranks in the React/NestJS client is a boundary violation (R6).

```
[Figma/Canva] -> client builds payload -> POST core endpoint (llm_mvp_core)
                                              |
                          (normalise / rank / score / DPO / train — CORE ONLY)
                                              v
            client renders <- { result, artifacts, status } <- core
```

---

## Section 2 — Payload contract

The client sends exactly this shape (typed; validate with a zod schema on the
NestJS adapter before forwarding):

```ts
interface DesignSourcePayload {
  source_kind: "figma" | "canva";
  payload_ref_or_inline_payload: string;     // a ref/URL OR an inline payload
  selected_frame_or_page: string;            // which frame/page to convert
  viewport_state_request: ("desktop" | "tablet" | "mobile" | "rtl")[];
  tier_policy_id: string;                     // which tier/policy governs the call
  privacy_scope: "public" | "tenant" | "private";
  user_approval_refs: string[];              // consent/approval evidence ids
}
```

The core response is `{ result, artifacts[], status }`; the client renders
artifacts and never re-computes them.

---

## Section 3 — Privacy gate

- A payload with `privacy_scope: "private"` (or "tenant" without explicit
  approval) must **not** be sent into any common-training path. Private user
  designs train only the adaptive/user leg, and only with `user_approval_refs`
  present.
- Missing `user_approval_refs` for a non-public scope = **do not send**; surface
  a consent affordance instead (ties to FC-18 UX-29).
- This is enforced client-side as a pre-send check and re-enforced in core.

---

## Section 4 — Debug gate

- Debug/inspection surfaces must not leak model internals or any private corpus
  content (prompts, other tenants' designs, checkpoint internals).
- A debug view may show the *payload the client sent* and the *artifacts core
  returned*, never core's internal model state.

---

## Section 5 — Honest status (failed / quarantine)

The client must render the core status truthfully:

| status | meaning | client behaviour |
|--------|---------|------------------|
| `success` | conversion produced artifacts | render artifacts |
| `failed` | conversion could not complete | show the reason, offer retry; do not fabricate a result |
| `quarantine` | source/consent/license could not be cleared | show why; block use until cleared |

Never paper over a `failed`/`quarantine` with a fake "looks done" view.

## Section 6 — What stays in llm_mvp_core (not here)

Normalisation of design payloads, semantic/visual scoring, ranking, DPO pair
construction, checkpoints, and any training/promotion of common models live in
`llm_mvp_core` (R5/R6). The mvp side is strictly the thin adapter + viewer +
gates defined above.

## Section 7 — Integration

- **Adapter home:** `server/src/engine/adapters/` (or `adapters/`) — a typed
  NestJS provider (fabric/DI) that validates the payload (zod) and forwards to
  core; a thin React viewer in `client/src` for artifacts.
- **Render-QA / visual-diff:** returned artifacts can feed SK-563 (render-QA) and
  SK-564 (visual-diff) as evidence — but those run on the *rendered output*, not
  inside this client.
