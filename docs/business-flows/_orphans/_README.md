# Orphan files — zip content that didn't map to a single canonical flow

These files were in `business flows.zip` but don't belong under any one of today's 48 canonical flows. They are preserved as authoring history — not deleted, not the primary source of anything.

## What's here and why

| File | Origin | Why it's here |
|---|---|---|
| `24 - learning calendar extension.md` | zip-24 base spec | "Learning calendar extension" was an idea to extend either event-management (FLOW-03) or completion-gamification (FLOW-05). It never got assigned its own flow number in today's 48-flow scheme. If you're planning a calendar feature on top of events or lessons, start from this spec. |
| `24 - learning calendar extension multi tenant.md` | zip-24 deep-research | Same flow as above, multi-tenant variant. |
| `32-first rag initialization.md` | zip-32 base spec | The zip numbered this `32-` but it describes the first-boot RAG seeding step — which is today part of FLOW-33 system-initiation-bootstrap, not FLOW-32 sharable-flows-marketplace (which is what the `32-` number now means). The zip's zip-32-sharable-flows is the primary for FLOW-32; this file is the *earlier* content under the same number. Read it if you're working on FLOW-33 bootstrap. |

## How to use these

- **Orphans are secondary.** Always read the relevant primary spec at `docs/business-flows/NN-{slug}.md` first.
- **Don't promote an orphan to a primary** without explicit product approval — the reason it's here is that no single canonical flow owns it.
- **If you determine an orphan belongs with a flow**, move it to `_deep-research/{slug}/` and note the move in the commit message.
