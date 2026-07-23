# Third-Party Notices

XIIGen as a whole is licensed under `AGPL-3.0-only` (see `LICENSE` and
`NOTICE`). This file lists third-party material that is **committed into this
repository as source** and that carries its **own permissive license**. Those
items keep their original license and attribution — relicensing XIIGen to AGPL
does **not** change them. Their licenses are compatible with AGPL-3.0 as long as
this attribution is preserved.

Scope note: npm / package dependencies are **not** listed here. Their declared
licenses live in the lock files and in `node_modules`, not in the source
manifests; a full SPDX dependency scan is a separate step (see the release plan
§4.7). This file covers only third-party material embedded in the repository
itself.

---

## impeccable — frontend-design skill (main file + companion references + `critique` command)

- **Paths in this repository:**
  - `.claude/skills/impeccable-SKILL.md` — carries the license header
  - `.claude/skills/impeccable--color-and-contrast.md`
  - `.claude/skills/impeccable--craft.md`
  - `.claude/skills/impeccable--extract.md`
  - `.claude/skills/impeccable--interaction-design.md`
  - `.claude/skills/impeccable--motion-design.md`
  - `.claude/skills/impeccable--responsive-design.md`
  - `.claude/skills/impeccable--spatial-design.md`
  - `.claude/skills/impeccable--typography.md`
  - `.claude/skills/impeccable--ux-writing.md`
  - `.claude/skills/critique-SKILL.md` — the `critique` command of the same
    package (declares `version: 2.1.1` and `allowed-tools: Bash(npx impeccable *)`
    in its front matter, and invokes `/impeccable`)
  - `.claude/skills/critique--cognitive-load.md`
  - `.claude/skills/critique--heuristics-scoring.md`
  - `.claude/skills/critique--personas.md`
- **Copyright / attribution:** Anthropic — "Based on Anthropic's frontend-design skill."
- **License (SPDX):** `Apache-2.0`
- **What it is:** A Claude Code skill — a main skill file plus companion
  reference files — that guides creation of distinctive, production-grade
  frontend interfaces. It is loaded by the design tooling in this repository. The
  main file (`impeccable-SKILL.md`) declares the license in its front matter; the
  `impeccable--*.md` files are companion references of the same skill and are
  covered by the same Apache-2.0 license and attribution. The `critique-SKILL.md`
  design-review command and its `critique--*.md` companions ship as part of the
  same `impeccable` package: `critique-SKILL.md` pins `version: 2.1.1`, declares
  the `npx impeccable` tool in `allowed-tools`, and runs `/impeccable` as its
  first step, so it is covered by the same Apache-2.0 license and attribution.
  (Note: the unrelated `interface-design--critique.md` file is *not* part of this
  package — it is a companion reference of the separate `interface-design` skill
  listed below.)
- **Full license text:** The Apache License, Version 2.0, is available at
  <https://www.apache.org/licenses/LICENSE-2.0>. The license header and
  attribution inside `impeccable-SKILL.md` are kept unchanged.

---

## ui-ux-pro-max — UI/UX design-intelligence skill

- **Paths in this repository:**
  - `.claude/skills/ui-ux-pro-max-SKILL.md`
- **Copyright / attribution:** Copyright (c) 2024 Next Level Builder.
- **License (SPDX):** `MIT`
- **What it is:** A Claude Code skill providing a searchable UI/UX design
  database (styles, colour palettes, font pairings, product types, UX guidelines,
  and chart types across multiple technology stacks). It carries no license
  header inside the file itself; the license and copyright holder were confirmed
  from the upstream public repository.
- **Source verified:** Upstream repository
  <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>. Its `LICENSE` file is
  the MIT License with the copyright line `Copyright (c) 2024 Next Level Builder`.
  The skill's front-matter description in this repository matches the upstream
  feature list verbatim (50+ styles, 161 colour palettes, 57 font pairings, 161
  product types, 99 UX guidelines, 25 chart types across 10 stacks).
- **Full license text:** The MIT License text is available at
  <https://opensource.org/license/mit>. The MIT copyright notice and permission
  notice above are retained.

---

## interface-design — interface-design skill (main file + companion references)

- **Paths in this repository:**
  - `.claude/skills/interface-design-SKILL.md`
  - `.claude/skills/interface-design--critique.md`
  - `.claude/skills/interface-design--example.md`
  - `.claude/skills/interface-design--principles.md`
  - `.claude/skills/interface-design--validation.md`
