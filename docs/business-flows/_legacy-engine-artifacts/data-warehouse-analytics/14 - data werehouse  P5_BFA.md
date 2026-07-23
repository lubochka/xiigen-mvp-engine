# XIIGen — FLOW-14 PHASE 5: BFA CONFLICT RULES + STRESS TESTS
# Merged: 2026-02-26 | Source: FLOW14_PLAN_P0.md Phase P5
# Adds: CF-192–CF-213 (22 rules), ST-92–ST-103 (12 stress tests)
# Depends on: P1-P4 (F426-F465, T167-T178, DR-58-65, Templates 33-35)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Extends: CF-1–CF-191 | Adds: CF-192–CF-213 (22 rules)
## Extends: ST-1–ST-91 | Adds: ST-92–ST-103 (12 stress tests)
## Backward compatibility: CF-1–CF-191 UNCHANGED, ST-1–ST-91 UNCHANGED

---

## CONFLICT RULES CF-192–CF-213

### CATEGORY 1: DWH Internal (intra-FLOW-14) — CF-192–CF-197

### CF-192: Zone Promotion Order Enforcement
```
RULE:         Data MUST flow raw (Zone 1) → staging (Zone 2) → core (Zone 3) → mart (Zone 4).
              No zone may be skipped. No direct write to staging without raw landing. No direct
              write to mart without core model load. Replay (F441) re-enters at raw.
AFFECTED FLOWS: FLOW-14 — all templates (33, 34, 35)
TRIGGER:      Any factory writes to a zone without the prior zone having received the record
DETECTION:    BFA traces lineage graph (F460) for every record; verifies complete chain exists
RESOLUTION:   Missing zone write must be executed first; if impossible, quarantine record (F445)
SEVERITY:     CRITICAL — zone skip corrupts lineage, breaks PII gate (DR-63), invalidates audit
BFA ACTION:   BUILD FAILURE if generated service writes to Zone N without Zone N-1 landing
PROOF:        T171 IR-171-8 (_sourceRawId required), T173 IR-173-6 (lineage), T174 IR-174-3 (mart from core only)
```

### CF-193: Cursor Monotonic Advancement
```
RULE:         Incremental sync cursors (F433) MUST advance monotonically. A cursor value at
              time T+1 MUST be >= cursor at time T for the same (tenantId, connectorId, entityType).
              Cursor rollback only via explicit ResetCursorAsync (privileged operation).
AFFECTED FLOWS: FLOW-14 — Template 33 (ingest-pipeline-v1)
TRIGGER:      F433.CommitCursorAsync called with cursor value less than stored value
DETECTION:    BFA checks cursor state table; compares new cursor with previous
RESOLUTION:   Reject cursor commit; escalate to admin; check for data loss in raw zone
SEVERITY:     HIGH — backward cursor causes duplicate ingestion or data gap
BFA ACTION:   BUILD FAILURE if generated sync service can commit backward cursor
PROOF:        T168 IR-168-4 (EP-4 checkpoint before advance), T170 IR-170-2 (per-slice checkpoint)
```

### CF-194: Staging Idempotent Upsert
```
RULE:         Processing the same raw record twice through T171 MUST produce identical staging
              output. Content hash comparison ensures dedup. Changed source records create new
              staging versions; unchanged records are no-ops.
AFFECTED FLOWS: FLOW-14 — Template 34 (transform-pipeline-v1)
TRIGGER:      F444.UpsertRecordAsync called with same (tenantId, provider, entityType, sourceId, contentHash)
DETECTION:    BFA verifies content hash in staging record; duplicate hash = no new record
RESOLUTION:   Duplicate = silent dedup (no new staging version). Changed = new version + supersede old.
SEVERITY:     MEDIUM — non-idempotent staging creates duplicate facts downstream
BFA ACTION:   ALERT if generated staging service creates duplicate records for same content hash
PROOF:        T171 IR-171-4 (staging idempotency), T171 QG-171-5 (replay produces identical output)
```

### CF-195: Schema Approval Blocks Mart Promotion
```
RULE:         New fields detected by F439 (ISchemaRegistryService) MUST NOT enter mart layer
              (F451) until admin approval via ApproveSchemaChangeAsync. Raw and staging zones
              may include new fields immediately; mart requires explicit gate.
AFFECTED FLOWS: FLOW-14 — Template 34 (step-mart depends on approved schema)
TRIGGER:      F451.BuildMartAsync includes field not in approved schema version
DETECTION:    BFA cross-references mart field set against F439 approved schema version
RESOLUTION:   Admin reviews schema diff; approves or rejects; approved fields enter mart on next refresh
SEVERITY:     HIGH — unapproved fields in mart can break KPI formulas and dashboard contracts
BFA ACTION:   BUILD FAILURE if mart builder references fields not in approved schema
PROOF:        DR-60 (schema drift as FREEDOM), T172 IR-172-4 (FIELD_ADDED admin-gate for mart)
```

