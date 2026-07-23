# XIIGEN External Skill Library — Flat Edition
## Version: 1.1.0 | Date: 2026-04-20
## 38 files, all flat — no subdirectories

---

## Naming convention

All files live at the top level. The directory path is encoded in the filename:

| Pattern | Example |
|---------|---------|
| `{skill-name}-SKILL.md` | `design-for-ai-SKILL.md` |
| `{skill-name}--{reference}.md` | `design-for-ai--ai-tells.md` |

Double-dash (`--`) separates skill name from reference filename. All internal
cross-references inside the SKILL.md files have been rewritten to use the flat
filenames — no paths will break.

---

## Commit to repo

Drop all 38 files directly into `.claude/skills/` (no subdirectories needed):

```bash
cp xiigen-ext-skills/*.md  repo/.claude/skills/
git add .claude/skills/design-for-ai-SKILL.md \
        .claude/skills/design-for-ai--*.md \
        .claude/skills/impeccable-SKILL.md \
        .claude/skills/impeccable--*.md \
        .claude/skills/critique-SKILL.md \
        .claude/skills/critique--*.md \
        .claude/skills/interface-design-SKILL.md \
        .claude/skills/interface-design--*.md \
        .claude/skills/ui-ux-pro-max-SKILL.md
git commit -m "feat: add external design skill libraries (SK-540/SK-541/SK-539 dependencies)"
```

---

## File inventory (38 files)

### design-for-ai (22 files) — SK-541 Layer 2
| File | Used for |
|------|---------|
| `design-for-ai-SKILL.md` | CHECKER mode entry — AI slop audit |
| `design-for-ai--ai-tells.md` | 10-tell detection checklist |
| `design-for-ai--checklists.md` | Full design review + decision trees |
| `design-for-ai--foundations.md` | Design purpose + goals |
| `design-for-ai--techniques.md` | Implementation patterns |
| `design-for-ai--chapter-01-why-design-matters.md` | Design as layered discipline |
| `design-for-ai--chapter-02-purpose-of-design.md` | Personas, use cases, right-sizing |
| `design-for-ai--chapter-03-typography.md` | Typeface selection for medium |
| `design-for-ai--chapter-04-technology-and-culture.md` | Style grounded in tech/culture |
| `design-for-ai--chapter-05-proportions.md` | Ratios and proportional systems |
| `design-for-ai--chapter-06-composition.md` | Dominance, flow, depth |
| `design-for-ai--chapter-07-visual-hierarchy.md` | White space → weight → size → color |
| `design-for-ai--chapter-08-color-science.md` | Lab, ICC, colorblindness |
| `design-for-ai--chapter-09-color-theory.md` | Color wheel schemes, mood-driven palettes |
| `design-for-ai--appendix-fonts-and-typography.md` | Font pairing, metrics, rules |
| `design-for-ai--motion.md` | Animation timing and easing |
| `design-for-ai--interaction.md` | Interaction states |
| `design-for-ai--responsive.md` | Responsive design principles |

### impeccable (10 files) — SK-540 teach mode + SK-541 Layer 3
| File | Used for |
|------|---------|
| `impeccable-SKILL.md` | teach/craft/extract modes |
| `impeccable--typography.md` | OpenType, web fonts, scales |
| `impeccable--color-and-contrast.md` | Contrast, accessibility, palette |
| `impeccable--spatial-design.md` | Grids, container queries, optical |
| `impeccable--motion-design.md` | Timing, easing, reduced-motion |
| `impeccable--interaction-design.md` | Forms, focus, loading patterns |
| `impeccable--responsive-design.md` | Mobile-first, fluid, container queries |
| `impeccable--ux-writing.md` | Labels, errors, empty states |
| `impeccable--craft.md` | shape-then-build flow |
| `impeccable--extract.md` | Extract components/tokens flow |

### critique (4 files) — SK-541 Layer 3
| File | Used for |
|------|---------|
| `critique-SKILL.md` | LLM design review procedure |
| `critique--heuristics-scoring.md` | Nielsen H1–H10 with 0–4 scale |
| `critique--cognitive-load.md` | Cognitive load checklist (8 items) |
| `critique--personas.md` | Jordan/Sam/Riley/Alex persona testing |

