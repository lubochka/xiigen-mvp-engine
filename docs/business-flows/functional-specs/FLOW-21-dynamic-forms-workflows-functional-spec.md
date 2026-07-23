# Functional Spec — FLOW-21 Dynamic Forms & Workflows

**Grammar:** G7 Settings tabs (form builder) + G5 Kiosk (public form submission) + G3 Card list (submission management)
**Primary role tiers:** TENANT_OPS (form author), TENANT_CONSUMER / PUBLIC (form filler), PLATFORM_OPS
**Current state:** **Half-built** — 4 services running form schema + submission processing; **`/forms/:schemaId` public route doesn't exist** — end users can't reach the forms their tenants publish
**Primary unblock:** add the public form-filler route + page

---

## 1. Summary

A tenant (community admin, event organiser, freelancer, researcher) defines a custom form — questions, validation, conditional logic, routing on submit — and gets a shareable public URL. A respondent (authenticated member or anonymous visitor) opens that URL, fills the form in a focused single-task view, and submits. The tenant monitors submissions, exports data, and triggers downstream workflows (notify, auto-reply, route to a Zapier-style action). Today the schema + submission processor runs server-side; neither the form-builder UI for the author nor the filler page for the respondent exists.

---

## 2. Roles & modes

| Role | Route prefix | What they do |
|---|---|---|
| **TENANT_OPS** (form author) | `/admin/forms/` | Create, edit, publish forms; view submissions; configure workflows |
| **TENANT_CONSUMER / PUBLIC** (respondent) | `/forms/:schemaId` | Open a published form, fill it in, submit |
| **PLATFORM_OPS** | `/admin/engine/forms/` | Monitor abuse, policy violations, platform-level form metrics |
| **PLATFORM_OPS** (moderator) | `/admin/engine/forms/review` | Review flagged forms (phishing, spam) |

**Modes:**
- **Authenticated respondent:** pre-fills name + email from their account; submission is linked to their user record.
- **Anonymous respondent:** email field required; submission stored as anonymous with optional "remember me" cookie for repeat submissions.
- **Mobile:** forms are single-column, large tap targets, progressive disclosure (one question per screen optional).
- **Embed mode:** `?embed=true` strips the XIIGen header/footer for iframe use.
- **Preview mode:** author clicks "Preview" → their own version of the form URL to test without logging a real submission.

---

## 3. User stories

### Story 3.1 — Author creates a new form from a blank template *(TENANT_OPS, G7)*

**Screens:** `/admin/forms/` list → **New form** CTA → builder at `/admin/forms/:id/edit` → publish → share-link modal.

**Trigger:** author clicks **New form** on the forms list.

**Happy path:**
1. New form created as Draft; builder opens at `/admin/forms/new-draft-xyz/edit`.
2. Builder has three panes: left (question library), centre (form canvas), right (question settings for the selected question).
3. Author drags a "Short text" question from the left pane onto the canvas. Question appears in the centre with the right pane showing its settings (label, required, placeholder, validation).
4. Author renames the form (top of canvas, inline-editable title).
5. Author adds more questions (long text, single-select, multi-select, date, file upload, scale, signature).
6. Author clicks **Publish** (primary CTA, top-right). Confirm modal: *"Publishing makes the form reachable at `community.xiigen.com/forms/:schemaId`. You can unpublish anytime — existing submissions stay."*
7. On confirm, state goes Draft → Published; share-link modal appears with copy button + "preview the form" link + QR code.

**UI elements:**
- Left pane: collapsible question-library groups (Inputs, Choice, Date & time, Advanced).
- Canvas: each question is a card with drag handle, duplicate, delete. Reordering is drag-and-drop with clear drop indicators.
- Right pane: contextual settings for the selected question.
- Top bar: form title (inline-editable), state badge (Draft / Published / Paused), preview link, publish/unpublish button.

### Story 3.2 — Respondent fills and submits a form *(PUBLIC / TENANT_CONSUMER, G5 kiosk)*

**Screens:** `/forms/:schemaId` → (optional multi-step) → success page.

**Trigger:** respondent clicks a share link.

