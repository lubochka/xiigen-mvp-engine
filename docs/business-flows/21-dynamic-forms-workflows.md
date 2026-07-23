<!--
  Source: business flows.zip / 21 - forms and flows.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-21 dynamic-forms-workflows
  Related deep-research: docs/business-flows/_deep-research/dynamic-forms-workflows/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/dynamic-forms-workflows/ (if present)
-->

Gravity Forms (and similar “form builders”) are basically **a Forms + Workflow/Automation layer** that sits on top of the CMS. It helps non-developers build “mini applications” (forms, conditional logic, notifications, integrations, payments) without writing code.

Here’s how to think about it in **modules** and **flows**.

---

## 1) What a Forms Builder like Gravity Forms contains (modules)

### A. Form Definition & UI Builder

* Drag/drop fields, sections, pages (multi-step), repeaters (sometimes), calculations
* Conditional rules per field (“show X if Y is ‘Yes’”)
* Form-level settings: confirmations, limits, scheduling, anti-spam

**Output:** a stored “form schema” (fields, rules, settings)

---

### B. Form Runtime Renderer

* Takes the schema and renders:

  * public form UI (shortcode/block)
  * admin preview
* Handles client-side behaviors (show/hide fields, wizard steps)

---

### C. Submission Pipeline (the heart)

A typical pipeline looks like:

1. **Request intake** (POST)
2. **Normalize input** (field parsing, file refs)
3. **Validation** (required fields, regex, cross-field, business rules)
4. **Spam/security** (CSRF nonce, honeypot/reCAPTCHA, rate limits)
5. **Persist entry** (save submission)
6. **Post-processing events** fire (notifications, feeds, hooks)
7. **Confirmation** (redirect / message / next step)

---

### D. Entry Storage (Submissions)

* Stores each submission (“entry”) + meta (IP, user, timestamps, status)
* Often supports:

  * export CSV
  * partial entries / save & continue
  * entry updates (admin edits)
  * entry lifecycle (unread/read, starred, trashed)

---

### E. Notification Engine

* Email/SMS templates with merge tags
* Routing rules (“send to X if Department = Finance”)
* Attachments (uploaded files, generated PDFs via add-ons)

---

### F. “Feeds” / Integration Add-ons

Gravity Forms uses a “feed” concept: **per-form integration rules** like:

* On submit → create/update CRM contact
* On submit → add to Mailchimp list
* On payment success → create invoice in accounting system
* On conditional match → send to Slack/Teams

This is where it starts to look like a “flow builder”.

---

### G. Payments Module (optional add-ons)

* Payment fields, pricing, coupons
* Payment gateway connectors (Stripe/PayPal, etc.)
* Payment states: pending → paid → failed → refunded
* Separate event triggers for “payment completed”

---

### H. File Uploads & Media Handling

* Secure upload endpoints
* Virus scanning (sometimes external)
* Storage (local / S3 via add-ons)
* Permissions: who can download, signed URLs, retention

---

### I. Admin Ops: Logs, Resend, Retry, Export, Permissions

* Audit logs
* Re-send notifications
* Re-run feeds
* Role-based access (who can view entries, edit forms)

---

### J. Extensibility Layer (Hooks / API)

* Hooks/events at each stage:

  * before validation
  * after entry created
  * after payment completed
* REST API / webhooks for headless or external orchestration

---

## 2) What “Flow Builders” are (and how they differ)

Tools like **Zapier / Make / n8n / Power Automate**, and WordPress ones like **Uncanny Automator / AutomatorWP / WP Fusion**, are primarily:

### Flow Builder Core Modules

**A. Trigger Registry**

* “When X happens…” (form submitted, post published, user created, payment succeeded)

**B. Action Registry**

* “Do Y…” (send email, create CRM lead, post Slack message, create Jira ticket)

**C. Rule/Condition Engine**

* If/else branches
* Filters (“only if email ends with company.com”)

**D. Data Mapping & Transformation**

* Map fields → external payload
* Transformations: concat, format dates, parse JSON, lookup tables

**E. Execution Engine**

* Runs the recipe
* Handles steps, branching, loops, delays

**F. Queue + Retry + Idempotency**

* Background jobs
* Retry with backoff
* “Don’t create duplicates if the trigger replays”

**G. Secrets & Connector Management**

* OAuth tokens, API keys, scopes
* Per-tenant connections

**H. Observability**

* Run history, step logs, failures, replays

---

## 3) How Gravity Forms + Flow Builders typically work together

Gravity Forms is often the **front door** (collect structured input + validate + store).
A flow builder is the **orchestrator** (fan out to many systems with retries and logs).

### Common integration patterns

#### Pattern 1: Form submission → internal “event” → flow runner

