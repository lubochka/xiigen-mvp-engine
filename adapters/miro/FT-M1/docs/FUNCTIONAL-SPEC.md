# FLOW-42 Functional Spec

FLOW-42 certifies the Miro external adapter path for portability and authorization.

The adapter reads Miro board items, classifies shapes using deterministic heuristics, maps items into the shared XIIGen architecture model, analyzes spatial containment/layout, and writes enhanced results back through a Miro-compatible mutation path.

## Required Capabilities

- Map Miro cards, connectors, shapes, text, frames, and sticky notes into shared element/style records.
- Classify shapes with R1-R10 priority rules and confidence scores.
- Infer row, column, or absolute layout from contained board items.
- Parse simple Miro HTML content into text plus links.
- Keep Miro SDK imports outside runtime module initialization so the package can be unit-tested without a live Miro app.

## Certification Scope

This Sprint A package certification proves standalone install, package tests, static named checks, local-registry publication, Docker/Vault auth, and external-adapter evidence. Full three-tenant external repository cascade remains a later platform-infra phase.