### CF-196: Fact Append-Only Enforcement
```
RULE:         Fact records in core zone (F450) and composite facts (T176) MUST be append-only.
              No UPDATE, no DELETE on fact tables. Corrections require new compensating fact records.
AFFECTED FLOWS: FLOW-14 — Template 34 (step-model), Template 35 (step-cross-flow)
TRIGGER:      Any generated service calls UpdateDocument or DeleteDocument on fact tables
DETECTION:    AF-7 static analysis of generated code; BFA checks for update/delete calls on fact schemas
RESOLUTION:   Generate compensating fact record instead of modifying existing
SEVERITY:     CRITICAL — fact mutation destroys audit trail, breaks snapshot integrity
BFA ACTION:   BUILD FAILURE if generated code mutates fact records
PROOF:        T173 IR-173-2 (facts append-only), T176 IR-176-3 (composite facts append-only)
```

### CF-197: Mart Dependency Chain
```
RULE:         Mart layer (F451, T174) MUST only read from core dims/facts (F449, F450).
              Mart MUST NOT reference raw zone (F438) or staging zone (F444) directly.
              Cross-flow analytics (T176) reads from marts only.
AFFECTED FLOWS: FLOW-14 — Template 34 (step-mart), Template 35 (step-cross-flow)
TRIGGER:      Generated mart builder SQL references raw_landing or staging tables
DETECTION:    BFA analyzes generated SQL table references; cross-references with zone schema registry
RESOLUTION:   Rewrite mart query to use core model tables only
SEVERITY:     HIGH — direct raw/staging access bypasses transform, identity, and PII gates
BFA ACTION:   BUILD FAILURE if mart references raw or staging tables
PROOF:        T174 IR-174-3 (mart from core only), T176 IR-176-1 (cross-flow from mart only)
```

---

### CATEGORY 2: DWH vs Prior Flows (FLOW-14 vs FLOW-01–13) — CF-198–CF-203

### CF-198: Connector Auth vs User Auth Identity Planes
```
RULE:         FLOW-14 connector credentials (F427 ICredentialVaultService) and FLOW-01 user
              authentication (IAuthService) operate in SEPARATE identity planes. Connector
              OAuth tokens authenticate the PLATFORM to external SaaS; user tokens authenticate
              USERS to the platform. These MUST NOT be confused or cross-referenced.
AFFECTED FLOWS: FLOW-14 vs FLOW-01
TRIGGER:      Generated connector service attempts to use FLOW-01 user auth token for external API
DETECTION:    BFA traces credential source; flags if user auth token used in external API context
RESOLUTION:   Connector credentials come from F427 vault only; user credentials from FLOW-01 auth only
SEVERITY:     CRITICAL — credential plane confusion leaks user tokens to external systems
BFA ACTION:   BUILD FAILURE if credential source mismatched
PROOF:        T167 IR-167-6 (credentials from F427 vault), T167 IR-167-5 (no SDK import)
```

### CF-199: Warehouse Provision vs Finance Provision Compatibility
```
RULE:         FLOW-14 warehouse provisioning (T178) and FLOW-13 finance provisioning (T166) use
              compatible but independent isolation tier models. A tenant may have SILO for finance
              (DR-56) and POOL for warehouse raw zone (DR-65). Tier decisions are independent.
AFFECTED FLOWS: FLOW-14 vs FLOW-13
TRIGGER:      T178 provisioning attempts to read or modify FLOW-13 isolation tier settings
DETECTION:    BFA checks that T178 only touches F461 (warehouse isolation), not F424 (finance isolation)
RESOLUTION:   Each flow manages its own isolation tier via its own factory. No cross-modification.
SEVERITY:     HIGH — cross-flow isolation modification breaks tenant guarantees
BFA ACTION:   BUILD FAILURE if generated warehouse service modifies finance isolation settings
PROOF:        DR-65 (warehouse inherits model, not settings), T178 IR-178-1 (per-zone isolation)
```