- **Copyright / attribution:** Copyright (c) 2026 Damola Akinleye.
- **License (SPDX):** `MIT`
- **What it is:** A Claude Code skill for interface design (dashboards, admin
  panels, apps, tools, and interactive products) with craft, consistency, and
  review companions. The files carry no license header inside themselves; the
  license and copyright holder were confirmed from the upstream public
  repository.
- **Source verified:** Upstream repository
  <https://github.com/Dammyjay93/interface-design>. Its `LICENSE` file is the MIT
  License with the copyright line `Copyright (c) 2026 Damola Akinleye`. The skill
  name and its "interface design, NOT marketing design" positioning match the
  upstream project. (Note: `interface-design--critique.md` is a companion of *this*
  skill, distinct from the `critique-SKILL.md` that belongs to the `impeccable`
  package above. The internal `planning--interface-design-craft-SKILL.md` file is
  an in-house XIIGen skill — `author: luba`, `sk_number: SK-506` — and is *not*
  third-party material, so it is intentionally excluded from this entry.)
- **Full license text:** The MIT License text is available at
  <https://opensource.org/license/mit>. The MIT copyright notice and permission
  notice above are retained.

---

## Third-party material — provenance unconfirmed

The following material was imported into this repository as an external skill
library (delivered flat in `xiigen-ext-skills-flat.zip`) and does **not** carry an
embedded license. Its license is presumed permissive per the release plan, but it
has **not** been confirmed from a retained source of the exact imported version.
No copyright holder is asserted here. Attribution must be completed before public
release.

### design-for-ai — visual-design-principles skill (main file + companion references)

- **Paths in this repository:**
  - `.claude/skills/design-for-ai-SKILL.md`
  - `.claude/skills/design-for-ai--ai-tells.md`
  - `.claude/skills/design-for-ai--appendix-fonts-and-typography.md`
  - `.claude/skills/design-for-ai--chapter-01-why-design-matters.md`
  - `.claude/skills/design-for-ai--chapter-02-purpose-of-design.md`
  - `.claude/skills/design-for-ai--chapter-03-typography.md`
  - `.claude/skills/design-for-ai--chapter-04-technology-and-culture.md`
  - `.claude/skills/design-for-ai--chapter-05-proportions.md`
  - `.claude/skills/design-for-ai--chapter-06-composition.md`
  - `.claude/skills/design-for-ai--chapter-07-visual-hierarchy.md`
  - `.claude/skills/design-for-ai--chapter-08-color-science.md`
  - `.claude/skills/design-for-ai--chapter-09-color-theory.md`
  - `.claude/skills/design-for-ai--checklists.md`
  - `.claude/skills/design-for-ai--foundations.md`
  - `.claude/skills/design-for-ai--interaction.md`
  - `.claude/skills/design-for-ai--motion.md`
  - `.claude/skills/design-for-ai--responsive.md`
  - `.claude/skills/design-for-ai--techniques.md`
- **Required credit (from the file itself):** "Based on principles from *Design
  for Hackers* by David Kadavy." This credit appears in the skill's own front
  matter and body (`design-for-ai-SKILL.md`) and must be preserved regardless of
  the final license determination. David Kadavy is credited as the author of the
  underlying book *Design for Hackers*; he is **not** asserted here as the
  copyright holder of the skill files.
- **License (SPDX):** Unconfirmed. Presumed permissive per the release plan, not
  confirmed from a retained source for the imported version.
- **Status:** Imported as an external skill library from
  `xiigen-ext-skills-flat.zip`; license presumed permissive per the release plan
  but not confirmed from a retained source; attribution to be completed before
  public release.
- **Partial network finding (not sufficient to confirm):** A same-named public
  repository, <https://github.com/ryanthedev/design-for-ai>, does exist and
  repeats the same *Design for Hackers* by David Kadavy credit. However, GitHub
  does **not** currently detect any license for it: the repository's API `license`
  field is `null`, and no `LICENSE` file is present in any branch (the raw
  `main`/`master` paths and the `/license` API endpoint all return `404`). The
  string "MIT" appears only in the README and in third-party listings and is
  **not** backed by an actual license file, so it does not confirm the license.
  Provenance therefore remains unconfirmed. Treat this as a lead to verify, not a
  confirmed attribution.

---

## Notes

- Apache-2.0 is one-directionally compatible with AGPL-3.0 (per the Free Software
  Foundation) as long as the original license text and attribution are retained.
  The impeccable skill above therefore **keeps** its Apache-2.0 license; it is
  **not** relicensed to AGPL.
- If more third-party source material is later embedded in the repository, add it
  here with the same four fields: repository path, copyright holder, SPDX license,
  and a short description of what it is.
