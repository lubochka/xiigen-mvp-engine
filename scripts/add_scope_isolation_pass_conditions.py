"""
Add passConditions to all 63 scope_isolation arbiter records across 13 NDJSON files.
passConditions = logical inverses of blockConditions + positive confirmation of correct behavior.
"""
import json, glob

# ─── passConditions by arbiterId ──────────────────────────────────────────────
PASS_CONDITIONS = {

    # ── completion-gamification ───────────────────────────────────────────────
    "arb-flow05-scope-isolation": [
        "All completion, achievement, ledger, and streak records stored with knowledgeScope: 'PRIVATE'",
        "tenantId sourced exclusively from cls.get().tenantId (AsyncLocalStorage) in all T83-T98 services",
        "No completion-gamification records stored with knowledgeScope: 'GLOBAL'",
    ],

    # ── data-warehouse-analytics ──────────────────────────────────────────────
    "arb-flow13-scope-isolation-t173": [
        "Warehouse query records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or hardcoded",
        "All xiigen-warehouse-queries reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t174": [
        "Warehouse metric records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "All xiigen-warehouse-metrics reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t175": [
        "KPI snapshot records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "All xiigen-warehouse-kpi-snapshots reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t176": [
        "Cohort analysis records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "All cross-flow joins in T176 include tenantId predicate sourced from ALS",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t177": [
        "Funnel analysis records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "All xiigen-warehouse-funnels reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t178": [
        "Retention cohort records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "All xiigen-warehouse-retention reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t179": [
        "Report records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "All xiigen-warehouse-reports reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t180": [
        "Correlation records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "All cross-flow joins in T180 include tenantId predicate from ALS; sourceFlows.length >= 2 validated",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t181": [
        "Export records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "F411 encryption applied to all exported data regardless of tenant configuration",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t182": [
        "Dataset records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "F423 PII masking applied to all dataset fields before export",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t183": [
        "Alert rule records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "All xiigen-warehouse-alert-rules reads include tenantId predicate from ALS",
    ],
    "arb-flow13-scope-isolation-t184": [
        "Query advice stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "T184 is read-only: only searchDocuments and getDocument — no storeDocument, no deleteDocument",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t185": [
        "Lineage records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "Lineage index is append-only: each event creates a new record — no updates to existing records",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t186": [
        "Retention policy records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "F424 governance policies stored at PLATFORM_ONLY scope — not configurable by individual tenants",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t187": [
        "Quota records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "T187 instantiated inline (new QuotaManager()) per INLINE archetype — never resolved via DI container",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow13-scope-isolation-t188": [
        "Health records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "T188 is read-only: only searchDocuments and getDocument — no storeDocument, no mutations",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],

    # ── event-attendance ──────────────────────────────────────────────────────
    "arb-flow04-scope-isolation-t63": [
        "RSVP records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-rsvps reads include tenantId predicate from ALS",
    ],
    "arb-flow04-scope-isolation-t64": [
        "Waitlist entry records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-waitlist-entries reads include tenantId predicate from ALS",
    ],
    "arb-flow04-scope-isolation-t65": [
        "Check-in records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-checkins reads include tenantId predicate from ALS",
    ],
    "arb-flow04-scope-isolation-t66": [
        "Feedback window records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-feedback-windows reads include tenantId predicate from ALS",
    ],

    # ── event-management ──────────────────────────────────────────────────────
    "arb-flow03-scope-isolation-t59": [
        "Event records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-events reads include tenantId predicate from ALS",
    ],
    "arb-flow03-scope-isolation-t60": [
        "Registration records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-event-registrations reads include tenantId predicate from ALS",
    ],
    "arb-flow03-scope-isolation-t61": [
        "Promotion records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-event-promotions reads include tenantId predicate from ALS",
    ],
    "arb-flow03-scope-isolation-t62": [
        "Analytics records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-event-analytics reads include tenantId predicate from ALS",
    ],

    # ── friend-request-social-feed ────────────────────────────────────────────
    "arb-flow07-scope-isolation": [
        "All connection, feed, and social notification records stored with knowledgeScope: 'PRIVATE'",
        "tenantId sourced exclusively from cls.get().tenantId (AsyncLocalStorage) in all T73-T82 services",
        "No cross-tenant reads or writes in connection graph, feed, or notification indexes",
    ],

    # ── marketplace ───────────────────────────────────────────────────────────
    "arb-flow08-scope-isolation-t83": [
        "Listing records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-marketplace-listings reads include tenantId predicate from ALS",
    ],
    "arb-flow08-scope-isolation-t84": [
        "Catalog index entries stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-catalog-index reads include tenantId predicate from ALS",
    ],
    "arb-flow08-scope-isolation-t85": [
        "Feed records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-listing-feeds reads include tenantId predicate from ALS",
    ],
    "arb-flow08-scope-isolation-t86": [
        "Analytics records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-listing-analytics reads include tenantId predicate from ALS",
    ],

    # ── profile-enrichment ────────────────────────────────────────────────────
    "arb-flow02-scope-isolation-t50": [
        "Matching profile (GLOBAL record) contains only name, industry, and tags — never questionnaire, goals, or challenges",
        "Business profile (PRIVATE record) stored in xiigen-business-profiles with knowledgeScope: 'PRIVATE' and tenantId from ALS",
        "T50 dual-record write: PRIVATE record to xiigen-business-profiles AND GLOBAL record to xiigen-matching-profiles with PRIVATE fields stripped",
    ],
    "arb-flow02-scope-isolation-t51": [
        "Match results stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "T51 reads exclusively from xiigen-matching-profiles (GLOBAL index) — never reads from xiigen-business-profiles (PRIVATE)",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
    ],
    "arb-flow02-scope-isolation-t52": [
        "Personalization feed records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "PersonalizationCompleted only enqueued after consent.agreed === true check passes",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
    ],

    # ── reviews-reputation ────────────────────────────────────────────────────
    "arb-flow10-scope-isolation": [
        "All review, reputation, response, and audit records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId in all T169-T172 services — never from request parameter or event payload",
        "No cross-tenant reads or writes in review, reputation, response, or audit indexes",
    ],

    # ── schema-registry-dag ───────────────────────────────────────────────────
    "arb-flow11-scope-isolation-t189": [
        "Schema records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
        "All xiigen-schemas reads for T189 include tenantId predicate from ALS",
    ],
    "arb-flow11-scope-isolation-t190": [
        "Change classification records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
        "Classification results scoped to current tenant's schema submission only",
    ],
    "arb-flow11-scope-isolation-t191": [
        "DAG cycle detection operates exclusively on current tenant's schema DAG",
        "tenantId predicate from ALS included in all DAG node lookup queries",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
    ],
    "arb-flow11-scope-isolation-t192": [
        "DAG edge records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
        "All xiigen-schema-dag reads include tenantId predicate from ALS",
    ],
    "arb-flow11-scope-isolation-t193": [
        "Audit records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
        "All xiigen-schema-audit reads include tenantId predicate from ALS",
    ],
    "arb-flow11-scope-isolation-t194": [
        "Schema records stored with knowledgeScope: 'PRIVATE'; tenantId included in storeDocumentWithOCC call",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
        "OCC publish includes tenantId predicate from ALS in version pin lookup",
    ],
    "arb-flow11-scope-isolation-t195": [
        "Index management operations scoped to current tenant — no cross-tenant index access",
        "tenantId present in all index management operations in T195",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t196": [
        "Schema version reads include tenantId predicate from ALS in all getDocumentWithVersion calls",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
        "Only the current tenant's schema versions accessible via T196",
    ],
    "arb-flow11-scope-isolation-t197": [
        "DAG topology built exclusively from current tenant's schema DAG",
        "tenantId predicate from ALS included in all DAG traversal queries",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t198": [
        "Schema search results include only current tenant's schemas",
        "tenantId predicate from ALS included in all searchDocuments calls in T198",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t199": [
        "DAG rendered exclusively for current tenant's schema graph",
        "tenantId predicate from ALS included in all DAG node fetch operations",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t200": [
        "Schema deprecation records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "Deprecation operations restricted to current tenant's schemas only",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t201": [
        "History records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "History index is append-only: new record per SchemaPublished event — no cross-tenant history reads",
        "tenantId sourced exclusively from cls.get().tenantId — never from event payload",
    ],
    "arb-flow11-scope-isolation-t202": [
        "Approval records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "Approval decisions restricted to current tenant's schemas only",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t203": [
        "Migration runs scoped to current tenant's schemas only — no cross-tenant batch processing",
        "Migration searchDocuments predicate includes tenantId from ALS",
        "Migration records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
    ],
    "arb-flow11-scope-isolation-t204": [
        "Compatibility checks operate exclusively on current tenant's schema versions",
        "tenantId predicate from ALS included in all schema lookup queries in T204",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t205": [
        "Schema validation uses only the current tenant's schema version (tenantId from ALS in lookup)",
        "tenantId predicate from ALS included in schema version lookup in T205",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t206": [
        "Quality analysis restricted to current tenant's schemas only",
        "tenantId predicate from ALS included in all searchDocuments calls in T206",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t207": [
        "Export includes only current tenant's active schemas — tenantId from ALS in searchDocuments predicate",
        "activeUntil: null filter applied to exclude deprecated schemas from export",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],
    "arb-flow11-scope-isolation-t208": [
        "Visualization rendered exclusively for current tenant's DAG",
        "tenantId predicate from ALS included in all DAG node fetch operations in T208",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter",
    ],

    # ── subscription-billing ──────────────────────────────────────────────────
    "arb-flow12-scope-isolation-t209": [
        "Subscription plan records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-subscription-plans reads include tenantId predicate from ALS",
    ],
    "arb-flow12-scope-isolation-t210": [
        "Subscription records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-subscriptions reads include tenantId predicate from ALS",
    ],
    "arb-flow12-scope-isolation-t211": [
        "Invoice and billing audit records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-invoices and xiigen-billing-audit reads include tenantId predicate from ALS",
    ],
    "arb-flow12-scope-isolation-t212": [
        "MRR metric records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-mrr-metrics reads include tenantId predicate from ALS",
    ],

    # ── transactional-event-participation ─────────────────────────────────────
    "arb-flow09-scope-isolation": [
        "All ticket, payment, refund, and revenue records stored with knowledgeScope: 'PRIVATE'",
        "tenantId sourced exclusively from cls.get().tenantId (AsyncLocalStorage) in all T99-T118 services",
        "T110 reads GLOBAL event aggregates only — all write records remain PRIVATE with tenantId from ALS",
    ],

    # ── user-groups-communities ───────────────────────────────────────────────
    "arb-flow06-scope-isolation": [
        "All membership, feed, approval, and tier change records stored with knowledgeScope: 'PRIVATE'",
        "tenantId sourced exclusively from cls.get().tenantId (AsyncLocalStorage) in all T99-T118 services",
        "No cross-tenant reads or writes in membership, feed, approval, or tier change indexes",
    ],

    # ── user-registration ─────────────────────────────────────────────────────
    "arb-flow01-scope-isolation-t47": [
        "User registration records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-user-registrations reads include tenantId predicate from ALS",
    ],
    "arb-flow01-scope-isolation-t48": [
        "Verification token records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "tenantId sourced exclusively from cls.get().tenantId — never from request parameter or event payload",
        "All xiigen-user-verification reads include tenantId predicate from ALS",
    ],
    "arb-flow01-scope-isolation-t49": [
        "Onboarding records stored with knowledgeScope: 'PRIVATE' and tenantId from AsyncLocalStorage",
        "OnboardingCompleted event emitted with tenantId from cls.get().tenantId — never from event payload",
        "All xiigen-user-onboarding reads include tenantId predicate from ALS",
    ],
}


def patch_file(path):
    with open(path, "r") as f:
        lines = [l for l in f.readlines() if l.strip()]

    output = []
    patched = 0
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('{"index"'):
            output.append(lines[i])
            i += 1
            continue

        rec = json.loads(line)
        arbiter_id = rec.get("arbiterId", "")

        if (rec.get("arbiterType") == "scope_isolation"
                and not rec.get("passConditions")
                and arbiter_id in PASS_CONDITIONS):
            rec["passConditions"] = PASS_CONDITIONS[arbiter_id]
            output.append(json.dumps(rec) + "\n")
            patched += 1
        else:
            output.append(lines[i])

        i += 1

    with open(path, "w") as f:
        f.writelines(output)

    return patched


total = 0
for path in sorted(glob.glob("fixtures/arbiters/*.bulk.ndjson")):
    n = patch_file(path)
    if n:
        slug = path.replace("\\", "/").split("/")[-1]
        print(f"  {slug}: {n} records patched")
    total += n

print(f"\nTotal patched: {total}")

# ─── verify ───────────────────────────────────────────────────────────────────
missing = 0
for path in sorted(glob.glob("fixtures/arbiters/*.bulk.ndjson")):
    for line in open(path):
        if "arbiterId" in line:
            r = json.loads(line)
            if not r.get("passConditions"):
                print(f"STILL MISSING passConditions: {r['arbiterId']}")
                missing += 1

print(f"Records still missing passConditions: {missing}")