### CF-200: Identity Service vs User Service Coordination
```
RULE:         FLOW-14 identity resolution (F446) matching external ClickUp/Zoho users to internal
              system users MUST coordinate with FLOW-01 IUserService. When a match exists to an
              internal user, F446 links the external source ID to the existing dim_user record —
              it MUST NOT create a duplicate user record.
AFFECTED FLOWS: FLOW-14 vs FLOW-01
TRIGGER:      F446 resolves external user that matches an existing FLOW-01 internal user
DETECTION:    BFA checks that dim_user merge references existing user record, not duplicate creation
RESOLUTION:   External source IDs added to existing dim_user via SCD-2 version (DR-62)
SEVERITY:     HIGH — duplicate user records corrupt analytics aggregations per user
BFA ACTION:   ALERT + generated identity service includes internal user lookup step
PROOF:        T175 IR-175-4 (SCD-2 merge), T175 IR-175-8 (provenance tracking)
```

### CF-201: Warehouse vs Commerce Data Coordination
```
RULE:         If tenant uses FLOW-10 commerce modules, FLOW-14 Sales mart can consume commerce
              transaction data. Access is READ-ONLY through mart layer (CF-197). Warehouse MUST
              NOT modify FLOW-10 commerce operational data.
AFFECTED FLOWS: FLOW-14 vs FLOW-10
TRIGGER:      FLOW-14 mart builder attempts to write to FLOW-10 commerce tables
DETECTION:    BFA cross-references mart SQL table targets against FLOW-10 operational schemas
RESOLUTION:   Read-only access to FLOW-10 data via core model integration, never direct write
SEVERITY:     HIGH — warehouse writing to commerce operational tables corrupts transactions
BFA ACTION:   BUILD FAILURE if generated mart service modifies FLOW-10 data
PROOF:        T174 IR-174-3 (mart reads core only), CF-197 (mart dependency chain)
```

### CF-202: Warehouse Quota vs Billing Integration
```
RULE:         FLOW-14 warehouse quotas (F465) MUST NOT override or conflict with platform billing
              quotas (FLOW-09 if applicable). Warehouse quotas are ADDITIVE constraints within
              the tenant's platform allocation.
AFFECTED FLOWS: FLOW-14 vs FLOW-09
TRIGGER:      F465 quota limit exceeds platform-level billing quota
DETECTION:    BFA checks warehouse quota ceiling against platform entitlement
RESOLUTION:   Warehouse quota ceiling capped at platform entitlement; admin alerted if exceeded
SEVERITY:     MEDIUM — quota mismatch causes confusing error messages
BFA ACTION:   ALERT + quota initialization cross-checks platform entitlement
PROOF:        T178 IR-178-3 (quotas before ACTIVE), F465 FREEDOM config per tenant tier
```

### CF-203: Backfill vs Incremental Sync Coordination
```
RULE:         When a backfill saga (T170) is running for a (tenantId, connectorId, entityType),
              incremental sync (T168) for the same tuple MUST either pause or coordinate to
              avoid duplicate raw records. Backfill owns the cursor for its date range.
AFFECTED FLOWS: FLOW-14 internal (T168 vs T170)
TRIGGER:      T168 and T170 both attempt to poll same entity type on same connector simultaneously
DETECTION:    BFA checks active saga count per (tenantId, connectorId, entityType)
RESOLUTION:   Incremental sync pauses until backfill completes, then resumes from backfill end cursor
SEVERITY:     HIGH — concurrent polling wastes API quota and creates duplicates
BFA ACTION:   ALERT + generated sync template adds backfill-active check before polling
PROOF:        T170 IR-170-5 (dedup), T168 IR-168-4 (cursor checkpoint)
```

---

### CATEGORY 3: Multi-Tenant DWH Isolation — CF-204–CF-206

### CF-204: Credential Never Cross Tenant
```
RULE:         OAuth tokens, PATs, and webhook secrets stored in F427 ICredentialVaultService
              MUST NEVER be readable by a different tenant. GetCredentialAsync MUST fail with
              403 if tenantId in request ≠ tenantId on credential record.
AFFECTED FLOWS: FLOW-14 — all connectors, all ingestion, all activation
TRIGGER:      Any credential access where request tenantId ≠ stored credential tenantId
DETECTION:    BFA injects cross-tenant credential access test at registration time
RESOLUTION:   Immediate 403 rejection. Alert. Audit record in F459.
SEVERITY:     CRITICAL — credential cross-tenant leak = full external system compromise
BFA ACTION:   BUILD FAILURE + mandatory cross-tenant access test in T167 smoke checks
PROOF:        T167 IR-167-1 (tenantId on every op), DNA-5, DR-59 (rate limit separate)
```

