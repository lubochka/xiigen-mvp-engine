# FLOW-43 Functional Spec

FLOW-43 certifies the Webflow Designer Extension adapter path for portability and authorization.

The adapter expands Webflow CSS shorthand values, maps Designer element categories into pipeline-compatible style records, and computes a validation diff between pipeline output and native Webflow CSS.

## Required Capabilities

- Expand border, font, padding, margin, and box-shadow shorthand values.
- Route layout, text, link, button, media, form, navigation, tab, slider, dropdown, lightbox, symbol, commerce, embed, and map element types.
- Preserve unknown CSS properties by expanding and passing them through.
- Produce structured validation diffs for missing and mismatched CSS properties.
- Remain unit-testable without a live Webflow Designer runtime.

## Certification Scope

This Sprint A certification proves standalone install, package tests, static named checks, local-registry publication, Docker/Vault auth, and external-adapter evidence. Full three-tenant external repository cascade remains a later platform-infra phase.