**Happy path:**
1. `/forms/:schemaId` loads. No XIIGen admin chrome. Header shows the form author's logo + form title + (optional) description.
2. Form renders as a single scrolling column (desktop) or progressive one-question-at-a-time (mobile, if author enabled it).
3. Respondent fills fields. Validation is on blur, not on keystroke, except for format hints (phone, email).
4. **Submit** button at the bottom. Disabled until required fields valid.
5. On submit: inline loading state on the button; then navigation to a success page with the author-configured thank-you message + (optional) next action (redirect URL, share link, invitation to fill another form).

**UI elements:**
- Zero chrome on the form page — no XIIGen sidebar. Feels like the author's page.
- One-column layout, max-width 640px centred.
- Per-field labels above the input (never placeholder-only — accessibility).
- Validation errors below the field in red with icon.
- Progress bar at the top if the form is multi-step.

### Story 3.3 — Author reviews submissions *(TENANT_OPS, G3 + detail)*

**Screens:** `/admin/forms/` → click a form → `/admin/forms/:id/submissions` → click a row → submission detail panel.

**Trigger:** author clicks a form's "X submissions" link from the forms list, or opens the submissions tab inside a form.

**Happy path:**
1. Submissions table: one row per submission. Columns: respondent (name + email), submitted-at, status (New / Reviewed / Archived), first 2 response columns as preview, actions (view, export).
2. Filters at top: date range, status, contains-text search across all responses, respondent domain.
3. Click a row → side panel slides in from the right with the full submission (all questions + answers + metadata).
4. Side-panel actions: Mark reviewed / Archive / Export this submission / Respond via email.
5. Top-right of the table: **Export all** button → CSV / JSON / Google Sheets connection.

**UI elements:** card list with state badges (per SK-539 G3). Side-panel detail view — never a separate page that breaks the list context.

### Story 3.4 — Author wires a submission → email notification workflow *(TENANT_OPS, G7 settings area within the form)*

**Screens:** form builder → Workflows tab → **Add workflow** → trigger + action wizard.

**Trigger:** author clicks the "Workflows" tab inside the form.

**Happy path:**
1. Workflows tab (G7 within the form). Empty state: *"When a submission arrives, what should happen? Add a workflow to notify, route, or trigger something."*
2. Click **Add workflow** → small modal: pick trigger (always / when a field has a specific value / when the respondent is new vs returning) → pick action (email author, email respondent, post to Slack, post to webhook, add to CRM).
3. Each action has its own configuration (email to, subject template, body with `{{field}}` interpolation).
4. Save → workflow card appears in the workflows list. Toggle to pause/activate.
5. On new submission: the workflow fires server-side; the workflow's "last run" timestamp updates.

**UI elements:** workflow cards with state badge (Active / Paused / Error), last-run timestamp, run count, error message if the last run failed with a **Retry** affordance.

### Story 3.5 — Author duplicates a form *(TENANT_OPS, minor)*

**Trigger:** author clicks **Duplicate** on a form card.

**Happy path:** new draft created with `{original title} (copy)` and same questions; workflows explicitly excluded (respondent-contact configuration often differs between forms); toast + redirect to the new draft's builder.

### Story 3.6 — Platform admin reviews a flagged form *(PLATFORM_OPS, G2 verdict grid)*

**Screens:** `/admin/engine/forms/review` → verdict grid → form detail → approve / take down / warn.

**Trigger:** a form triggered automated spam/phishing checks or was reported.

**Happy path:**
1. Review queue renders Grammar-2 verdict grid: rows = flagged forms, columns = check verdicts (Spam, Phishing, PII misuse, Rate-limit abuse, Policy).
2. Click a row → detail view: form content + flag reasons + respondent reports + author history.
3. Three actions: Approve (clear flags), Take down (unpublish + notify author), Warn author.

---

## 4. Screen structure & UI elements

### 4.1 `/admin/forms/` (Author list, G3 card list)

**Layout:** top bar with **New form** CTA + search; card list below, one card per form.

**Card:** thumbnail (first-question-preview or icon), title, state badge (Draft / Published / Paused), submission count + chart sparkline, last-submitted timestamp, action menu (duplicate, archive, delete).

**Empty state:** *"No forms yet — create one to collect data from your community."* with **New form** CTA and illustration. Never an empty table with column headers.