### CF-205: Warehouse Schema Never Cross Tenant
```
RULE:         In BRIDGE and SILO isolation modes, warehouse schemas/databases/ES indices are
              physically separated per tenant. In POOL mode, every query MUST include tenantId
              filter (DNA-5) + RLS policy (F463). No query may access another tenant's data.
AFFECTED FLOWS: FLOW-14 — all warehouse operations across all zones
TRIGGER:      Query executed without tenantId filter (POOL) or routed to wrong schema/DB (BRIDGE/SILO)
DETECTION:    BFA validates that F461 isolation binding is applied before every zone access;
              RLS test (F463.TestRlsIsolationAsync) returns zero cross-tenant rows
RESOLUTION:   Fix isolation binding; re-run RLS test; if failed, suspend tenant warehouse
SEVERITY:     CRITICAL — cross-tenant data exposure = compliance violation + customer breach
BFA ACTION:   BUILD FAILURE if generated services lack tenantId filter or RLS binding
PROOF:        T178 IR-178-6 (smoke test), T178 QG-178-2 (zero cross-tenant rows), DR-65
```

### CF-206: RLS Policy Per Zone Per Tenant
```
RULE:         In POOL isolation mode, every warehouse table in every zone MUST have an active
              RLS policy enforcing tenant_id = current_setting('app.current_tenant'). Tables
              without RLS in POOL mode = CRITICAL vulnerability.
AFFECTED FLOWS: FLOW-14 — all zones for POOL-mode tenants
TRIGGER:      New table created in any zone without corresponding RLS policy
DETECTION:    BFA enumerates zone tables; cross-references against F463 RLS policy list; flags gaps
RESOLUTION:   F463.CreateRlsPolicyAsync for missing tables; T178 re-validates
SEVERITY:     CRITICAL — unprotected table in shared schema = cross-tenant access possible
BFA ACTION:   BUILD FAILURE if generated schema migration creates table without RLS
PROOF:        T178 IR-178-2 (RLS for pool-tier zones), F463 (dynamic RLS generation)
```

---

### CATEGORY 4: PII & Compliance — CF-207–CF-209

### CF-207: PII Masking Before Mart Promotion
```
RULE:         No record enters mart layer (Zone 4) without PII classification pass from F462.
              Fields classified as PII MUST be masked per tenant config BEFORE F451 mart write.
AFFECTED FLOWS: FLOW-14 — Template 34 (step-mart)
TRIGGER:      F451.BuildMartAsync receives records without PII classification metadata
DETECTION:    BFA checks mart input records for _piiClassified flag; absent = violation
RESOLUTION:   Route records back through F462 classification before mart write
SEVERITY:     CRITICAL — PII in mart layer = GDPR/CCPA compliance violation
BFA ACTION:   BUILD FAILURE if mart builder skips PII classification step
PROOF:        DR-63, T174 IR-174-1 (PII classification MUST complete before mart write)
```

### CF-208: Finance Mart Consumes FLOW-13 Data Read-Only
```
RULE:         When a tenant has both FLOW-13 (Finance Engine) and FLOW-14 (Warehouse) enabled,
              the Finance mart (F451) MAY consume FLOW-13 fact data (GL entries, invoices) for
              cross-system profitability analysis. Access is READ-ONLY. Warehouse MUST NOT
              modify any FLOW-13 financial records. Fiscal period locks (EP-5) MUST be respected.
AFFECTED FLOWS: FLOW-14 vs FLOW-13
TRIGGER:      Finance mart aggregation includes FLOW-13 GL data
DETECTION:    BFA traces mart data sources; verifies FLOW-13 access is read-only
RESOLUTION:   Read-only integration via core model; mart builder generates read-only SQL
SEVERITY:     HIGH — warehouse write to finance data violates immutable audit trail (DR-50)
BFA ACTION:   BUILD FAILURE if generated mart service has write access to FLOW-13 tables
PROOF:        CF-197 (mart dependency chain), FLOW-13 DR-50 (immutable audit), DR-52 (compensation-only)
```

### CF-209: Audit Trail Before Any Warehouse Mutation
```
RULE:         Every warehouse mutation (ingest, transform, dim load, fact write, mart refresh,
              retention delete, activation push) MUST produce an audit record in F459 BEFORE
              the mutation is committed. Audit-then-mutate ordering is non-negotiable.
AFFECTED FLOWS: FLOW-14 — all templates, all factories that write data
TRIGGER:      Any data mutation without prior F459.LogOperationAsync call
DETECTION:    BFA traces mutation calls; verifies F459 audit call precedes each mutation
RESOLUTION:   Add audit call before mutation in generated code; AF-7 validates ordering
SEVERITY:     HIGH — audit-after-mutation risks audit gaps on crash (mutation committed, audit lost)
BFA ACTION:   BUILD FAILURE if generated code mutates data before audit record
PROOF:        DR-58 (raw immutability), FLOW-13 DR-50 (audit before saga advance), T177 IR-177-7
```

---

