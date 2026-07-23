# Functional Spec — FLOW-23 Form-builder Templates

**Grammar:** G7 Settings tabs (template editor) + G3 Card list (template library)
**Primary role tiers:** PLATFORM_OPS (template author), TENANT_OPS (template consumer via FLOW-21)
**Current state:** **Designed** — 13 services on disk; no UI.

## 1. Summary

A platform admin (or power tenant admin) authors reusable form templates that tenants start from in FLOW-21. Each template has a name, category, schema, default workflows, and example use cases. Tenants pick a template instead of starting from blank — faster to launch.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/form-templates/` | Author + publish templates |
| **TENANT_OPS** | `/admin/forms/new` → template gallery | Pick a template to start |

**Modes:** Blank (start from scratch) / From template / Clone of existing form.

## 3. User stories

### Story 3.1 — Platform admin authors a template

**Screens:** `/admin/engine/form-templates/new` → template editor.

1. Same builder as FLOW-21 form builder — same three-pane.
2. Additional template-specific settings tab: *Template metadata* (name, category, icon, description, example preview image, default workflow recipes).
3. Publish → template appears in tenant gallery.

### Story 3.2 — Tenant picks a template

**Screens:** `/admin/forms/new` → template gallery.

1. Gallery of published templates with filter + search.
2. Preview a template → example preview + description + what's included.
3. **Use this template** → creates a new form in tenant's space as a Draft; tenant can customise.

## 4. Screen structure

- **Template author console** — same as FLOW-21 builder + template metadata tab.
- **Template gallery** (in FLOW-21 new-form flow) — G3 card list.
- **Template preview modal** — example + description + use-this CTA.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Template updated after tenant used it | Tenant's form doesn't auto-update; optional *"Template has a new version — update?"* banner. |
| Template deleted | Tenants who already used it keep working; gallery removes; banner: *"This template is no longer available."* |
| Template with invalid workflow recipe | Platform admin blocked from publishing until fixed. |
| Tenant customises heavily | Form diverges from template; no auto-sync. |

## 6. Problematic states

- **Empty gallery** → *"No templates yet — start from blank?"*
- **Template load fails** → fallback to blank.
- **Template-metadata validation fails** → inline errors in author console.

## 7. Visual direction

**Grammar:** G7 settings (author) + G3 card list (gallery).

**Feel:** *Curated · Proven · Quick-start*. Templates should feel like expert starting points, not random examples.

**Signature:** the **example preview image** on each template card — shows immediately what the published form will look like.

**Anti-patterns:**
- Stock screenshot placeholders.
- Template categories that overlap confusingly.

## 8. Acceptance criteria

- [ ] Template author console reuses FLOW-21 builder + adds metadata tab.
- [ ] Tenant gallery renders G3 cards with preview + use CTA.
- [ ] Preview modal with example image + description.
- [ ] Template version awareness on tenant forms.
- [ ] All 3 problematic states covered.