* Gravity Forms submission emits `FormSubmitted(formId, entryId, payload)`
* Flow runner picks it up and runs automation recipes

#### Pattern 2: Form submission → webhook → external automation

* Send webhook to Zapier/n8n endpoint
* External system handles the entire pipeline

#### Pattern 3: Hybrid (best practice)

* Store entry locally first (source of truth)
* Trigger automation asynchronously
* If integrations fail, entry is still saved and can be retried

---

## 4) Typical flows people build (real examples)

### Lead capture flow

1. User submits form (name/email/company)
2. Validate + save entry
3. If consent = true → add to email list
4. Create/Update CRM lead
5. Notify sales in Slack + assign owner
6. Create follow-up task in Asana/Jira

### Support / triage flow

1. Form with conditional fields (“bug” vs “feature request”)
2. Route notification to correct team
3. Create ticket with mapped fields + attachments
4. If severity = high → page on-call

### Paid form / booking flow

1. Multi-step form → calculate price
2. Payment authorization
3. On payment success:

   * create order record
   * send receipt
   * generate PDF invoice
   * update inventory / booking slot
   * notify ops team

---

## 5) If you’re designing your own “Gravity Forms + Flow Builder” architecture

If you want this capability in *your* platform, the clean separation is:

### Forms Service (authoring + submission)

* `FormSchema`
* `Entry`
* `SubmissionPipeline` (validate → persist → emit events)
* `Notifications` (simple)
* `Webhooks` (optional)

### Automation Service (flows)

* `Recipe` (trigger + steps + conditions)
* `Connector` adapters
* `ExecutionEngine` + queue
* `Runs` + logs + retry/idempotency
* `Secrets` storage

**Key contract:** Forms emits events; Automation consumes them.

---

If you tell me which direction you mean:

* **WordPress plugin architecture** (build a GF-like plugin), or
* **Your own platform** (microservices + UI builder + orchestrations like n8n),

…I’ll sketch the exact modules, data types (FormSchema/Entry/Recipe/Run), and the event flow (including retries + idempotency) in a way that’s production-grade.
To extend the **XIIGen Multimodel Orchestrator** platform with the "Forms + Flow Builder" capability described in the provided document, we will integrate a new **Forms & Automation Layer**. This extension will leverage your existing **Flow Orchestrator (F09)**, **Skills Factory**, and **Redis Queue (F04)** to create a mini-application builder.

### 1. Capability Matrix Extension

We will introduce three new core services to the `CAPABILITY_MATRIX.md` to handle the specific needs of form-driven workflows:

* **F64: Forms Authoring Service:** Manages `FormSchema` definitions, including field types, validation rules, and conditional logic ("Show X if Y is Yes").
* **F65: Form Runtime Engine:** A specialized skill that renders the schema for the **React Native Client (F25)** and handles client-side behaviors like multi-step wizards.
* **F66: Submission Pipeline:** A high-throughput service for processing intake, normalization, and spam/security checks (Honeypot/reCAPTCHA) before persisting entries.

### 2. Integration with the "XIIGen Architect Protocol"

The extension will follow the existing project-flow logic where the **Figma Parser (F10)** and **Figma Plugin Bridge (F39)** are used to "author" the forms directly from design files.

#### Flow Architecture:

1. **Trigger:** A user submits a form. The **Submission Pipeline (F66)** validates the data and saves the `Entry`.
2. **Event Emission:** On successful submission, F66 emits a `FORM_SUBMISSION_COMPLETED` event to the **Redis Queue Service (F04)**.
3. **Orchestration:** The **Flow Orchestrator (F09)** consumes this event and initiates the associated **Automation Recipe**.
4. **Execution:** The **AI Dispatcher (F07)** routes individual steps (e.g., "Generate PDF invoice," "Create ticket in Jira") to specific skills in the **Skills Factory**.

### 3. New Skill Definitions (Connector Adapters)

To support the "Automation Service" described in your file, we will expand the **V17-skills** catalog with specific connector skills:

* **F146: External Ticket Skill:** Integration with Asana/Jira for support and triage flows.
* **F147: Payment Gateway Skill:** Integration with Stripe/PayPal for "Paid form/booking flows".
* **F148: Document Generator Skill:** Leverages AI to generate PDF invoices or receipts based on form data.

### 4. Implementation Priority (Roadmap)

Following the **V66 Master Plan**, this extension would move from Phase P15 (Post-Publishing) to a new **Phase P16: Forms & Automation**:

* **P16a:** Define `FormSchema` JSON specification and integrate with **Figma Parser (F10)**.
* **P16b:** Build the **Submission Pipeline (F66)** with idempotency and retry logic.
* **P16c:** Create "Connector Skills" for common 3rd-party integrations mentioned in the "Support/Triage" and "Booking" use cases.