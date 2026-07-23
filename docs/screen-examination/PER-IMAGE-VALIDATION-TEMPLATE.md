# Per-Image Validation Template

**Purpose:** a checklist applied to **one PNG at a time** so you can validate that a single rendered screen passes across every axis Luba named — business-logic phase, state, language, role, internal-vs-external framing, human-friendliness, terminology, and the five UX/UI skill layers.

**How to use:** copy this block once per PNG you're reviewing, fill in the cells, record the verdict. The completed blocks live in `ROUND-2-COVERAGE-MATRIX.json` (one entry per PNG examined).

**Authority:** `/.impeccable.md`, `.claude/skills/flow-prep-library/*`, `.claude/skills/*-SKILL.md` (impeccable / interface-design / design-for-ai / critique / ui-ux-pro-max), `ROUND-2-MATRIX-PLAN.md`.

---

## The template — one block per PNG

```
═══════════════════════════════════════════════════════════════════════════
IMAGE IDENTITY (the 5 axes — every PNG is one specific cell)
═══════════════════════════════════════════════════════════════════════════
flow          : FLOW-XX            (e.g. FLOW-08)
slug          : xx-yyyy             (e.g. marketplace)
screen        : ComponentName       (e.g. EventDiscoveryPage)
role          : anonymous | public-marketplace-visitor | tenant-user |
                referral-user | freelancer | business-partner |
                event-organiser | tenant-admin | platform-support |
                platform-admin
language      : en | he-RTL | fr    (en = baseline; he = RTL; fr = LTR-alt)
phase         : <flow-specific>     (e.g. CART | PAYMENT | CONFIRMED for FLOW-16)
state         : empty | loading | populated | error | success
url           : /path?mock=<state>&role=<role>&lang=<lang>

png_path      : docs/e2e-snapshots/{slug}/<file>.png
last_examined : RUN-<NN>            (populate on every examination)
first_verdict : PASS | CONCERN | BLOCK
current_verdict: PASS | CONCERN | BLOCK   (if re-examined)

═══════════════════════════════════════════════════════════════════════════
AXIS A \u2014 EXTERNAL / INTERNAL FRAMING (shell correctness)
═══════════════════════════════════════════════════════════════════════════
surface_kind  : external-public        (anonymous reading a public article)
                external-tenant-module (tenant-user browsing their tenant's marketplace)
                internal-tenant-admin  (tenant-admin managing their tenant)
                internal-platform      (platform-admin / platform-support)
expected_shell: kiosk         (no sidebar, minimal wordmark, full-width)
                module         (no XIIGen engine sidebar; tenant/module chrome)
                admin          (XIIGen sidebar + full admin chrome)
actual_shell  : kiosk | module | admin
shell_verdict : PASS | BLOCK       (if actual \u2260 expected \u2192 BLOCK)

═══════════════════════════════════════════════════════════════════════════
AXIS B \u2014 ROLE BRANCHING (the RIGHT content is rendered for THIS role)
═══════════════════════════════════════════════════════════════════════════
expected_verb : <the one action this role is here to take>
                (from flow P1 + ROLE-ANALYSIS-BATCH)
primary_cta   : <what the PNG actually shows as primary action>
role_correct  : YES | NO | PARTIAL
labels_role_scoped: YES | NO       (labels + buttons reflect THIS role's context)
forbidden_role_leaks: <list>        (engine nav shown to anon; T-numbers on tenant;
                                     admin actions on a consumer role; etc.)
role_verdict  : PASS | CONCERN | BLOCK

═══════════════════════════════════════════════════════════════════════════
AXIS C \u2014 LANGUAGE (the UI speaks this locale correctly)
═══════════════════════════════════════════════════════════════════════════
document_dir  : ltr | rtl           (must match locale; he/ar/fa/ur \u2192 rtl)
document_lang : <locale-code>       (must match locale)
layout_flips_correctly: YES | NO    (he-RTL: sidebar on visual right,
                                     text-start aligned per script, etc.)
physical_direction_classes: <grep for ml-*, mr-*, text-left, text-right,
                             left-*, right-* in component>
translations_present: YES | PARTIAL | NO   (all labels translated;
                                            bundled fallbacks tolerable)
numbers_tabular_nums_correct: YES | NO     (numbers stay LTR inside RTL text)
language_verdict: PASS | CONCERN | BLOCK

═══════════════════════════════════════════════════════════════════════════
AXIS D \u2014 BUSINESS-LOGIC PHASE + STATE (the PNG is of a meaningful state)
═══════════════════════════════════════════════════════════════════════════
phase_from_P1 : <phase name from docs/flow-coverage/{slug}/P1-business-logic-inventory.md>
state_kind    : empty | loading | populated | error | success
mock_state_url_param: ?mock=<key>   (what produced this PNG)
domain_fields_shown: <list of domain-meaningful fields rendered>
topology_edge_leak : YES | NO       (RUN-83 diagnosis: 'BundleValidator \u2192
                                     Orchestrator when emits...' style labels
                                     from the service graph)
state_verdict : PASS | CONCERN | BLOCK
                BLOCK if: state is 'error' or 'empty' rendered as the
                         populated representation (UX-06b); domain fields
                         absent on populated; topology-edge leak present.

═══════════════════════════════════════════════════════════════════════════
\u2757 AXIS D IS MANDATORY (not optional) FOR ANY FLOW FLAGGED
   NEEDS_PURPOSE_BUILT_UI IN ITS EXAMINATION RECORD
═══════════════════════════════════════════════════════════════════════════
An automated-score convergence cannot substitute for Axis D on these flows.
The automated score measures grep-countable surface quality (acronym leaks,
physical-direction classes, AI-slop tells). It has no weight for "does the
screen show meaningful domain data matching the business spec?" \u2014 that
check requires a visual read of a populated-state PNG against the flow's
P1 inventory and the planned fixes in its examination record.

For every flow where the examination record says NEEDS_PURPOSE_BUILT_UI
(e.g. FLOW-21 dynamic-forms-workflows builder + respondent, FLOW-35
meta-arbitration verdict grid, FLOW-36 feature registry card list, FLOW-18
visual-flow-engine topology canvas), the Axis D block MUST be filled in
with:
  \u2022 the actual `?mock=populated` PNG path that was visually read
  \u2022 the domain_fields_shown list (verified against the planned fixes)
  \u2022 a state_verdict of PASS (and only PASS) before the flow counts as
    having post-fix verification

If Axis D is not completed for a NEEDS_PURPOSE_BUILT_UI flow, that flow
contributes `coverage_NOT_YET_EXAMINED = +1` to the convergence tally,
regardless of its automated score. See VISUAL-REEXAMINATION-PLAN.md for
the dual convergence criterion this feeds.

═══════════════════════════════════════════════════════════════════════════
AXIS E \u2014 HUMAN-FRIENDLINESS / PLAIN LANGUAGE (Luba directive)
═══════════════════════════════════════════════════════════════════════════
visible_acronyms: <count + list>    (grep: BFA | DNA | AF[- ]station |
                                     arbiter | FREEDOM | MACHINE | DLQ |
                                     T[0-9]{3} | CF-[0-9]{3} |
                                     DataProcessResult | scope_isolation |
                                     ENGINE_INTERNAL)
engineering_leaks: <list of engineer-speak strings visible to users>
                  (class names like AuctionBidProcessor,
                   method names, API paths, spec file names,
                   ES index names, service handler names)
non_technical_reviewer_test: <YES|NO> to each of:
  \u2022 'I understand what this feature does'
  \u2022 'I can see what I should do next'
  \u2022 'Nothing here looks like a developer left it by accident'
human_friendly_verdict: PASS (all three YES, 0 acronym leaks) |
                         CONCERN (1 YES missing, 1\u20132 leaks) |
                         BLOCK   (2+ YES missing, or 3+ leaks)

═══════════════════════════════════════════════════════════════════════════
AXIS F \u2014 UX/UI SKILL 5-LAYER AUDIT (from /.impeccable.md + skill libraries)
═══════════════════════════════════════════════════════════════════════════

\u2014 Layer 1 (ui-ux-pro-max P1 accessibility + P2 interaction)
color_not_only          : PASS | BLOCK
aria_labels             : PASS | BLOCK
form_labels             : PASS | BLOCK
heading_hierarchy       : PASS | BLOCK
loading_buttons         : PASS | BLOCK
error_feedback          : PASS | BLOCK
nav_state_active        : PASS | CONCERN
drawer_usage            : PASS | BLOCK
touch_target_size       : PASS | CONCERN
layer1_verdict          : PASS | CONCERN | BLOCK

\u2014 Layer 2 (design-for-ai CHECKER 10-tell detection)
tells_count             : 0\u20132 = PASS | 3\u20135 = CONCERN | 6+ = BLOCK
tells_present           : <list of the tells that triggered>
                          (Inter default; monospace-as-technical;
                           cyan-on-dark; pure-#000/#fff; hero-metric;
                           identical card grid; centred-everything;
                           side-stripe border; gradient text;
                           emoji-as-action-icons)
layer2_verdict          : PASS | CONCERN | BLOCK

\u2014 Layer 3 (critique Nielsen H1/H2/H8/H9 0\u20134 scoring)
H1_visibility_of_status : 0\u20134
H2_match_real_world     : 0\u20134   (engineering jargon auto-scores 0 \u2192 BLOCK)
H8_aesthetic_minimalist : 0\u20134
H9_error_recovery       : 0\u20134
total_score             : N / 16
layer3_verdict          : PASS (\u2265 12) | CONCERN (8\u201311) | BLOCK (< 8)

\u2014 Layer 4 (UX-30 grammar verification)
declared_grammar        : PROGRESS_STRIP | VERDICT_GRID | CARD_LIST |
                          TOPOLOGY_CANVAS | KIOSK | DASHBOARD | SETTINGS_TABS
implemented_grammar     : <what the PNG shows>
grammar_matches         : YES | PARTIAL | NO
dyn_crud_table_on_tenant_or_public: YES (\u2192 auto-BLOCK) | NO
layer4_verdict          : PASS | CONCERN | BLOCK

\u2014 Layer 5 (interface-design mandate checks)
swap_test               : PASS (swapping typeface / layout would be felt) | FAIL
squint_test             : PASS (hierarchy + action-required visible) | FAIL
signature_test          : PASS (5+ XIIGen-signature elements pointable) | FAIL
token_test              : PASS (tokens sound domain-native) | PARTIAL | FAIL
non_tech_reviewer_test  : PASS (all 3 questions YES) | FAIL
layer5_verdict          : PASS (all 5) | CONCERN (1 FAIL) | BLOCK (2+ FAIL)

═══════════════════════════════════════════════════════════════════════════
AXIS G \u2014 FOLLOW-UPS (what still needs work for this cell)
═══════════════════════════════════════════════════════════════════════════
open_items    : <bullet list; each item one concrete action>
                (e.g. 'Hebrew RTL spot-check not yet done for this PNG',
                 'FLOW-34 plain-language audit pending for
                  mpa-curator-approved-count field',
                 'Topology drill-down not yet implemented on this canvas')
blocked_on    : Luba | architectural-decision | none
owner         : Claude Code
target_run    : RUN-<NN-target>     (when this cell will be re-examined)

═══════════════════════════════════════════════════════════════════════════
FINAL VERDICT FOR THIS PNG
═══════════════════════════════════════════════════════════════════════════
any_block     : YES | NO            (if any axis returned BLOCK)
any_concern   : YES | NO            (if any axis returned CONCERN)

overall       : PASS     \u2014 every axis PASS, no follow-ups open
              | CONCERN  \u2014 at least one CONCERN, no BLOCK
              | BLOCK    \u2014 at least one BLOCK axis
              | NOT_YET_EXAMINED \u2014 default for cells we haven't touched

audit_commit  : <git hash of the run that produced this audit>
```