### CATEGORY 5: External API Safety — CF-210–CF-213

### CF-210: Rate Limit Before Every External API Call
```
RULE:         Every external API call (polling, webhook verification callback, reverse ETL push,
              token refresh) MUST be preceded by F430.CheckAsync. If rate limit exhausted,
              call MUST NOT proceed — back off and retry per exponential policy.
AFFECTED FLOWS: FLOW-14 — all ingestion and activation factories
TRIGGER:      External HTTP call made without prior F430.CheckAsync
DETECTION:    BFA traces HTTP call paths; verifies F430.CheckAsync precedes each
RESOLUTION:   Insert rate limit check before HTTP call; fail-safe = block if check is bypassed
SEVERITY:     CRITICAL — rate limit bypass exhausts API quota for all tenants on that connector
BFA ACTION:   BUILD FAILURE if any external API call path bypasses rate limit guard
PROOF:        DR-59, T168 IR-168-3, T170 IR-170-3, T177 IR-177-2
```

### CF-211: Webhook HMAC Before Processing
```
RULE:         Every webhook event received by F429 MUST have HMAC signature verified (timing-safe
              comparison) BEFORE any processing, fanout, or raw zone landing. Unsigned or
              invalid-signature events MUST be rejected, audited, and alerted.
AFFECTED FLOWS: FLOW-14 — Template 33 (step-webhook)
TRIGGER:      Webhook event processed without prior HMAC verification
DETECTION:    BFA traces webhook processing path; verifies VerifySignatureAsync precedes all processing
RESOLUTION:   Reject event; log to audit; alert admin; do NOT process or land in raw zone
SEVERITY:     CRITICAL — unverified webhooks can inject malicious data into the warehouse pipeline
BFA ACTION:   BUILD FAILURE if generated webhook service processes events before signature verification
PROOF:        T169 IR-169-1 (HMAC timing-safe), T169 IR-169-2 (unsigned = reject + audit)
```

### CF-212: Backfill Blackout During Peak Ingestion
```
RULE:         Backfill sagas (T170) MUST NOT dispatch slices during configured peak ingestion
              hours. Peak hours are FREEDOM config per tenant. This prevents backfill from
              competing with real-time incremental sync for API quota headroom.
AFFECTED FLOWS: FLOW-14 — Template 33 (step-backfill)
TRIGGER:      T170 dispatches slice during peak blackout window
DETECTION:    BFA checks slice dispatch timestamp against tenant peak hours config
RESOLUTION:   Slice deferred to next non-peak window; saga state updated; admin notified
SEVERITY:     MEDIUM — peak-hour backfill degrades real-time sync freshness SLA
BFA ACTION:   ALERT + generated backfill template includes peak-window check before slice dispatch
PROOF:        T170 IR-170-6 (blackout enforcement), DD-85 (backfill date-range slicing)
```

### CF-213: Reverse ETL Never Push to Locked Records
```
RULE:         Reverse ETL activation (T177) MUST NOT push data to records that are locked in
              the target system. For Zoho CRM: don't update deals in locked pipeline stages.
              For FLOW-13 integration: don't push to records in locked fiscal periods (EP-5).
AFFECTED FLOWS: FLOW-14 — Template 35 (step-activation) + FLOW-13 fiscal period locks
TRIGGER:      F456 activation targets a record in locked state
DETECTION:    BFA checks target record lock state before push (external API pre-check or FLOW-13 EP-5)
RESOLUTION:   Skip locked record; log as ACTIVATION_SKIPPED with reason; re-evaluate on next cycle
SEVERITY:     HIGH — pushing to locked records causes external system errors or data corruption
BFA ACTION:   ALERT + generated activation service includes lock-state check before push
PROOF:        T177 IR-177-4 (no push to locked periods), DR-64 (event-based activation)
```

---

## STRESS TESTS ST-92–ST-103

### ST-92: Cross-Tenant Raw Zone Isolation
```
SCENARIO:     Tenant A ingests ClickUp tasks via T168. Tenant B attempts to SearchRawAsync
              on Tenant A's raw zone index using Tenant A's sourceRecordId.
EXPECTED:     F438.SearchRawAsync returns DataProcessResult with zero records for Tenant B.
              RLS policy (F463) blocks access at database level. BFA CF-205 verified.
MUST PASS:    CF-204 (credential isolation), CF-205 (schema isolation), CF-206 (RLS), DNA-5
MUST FAIL IF: Tenant B receives any raw records belonging to Tenant A.
PROBE:        Reverse: Tenant A cannot see Tenant B's data either.
```

