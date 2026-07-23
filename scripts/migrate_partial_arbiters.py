"""
Migrate 24 partial-format arbiter records in reviews-reputation and subscription-billing.
Adds: arbiterType, blockConditions, passConditions, cfId, connectionType, knowledgeScope.
"""
import json

CONN = "FLOW_SCOPED"
PRIV = "PRIVATE"

# ─── FLOW-10 migrations ───────────────────────────────────────────────────────
FLOW10_MIGRATIONS = {
    "arb-flow10-eligibility-before-audit": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-1",
        "blockConditions": [
            "auditService.storeDocument() called before eligibilityService.check() in T169",
            "T169 creates audit record for an ineligible submission",
            "eligibility check is not the first operation in T169",
        ],
        "passConditions": [
            "eligibilityService.check() call appears before auditService.storeDocument() in T169",
            "T169 returns DataProcessResult.failure('not_eligible') before reaching audit call",
        ],
    },
    "arb-flow10-server-derived-review-id": {
        "arbiterType": "security",
        "cfId": "CF-FLOW10-SEC-1",
        "blockConditions": [
            "T169 reads event.reviewId or event.id for SETNX key",
            "T169 uses event.reviewId as the storeDocument _id",
            "reviewId derived from caller-supplied data instead of server-computed hash",
        ],
        "passConditions": [
            "T169 computes reviewId = SHA-256(tenantId+':'+reviewerId+':'+targetEntityId+':'+targetEntityType)",
            "SETNX key and storeDocument _id both use server-computed derivedReviewId",
            "event.reviewId never referenced in T169",
        ],
    },
    "arb-flow10-validation-before-setnx": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-2",
        "blockConditions": [
            "SETNX called before rating validation in T169",
            "T169 acquires idempotency slot before verifying rating is in [1,5]",
            "invalid rating (e.g. rating=6) submission consumes SETNX slot before rejection",
        ],
        "passConditions": [
            "rating validation (rating >= 1 && rating <= 5) appears before SETNX call in T169",
            "invalid rating returns DataProcessResult.failure before idempotency slot is consumed",
        ],
    },
    "arb-flow10-ineligible-no-audit": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-3",
        "blockConditions": [
            "T169 ineligible path reaches auditService.storeDocument() due to missing return",
            "audit record created for ineligible review attempt",
            "T169 does not hard-return immediately on eligibility check failure",
        ],
        "passConditions": [
            "T169 returns DataProcessResult.failure('not_eligible') immediately after eligibility check fails",
            "no audit record created on ineligible path",
            "hard return statement prevents audit call from being reached",
        ],
    },
    "arb-flow10-submission-completed-on-accepted": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-4",
        "blockConditions": [
            "ReviewSubmissionCompleted emitted from T170 or after moderation completes",
            "T169 does not emit ReviewSubmissionCompleted at executionOrder=5",
            "submitter waits for async moderation before receiving acknowledgment",
        ],
        "passConditions": [
            "T169 emits both ReviewAccepted AND ReviewSubmissionCompleted at executionOrder=5",
            "ReviewSubmissionCompleted emitted from T169 only — never from T170 or later",
        ],
    },
    "arb-flow10-dna8-submission": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-5",
        "blockConditions": [
            "T169 calls enqueue(ReviewAccepted) before storeDocument(review record)",
            "review record does not exist in xiigen-reviews when T170 processes ReviewAccepted",
            "DNA-8 outbox order violated in T169",
        ],
        "passConditions": [
            "T169 calls storeDocument() then enqueue(ReviewAccepted)",
            "line index storeDocument < line index enqueue in T169",
        ],
    },
    "arb-flow10-review-id-not-from-payload": {
        "arbiterType": "security",
        "cfId": "CF-FLOW10-SEC-2",
        "blockConditions": [
            "event.reviewId used as SETNX key in T169",
            "event.reviewId passed as storeDocument _id field in T169",
            "reviewId from event payload appears in SETNX or storeDocument arguments",
        ],
        "passConditions": [
            "SETNX key uses server-computed derivedReviewId only",
            "storeDocument _id uses server-computed derivedReviewId only",
            "event.reviewId never appears in SETNX or storeDocument arguments",
        ],
    },
    "arb-flow10-three-path-not-binary": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-6",
        "blockConditions": [
            "T170 implements binary APPROVE/REJECT without UNCERTAIN path",
            "confidence between passThreshold and rejectThreshold routes to ReviewRejected",
            "ReviewFlaggedForHuman event not emitted by T170",
            "dpoConflict annotation conflictsWith FLOW-08-binary-moderation absent",
        ],
        "passConditions": [
            "T170 implements: confidence >= passThreshold → ReviewPublished",
            "T170 implements: confidence < rejectThreshold → ReviewRejected",
            "T170 implements: else → ReviewFlaggedForHuman with status=PENDING",
            "dpoConflict annotation conflictsWith FLOW-08-binary-moderation present",
        ],
    },
    "arb-flow10-uncertain-to-pending-not-rejected": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-7",
        "blockConditions": [
            "T170 UNCERTAIN path emits ReviewFlaggedForHuman with status=REJECTED",
            "UNCERTAIN moderation result produces terminal REJECTED state",
            "borderline content permanently rejected without human review opportunity",
        ],
        "passConditions": [
            "T170 UNCERTAIN path emits ReviewFlaggedForHuman with {status: 'PENDING'}",
            "storeDocument called with status=PENDING on UNCERTAIN path",
            "PENDING status routes record to human moderator queue",
        ],
    },
    "arb-flow10-retraction-removes-from-aggregate": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-8",
        "blockConditions": [
            "T171 only subscribes to ReviewPublished without ReviewRetracted handler",
            "retracted reviews remain in reputation aggregate calculation",
            "T171 does not call recalculate() on ReviewRetracted event",
        ],
        "passConditions": [
            "T171 declares @EventPattern('ReviewPublished') onPublished() calling recalculate()",
            "T171 declares @EventPattern('ReviewRetracted') onRetracted() calling recalculate()",
            "both handlers present and both call recalculate()",
        ],
    },
    "arb-flow10-published-filter-only": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-9",
        "blockConditions": [
            "T171 recalculate() queries xiigen-reviews without status=PUBLISHED filter",
            "RETRACTED, PENDING, or REJECTED reviews included in reputation aggregate",
            "full-recalculate path re-includes non-PUBLISHED reviews",
        ],
        "passConditions": [
            "T171 recalculate() queries with filter {status: 'PUBLISHED', targetEntityId}",
            "only PUBLISHED reviews contribute to reputation score calculation",
        ],
    },
    "arb-flow10-score-clamp": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-10",
        "blockConditions": [
            "T171 stores rawScore without Math.max(1.0, Math.min(5.0, rawScore)) clamp",
            "reputation score outside [1.0, 5.0] range stored to xiigen-reputation-scores",
            "clamp not applied before storeDocument in T171",
        ],
        "passConditions": [
            "T171 applies score = Math.max(1.0, Math.min(5.0, rawScore)) before storeDocument",
            "stored reputation score is always in range [1.0, 5.0]",
            "named check: reputation_score_clamped_1_to_5",
        ],
    },
    "arb-flow10-revision-allowed-content-policy-only": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-11",
        "blockConditions": [
            "T172 sets revision_allowed:true for not_owner rejection reason",
            "T172 sets revision_allowed:true for already_responded rejection reason",
            "T172 always sets revision_allowed:true regardless of rejection reason",
        ],
        "passConditions": [
            "T172 emitRejection(): reason === 'content_policy' → revision_allowed:true",
            "T172 emitRejection(): reason === 'not_owner' → revision_allowed:false",
            "T172 emitRejection(): reason === 'already_responded' → revision_allowed:false",
        ],
    },
    "arb-flow10-ownership-before-setnx": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-12",
        "blockConditions": [
            "T172 calls SETNX before ownership check",
            "idempotency slot consumed for non-owner response attempt before rejection",
            "ownership check (review.ownerId === responderId) not at executionOrder=1",
        ],
        "passConditions": [
            "T172 checks review.ownerId === responderId before SETNX call",
            "line index ownership check < line index SETNX in T172",
            "non-owner returns DataProcessResult.failure before SETNX consumes slot",
        ],
    },
    "arb-flow10-no-reputation-from-response": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-13",
        "blockConditions": [
            "T172 emits reputation.updated event",
            "T172 triggers reputation recalculation on response submission",
            "reputation.updated emission present in T172 handler body",
        ],
        "passConditions": [
            "T172 emits only ReviewResponsePublished or ReviewResponseRejected",
            "no reputation.updated emission anywhere in T172",
            "reputation recalculation exclusively owned by T171 (ReviewPublished/ReviewRetracted handlers)",
        ],
    },
    "arb-flow10-dna8-response": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-14",
        "blockConditions": [
            "T172 calls enqueue(ReviewResponsePublished) before storeDocument(response record)",
            "response record does not exist when notification consumer fires",
            "DNA-8 outbox order violated in T172 on any path",
        ],
        "passConditions": [
            "T172 calls storeDocument() then enqueue() on all paths",
            "line index storeDocument < line index enqueue in T172",
        ],
    },
    "arb-flow10-new-key-variant-revision": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW10-DM-15",
        "blockConditions": [
            "T172 revision path uses same SETNX key as original response",
            "revision attempt gets 'already_responded' error due to consumed original key",
            "deriveRevisionKey() not implemented — revision uses hash(tenantId+reviewId+'response')",
        ],
        "passConditions": [
            "T172 revision path uses hash(tenantId+':'+reviewId+':response-revision-1') as SETNX key",
            "T172 original response uses hash(tenantId+':'+reviewId+':response') as SETNX key",
            "revision key is distinct from original response key",
        ],
    },
}

