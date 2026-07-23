# UI/UX Review Rubric — Per-Flow PNG Analysis

Applied to every PNG under `docs/e2e-snapshots/{slug}/` by a UI/UX expert reviewer acting from the end-user's perspective.

## Severity scale

| Icon | Severity | Meaning |
|------|----------|---------|
| 🔴 | BLOCKER | Wrong screen captured, page is empty/broken, user cannot proceed, or screenshot does not depict the business state its filename claims. |
| 🟠 | HIGH | Content shown is partly wrong/misleading, critical affordance missing, state is confusing or contradicts intent. |
| 🟡 | MEDIUM | Confusing copy, poor information hierarchy, inconsistent pattern, redundant capture, ambiguous CTA. |
| 🔵 | LOW | Cosmetic polish — spacing, contrast nit, minor copy, aligns OK with rest of app. |

## Evaluation axes (applied per PNG)

1. **State fidelity** — Does the PNG actually depict the business-logic phase + state its filename claims? A PNG named `02-listingmoderationengine-moderation-step.png` must show moderation UI, not an empty Bootstrap placeholder.
2. **Information appropriateness** — Is the right information for this phase visible? Empty states, loading states, and error states each have their own expectations.
3. **Affordances** — Primary action clear? Labels unambiguous? Form inputs have placeholders and help text? Destructive actions confirmable?
4. **Hierarchy & legibility** — Typography scale, contrast, whitespace. Is the most important element visually dominant?
5. **Consistency** — Does the flow's pattern align with the rest of the app (sidebar, top banner, buttons, table styles)?
6. **Error & empty states** — Are error messages specific and actionable? Do empty states explain next action?
7. **Screenshot integrity** — Occluders (modals mid-animation, banners eating the header), layout clipping, mobile breakpoint at wrong width, dark flashes.
8. **Persistent-chrome distraction** — The "Missing provider keys" banner occupies the top 48px of every capture. Flag if it obscures primary content the capture was meant to prove.

## Required output per flow — `docs/ux-review/{slug}/UX-REVIEW.md`

```markdown
# UX Review — {Flow Name} (`{slug}`)

**PNGs reviewed:** N | **Blockers:** X | **High:** Y | **Medium:** Z | **Low:** W
**Overall verdict:** ✅ Shippable / ⚠️ Needs fixes / 🚫 Not representative

## Summary

2–3 sentences from a UX-expert POV: is this flow's UI intuitive, logical, appropriate
to users? What's the single biggest issue?

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-...png` | 🔴 | State fidelity | Claims to show X but shows Y | Gate screenshot behind ... |
| 2 | `02-...png` | 🟡 | Copy | "Bootstrap Status" on a marketplace flow — confusing | Rename page or route |

## Cross-PNG patterns (flow-level)

Bullet any issue that recurs across ≥3 PNGs in this flow (e.g., all PNGs show the
same placeholder, or all forms lack field validation visible in screenshots).

## Business-logic phase coverage

If this flow has a topology (n1–n8), list which phases/states ARE visually covered
and which are missing or misrepresented.
```

## Rules for reviewers

- Treat yourself as a product designer reviewing shipping candidates, not a test auditor.
- READ the actual PNG (Claude Code is multimodal). Do not infer from filenames alone.
- If multiple PNGs in a flow are visually identical despite different filenames → flag as BLOCKER (state fidelity failure).
- The "Missing provider keys" yellow banner is present on every PNG; only flag it when it obscures the primary evidence the PNG is meant to show.
- Keep findings user-perspective, not test-harness-perspective. "User would not understand this page" > "screenshot has no data-testid."