### ST-93: Rate Limit 429 Recovery During Incremental Sync
```
SCENARIO:     T168 incremental sync polling ClickUp API. After 95 of 100 allowed calls/minute,
              ClickUp returns HTTP 429 with Retry-After header.
EXPECTED:     F430 records the 429. F430.BackoffAsync calculates wait time from Retry-After header.
              T168 pauses polling. EP-4 checkpoint saved at current cursor position.
              After backoff, T168 resumes from checkpoint. No data loss. No duplicate records.
MUST PASS:    CF-210 (rate limit before call), T168 IR-168-3, T168 QG-168-3 (429 = backoff, not failure)
MUST FAIL IF: 429 causes sync failure (not backoff). Cursor not checkpointed before wait. Data gap after resume.
PROBE:        Simulate Zoho credit exhaustion → same backoff behavior.
```

### ST-94: Webhook HMAC Tampering Rejection
```
SCENARIO:     ClickUp sends webhook event with valid X-Signature. Attacker sends modified
              payload with original signature (signature now invalid for changed body).
EXPECTED:     F429.VerifySignatureAsync returns false for tampered payload (HMAC mismatch).
              Event rejected. Audit record created in F459 with HMAC_VERIFICATION_FAILED.
              Alert emitted via QUEUE FABRIC. Tampered payload does NOT reach raw zone.
MUST PASS:    CF-211 (HMAC before processing), T169 IR-169-1 (timing-safe verification), T169 IR-169-2
MUST FAIL IF: Tampered event reaches raw zone. HMAC check uses non-timing-safe comparison. No audit.
PROBE:        Valid signature → event processed normally → raw zone landing confirmed.
```

### ST-95: Schema Drift — New ClickUp Custom Field Blocks Mart
```
SCENARIO:     ClickUp workspace admin adds new custom field "Launch_Date" (type: date).
              T172 schema drift detection samples raw records containing the new field.
EXPECTED:     F439 detects FIELD_ADDED drift. Raw zone: field included (auto-accept).
              Staging zone: field included (auto-accept). Mart zone: field BLOCKED until
              admin approves via F439.ApproveSchemaChangeAsync. KPI formulas unchanged.
MUST PASS:    CF-195 (schema approval blocks mart), DR-60, T172 IR-172-4 (FIELD_ADDED admin-gate for mart)
MUST FAIL IF: New field appears in mart without admin approval. Mart KPIs break due to new field.
PROBE:        Admin approves → next mart refresh includes Launch_Date. Admin rejects → field excluded from mart permanently.
```

### ST-96: Cross-System Identity Match and Dim_User Merge
```
SCENARIO:     ClickUp user "alice@company.com" (user_123) matches Zoho CRM contact "Alice Smith"
              (contact_456) with email "alice@company.com". Confidence score: 0.92 (above 0.85 threshold).
EXPECTED:     F446 auto-merges. dim_user record created via SCD-2 (F449): new version with
              merged attributes + provenance { email: ClickUp(1.0), name: Zoho(0.92) }.
              F440 source object map updated: ClickUp/user_123 → dim_user_surrogateKey,
              Zoho/contact_456 → same dim_user_surrogateKey.
MUST PASS:    DR-61 (probabilistic), T175 IR-175-4 (SCD-2 merge), T175 IR-175-8 (provenance), CF-204
MUST FAIL IF: Two separate dim_user records created. Merge without provenance. Cross-tenant match attempted.
PROBE:        Score 0.70 (below threshold) → queued for human review, NOT auto-merged.
```

### ST-97: Backfill Crash Recovery via EP-4
```
SCENARIO:     T170 backfill saga processing 30-day date range in daily slices. After completing
              slice 12 of 30 and checkpointing cursor, the service crashes (simulated).
EXPECTED:     EP-4 saga state shows: PROCESSING, last checkpoint = slice 12 cursor, slices 1-12 COMPLETED.
              On restart, F436.ResumeBackfillAsync loads saga state from EP-4.
              Processing resumes at slice 13. Slices 1-12 NOT re-processed (checkpointed).
              Raw records from slices 1-12 already in raw zone (immutable — DR-58).
MUST PASS:    T170 IR-170-1 (EP-4 saga), T170 IR-170-2 (per-slice checkpoint), T170 QG-170-1
MUST FAIL IF: Backfill restarts from slice 1 (lost checkpoint). Slices 1-12 duplicated in raw zone.
PROBE:        Cancel backfill after slice 15 → saga moves to CANCELLED with partial completion record.
```