### interface-design (5 files) — SK-540 domain exploration
| File | Used for |
|------|---------|
| `interface-design-SKILL.md` | WHO/VERB/FEEL "Intent First" protocol |
| `interface-design--principles.md` | Design system principles + dark mode |
| `interface-design--validation.md` | .impeccable.md validation protocol |
| `interface-design--critique.md` | Post-build craft critique |
| `interface-design--example.md` | Example design contexts |

### ui-ux-pro-max (1 file) — SK-541 Layer 1 + SK-539
| File | Used for |
|------|---------|
| `ui-ux-pro-max-SKILL.md` | P1 accessibility CRITICAL + P2 touch CRITICAL checks |

---

## How each XIIGen skill loads these

### SK-540 — product-design-context (load_order 5.4)

```
Read interface-design-SKILL.md
  → "Intent First" section (WHO / VERB / FEEL)
  → References: interface-design--principles.md, interface-design--validation.md

Run impeccable-SKILL.md teach mode
  → Produces docs/design-context/{slug}/.impeccable.md
  → References: impeccable--typography.md, impeccable--color-and-contrast.md etc.
```

### SK-541 — screen-craft-audit (Phase 7 Step 5)

```
Layer 1 — Accessibility
  Read ui-ux-pro-max-SKILL.md → P1 (aria, contrast, skip-link, reduced-motion)
                               → P2 (touch 44×44px, tap spacing)

Layer 2 — AI slop detection
  Read design-for-ai-SKILL.md CHECKER mode
  Read design-for-ai--ai-tells.md → 10-tell checklist
  Read design-for-ai--checklists.md → full design review
  Score: 0–2 tells PASS | 3–5 CONCERN | 6+ BLOCK

Layer 3 — Nielsen heuristics
  Read critique-SKILL.md → LLM design review procedure
  Read critique--heuristics-scoring.md → H1/H2/H8/H9 (0–4 each)
  Read critique--cognitive-load.md → 8-item cognitive load check
  Threshold: H1≤1 or H2≤1 or H9=0 → BLOCK | Total<8 → BLOCK | 8–11 CONCERN

Layer 4 — Grammar verification
  Read docs/design-context/{slug}/.impeccable.md declared grammar
  Verify PNG implements G1–G7, not AdminCrudPanel CRUD table
  UX-30 BLOCK if mismatch
```

### SK-539 v1.1.0 — ui-ux-compliance (load_order 5.5)

```
Section 0 pre-design gate:
  Read ui-ux-pro-max-SKILL.md → P1/P2 CRITICAL checks
  (The 29 UX checks UX-01..UX-30 are defined in planning--ui-ux-compliance-SKILL.md;
   ui-ux-pro-max-SKILL.md is the companion for accessibility and touch specifics)
```

---

## HOW-TO-USE-SKILLS integration

Load order entries affected (HOW-TO-USE-SKILLS v4.5.0 and SESSION-LOAD-PLAN v31):

| Load order | Skill | Files loaded |
|-----------|-------|-------------|
| 5.3 | SK-542 flow-ui-examination-protocol | No external files |
| 5.4 | SK-540 product-design-context | `interface-design-SKILL.md` + `impeccable-SKILL.md` |
| 5.5 | SK-539 ui-ux-compliance | `ui-ux-pro-max-SKILL.md` |
| Phase 7 Step 5 | SK-541 screen-craft-audit | `ui-ux-pro-max-SKILL.md` + `design-for-ai-SKILL.md` + `design-for-ai--ai-tells.md` + `critique-SKILL.md` + `critique--heuristics-scoring.md` + `critique--cognitive-load.md` |

The Q2 table in HOW-TO-USE-SKILLS for GENERATION and MATERIALIZATION sessions
that produce React pages should add:

```
+ interface-design-SKILL.md (when SK-540 runs — .impeccable.md absent)
+ impeccable-SKILL.md       (SK-540 teach mode)
+ ui-ux-pro-max-SKILL.md    (SK-539 + SK-541 Layer 1)
+ design-for-ai-SKILL.md    (SK-541 Layer 2)
+ critique-SKILL.md         (SK-541 Layer 3)
```

These are read by the XIIGen wrapper skills (SK-540/SK-541/SK-539) —
they do NOT need to appear in the session-start checklist independently.
The wrapper skills handle loading them at the right step.