### 4.2 `/admin/forms/:id/edit` (Builder, G7-ish three-pane)

**Layout:** three-pane (left question library / centre canvas / right question settings). Top bar: form title, state, preview, publish.

**Tabs within the builder** (top of centre pane): **Build · Logic · Design · Workflows · Share · Submissions**.

- **Build:** the three-pane drag-drop canvas.
- **Logic:** conditional rules ("show question 5 only if answer to question 2 is yes").
- **Design:** colour theme, logo upload, custom CSS for power users.
- **Workflows:** Story 3.4.
- **Share:** public URL + QR + embed code + password protection toggle.
- **Submissions:** Story 3.3 embedded here.

### 4.3 `/forms/:schemaId` (Respondent, G5 kiosk)

**Layout:**
- **Header:** author logo + form title.
- **Main:** single-column form, max-width 640px, centred.
- **Footer:** *"Powered by XIIGen"* tiny link (removable on paid tiers).

**Question components:** short text, long text (with character count), email, phone, single-select (radio or select), multi-select (checkboxes), date, datetime, date-range, file upload, rating (1-5 stars or NPS 0-10), signature (canvas), scale, yes/no toggle, matrix (rows × columns of radios).

**Multi-step mode:** progress bar top, next/back buttons at the bottom, keyboard Enter-to-advance.

### 4.4 `/admin/engine/forms/review` (Platform moderator, G2 verdict grid)

Rows = flagged forms, columns = check types, cells = Pass / Concern / Fail / Needs review. Same pattern as FLOW-20 admin review.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Author deletes a question that has conditional logic pointing to it | Confirm modal: *"This question has logic rules attached. Deleting it removes the rules too."* with **Delete and remove 3 rules** / **Cancel**. |
| Respondent submits a form that was paused while they were filling it | Submit succeeds if paused-just-now (within 60s grace); otherwise submit fails with *"This form is no longer accepting responses — your answers are saved as a draft, ask the owner if you need help."* |
| Respondent submits the same form twice (authenticated) | Author configures per-form: allow multiple submissions / only latest counts / first submission only. UI respects the setting with a visible "You already submitted this form" state on re-visit. |
| File upload exceeds max size | Field-level error: *"Max 10 MB — this file is 13 MB."* + suggestion. No silent failure. |
| Author publishes without any questions | Publish button disabled with tooltip *"Add at least one question to publish."* |
| Form has 100+ questions | Builder canvas virtualises (not all DOM rendered at once); performance stays under 100ms keystroke latency. |
| Respondent has JavaScript disabled | Server-rendered fallback submits via normal form POST; no dynamic validation but the form still works. Progressive enhancement only. |
| Two authors edit the same form simultaneously | Last-save-wins with a visible warning: *"Anna edited this form 30 seconds ago — reloading will pull her changes."* |
| Embedded form inside iframe on third-party site with strict CSP | Works with `?embed=true` + `frame-ancestors` header configured per tenant. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** on `/admin/forms/` | Redirect to `/login?return=/admin/forms/`. |
| **Permission denied** (TENANT_CONSUMER on `/admin/forms/`) | `/404` *"This page isn't for your account type."* |
| **Session expired mid-build** | Toast: *"Signed out — your draft was saved."* + sign-in modal that returns to the same question selected. |
| **Network offline in builder** | Top banner: *"Offline — changes will sync when you're back online."* Changes queue locally; save button shows a dot. |
| **Submit fails — network** (respondent) | Stays on form, inline banner: *"We couldn't submit — check your connection and try again."* Local draft preserved. |
| **Submit fails — server** | Banner: *"Something's off on our side — your answers are saved, try again in a minute."* **Retry** button; draft preserved. |
| **Submit blocked — spam detection** | Banner: *"We couldn't submit this — if you think this is a mistake, email {author}."* No scary jargon. |
| **Form not found** `/forms/:schemaId` | Friendly 404: *"This form isn't available — it may have been removed or paused."* |
| **Form paused** by author while respondent is mid-fill | Full-screen banner on the form page: *"This form is no longer accepting responses — but your answers are saved. Reach out to {author} if you need help."* |
| **Password-protected form** | Password input screen before the form; wrong password → *"That password doesn't match — try again."* |
| **Rate limited** (respondent submitting many forms) | Soft: *"Slow down — you can submit again in 30s."* |
| **File upload virus detected** | Field error: *"We blocked this file — looks unsafe. Try a different file."* |
| **Stale data** (author opened submissions list 30 min ago; new submissions came in) | Subtle top banner: *"12 new submissions — reload to see them."* Live badge counter updates. |
| **Conflict** (author published a form that now has workflow pointing to a deleted field) | Publish blocked with banner: *"One workflow references a field that doesn't exist — fix or remove the workflow to publish."* with link to the offending workflow. |
| **Empty submissions** | Friendly empty state: *"No submissions yet — share the link to start collecting."* with copy-link affordance. |
| **Third-party workflow down** (Slack unreachable) | Workflow card shows error state + last-error timestamp + **Retry** button. Never silently drops. |
| **Danger-zone: delete form with submissions** | Triple confirm: *"Deleting removes all 247 submissions permanently"* → *"Type the form title to confirm"* → final. Offer **Export all first** as a shortcut above the confirm. |