### ST-98: PII Classification Blocks Mart Without Classification
```
SCENARIO:     T174 mart build triggered. Staging records for Zoho CRM contacts contain email
              and phone fields. F462 PII classification service is temporarily unavailable.
EXPECTED:     T174 returns DataProcessResult.Failure("PII_CLASSIFICATION_UNAVAILABLE").
              Mart refresh DOES NOT proceed. No unclassified records enter mart layer.
              Alert emitted. Retry scheduled for next mart refresh cycle.
MUST PASS:    CF-207 (PII before mart), DR-63, T174 IR-174-1
MUST FAIL IF: Mart refresh proceeds without PII classification. Unmasked email/phone in mart.
PROBE:        F462 recovers → next mart refresh succeeds with PII fields masked.
```

### ST-99: Reverse ETL Cooldown Enforcement
```
SCENARIO:     KPI "sla_compliance_rate" drops below threshold 0.80 for Tenant A. T177 fires
              activation: create ClickUp task "SLA breach alert". 5 minutes later, same KPI
              is re-evaluated and still below threshold. Cooldown configured at 60 minutes.
EXPECTED:     First activation: ClickUp task created. Audit record in F459.
              Second evaluation (5 min later): threshold still breached BUT cooldown active.
              Activation SKIPPED with reason "COOLDOWN_ACTIVE". No duplicate ClickUp task.
MUST PASS:    T177 IR-177-5 (cooldown enforcement), T177 IR-177-6 (idempotency key)
MUST FAIL IF: Duplicate ClickUp task created. Cooldown bypassed. No audit for skipped activation.
PROBE:        After 60 minutes, threshold still breached → new activation fires (cooldown expired).
```

### ST-100: Warehouse Tenant Provisioning Idempotency
```
SCENARIO:     New tenant provisioned via T178. Network error causes provisioning to be called
              twice with identical parameters (tenantId, isolation matrix, quota config).
EXPECTED:     Second call returns existing warehouse config reference (idempotent).
              No duplicate schemas, RLS policies, quotas, or dim_date records created.
              Single provisioning audit record in F459. Single event on QUEUE FABRIC.
MUST PASS:    T178 IR-178-7 (idempotent provisioning), T178 QG-178-6
MUST FAIL IF: Duplicate warehouse schemas created. Double dim_date records. Multiple provision events.
PROBE:        Provision with DIFFERENT isolation matrix → update (not duplicate) existing config.
```

### ST-101: Zone-Level Isolation Tier Granularity
```
SCENARIO:     Tenant A configured: raw=SILO, staging=BRIDGE, core=POOL, mart=POOL.
              T178 provisions warehouse. Data ingested via T168 and transformed via T171.
EXPECTED:     Raw records land in tenant-specific ES index (SILO). Staging records in
              tenant-specific PG schema (BRIDGE). Core dims/facts in shared PG schema with
              RLS (POOL). Mart aggregates in shared schema with RLS (POOL).
              Cross-tenant read returns zero at every zone. Lineage (F460) traces across zones.
MUST PASS:    DR-65 (zone-level isolation), CF-205, CF-206, T178 IR-178-1
MUST FAIL IF: Any zone uses wrong isolation tier. Cross-tenant data visible at any zone.
PROBE:        Graduate Tenant A staging from BRIDGE → SILO → data migrated, no data loss.
```

### ST-102: Cross-Flow Analytics Graceful Degradation
```
SCENARIO:     Tenant has Delivery mart and Sales mart populated. Support mart is EMPTY
              (no Zoho Desk connector registered). T176 cross-flow analytics triggered.
EXPECTED:     Lead→Delivery join: SUCCESS (Sales + Delivery available).
              Plan→Profit join: SUCCESS (Delivery + Sales available).
              Support→Resolution join: SKIPPED with DataProcessResult.Partial("SUPPORT_MART_EMPTY").
              Overall T176 returns partial success. Cross-flow composite facts written for
              available joins. No failure for unavailable mart.
MUST PASS:    T176 IR-176-5 (graceful degradation), T176 QG-176-4
MUST FAIL IF: T176 fails entirely because one mart is unavailable. Support join attempted on empty mart.
PROBE:        Register Zoho Desk connector → populate Support mart → re-run T176 → all 3 joins succeed.
```

### ST-103: End-to-End Lineage from Source to Mart
```
SCENARIO:     ClickUp task "TASK-001" ingested via T168, transformed via T171, loaded into
              dim_workspace + fact_task_event via T173, aggregated into Delivery mart via T174.
              Admin queries: "Where did this mart record come from?"
EXPECTED:     F460.TraceBackwardAsync returns complete lineage chain:
              mart_delivery_record → fact_task_event_id → staging_record_id → raw_record_id
              Each edge has: sourceZone, targetZone, transformType, timestamp, syncRunId.
              Forward trace from raw_record_id shows all downstream consumers.
MUST PASS:    T173 IR-173-6 (lineage edge), T174 IR-174-7 (lineage edge), SK-98
MUST FAIL IF: Lineage chain has gaps. Any zone transition missing lineage edge. No syncRunId on edges.
PROBE:        F460.TraceForwardAsync from raw_record_id → shows staging + core + mart destinations.
```