# ─── FLOW-12 migrations ───────────────────────────────────────────────────────
FLOW12_MIGRATIONS = {
    "arb-flow12-integer-cents-guard": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW12-DM-1",
        "blockConditions": [
            "T209 accepts float values for priceCents",
            "Number.isInteger(priceCents) check absent or not at executionOrder=1",
            "SETNX or storeDocument called before price integer validation",
        ],
        "passConditions": [
            "Number.isInteger(priceCents) && priceCents > 0 check at executionOrder=1",
            "float price returns DataProcessResult.failure before any SETNX or storeDocument call",
        ],
    },
    "arb-flow12-occ-write-not-plain-store": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW12-DM-2",
        "blockConditions": [
            "T209 calls plain storeDocument() for subscription plan write",
            "OCC not used for plan publication in T209",
            "storeDocumentWithOCC(plan, versionPin) absent from T209",
        ],
        "passConditions": [
            "T209 calls storeDocumentWithOCC(plan, versionPin) at executionOrder=6",
            "OCC_CONFLICT emits SubscriptionPlanPublicationFailed and returns DataProcessResult.failure",
        ],
    },
    "arb-flow12-status-before-lock": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW12-DM-3",
        "blockConditions": [
            "T211 acquires lock before checking subscription status",
            "CANCELLED or PAUSED subscriptions acquire lock before returning InvoiceVoided",
            "getStatus() not at executionOrder=1 in T211",
            "dpoConflict annotation conflictsWith FLOW-09-T107-seat-before-payment absent",
        ],
        "passConditions": [
            "T211 calls getStatus() at executionOrder=1 before lock acquisition at executionOrder=2",
            "CANCELLED subscription returns InvoiceVoided without acquiring lock",
            "dpoConflict annotation conflictsWith FLOW-09-T107-seat-before-payment present",
        ],
    },
    "arb-flow12-dunning-from-freedom-config": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW12-DM-4",
        "blockConditions": [
            "T211 uses hardcoded DUNNING_SCHEDULE constant array",
            "dunning retry schedule not read from FREEDOM config key subscription_billing_dunning_schedule",
            "maxAttempts hardcoded instead of derived from dunningSchedule.length",
        ],
        "passConditions": [
            "T211 calls freedom.getConfig('subscription_billing_dunning_schedule') for dunning schedule",
            "maxAttempts === dunningSchedule.length (derived from FREEDOM config)",
            "no hardcoded DUNNING_SCHEDULE constant in T211",
        ],
    },
    "arb-flow12-additive-subtractive-mrr": {
        "arbiterType": "domain",
        "cfId": "CF-FLOW12-DM-5",
        "blockConditions": [
            "T212 only subscribes to SubscriptionActivated without SubscriptionCancelled handler",
            "MRR aggregate only increases, never decreases on cancellation",
            "subtract path missing from T212",
        ],
        "passConditions": [
            "T212 has @EventPattern('SubscriptionActivated') handler adding to MRR",
            "T212 has @EventPattern('SubscriptionCancelled') handler subtracting from MRR",
            "normalizeMrr(): ANNUAL=Math.floor(priceCents/12), CUSTOM=Math.floor(priceCents/intervalDays*30)",
        ],
    },
    "arb-flow12-no-subscriber-id-in-metrics": {
        "arbiterType": "security",
        "cfId": "CF-FLOW12-SEC-1",
        "blockConditions": [
            "SubscriptionMetricsUpdated CloudEvent includes subscriberId field",
            "individual subscriber data leaks into tenant-level analytics aggregate event",
            "T212 includes subscriberId in metrics payload",
        ],
        "passConditions": [
            "SubscriptionMetricsUpdated event contains no subscriberId field",
            "metrics events contain only tenant-level aggregates (mrrDelta, planId, tenantId)",
            "no subscriber-level PII in any T212 emitted events",
        ],
    },
    "arb-flow12-payment-token-never-stored": {
        "arbiterType": "security",
        "cfId": "CF-FLOW12-SEC-2",
        "blockConditions": [
            "T210 stores paymentMethodToken (raw client token) in any document",
            "raw payment token present in xiigen-subscriptions or xiigen-billing-audit index",
            "database enters PCI scope due to raw token storage in T210",
        ],
        "passConditions": [
            "T210 stores only paymentMethodId (vault reference token)",
            "paymentMethodToken never appears in storeDocument arguments in T210",
            "only vault reference IDs stored in payment-related fields",
        ],
    },
}