---

## 7. Visual direction

**Grammar:** G5 Kiosk (respondent) + G7 Settings tabs (builder Logic/Design/Workflows/Share panes) + G3 card list (submissions + forms list) + G2 verdict grid (platform review).

**Feel (3 words):** *Spacious · Confident · Focused* — for the respondent page. *Workmanlike · Precise · Fast* — for the builder. Different faces for different audiences.

**Domain vocabulary:** form, question, submission, respondent, workflow, trigger, action, published, draft, paused. Never "schema", "field definition", "submission ID", "webhook endpoint" in the respondent UI.

**Colour world (respondent):**
- White canvas, maximal whitespace
- Author's brand colour for the primary submit button only (pulled from their Design tab)
- Grey for supporting text
- Red for validation errors, with icon + text (never colour alone)

**Colour world (builder):**
- Subtle blue-grey chrome (`#eef1f5`, `#d9dde3`)
- Amber for paused, green for published, grey for draft

**Signature element:** the **live preview pane** in the builder — every drag to the canvas updates the preview on the right in real time. Nothing about it is a future-only promise; the respondent view is literally what the author sees.

**Anti-references:** Wufoo circa 2015 (too playful), Jotform default themes (too busy), generic Bootstrap forms (too mechanical).

**Anti-patterns:**
- Placeholder-only labels (accessibility failure)
- Validating on every keystroke instead of on blur
- Forcing a login before even seeing the form
- Submit button that's disabled without telling the user which field is missing
- XIIGen admin sidebar appearing on the respondent page

---

## 8. Acceptance criteria

- [ ] `/forms/:schemaId` renders for any visitor (PUBLIC or authenticated) with zero XIIGen admin chrome.
- [ ] Form builder three-pane layout works on desktop; collapses to tabs (Build / Logic / Design / Share / Submissions) on narrow viewports.
- [ ] All 15 question types render with accessible labels, proper focus management, and WCAG AA contrast.
- [ ] Multi-step mode: progress bar visible, Enter advances, Esc doesn't exit.
- [ ] Live preview in builder updates within 100ms of any change.
- [ ] Publish wizard produces a shareable URL, a preview URL, a QR code, and an embed snippet.
- [ ] Submission table supports text search, date filter, status filter; side-panel detail renders inline without navigation.
- [ ] Workflow creation supports at minimum: email author, email respondent, Slack, webhook.
- [ ] Every workflow has a "last run" timestamp + error state with retry.
- [ ] Platform review queue renders G2 verdict grid; three actions (Approve / Take down / Warn).
- [ ] All 17 problematic states (§6) render the documented treatment — no raw 4xx/5xx screens.
- [ ] Export as CSV, JSON, and Google Sheets connection from the submissions view.
- [ ] Password-protected forms gate correctly; wrong password does not reveal the form structure.
- [ ] Zero engineering terminology (schema, field ID, webhook endpoint) in respondent UI.
- [ ] Under-13 accounts cannot fill forms collecting PII; anonymous-allowed forms respect this.
- [ ] Danger-zone delete requires triple confirm with export-first shortcut.
