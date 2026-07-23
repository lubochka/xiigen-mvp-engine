# Functional Spec — FLOW-14 ETL Data Integration

**Grammar:** G1 Progress strip (per pipeline run) + G3 Card list (pipelines + sources)
**Primary role tiers:** PLATFORM_OPS (pipeline author), TENANT_OPS
**Current state:** **Half-built** — 12 services on disk. Topology missing. Pipeline can't run as a flow.
**Primary unblock:** topology + admin UI.

---

## 1. Summary

A platform admin configures and monitors ETL pipelines between external sources (Stripe, Salesforce, Mailchimp, Postgres dumps, S3 buckets) and the XIIGen warehouse. Each pipeline has a schedule, source config, transformation rules, destination, and success/failure history. Today the transforms run if triggered, but there's no UI to configure or monitor.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/etl/` | Create pipelines, view history, debug failures |
| **TENANT_OPS** | `/admin/integrations/etl/` | Configure tenant-scoped imports (from own Stripe, own CRM) |

**Modes:**
- **Scheduled mode** (cron-like schedule).
- **On-demand mode** (triggered manually).
- **Event-driven mode** (triggered by webhook or upstream flow event).
- **Dry-run mode** (runs the pipeline without persisting — preview the transform output).

---

## 3. User stories

### Story 3.1 — Admin sees all pipelines and their health

**Screens:** `/admin/engine/etl/` pipelines list.

**Happy path:**
1. Page loads card list of pipelines. Each card: name, source, destination, schedule, last-run timestamp, last-run state (Success / Failed / Running / Queued), rows processed last run.
2. Filter by source type, state, schedule.
3. Click a card → detail view with progress strip of all runs (last 30).

### Story 3.2 — Admin creates a new pipeline

**Screens:** `/admin/engine/etl/new` → 4-step wizard.

**Happy path:**
1. Step 1 — **Source:** pick source type (Stripe, Salesforce, Postgres, S3, HTTP API, CSV upload), provide credentials via secrets service.
2. Step 2 — **Transform:** visual transform editor — rename columns, type coercions, filters, joins, derived columns. Live preview on the right with sample data.
3. Step 3 — **Destination:** pick warehouse table (existing or new), column mapping, write mode (append / upsert / replace).
4. Step 4 — **Schedule:** cron / on-demand / webhook. Retry policy. Alerts on failure.
5. Test run on a 100-row sample before activation.

### Story 3.3 — Admin debugs a failed run

**Trigger:** admin clicks a failed run in the history.

**Happy path:**
1. Run detail: progress strip showing exactly which stage failed (Extract / Transform / Load).
2. Error detail: row that caused the failure (if Transform or Load stage), full stack trace (collapsible).
3. Actions: **Retry from failed stage** / **Skip bad rows and retry** / **Investigate source**.

### Story 3.4 — Tenant admin configures their own Stripe import

**Screens:** `/admin/integrations/etl/` → **Connect Stripe** → pipeline auto-created.

**Happy path:**
1. Tenant admin clicks **Connect Stripe**.
2. OAuth to Stripe; scopes explained in plain language.
3. On approval: pre-configured pipeline (Stripe customers + subscriptions + invoices → tenant warehouse) created with sensible defaults. Admin can tweak.
4. Runs on daily schedule; tenant sees import history in their integrations tab.

---

## 4. Screen structure & UI elements

### 4.1 `/admin/engine/etl/` pipelines list

G3 card list with filter bar. Card structure: name + source icon → destination icon + schedule + state badge + last-run info.

### 4.2 Pipeline detail page

Progress strip of last 30 runs at the top. Below: config tabs (Source / Transform / Destination / Schedule / Alerts). Run history table at the bottom.

### 4.3 New-pipeline wizard

4-step wizard with live preview. Step-indicator top + Back/Next/Cancel bottom.

### 4.4 Tenant integrations page

Card list of available integrations (Stripe, Salesforce, Mailchimp, etc.) with **Connect** CTA per card.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Source API rate-limited | Pipeline pauses; state "Rate-limited"; auto-resume with exponential backoff. |
| Source schema changed | Pipeline fails with clear error: *"Source now has column `full_name` instead of `name` — update mapping?"* with one-click fix. |
| Destination table full or locked | State "Destination unavailable"; retry with backoff. |
| Partial row failures | Log bad rows separately; configurable: fail run or skip and continue. |
| Credentials rotated | Pipeline fails with *"Credentials rejected — update in secrets service"*. |
| Webhook-triggered pipeline fires 1000× per minute | Debounce + queue; process in batches. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Empty** (no pipelines yet) | Friendly empty: *"Connect a source to pull data into your warehouse."* with **New pipeline** CTA. |
| **Loading** | Skeleton card list. |
| **Pipeline failed** | Card state "Failed" with most-recent-error snippet + **Investigate**. |
| **Source unreachable** | Banner: *"Source API unreachable — we'll retry automatically. Check source status."* |
| **Transform error** | Specific row + column shown; **Edit mapping** shortcut. |
| **Credential expired** | Card state "Credentials expired" with **Reconnect** button. |
| **Schedule missed** | State "Schedule missed — next run at …" with **Run now** option. |
| **Dry-run output** | Distinct visual mode — banner *"Dry-run preview — not persisted"*; outputs shown in table for scroll review. |

---

## 7. Visual direction

**Grammar:** G3 card list + G1 progress strip.

**Feel:** *Operational · Predictable · Debuggable*.

**Reference UIs:** Airbyte, Fivetran, Stitch Data, dbt Cloud.

**Colour world:** neutral chrome, green for successful runs, red for failures (with icon), amber for in-progress, grey for queued.

**Signature:** the **progress strip of last 30 runs** on the pipeline detail page — instant visual health at-a-glance.

**Anti-patterns:**
- Raw SQL as the primary transform UI (use visual builder first; SQL as advanced-mode fallback).
- Burying credential errors in logs.

---

## 8. Acceptance criteria

- [ ] `/admin/engine/etl/` lists all pipelines with state + last-run info.
- [ ] New-pipeline wizard covers source / transform / destination / schedule with live preview + test run.
- [ ] Pipeline detail shows 30-run progress strip + config tabs + run history.
- [ ] Failed-run debug view shows failing stage + row + error.
- [ ] Tenant integrations page offers OAuth-connected pre-configured pipelines.
- [ ] All 8 problematic states documented treatment.
- [ ] Zero raw error stack traces exposed to tenant users (platform admins only see them).