def migrate_file(path, migrations):
    """Read NDJSON, apply migrations to matching records, write back."""
    with open(path, "r") as f:
        lines = [l for l in f.readlines() if l.strip()]

    output_lines = []
    i = 0
    migrated = 0
    skipped = 0

    while i < len(lines):
        line = lines[i].strip()

        # Index record — pass through
        if line.startswith('{"index"'):
            output_lines.append(lines[i])
            i += 1
            continue

        # Data record
        record = json.loads(line)
        arbiter_id = record.get("arbiterId", "")

        if arbiter_id in migrations and "arbiterType" not in record:
            patch = migrations[arbiter_id]
            record["arbiterType"] = patch["arbiterType"]
            record["cfId"] = patch["cfId"]
            record["blockConditions"] = patch["blockConditions"]
            record["passConditions"] = patch["passConditions"]
            record["connectionType"] = CONN
            record["knowledgeScope"] = PRIV
            output_lines.append(json.dumps(record) + "\n")
            migrated += 1
        else:
            output_lines.append(lines[i])
            if arbiter_id and "arbiterType" in record:
                skipped += 1

        i += 1

    with open(path, "w") as f:
        f.writelines(output_lines)

    return migrated, skipped


# ─── Run migrations ───────────────────────────────────────────────────────────
rr_m, rr_s = migrate_file(
    "fixtures/arbiters/reviews-reputation-arbiters.bulk.ndjson",
    FLOW10_MIGRATIONS,
)
print(f"reviews-reputation: migrated={rr_m}, already_complete={rr_s}")

sb_m, sb_s = migrate_file(
    "fixtures/arbiters/subscription-billing-arbiters.bulk.ndjson",
    FLOW12_MIGRATIONS,
)
print(f"subscription-billing: migrated={sb_m}, already_complete={sb_s}")

# ─── Verify no records missing arbiterType ────────────────────────────────────
import glob, os

print("\nPost-migration audit:")
total_missing = 0
for f in sorted(glob.glob("fixtures/arbiters/*.bulk.ndjson")):
    missing = 0
    for line in open(f):
        if "arbiterId" in line:
            rec = json.loads(line)
            if "arbiterType" not in rec:
                missing += 1
                print(f"  STILL MISSING: {f} → {rec['arbiterId']}")
    total_missing += missing

if total_missing == 0:
    print("  ✅ All records have arbiterType — 0 missing")
else:
    print(f"  ❌ {total_missing} records still missing arbiterType")
