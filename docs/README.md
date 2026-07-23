# Documentation map

This directory is a working archive of the sessions that built XIIGen. Its
contents are **accurate at the time they were written, not maintained as user
documentation.** Read the maintained documents below first; consult the working
records only when you need provenance or evidence of how the engine was built.

To learn what XIIGen is, start at the top-level [README.md](../README.md), not here.

## Maintained documentation

| Path | What it is |
|---|---|
| `architecture/ARCHITECTURE_GUIDE.md` | The engine in one pass: the six fabric layers, the DNA rules, the factory pattern |
| `architecture/DEVELOPER_ONBOARDING.md` | Recipes: add a provider, add a task type, add a flow |
| `architecture/KNOWLEDGE_DIGEST.md` | Compact reference of artifact numbers and interfaces |
| `architecture/QUICK_REFERENCE.md`, `architecture/DELIVERY_DOCUMENTATION.md` | Additional architecture references |
| `business-flows/` | One product spec per business flow, plus `README.md` and `PRODUCT-STATE.md` — start here to learn what a flow is for |
| `xiigenDesign/` | The merged design-time documents (engine architecture, task-type catalog, BFA stress test, skills/factory RAG, standards P21–P26) |

## Working records — accurate when written, not maintained

| Path | What it is |
|---|---|
| `topology-snapshots/` | Snapshot fixtures for flow topologies |
| `portability/` | Studies of forking a flow into a separate tenant repository |
| `flow-coverage/`, `screen-examination/`, `ux-review/`, `design-reviews/` | Coverage and review reports from specific rounds |
| `flows/`, `flow-plan-preparation/`, `flow-analysis/` | Per-flow planning and analysis working notes |
| `state/`, `decisions/`, `planning/`, `phase-reports/`, `reports/` | Session state files, decision records, and phase/round reports |
| `plans/` | Internal working plans, including one originally written in Russian (translated for the public release) |
| `schemas/`, `adaptation-surface/`, `ai-skills/`, `skills-archive/`, `design-context/`, `client/`, `rag-benchmark/`, `user-journey-*` | Additional working records from individual rounds |

The root-level `DOCUMENT_INDEX.md` is a working record too: it is a manifest of
the thirty FLOW-26…FLOW-35 build sessions. Those per-flow session records are
not part of this public release; the manifest is kept as a record of what was
built.

## Honesty note on evidence

Working records quote absolute paths and internal identifiers from the machines
and sessions that produced them. They are published as evidence of how the
engine was built, not as instructions to follow.

End-to-end run screenshots are not part of this public release; they were
excluded to keep tenant and personal data out of the public tree. Absolute
paths that appear in the internal reports point into a private archive that is
not part of this release.