---

## Example completed block (FLOW-08 marketplace · tenant-user · en · populated)

```
flow          : FLOW-08
slug          : marketplace
screen        : EventDiscoveryPage
role          : tenant-user
language      : en
phase         : PUBLISHED (events visible in discovery feed)
state         : populated
url           : /marketplace?role=tenant-user
png_path      : docs/e2e-snapshots/marketplace/role-tenant-user.png
last_examined : RUN-90
first_verdict : PASS
current_verdict: PASS

\u2014 Axis A \u2014 External/Internal framing
surface_kind  : external-tenant-module
expected_shell: module
actual_shell  : admin (sidebar visible, should be module)
shell_verdict : FIXED in RUN-120 (tenant-user isConsumerShell=true)

\u2014 Axis B \u2014 Role branching
expected_verb : find an event worth RSVPing to
primary_cta   : 'Register' (blue button per event card)
role_correct  : YES
labels_role_scoped: YES (no ENGINE labels, no cross-tenant language)
forbidden_role_leaks: none
role_verdict  : PASS

\u2014 Axis C \u2014 Language
document_dir  : ltr \u2713
document_lang : en \u2713
layout_flips_correctly: N/A for en
physical_direction_classes: 0 hits in this file (grep clean)
translations_present: en:verified \u00b7 he:deferred \u00b7 fr:deferred
language_verdict: PASS (for en only; he not yet spot-checked)

\u2014 Axis D \u2014 Business-logic phase + state
phase_from_P1 : 'PUBLISHED events in the tenant's discovery feed'
state_kind    : populated
mock_state_url_param: n/a (no mock, seed data on load failure)
domain_fields_shown: eventName, category, startsAt, venue, capacity,
                      registeredCount (driving the capacity strip)
topology_edge_leak : NO
state_verdict : PASS

\u2014 Axis E \u2014 Human-friendliness
visible_acronyms: 0 (removed 'PUBLISHED' chip in RUN-90)
engineering_leaks: none
non_technical_reviewer_test:
  \u2022 'I understand what this feature does': YES
  \u2022 'I can see what I should do next': YES
  \u2022 'Nothing here looks like a developer left it': YES
human_friendly_verdict: PASS

\u2014 Axis F \u2014 5-layer UX audit
Layer 1: PASS (capacity strip has colour + text; no icon-only buttons;
               form-free; h1+h3 hierarchy; no async buttons on this view;
               N/A; no sidebar for tenant-user post-RUN-120;
               44px CTA height)
Layer 2: 0 tells \u2192 PASS (no hero-metric, no identical card grid
                           \u2014 each card differentiated by capacity-state
                           bar; no emoji-as-icons, no side-stripe,
                           no cyan-on-dark)
Layer 3: H1=3, H2=4, H8=4, H9=3 \u2192 14/16 PASS
Layer 4: declared=CARD_LIST; implemented=CARD_LIST; grammar_matches=YES;
         dyn_crud_table_on_tenant_or_public=NO \u2192 PASS
Layer 5: swap=PASS (capacity-strip signature unique), squint=PASS
         (state-differentiated urgency), signature=PASS (capacity
         strip + category pill + state colour), token=PARTIAL
         (Tailwind utilities, not domain tokens yet),
         non-tech-reviewer=PASS \u2192 CONCERN on token only \u2192 PASS

\u2014 Axis G \u2014 Follow-ups
open_items:
  \u2022 Hebrew RTL spot-check (this cell not yet visually verified at
    dir=rtl; file has zero physical-direction classes so layout
    should auto-flip, but needs confirmation)
  \u2022 French spot-check (deferred; lower priority than he)
  \u2022 Loading-state PNG capture for this role
  \u2022 Error-state PNG capture (API failure fallback)
blocked_on    : none
owner         : Claude Code
target_run    : RUN-128+ (Hebrew spot-check wave)

\u2014 Final verdict
any_block     : NO
any_concern   : NO  (after RUN-120 shell fix landed)
overall       : PASS
audit_commit  : 9f6e1845 (RUN-90 that established the signature) +
                ac5f4e62 (RUN-120 that fixed the shell)
```

