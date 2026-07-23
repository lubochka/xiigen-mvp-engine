# Functional Spec — FLOW-02 Profile Enrichment (polish)

**Grammar:** G5 Kiosk → multi-step wizard
**Primary role tiers:** TENANT_CONSUMER
**Current state:** **Half-built** — 7 services, 3 pages (Questionnaire, Matching, Personalisation). Pipeline runs. One test track red. Rendering polish needed before it's shippable.
**Primary unblock:** rendering polish + empty-state for no-matches

---

## 1. Summary

A freshly-registered member answers a skills questionnaire, is matched to 3-5 relevant projects, and personalises their feed preferences. Today the 3 pages render but miss UI details: step indicator, progress bar, empty-state copy, one-question-per-screen rhythm, right-pane micro-affordances.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **TENANT_CONSUMER** | `/onboarding/profile` | 3-step wizard: questionnaire → matches → personalisation |

**Modes:**
- **First-time** (post-registration): auto-launched after email verify.
- **Returning** (user comes back to update): same 3-step UI with existing answers pre-filled; can skip any completed step.
- **Skip-all:** dismissible with a secondary CTA; user can complete later from `/settings/profile`.

---

## 3. User stories

### Story 3.1 — New member completes the 3-step wizard

**Screens:** `/onboarding/profile/questionnaire` → `/onboarding/profile/matching` → `/onboarding/profile/personalisation` → `/feed`.

**Happy path:**
1. **Step 1 — Questionnaire:** one question group per screen (not all at once). Step indicator top-right *"Step 1 of 3"* + progress bar. Next button primary, Back secondary; Skip-all tertiary.
2. **Step 2 — Matching:** 3-5 project cards based on questionnaire answers. Each: project title, excerpt, tags matching user's answers, mutual-member count. **Join** CTA on each card. At least 1 join required to advance, or **Skip** available.
3. **Step 3 — Personalisation:** feed preferences — topic toggles, source toggles, digest vs live feed. Preview on the right showing what the feed will look like.
4. On **Finish**: welcome toast + redirect to `/feed` which is personalised from step 3.

**UI elements:**
- **Step indicator** top-right of every step: *"Step N of 3"* + dots.
- **Progress bar** under the step indicator.
- **Back / Next / Skip** buttons always visible at the bottom.
- **Matching cards** use consistent grid (3 or 5 across desktop, 1 column mobile).
- **Preview pane** on personalisation step: live feed mockup updating as user toggles.

### Story 3.2 — Member with no matches sees a graceful empty state

**Trigger:** questionnaire answers don't match any current projects.

**Happy path:**
1. Step 2 shows *"No projects match you yet — tell us a bit more about what you're looking for."* with a **Refine answers** link back to Step 1 and **Browse all projects** as an alternative.
2. Never a blank page with zero cards.

### Story 3.3 — Member skips and completes later

**Trigger:** user clicks **Skip all** in the wizard.

**Happy path:**
1. Confirm: *"Skip for now? You can complete your profile anytime from Settings."*
2. On confirm: redirect to `/feed` (un-personalised); banner prompts to complete later.

---

## 4. Screen structure

### 4.1 Common wizard chrome

Top-right step indicator + progress bar. Bottom-right bank: Back / Next / Skip. Single-column centred content, max-width 680px.

### 4.2 Step 1 Questionnaire

One question group per screen with 3-7 related questions. Each question: label, input (text / multi-select / rating / date). "Why we ask this" tooltip.

### 4.3 Step 2 Matching

3-5 project cards. Each card has title, excerpt, tags, member count, Join CTA.

### 4.4 Step 3 Personalisation

Left column: toggles (topics, sources, digest frequency). Right column: live feed preview (5-7 placeholder cards updating based on toggles).

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| User reloads mid-step | Progress saved server-side; returning to wizard resumes at last step. |
| User refines answers after seeing matches | Back to Step 1; answers pre-filled; Step 2 matches re-run. |
| User joins a project mid-wizard and the project fills up | Card updates to *"Full — added to waitlist"* inline; doesn't block advancing. |
| Accessibility: keyboard-only user | Tab order is logical; step indicator reachable via skip-link; all CTAs keyboard-activatable. |
| Slow network on Step 2 (matches take 10s to compute) | Loading state with *"Finding projects for you..."* + skeleton cards; progress indicator never stuck. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** | Redirect to registration / login. |
| **No matches** | See Story 3.2. |
| **Server error on advance** | Toast *"Couldn't save — retry?"*; answers preserved locally; retry button. |
| **Empty personalisation preview** | *"Feed preview appears here as you pick topics."* — not a blank area. |
| **Session expired mid-wizard** | Toast + sign-in modal; wizard state preserved. |
| **Skip-all without completing** | See Story 3.3. |

---

## 7. Visual direction

**Grammar:** G5 kiosk multi-step.

**Feel:** *Welcoming · Confident · Unhurried*. This is the user's first real engagement after sign-up.

**Colour world:** warm neutrals; accent colour from the platform's brand; success green for "Joined".

**Signature:** the **live feed preview** on Step 3 — instant feedback for every toggle.

**Anti-patterns:**
- All questions on one long scrolling page (overwhelming).
- Modal-within-modal for sub-questions.
- No-match state that shows zero cards with no explanation.

---

## 8. Acceptance criteria

- [ ] Step indicator + progress bar visible on every wizard step.
- [ ] One question group per screen (not all at once).
- [ ] Step 2 shows 3-5 cards or the graceful empty state.
- [ ] At least 1 join required to advance Step 2, or **Skip**.
- [ ] Step 3 live preview updates within 100ms of toggle change.
- [ ] Reloading mid-wizard resumes at last step.
- [ ] Failing test track fixed; flow passes in CI.
- [ ] All 6 problematic states documented treatment.
- [ ] Keyboard-navigable end to end.
