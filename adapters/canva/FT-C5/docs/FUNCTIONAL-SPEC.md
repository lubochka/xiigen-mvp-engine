# FLOW-41 Functional Spec

## Purpose

The Canva Text Elements Adapter converts Canva text element data into the shared XIIGen/Figma-shaped text contract, then converts enhanced shared styles back into Canva-compatible write payloads.

## Inputs

- Canva text element records with `content`, `fontSize`, `fontStyle`, `textAlign`, `color`, `width`, and `height`.
- Shared style records produced by the XIIGen CSS generation pipeline.

## Outputs

- Shared text element records with `type`, `characters`, `width`, and `height`.
- Shared style records with normalized `fontFamily`, `fontWeight`, `textAlignHorizontal`, and RGB color strings.
- Canva write payloads for user-triggered canvas updates.

## Invariants

- The adapter has no module-level Canva SDK dependency in the pure mapping path.
- Mapping functions do not throw for expected empty content or writer failures.
- Write failures are counted in the result instead of aborting the full write batch.
- The package carries its STEP-1 invariants for downstream fork and review workflows.