---

## How to use the template operationally

### For a fresh PNG (never examined):
1. Copy the template block above.
2. Fill in the 5 identity axes (flow / slug / screen / role / language / phase / state).
3. Open the PNG.
4. Run Axis A\u2192G top to bottom — record each verdict.
5. Append the block to `ROUND-2-COVERAGE-MATRIX.json` as a new entry.
6. If any BLOCK: write a focused fix, commit, re-run the template as a re-examination.

### For a re-examination after a fix:
1. Find the prior entry in `ROUND-2-COVERAGE-MATRIX.json`.
2. Update `last_examined`, `current_verdict`, and any axis that changed.
3. Note the new `audit_commit`.

### For a batch update across many PNGs:
Use the self-execution commands in `ROUND-2-MATRIX-PLAN.md` to grep
the offender patterns (acronyms, hero-metric, physical direction
classes, icon-only buttons) and produce a table of which flows
still carry each failure. Then create one entry per (flow, role,
language, phase, state) combination where a grep hit was found,
with the relevant axis set to BLOCK.

---

## Why both a template and a coverage matrix

The template validates **one** image. The coverage matrix (`ROUND-2-COVERAGE-MATRIX.json`) answers **"are all of them verified?"** — it's the index that tells you what's been looked at, what passed, what's still NOT_YET_EXAMINED. Luba asked for both; one without the other leaves a blind spot.

---

## END OF TEMPLATE