---

## PHASE 5 — SUMMARY

### Conflict Rules by Category

| Category | Range | Count | Severity Profile |
|---|---|---|---|
| DWH Internal | CF-192–CF-197 | 6 | 2 CRITICAL, 3 HIGH, 1 MEDIUM |
| DWH vs Prior Flows | CF-198–CF-203 | 6 | 2 CRITICAL, 3 HIGH, 1 MEDIUM |
| Multi-Tenant Isolation | CF-204–CF-206 | 3 | 3 CRITICAL |
| PII & Compliance | CF-207–CF-209 | 3 | 1 CRITICAL, 2 HIGH |
| External API Safety | CF-210–CF-213 | 4 | 2 CRITICAL, 1 HIGH, 1 MEDIUM |
| **TOTAL** | **CF-192–CF-213** | **22** | **10 CRITICAL, 9 HIGH, 3 MEDIUM** |

### Stress Tests by Focus Area

| Focus | Range | Count | Key Invariants Tested |
|---|---|---|---|
| Tenant Isolation | ST-92, ST-101 | 2 | CF-204/205/206, DR-65 |
| Rate Limit & Backoff | ST-93 | 1 | CF-210, IR-168-3 |
| Webhook Security | ST-94 | 1 | CF-211, IR-169-1 |
| Schema Drift | ST-95 | 1 | CF-195, DR-60 |
| Identity Resolution | ST-96 | 1 | DR-61, IR-175-4 |
| Crash Recovery | ST-97 | 1 | EP-4, IR-170-2 |
| PII Compliance | ST-98 | 1 | CF-207, DR-63 |
| Reverse ETL | ST-99 | 1 | IR-177-5/6, DR-64 |
| Provisioning | ST-100 | 1 | IR-178-7 |
| Cross-Flow Analytics | ST-102 | 1 | IR-176-5 |
| Lineage | ST-103 | 1 | IR-173-6, SK-98 |
| **TOTAL** | **ST-92–ST-103** | **12** | |

---

## BACKWARD COMPATIBILITY CHECK

```
CF-1-191:  UNCHANGED ✅ (CF-192-213 are ADDITIVE — no modifications)
ST-1-91:   UNCHANGED ✅ (ST-92-103 are ADDITIVE)
F1-F465:   UNCHANGED ✅ (rules reference existing factories, no modifications)
T1-T178:   UNCHANGED ✅ (rules reference existing task types, no modifications)
DR-1-65:   UNCHANGED ✅ (rules reference existing DRs, no modifications)
DNA-1-9:   STABLE ✅ (rules enforce existing DNA patterns)
EP-1-5:    STABLE ✅ (EP-4 referenced by ST-97, not redefined)
FLOW-13:   DR-50/52 referenced READ-ONLY ✅
FLOW-08:   Skill 11 referenced READ-ONLY ✅
FLOW-01:   IAuthService referenced for coordination ✅ (CF-198, CF-200 — no modification)
```

---

## SAVE POINT: FLOW14:P5:COMPLETE ✅

### Recovery Commands
```
"Load P5"                → This file (FLOW14_P5_BFA.md)
"Start P6"               → Generate SK-89–SK-98 + DD-74–DD-85
"Merge P5"               → Append FLOW14_P5_BFA.md → V62_BFA_STRESS_TEST_MERGED.md
"Resume from P5"         → Load P0 + P1 + P2 + P3 + P4 + this file + basic_prompt.txt
```

### Cumulative P1–P5 Totals:
```
Factories:        F426–F465 (40 new, 8 families)
Task Types:       T167–T178 (12 new, 4 new archetypes)
Flow Templates:   33–35 (3 new DAGs)
Design Records:   DR-58–DR-65 (8 new)
BFA Conflict Rules: CF-192–CF-213 (22 new — 10 CRITICAL, 9 HIGH, 3 MEDIUM)
Stress Tests:     ST-92–ST-103 (12 new)
Iron Rules:       96 (8 per task type × 12)
Quality Gates:    72 (6 per task type × 12)
AF Station Cells: 132 (11 stations × 12 task types)
DNA Compliance:   40/40 factories, 12/12 task types (100%)
```

### Next Phase (P6) Will Produce:
- SK-89–SK-98: 10 skill patterns
- DD-74–DD-85: 12 design decisions
