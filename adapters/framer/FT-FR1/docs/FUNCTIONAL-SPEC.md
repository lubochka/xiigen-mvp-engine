# FLOW-44 Functional Spec

FLOW-44 certifies the Framer Text Elements Adapter path for portability and authorization.

The adapter filters Framer selections to text nodes, maps text content and typography into XIIGen's shared text model, converts color strings into Framer solid paints, writes text/style updates through a Framer runtime facade, and stores adapter state through plugin data APIs.

## Required Capabilities

- Read only text nodes from a mixed Framer selection.
- Preserve node id, display name, text, width, and height.
- Normalize font weights to the Framer style names Thin through Black.
- Convert hex, short-hex, rgb, and rgba color values into solid paint payloads.
- Write updated text and text style attributes through `setAttributes`.
- Persist adapter state through `getPluginData` and `setPluginData`.
- Remain unit-testable without a live Framer Plugin API runtime.

## Certification Scope

This Sprint A certification proves standalone install, package tests, static named checks, local-registry publication, Docker/Vault auth, and external-adapter evidence. Full three-tenant external repository cascade remains a later platform-infra phase.
