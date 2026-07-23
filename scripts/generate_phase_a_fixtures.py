#!/usr/bin/env python3
"""
generate_phase_a_fixtures.py
============================
Generates all 53 FLOW-01 Phase A fixture files from what already exists
in the codebase — no new authoring required.

Sources:
  - server/src/engine-contracts/user-registration-onboarding-contracts.ts
  - server/src/engine-contracts/user-registration-onboarding-seed-prompts.ts
  - contracts/topologies/FLOW-01.topology.json
  - contracts/events/FLOW-01/*.schema.json
  - sessions/FLOW-01/STATE.json  (BFA rules CF-1..CF-8, factory map)

Outputs (in fixtures/):
  contracts/           3 files  (t47, t48, t49)
  prompts/             12 files (genesis, review, compliance, judge × 3)
  rag-patterns/        22 files (8 service + 6 conflict + 3 arch + 4 DNA + 1 plan)
  flow-definitions/    3 files  (per-task-type AF pipeline graphs)
  arbiters/            1 bulk file (6 arbiter registrations)
  event-schemas/flow-01/  12 files (6 existing + 6 derived)

Run from the repo root:
  python3 scripts/generate_phase_a_fixtures.py

Idempotent: safe to re-run, will overwrite existing files.
"""

import json
import os
import re
from pathlib import Path
from datetime import datetime, timezone

# ── Config ────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
FIXTURES = REPO_ROOT / "fixtures"
CONTRACTS_DIR = FIXTURES / "contracts"
PROMPTS_DIR = FIXTURES / "prompts"
RAG_DIR = FIXTURES / "rag-patterns"
FLOWDEF_DIR = FIXTURES / "flow-definitions"
ARBITERS_DIR = FIXTURES / "arbiters"
SCHEMAS_DIR = FIXTURES / "event-schemas" / "flow-01"

STATE_JSON = REPO_ROOT / "sessions" / "FLOW-01" / "STATE.json"
TOPOLOGY_JSON = REPO_ROOT / "contracts" / "topologies" / "FLOW-01.topology.json"
EXISTING_SCHEMAS = REPO_ROOT / "contracts" / "events" / "FLOW-01"

NOW = datetime.now(timezone.utc).isoformat()
FLOW_ID = "FLOW-01"
DOMAIN_ID = "user-registration-onboarding"

def makedirs():
    for d in [CONTRACTS_DIR, PROMPTS_DIR, RAG_DIR, FLOWDEF_DIR, ARBITERS_DIR, SCHEMAS_DIR]:
        d.mkdir(parents=True, exist_ok=True)

def write(path: Path, data: dict | list, label: str):
    path.write_text(json.dumps(data, indent=2))
    print(f"  ✅ {label}: {path.relative_to(REPO_ROOT)}")

# ── Load existing data ────────────────────────────────────────────────────────

def load_state() -> dict:
    return json.loads(STATE_JSON.read_text())

def load_topology() -> dict:
    return json.loads(TOPOLOGY_JSON.read_text())

# ── 1. ENGINE CONTRACTS (3 files) ─────────────────────────────────────────────
# Derived from: user-registration-onboarding-contracts.ts + STATE.json

def generate_contracts(state: dict):
    print("\n=== CONTRACTS (3) ===")
    factories = state["artifact_numbers"]["factories"]
    bfa = state["artifact_numbers"]["bfa_rules"]

    # T47 — SSOAndEmailAuth (ROUTING)
    t47 = {
        "taskTypeId": "T47",
        "flowId": FLOW_ID,
        "name": "SSOAndEmailAuth",
        "archetype": "ROUTING",
        "domainId": DOMAIN_ID,
        "seededAt": NOW,
        "stackCoupling": {
            "mechanism": "token-generation-and-rate-limiting",
            "tier": "IMPL_VARIES",
            "fabricInterface": "IScopedMemoryService",
            "freedomConfigKey": "sso_providers_enabled",
            "neutralConcepts": [
                "No PII in event payload",
                "Rate-limit from FREEDOM config",
                "Atomic set-if-not-exists idempotency via IScopedMemoryService.setIfAbsent()",
                "DNA-8: store before emit",
            ],
        },
        "factories": [
            {"factoryId": "F174", "interface": "IUserRepository", "fabric": "DATABASE"},
            {"factoryId": "F175", "interface": "IEmailVerificationQueue", "fabric": "QUEUE"},
            {"factoryId": "F176", "interface": "ISSOAuthProvider", "fabric": "AI_ENGINE"},
        ],
        "ironRules": [
            {"id": "IR-1", "rule": "Check email uniqueness BEFORE creating user record (CF-1)", "severity": "BUILD_FAILURE"},
            {"id": "IR-2", "rule": "Rate limit: read limit from FREEDOM config — never hardcode", "severity": "BUILD_FAILURE"},
            {"id": "IR-3", "rule": "Idempotency key: auth_attempt:<userId>:<correlationId> — deduplicate (CF-2)", "severity": "BUILD_FAILURE"},
            {"id": "IR-4", "rule": "DNA-8: storeDocument() BEFORE enqueue() on every state transition", "severity": "BUILD_FAILURE"},
            {"id": "IR-5", "rule": "No PII in emitted events — userId reference only (CF-8)", "severity": "BUILD_FAILURE"},
            {"id": "IR-6", "rule": "SSO token validation via ISSOAuthProvider only — never import OAuth SDK directly", "severity": "BUILD_FAILURE"},
        ],
        "bfaRules": list(bfa.keys())[:8],
        "handlers": ["validate_email_uniqueness", "route_auth_pathway", "store_user_record", "emit_registration_initiated"],
        "tags": ["registration", "routing", "sso", "idempotency", "tenant-scoped"],
        "keywords": "user registration SSO email auth routing idempotency duplicate prevention",
    }
    write(CONTRACTS_DIR / "t47.contract.json", t47, "T47 contract")

    # T48 — EmailVerificationWaitState (PROCESSING / IMPL_VARIES_WITH_PROVIDER)
    t48 = {
        "taskTypeId": "T48",
        "flowId": FLOW_ID,
        "name": "EmailVerificationWaitState",
        "archetype": "PROCESSING",
        "domainId": DOMAIN_ID,
        "seededAt": NOW,
        "stackCoupling": {
            "mechanism": "delayed-scheduled-action",
            "tier": "IMPL_VARIES_WITH_PROVIDER",
            "fabricInterface": "ISchedulerService",
            "freedomConfigKey": "scheduler_provider",
            "neutralConcepts": [
                "TTL from FREEDOM config — verificationTtlMs key",
                "No PII in scheduled payload",
                "Resend idempotency via IScopedMemoryService.setIfAbsent()",
                "Atomic token revoke on email change",
                "DNA-8 on all transitions",
                "Schedule expiry via ISchedulerService.scheduleDelayed()",
            ],
        },
        "factories": [
            {"factoryId": "F174", "interface": "IUserRepository", "fabric": "DATABASE"},
            {"factoryId": "F175", "interface": "IEmailVerificationQueue", "fabric": "QUEUE"},
            {"factoryId": "F177", "interface": "IVerificationTokenStore", "fabric": "DATABASE"},
        ],
        "ironRules": [
            {"id": "IR-1", "rule": "TTL from FREEDOM config (verificationTtlMs) — never hardcode 24h", "severity": "BUILD_FAILURE"},
            {"id": "IR-2", "rule": "No PII in scheduled callback payload — tokenId reference only (CF-8)", "severity": "BUILD_FAILURE"},
            {"id": "IR-3", "rule": "ResendVerificationRequested idempotent + rate-limited (CF-3)", "severity": "BUILD_FAILURE"},
            {"id": "IR-4", "rule": "DNA-8: storeDocument() BEFORE enqueue() on all token state transitions", "severity": "BUILD_FAILURE"},
            {"id": "IR-5", "rule": "Expired tokens MUST be rejected — never silently accepted (CF-6)", "severity": "BUILD_FAILURE"},
            {"id": "IR-6", "rule": "ChangeEmailRequested revokes existing token before issuing new one (CF-5)", "severity": "BUILD_FAILURE"},
            {"id": "IR-7", "rule": "24h SLA surfaced via FlowStateSnapshot.remainingMs (CF-7)", "severity": "BUILD_FAILURE"},
        ],
        "bfaRules": ["CF-3", "CF-5", "CF-6", "CF-7"],
        "handlers": ["send_verification_email", "wait_for_verification", "handle_resend", "handle_expiry"],
        "tags": ["email-verification", "wait-state", "scheduler", "24h-ttl", "idempotency"],
        "keywords": "email verification wait state scheduler delayed TTL expiry token resend",
        "designNote": "Reclassified from INCOMPATIBLE to IMPL_VARIES_WITH_PROVIDER. ISchedulerService abstracts Bull/ActionScheduler/Hangfire. See D-01-1.",
    }
    write(CONTRACTS_DIR / "t48.contract.json", t48, "T48 contract")

    # T49 — OnboardingDelivery (ORCHESTRATION)
    t49 = {
        "taskTypeId": "T49",
        "flowId": FLOW_ID,
        "name": "OnboardingDelivery",
        "archetype": "ORCHESTRATION",
        "domainId": DOMAIN_ID,
        "seededAt": NOW,
        "stackCoupling": {
            "mechanism": "multi-step-sequential-orchestration",
            "tier": "IMPL_VARIES",
            "fabricInterface": "ITenantRegistry",
            "freedomConfigKey": "flow01_onboarding_steps_required",
            "neutralConcepts": [
                "completedSteps[] tracking for app-reopen resume",
                "Workspace idempotency via IScopedMemoryService.setIfAbsent()",
                "Step list from FREEDOM config — never hardcode",
                "DNA-8: storeDocument() before advancing each step",
            ],
        },
        "factories": [
            {"factoryId": "F174", "interface": "IUserRepository", "fabric": "DATABASE"},
            {"factoryId": "F178", "interface": "IOnboardingTemplateStore", "fabric": "RAG"},
            {"factoryId": "F179", "interface": "IWorkspaceProvisionService", "fabric": "FLOW_ENGINE"},
            {"factoryId": "F180", "interface": "IProfileService", "fabric": "DATABASE"},
            {"factoryId": "F181", "interface": "IQueueNotificationService", "fabric": "QUEUE"},
        ],
        "ironRules": [
            {"id": "IR-1", "rule": "completedSteps[] tracked per step — app-reopen resumes from last incomplete step", "severity": "BUILD_FAILURE"},
            {"id": "IR-2", "rule": "Workspace provision idempotent: key=workspace:<userId>:<tenantId> via IScopedMemoryService", "severity": "BUILD_FAILURE"},
            {"id": "IR-3", "rule": "UserOnboardingCompleted emitted ONLY after ALL steps complete (CF-4)", "severity": "BUILD_FAILURE"},
            {"id": "IR-4", "rule": "Step list from FREEDOM config (flow01_onboarding_steps_required) — never hardcode", "severity": "BUILD_FAILURE"},
            {"id": "IR-5", "rule": "DNA-8: storeDocument() BEFORE proceeding to next step", "severity": "BUILD_FAILURE"},
            {"id": "IR-6", "rule": "No PII in UserOnboardingCompleted event (CF-8)", "severity": "BUILD_FAILURE"},
            {"id": "IR-7", "rule": "Workspace creation via ITenantRegistry.createTenant() — not raw database insert", "severity": "BUILD_FAILURE"},
        ],
        "bfaRules": ["CF-4", "CF-8"],
        "handlers": ["provision_workspace", "build_profile", "deliver_questionnaire", "emit_onboarding_completed"],
        "tags": ["onboarding", "orchestration", "multi-step", "workspace", "resume"],
        "keywords": "onboarding delivery orchestration workspace provision multi-step resume completedSteps",
    }
    write(CONTRACTS_DIR / "t49.contract.json", t49, "T49 contract")


# ── 2. PROMPTS (12 files) ─────────────────────────────────────────────────────
# Derived from: user-registration-onboarding-seed-prompts.ts (genesis × 3)
# + generated review/compliance/judge stubs for the other 9

GENESIS_PROMPTS = {
    "T47": (
        "Generate a NestJS UserRegistrationInitiatorService (T47) that accepts initial signup "
        "via SSO or email+password and routes to the appropriate auth pathway. ROUTING archetype. "
        "Inject IUserRepository (F174) via DATABASE FABRIC for user record creation + uniqueness check. "
        "Inject IEmailVerificationQueue (F175) via QUEUE FABRIC for verification email trigger. "
        "Inject ISSOAuthProvider (F176) via AI_ENGINE FABRIC for SSO token validation. "
        "CRITICAL: Check email uniqueness BEFORE creating user record (CF-1). "
        "User record MUST be stored via storeDocument() BEFORE emitting UserRegistrationInitiated event (DNA-8 outbox pattern). "
        "Build idempotency key: 'auth_attempt:<userId>:<correlationId>' to deduplicate registration attempts (CF-2). "
        "No PII in emitted events — userId reference only, never email or credentials in payload (CF-8). "
        "Read FREEDOM config for sso_providers_enabled, password_min_length. "
        "SSO token validation via ISSOAuthProvider only — never import OAuth library directly. "
        "Emit CloudEvents envelope via createCloudEvent(). "
        "Return DataProcessResult.failure('DUPLICATE_EMAIL') on uniqueness violation. "
        "Extend MicroserviceBase. Return DataProcessResult<{ userId, authPathway, correlationId }>."
        "\n\nDO NOT: hardcode rate limits, import ioredis or any Redis SDK directly, store passwords in plaintext, "
        "include email in event payload, skip the uniqueness check."
        "\n\nDO: use IScopedMemoryService.setIfAbsent() for idempotency, read all config from FREEDOM config, "
        "call storeDocument() before enqueue(), use createCloudEvent() wrapper."
    ),
    "T48": (
        "Generate a NestJS EmailVerificationWaitService (T48) that holds the registration flow "
        "open for 24h while a verification token is active. PROCESSING archetype — async wait state. "
        "Inject IUserRepository (F174) via DATABASE FABRIC. "
        "Inject IEmailVerificationQueue (F175) via QUEUE FABRIC. "
        "Inject IVerificationTokenStore (F177) via DATABASE FABRIC for token TTL management. "
        "CRITICAL: ResendVerificationRequested MUST be idempotent and rate-limited — "
        "check last_resend_at against flow01_resend_rate_limit_minutes from FREEDOM config (CF-3). "
        "ChangeEmailRequested MUST revoke existing token before issuing new one — "
        "storeDocument token revocation BEFORE creating replacement (CF-5). "
        "Expired tokens MUST be rejected — never silently accepted (CF-6). "
        "Track 24h SLA and surface via FlowStateSnapshot.remainingMs (CF-7). "
        "Use BuildSearchFilter for all token queries — empty/null fields auto-skipped (DNA-2). "
        "storeDocument() BEFORE enqueue() on all token state transitions (DNA-8). "
        "No PII in emitted events — tokenId reference only, never token value (CF-8). "
        "Schedule expiry via ISchedulerService.scheduleDelayed() — no direct Bull imports. "
        "Emit EmailVerified CloudEvent to trigger T49. "
        "Extend MicroserviceBase. Return DataProcessResult<{ status: PENDING | VERIFIED | EXPIRED, expiresAt, remainingMs }>."
        "\n\nDO NOT: import Bull or any scheduler SDK directly, store the raw token value in events, "
        "accept expired tokens silently, hardcode the 24h TTL."
        "\n\nDO: use ISchedulerService.scheduleDelayed(), read TTL from FREEDOM config, "
        "call storeDocument() before enqueue(), use setIfAbsent() for resend rate limiting."
    ),
    "T49": (
        "Generate a NestJS OnboardingDeliveryService (T49) that orchestrates the full onboarding "
        "wizard after email verification. ORCHESTRATION archetype. "
        "Inject IUserRepository (F174) via DATABASE FABRIC. "
        "Inject IOnboardingTemplateStore (F178) via RAG FABRIC for tenant-customized questionnaire + profile schema. "
        "Inject IWorkspaceProvisionService (F179) via FLOW_ENGINE FABRIC for workspace creation. "
        "Inject IProfileService (F180) via DATABASE FABRIC for profile data persistence. "
        "Inject IQueueNotificationService (F181) via QUEUE FABRIC for UserOnboardingCompleted event. "
        "CRITICAL: Track completedSteps[] per step — app-reopen MUST resume from last incomplete step. "
        "Each step persisted via storeDocument() BEFORE proceeding to next step (DNA-8). "
        "UserOnboardingCompleted emitted ONLY after ALL onboarding steps complete (CF-4). "
        "Workspace provisioning MUST be idempotent — idempotency key: 'workspace:<userId>:<tenantId>' "
        "via IScopedMemoryService.setIfAbsent() — no duplicate creation on resume. "
        "Workspace creation via ITenantRegistry.createTenant() — not a raw database INSERT. "
        "RAG template fetch via IOnboardingTemplateStore — BuildSearchFilter with { templateType: 'onboarding', bundleId }. "
        "Read flow01_onboarding_steps_required from FREEDOM config — never hardcode step list. "
        "No PII in emitted events (CF-8). "
        "UserOnboardingCompleted is the gateway to FLOW-02. "
        "Extend MicroserviceBase. Return DataProcessResult<{ userId, workspaceId, completedSteps, completedAt }>."
        "\n\nDO NOT: hardcode the step list, emit UserOnboardingCompleted before all steps complete, "
        "create a workspace via raw database INSERT, skip idempotency on workspace provisioning."
        "\n\nDO: use ITenantRegistry.createTenant(), read steps from FREEDOM config, "
        "call storeDocument() before proceeding to next step, use setIfAbsent() for workspace idempotency."
    ),
}

REVIEW_PROMPTS = {
    "T47": "Review the generated UserRegistrationInitiatorService (T47). Check: (1) Email uniqueness checked before user record created? (2) Idempotency key constructed as auth_attempt:<userId>:<correlationId>? (3) IScopedMemoryService.setIfAbsent() used — no direct Redis import? (4) storeDocument() called BEFORE enqueue()? (5) No PII in UserRegistrationInitiated event payload? (6) ISSOAuthProvider used for SSO — no direct OAuth SDK import? Flag any violation as BUILD_FAILURE.",
    "T48": "Review the generated EmailVerificationWaitService (T48). Check: (1) ISchedulerService.scheduleDelayed() used — no direct Bull import? (2) Token TTL read from FREEDOM config — not hardcoded? (3) ResendVerificationRequested is idempotent via IScopedMemoryService.setIfAbsent()? (4) ChangeEmailRequested revokes existing token via storeDocument() BEFORE creating replacement? (5) Expired tokens rejected — not silently accepted? (6) SLA surfaced via FlowStateSnapshot.remainingMs? Flag any violation as BUILD_FAILURE.",
    "T49": "Review the generated OnboardingDeliveryService (T49). Check: (1) completedSteps[] tracked per step? (2) Workspace created via ITenantRegistry.createTenant() — not raw INSERT? (3) Workspace idempotency via IScopedMemoryService.setIfAbsent()? (4) UserOnboardingCompleted emitted ONLY after all steps complete? (5) Step list read from FREEDOM config — not hardcoded? (6) storeDocument() before advancing each step? Flag any violation as BUILD_FAILURE.",
}

COMPLIANCE_PROMPTS = {
    "T47": "Compliance check for T47 SSOAndEmailAuth: (1) DNA-1 compliance — all data as Record<string,unknown>? (2) DNA-2 — BuildSearchFilter used for all queries? (3) DNA-3 — no throw statements? All errors return DataProcessResult.failure()? (4) DNA-4 — extends MicroserviceBase? (5) DNA-5 — tenantId on every database operation? (6) DNA-8 — storeDocument() before enqueue() on every transition? (7) DNA-9 — CloudEvents envelope via createCloudEvent()?",
    "T48": "Compliance check for T48 EmailVerificationWaitState: (1) DNA-2 — BuildSearchFilter for all token queries? (2) DNA-3 — no throw for business logic? (3) DNA-4 — extends MicroserviceBase? (4) DNA-5 — tenantId on all database operations? (5) DNA-8 — storeDocument() before enqueue() on all transitions? (6) FABRIC-FIRST — ISchedulerService used, not Bull directly? (7) FABRIC-FIRST — IScopedMemoryService used, not ioredis directly?",
    "T49": "Compliance check for T49 OnboardingDelivery: (1) DNA-1 — all data as Record<string,unknown>? (2) DNA-3 — no throw for business logic? (3) DNA-4 — extends MicroserviceBase? (4) DNA-5 — tenantId on all operations? (5) DNA-8 — storeDocument() before each step advancement? (6) FABRIC-FIRST — ITenantRegistry used for workspace, not raw INSERT? (7) FABRIC-FIRST — IScopedMemoryService used for workspace idempotency?",
}

JUDGE_PROMPTS = {
    "T47": "Judge the T47 SSOAndEmailAuth implementation. Score 0-100. Iron rules (70 points): CF-1 email uniqueness (20), CF-2 idempotency key (20), CF-8 no PII (15), IScopedMemoryService not raw Redis (15). DNA compliance (20 points): DNA-8 outbox ordering (10), DNA-5 tenant scope (10). Quality (10 points): error messages meaningful, FREEDOM config for all tunable values. Score-0 violations: any iron rule failure, any SDK import, any raw Redis access.",
    "T48": "Judge the T48 EmailVerificationWaitState implementation. Score 0-100. Iron rules (70 points): CF-3 resend idempotency (15), CF-5 token revocation ordering (15), CF-6 expiry rejection (15), CF-7 SLA tracking (10), ISchedulerService not Bull directly (15). DNA compliance (20 points): DNA-8 outbox ordering (10), DNA-2 BuildSearchFilter (10). Quality (10 points): FREEDOM config for TTL, virtualClock-testable. Score-0 violations: direct Bull import, silent token acceptance, hardcoded 24h.",
    "T49": "Judge the T49 OnboardingDelivery implementation. Score 0-100. Iron rules (70 points): completedSteps tracking (20), ITenantRegistry for workspace (20), workspace idempotency (15), CF-4 completion gate (15). DNA compliance (20 points): DNA-8 per step (10), DNA-5 tenant scope (10). Quality (10 points): FREEDOM config for step list, resume logic correct. Score-0 violations: raw workspace INSERT, missing idempotency, early UserOnboardingCompleted emission, hardcoded step list.",
}

def generate_prompts():
    print("\n=== PROMPTS (12) ===")
    prompt_types = {
        "genesis": GENESIS_PROMPTS,
        "review": REVIEW_PROMPTS,
        "compliance": COMPLIANCE_PROMPTS,
        "judge": JUDGE_PROMPTS,
    }
    for task in ["T47", "T48", "T49"]:
        tt_lower = task.lower()
        for ptype, source in prompt_types.items():
            filename = f"{tt_lower}-{ptype}-v1.1.0.json"
            doc = {
                "promptId": f"{tt_lower}-{ptype}-v1.1.0",
                "taskTypeId": task,
                "flowId": FLOW_ID,
                "promptType": ptype,
                "version": "1.1.0",
                "seededAt": NOW,
                "content": source[task],
                "tags": ["flow-01", task.lower(), ptype, "xiigen-community"],
            }
            write(PROMPTS_DIR / filename, doc, f"{task} {ptype} prompt")


# ── 3. RAG PATTERNS (22 files) ────────────────────────────────────────────────

def generate_rag_patterns(state: dict):
    print("\n=== RAG PATTERNS (22) ===")

    # 8 SERVICE PATTERNS (one per factory F174-F181)
    service_patterns = [
        {
            "patternId": "svc-F174-IUserRepository",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F174", "interfaceName": "IUserRepository",
            "archetype": "STORAGE_WRITE",
            "fabric": "DATABASE",
            "fabricProvider": "Elasticsearch",
            "skillRefs": ["SK-05"],
            "taskTypeRefs": ["T47", "T48", "T49"],
            "tags": ["user", "repository", "storage", "tenant-scoped", "registration"],
            "keywords": "user repository store document search tenant registration uniqueness check",
            "codeSnippet": (
                "const filter = buildSearchFilter({ tenantId, email });\n"
                "const existing = await this.db.searchDocuments(tenantId, 'users', filter);\n"
                "if (existing.isSuccess && existing.data?.length) {\n"
                "  return DataProcessResult.failure('DUPLICATE_EMAIL');\n"
                "}\n"
                "return this.db.storeDocument(tenantId, 'users', userRecord, userId);"
            ),
        },
        {
            "patternId": "svc-F175-IEmailVerificationQueue",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F175", "interfaceName": "IEmailVerificationQueue",
            "archetype": "EVENT_EMIT",
            "fabric": "QUEUE",
            "fabricProvider": "RedisStreams",
            "skillRefs": ["SK-04"],
            "taskTypeRefs": ["T47", "T48"],
            "tags": ["email", "queue", "verification", "event-emit"],
            "keywords": "email verification queue enqueue event emit CloudEvents",
            "codeSnippet": (
                "// DNA-8: storeDocument BEFORE enqueue\n"
                "await this.db.storeDocument(tenantId, 'verifications', record, tokenId);\n"
                "await this.queue.enqueueAsync(tenantId, createCloudEvent({\n"
                "  type: 'xiigen.user-registration.email-verification-sent.v1',\n"
                "  data: { userId, tokenId }  // no PII — CF-8\n"
                "}));"
            ),
        },
        {
            "patternId": "svc-F176-ISSOAuthProvider",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F176", "interfaceName": "ISSOAuthProvider",
            "archetype": "EXTERNAL_CALL",
            "fabric": "AI_ENGINE",
            "fabricProvider": "GoogleOAuth",
            "skillRefs": ["SK-06"],
            "taskTypeRefs": ["T47"],
            "tags": ["sso", "oauth", "auth-provider", "external"],
            "keywords": "SSO OAuth Google Facebook provider token validation external auth",
            "codeSnippet": (
                "// Never import OAuth library directly — use ISSOAuthProvider\n"
                "const ssoResult = await this.ssoProvider.validateToken(provider, token);\n"
                "if (!ssoResult.isSuccess) return DataProcessResult.failure('SSO_INVALID');\n"
                "return DataProcessResult.success({ userId: ssoResult.data.userId });"
            ),
        },
        {
            "patternId": "svc-F177-IVerificationTokenStore",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F177", "interfaceName": "IVerificationTokenStore",
            "archetype": "STORAGE_WRITE",
            "fabric": "DATABASE",
            "fabricProvider": "Redis",
            "skillRefs": ["SK-05"],
            "taskTypeRefs": ["T48"],
            "tags": ["token", "verification", "ttl", "expiry", "revocation"],
            "keywords": "verification token store TTL expiry revoke replace token management",
            "codeSnippet": (
                "// Revoke existing token BEFORE creating replacement (CF-5)\n"
                "const revokeResult = await this.db.storeDocument(\n"
                "  tenantId, 'tokens', { ...existing, revoked: true }, existingTokenId\n"
                ");\n"
                "if (!revokeResult.isSuccess) return revokeResult;\n"
                "return this.db.storeDocument(tenantId, 'tokens', newToken, newTokenId);"
            ),
        },
        {
            "patternId": "svc-F178-IOnboardingTemplateStore",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F178", "interfaceName": "IOnboardingTemplateStore",
            "archetype": "RAG_RETRIEVAL",
            "fabric": "RAG",
            "fabricProvider": "Elasticsearch",
            "skillRefs": ["SK-00a"],
            "taskTypeRefs": ["T49"],
            "tags": ["onboarding", "template", "rag", "tenant-customized"],
            "keywords": "onboarding template RAG retrieval tenant-customized questionnaire profile schema",
            "codeSnippet": (
                "const filter = buildSearchFilter({ templateType: 'onboarding', bundleId });\n"
                "const template = await this.rag.search(tenantId, filter);\n"
                "if (!template.isSuccess || !template.data?.length) {\n"
                "  // Fallback to default from FREEDOM config\n"
                "  return this.freedom.get(tenantId, 'default_onboarding_template');\n"
                "}"
            ),
        },
        {
            "patternId": "svc-F179-IWorkspaceProvisionService",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F179", "interfaceName": "IWorkspaceProvisionService",
            "archetype": "ORCHESTRATION",
            "fabric": "FLOW_ENGINE",
            "fabricProvider": "XIIGenFlowEngine",
            "skillRefs": ["SK-08"],
            "taskTypeRefs": ["T49"],
            "tags": ["workspace", "provision", "idempotent", "tenant-registry"],
            "keywords": "workspace provision idempotent tenant registry create isolate",
            "codeSnippet": (
                "// Idempotency: setIfAbsent prevents duplicate workspace creation on resume\n"
                "const lockKey = `workspace:${userId}:${tenantId}`;\n"
                "const locked = await this.memory.setIfAbsent(lockKey, 'provisioning', 3600);\n"
                "if (!locked.data) return DataProcessResult.success({ workspaceId: existing.workspaceId });\n"
                "// Use ITenantRegistry — not a raw database INSERT\n"
                "return this.tenantRegistry.createTenant(workspaceId, { ownerId: userId });"
            ),
        },
        {
            "patternId": "svc-F180-IProfileService",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F180", "interfaceName": "IProfileService",
            "archetype": "STORAGE_WRITE",
            "fabric": "DATABASE",
            "fabricProvider": "Elasticsearch",
            "skillRefs": ["SK-05"],
            "taskTypeRefs": ["T49"],
            "tags": ["profile", "storage", "onboarding", "user-data"],
            "keywords": "profile store user data onboarding questionnaire answers persist",
            "codeSnippet": (
                "// DNA-8: persist profile BEFORE advancing to next step\n"
                "const profileResult = await this.db.storeDocument(\n"
                "  tenantId, 'profiles', profileData, userId\n"
                ");\n"
                "if (!profileResult.isSuccess) return profileResult;\n"
                "// Only advance completedSteps after successful persist\n"
                "completedSteps.push('profile');"
            ),
        },
        {
            "patternId": "svc-F181-IQueueNotificationService",
            "patternType": "SERVICE_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "factoryId": "F181", "interfaceName": "IQueueNotificationService",
            "archetype": "EVENT_EMIT",
            "fabric": "QUEUE",
            "fabricProvider": "RedisStreams",
            "skillRefs": ["SK-04"],
            "taskTypeRefs": ["T49"],
            "tags": ["notification", "queue", "gateway", "flow-02-trigger"],
            "keywords": "notification queue emit UserOnboardingCompleted FLOW-02 gateway trigger",
            "codeSnippet": (
                "// Gate: emit ONLY after ALL steps complete (CF-4)\n"
                "if (completedSteps.length < requiredSteps.length) {\n"
                "  return DataProcessResult.failure('INCOMPLETE_ONBOARDING');\n"
                "}\n"
                "// DNA-8: storeDocument completion record BEFORE emitting\n"
                "await this.db.storeDocument(tenantId, 'completions', completionRecord, userId);\n"
                "return this.queue.enqueueAsync(tenantId, createCloudEvent({\n"
                "  type: 'xiigen.user-registration.onboarding-completed.v1',\n"
                "  data: { userId, workspaceId }  // no PII — CF-8\n"
                "}));"
            ),
        },
    ]

    for p in service_patterns:
        write(RAG_DIR / f"{p['patternId']}.json", p, f"service pattern {p['patternId']}")

    # 6 CONFLICT PATTERNS (CF-1..CF-6 — most critical, skip CF-7/8 which are meta)
    bfa = state["artifact_numbers"]["bfa_rules"]
    conflict_patterns = [
        {
            "patternId": "conflict-CF-1-email-uniqueness",
            "patternType": "CONFLICT_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "cfId": "CF-1",
            "trigger": "T47 creates user record without first checking email uniqueness",
            "conflictDesc": "Duplicate user records created for same email. FK references corrupt. Cross-flow identity resolution breaks.",
            "resolution": "Email uniqueness check via buildSearchFilter BEFORE storeDocument. Return DataProcessResult.failure('DUPLICATE_EMAIL') on collision.",
            "flowScope": [FLOW_ID],
            "severity": "CRITICAL",
            "tags": ["uniqueness", "email", "duplicate", "registration", "cf-1"],
            "keywords": "email uniqueness duplicate registration user record conflict CF-1",
        },
        {
            "patternId": "conflict-CF-2-idempotency-dedup",
            "patternType": "CONFLICT_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "cfId": "CF-2",
            "trigger": "Duplicate registration request with same email + correlationId",
            "conflictDesc": "Network retry creates two user records for one registration attempt. Downstream flows process duplicate users.",
            "resolution": "IScopedMemoryService.setIfAbsent('auth_attempt:<userId>:<correlationId>', '1', 3600). Return existing record if key already set.",
            "flowScope": [FLOW_ID],
            "severity": "HIGH",
            "tags": ["idempotency", "deduplication", "setIfAbsent", "cf-2"],
            "keywords": "idempotency duplicate registration correlationId setIfAbsent dedup CF-2",
        },
        {
            "patternId": "conflict-CF-3-resend-rate-limit",
            "patternType": "CONFLICT_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "cfId": "CF-3",
            "trigger": "User spam-clicks 'Resend verification email' — many concurrent ResendVerificationRequested events",
            "conflictDesc": "Email provider rate-limited or blocked. User inbox flooded. Verification tokens orphaned.",
            "resolution": "IScopedMemoryService.setIfAbsent('resend:<userId>', '1', rateLimitMinutes*60). Check last_resend_at. Rate limit value from FREEDOM config.",
            "flowScope": [FLOW_ID],
            "severity": "HIGH",
            "tags": ["resend", "rate-limit", "idempotency", "email", "cf-3"],
            "keywords": "resend verification email rate limit idempotent setIfAbsent CF-3",
        },
        {
            "patternId": "conflict-CF-4-premature-completion",
            "patternType": "CONFLICT_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "cfId": "CF-4",
            "trigger": "T49 emits UserOnboardingCompleted before all required steps finish",
            "conflictDesc": "FLOW-02 triggered with incomplete user profile. Enrichment sources have no data to enrich. Downstream matching fails.",
            "resolution": "Check completedSteps.length === requiredSteps.length before emitting. requiredSteps from FREEDOM config flow01_onboarding_steps_required.",
            "flowScope": [FLOW_ID, "FLOW-02"],
            "severity": "CRITICAL",
            "tags": ["completion-gate", "premature-emit", "orchestration", "cf-4"],
            "keywords": "onboarding completion gate premature emit UserOnboardingCompleted CF-4",
        },
        {
            "patternId": "conflict-CF-5-token-revocation-ordering",
            "patternType": "CONFLICT_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "cfId": "CF-5",
            "trigger": "ChangeEmailRequested creates new verification token before revoking existing one",
            "conflictDesc": "Two active verification tokens exist. User verifies old link after email change. Account assigned to old email.",
            "resolution": "DNA-8 ordering: storeDocument(existing token, revoked=true) BEFORE storeDocument(new token). Atomic — no window between.",
            "flowScope": [FLOW_ID],
            "severity": "CRITICAL",
            "tags": ["token", "revocation", "ordering", "email-change", "cf-5"],
            "keywords": "token revocation email change ordering atomic CF-5 storeDocument before",
        },
        {
            "patternId": "conflict-CF-8-pii-in-events",
            "patternType": "CONFLICT_PATTERN",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "cfId": "CF-8",
            "trigger": "Service includes email, password, or name fields in queue event payload",
            "conflictDesc": "PII propagated through queue. Queue consumers receive and may log or store PII. GDPR violation. Audit trail contamination.",
            "resolution": "Event payloads contain userId/tokenId/correlationId only — never email, password, name, or other PII. References only.",
            "flowScope": [FLOW_ID],
            "severity": "CRITICAL",
            "tags": ["pii", "gdpr", "event-payload", "privacy", "cf-8"],
            "keywords": "PII GDPR event payload userId reference only no email password CF-8",
        },
    ]

    for p in conflict_patterns:
        write(RAG_DIR / f"{p['patternId']}.json", p, f"conflict pattern {p['patternId']}")

    # 3 ARCH PATTERNS
    arch_patterns = [
        {
            "patternId": "arch--routing-conditional-path",
            "patternType": "ARCH_PATTERN",
            "flowId": FLOW_ID, "domainId": "generic", "seededAt": NOW,
            "archetype": "ROUTING",
            "tags": ["routing", "conditional", "path-selection", "idempotency"],
            "keywords": "routing conditional path selection idempotency setIfAbsent duplicate prevention",
            "codeSnippet": (
                "// ROUTING archetype: check idempotency FIRST, then route\n"
                "const locked = await this.memory.setIfAbsent(idempotencyKey, '1', ttl);\n"
                "if (!locked.data) return DataProcessResult.success(existing);  // dedup\n"
                "// Route based on input\n"
                "const pathway = input.ssoProvider ? 'sso' : 'email';\n"
                "// ALWAYS: storeDocument BEFORE enqueue\n"
                "await this.db.storeDocument(tenantId, 'records', record, recordId);\n"
                "await this.queue.enqueueAsync(tenantId, createCloudEvent({ type, data }));"
            ),
            "ironRules": ["setIfAbsent for idempotency", "storeDocument before enqueue", "route based on input not config"],
        },
        {
            "patternId": "arch--processing-wait-state",
            "patternType": "ARCH_PATTERN",
            "flowId": FLOW_ID, "domainId": "generic", "seededAt": NOW,
            "archetype": "PROCESSING",
            "tags": ["processing", "wait-state", "ttl", "scheduler", "async"],
            "keywords": "processing wait state TTL scheduler delayed callback expiry async",
            "codeSnippet": (
                "// PROCESSING archetype: schedule expiry via ISchedulerService\n"
                "const ttlMs = await this.freedom.getNumber(tenantId, 'verificationTtlMs');\n"
                "await this.scheduler.scheduleDelayed(\n"
                "  'expiry-check', ttlMs,\n"
                "  { tokenId, tenantId },  // no PII in payload\n"
                "  `expiry:${tokenId}`  // idempotency key for the scheduled job\n"
                ");\n"
                "// Surface SLA to client\n"
                "return { status: 'PENDING', expiresAt, remainingMs: ttlMs };"
            ),
            "ironRules": ["ISchedulerService not direct SDK", "TTL from FREEDOM config", "no PII in scheduled payload"],
        },
        {
            "patternId": "arch--orchestration-multi-step",
            "patternType": "ARCH_PATTERN",
            "flowId": FLOW_ID, "domainId": "generic", "seededAt": NOW,
            "archetype": "ORCHESTRATION",
            "tags": ["orchestration", "multi-step", "resume", "completedSteps", "idempotent"],
            "keywords": "orchestration multi-step resume completedSteps idempotent app-reopen sequential",
            "codeSnippet": (
                "// ORCHESTRATION archetype: resume from last incomplete step\n"
                "const requiredSteps = await this.freedom.getArray(tenantId, 'onboardingSteps');\n"
                "const completedSteps = existing?.completedSteps ?? [];\n"
                "for (const step of requiredSteps) {\n"
                "  if (completedSteps.includes(step)) continue;  // already done\n"
                "  const result = await this.executeStep(step, tenantId, userId);\n"
                "  if (!result.isSuccess) return result;\n"
                "  // DNA-8: persist BEFORE advancing\n"
                "  await this.db.storeDocument(tenantId, 'progress', { step, completedAt }, userId);\n"
                "  completedSteps.push(step);\n"
                "}\n"
                "// Gate: emit completion ONLY when all steps done\n"
                "if (completedSteps.length < requiredSteps.length) return DataProcessResult.failure('INCOMPLETE');"
            ),
            "ironRules": ["steps from FREEDOM config", "storeDocument before advancing", "emit only on full completion"],
        },
    ]

    for p in arch_patterns:
        write(RAG_DIR / f"{p['patternId']}.json", p, f"arch pattern {p['patternId']}")

    # 4 DNA PATTERNS (reusable examples embedded in this flow's context)
    dna_patterns = [
        {
            "patternId": "dna-8-outbox-user-registration",
            "patternType": "DNA_PATTERN_EXAMPLE",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "dnaId": "DNA-8",
            "dnaName": "OutboxBeforeQueue",
            "tags": ["dna-8", "outbox", "store-before-emit", "event-ordering"],
            "keywords": "outbox before queue storeDocument enqueue event ordering DNA-8",
            "codeSnippet": (
                "// DNA-8: store FIRST, emit SECOND — always\n"
                "const stored = await this.db.storeDocument(tenantId, 'records', record, id);\n"
                "if (!stored.isSuccess) return stored;  // never emit without store\n"
                "return this.queue.enqueueAsync(tenantId, createCloudEvent({ type, data }));"
            ),
            "antiPattern": "await this.queue.enqueueAsync(...); await this.db.storeDocument(...)  // WRONG: emit before store",
        },
        {
            "patternId": "dna-5-tenant-scope-user-registration",
            "patternType": "DNA_PATTERN_EXAMPLE",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "dnaId": "DNA-5",
            "dnaName": "ScopeIsolation",
            "tags": ["dna-5", "tenant-scope", "isolation", "tenantId"],
            "keywords": "tenant scope isolation tenantId every query database operation DNA-5",
            "codeSnippet": (
                "// DNA-5: tenantId on EVERY database operation\n"
                "const filter = buildSearchFilter({ tenantId, userId });\n"
                "const result = await this.db.searchDocuments(tenantId, 'users', filter);\n"
                "// tenantId is the first argument — never omit it"
            ),
            "antiPattern": "this.db.searchDocuments('users', filter)  // WRONG: no tenantId",
        },
        {
            "patternId": "dna-3-dataprocessresult-user-registration",
            "patternType": "DNA_PATTERN_EXAMPLE",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "dnaId": "DNA-3",
            "dnaName": "DataProcessResult",
            "tags": ["dna-3", "DataProcessResult", "no-throw", "error-handling"],
            "keywords": "DataProcessResult no throw failure success error handling DNA-3",
            "codeSnippet": (
                "// DNA-3: return DataProcessResult — never throw\n"
                "if (!input.email) return DataProcessResult.failure('MISSING_EMAIL');\n"
                "const result = await this.db.storeDocument(tenantId, 'users', user, userId);\n"
                "if (!result.isSuccess) return result;  // propagate, don't throw\n"
                "return DataProcessResult.success({ userId });"
            ),
            "antiPattern": "throw new Error('Email required')  // WRONG: use DataProcessResult.failure()",
        },
        {
            "patternId": "dna-2-buildsearchfilter-user-registration",
            "patternType": "DNA_PATTERN_EXAMPLE",
            "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
            "dnaId": "DNA-2",
            "dnaName": "BuildQueryFilters",
            "tags": ["dna-2", "buildSearchFilter", "query-filter", "empty-skip"],
            "keywords": "buildSearchFilter query filter empty skip null auto DNA-2",
            "codeSnippet": (
                "// DNA-2: buildSearchFilter skips null/undefined/empty fields automatically\n"
                "const filter = buildSearchFilter({\n"
                "  tenantId,\n"
                "  email: options.email,     // skipped if null\n"
                "  tokenId: options.tokenId, // skipped if null\n"
                "});\n"
                "return this.db.searchDocuments(tenantId, 'users', filter);"
            ),
            "antiPattern": "where email = ? AND tokenId = ?  // WRONG: manual WHERE clause building",
        },
    ]

    for p in dna_patterns:
        write(RAG_DIR / f"{p['patternId']}.json", p, f"DNA pattern {p['patternId']}")

    # 1 ORCHESTRATION PLAN EXEMPLAR
    plan = {
        "patternId": "plan-flow01-user-registration-onboarding",
        "patternType": "PLAN_EXEMPLAR",
        "flowId": FLOW_ID, "domainId": DOMAIN_ID, "seededAt": NOW,
        "summary": "Wave-0 user registration funnel. T47 (ROUTING) accepts signup, T48 (PROCESSING) holds for email verification, T49 (ORCHESTRATION) delivers onboarding wizard.",
        "taskSequence": ["T47", "T48", "T49"],
        "archetypes": ["ROUTING", "PROCESSING", "ORCHESTRATION"],
        "keyPatterns": ["idempotency via IScopedMemoryService", "scheduled delay via ISchedulerService", "multi-step resume via completedSteps[]"],
        "crossFlowGate": "UserOnboardingCompleted from T49 triggers FLOW-02",
        "tags": ["plan", "wave-0", "registration", "onboarding", "sequential"],
        "keywords": "registration onboarding plan sequential ROUTING PROCESSING ORCHESTRATION wave-0",
    }
    write(RAG_DIR / "plan-flow01-user-registration-onboarding.json", plan, "plan exemplar")


# ── 4. FLOW DEFINITIONS (3 files) ─────────────────────────────────────────────
# Each is a per-task-type AF pipeline flow graph

def generate_flow_definitions(topology: dict):
    print("\n=== FLOW DEFINITIONS (3) ===")

    task_configs = {
        "T47": {
            "name": "user-registration-initiator",
            "description": "T47 SSOAndEmailAuth — ROUTING archetype. Email uniqueness + SSO path routing + idempotent registration.",
            "archetype": "ROUTING",
            "primaryFabric": "DATABASE",
            "entry": "POST /auth/register or OAuth callback",
        },
        "T48": {
            "name": "email-verification-wait",
            "description": "T48 EmailVerificationWaitState — PROCESSING archetype. Async wait state with 24h TTL via ISchedulerService.",
            "archetype": "PROCESSING",
            "primaryFabric": "DATABASE",
            "entry": "UserRegistrationInitiated event from T47",
        },
        "T49": {
            "name": "onboarding-delivery",
            "description": "T49 OnboardingDelivery — ORCHESTRATION archetype. Multi-step onboarding with resume support.",
            "archetype": "ORCHESTRATION",
            "primaryFabric": "DATABASE",
            "entry": "EmailVerified event from T48",
        },
    }

    for task_id, cfg in task_configs.items():
        # Standard AF pipeline flow graph (n1..n8)
        flow_def = {
            "flowId": FLOW_ID,
            "taskTypeId": task_id,
            "name": f"flow-01-{cfg['name']}",
            "description": cfg["description"],
            "archetype": cfg["archetype"],
            "seededAt": NOW,
            "nodes": [
                {"id": "n1", "type": "validate", "description": "Iron rule validation + DNA compliance check"},
                {"id": "n2", "type": "rag-retrieve", "description": f"Retrieve {cfg['archetype']} arch pattern + service patterns for {task_id}",
                 "params": {"archetype": cfg["archetype"], "taskTypeRef": task_id, "topK": 5}},
                {"id": "n3", "type": "decompose", "description": "Break task into implementation sub-steps using retrieved patterns"},
                {"id": "n4", "type": "ai-generate", "description": f"Generate {cfg['name']}.service.ts via genesis prompt"},
                {"id": "n5", "type": "validate", "description": "Named check validation (provider-keyed checks for this flow)"},
                {"id": "n6", "type": "score", "description": "Score generated code 0-100 against iron rules"},
                {"id": "n7", "type": "route", "description": "Route: score >= 85 → n8 promote, score < 85 → n3 iterate"},
                {"id": "n8", "type": "feedback", "description": "Capture DPO triple: prompt.system, chosen.code, rejected.code, fabricProviders"},
            ],
            "edges": [
                {"from": "n1", "to": "n2"},
                {"from": "n2", "to": "n3"},
                {"from": "n3", "to": "n4"},
                {"from": "n4", "to": "n5"},
                {"from": "n5", "to": "n6"},
                {"from": "n6", "to": "n7"},
                {"from": "n7", "to": "n8", "condition": "score >= 0.85"},
                {"from": "n7", "to": "n3", "condition": "score < 0.85 AND cycles_remaining > 0"},
            ],
            "scoreThreshold": 0.85,
            "maxCycles": 3,
            "entry": cfg["entry"],
            "primaryFabric": cfg["primaryFabric"],
        }
        filename = f"flow-01-{task_id.lower()}.flow.json"
        write(FLOWDEF_DIR / filename, flow_def, f"{task_id} flow definition")


# ── 5. ARBITERS (1 bulk NDJSON file) ─────────────────────────────────────────

def generate_arbiters(state: dict):
    print("\n=== ARBITERS (6) ===")
    bfa = state["artifact_numbers"]["bfa_rules"]

    arbiters = [
        {
            "arbiterId": "arb-flow01-email-uniqueness",
            "flowId": FLOW_ID, "cfId": "CF-1", "seededAt": NOW,
            "name": "EmailUniquenessArbitrator",
            "description": bfa["CF-1"],
            "scope": ["T47"],
            "checkType": "uniqueness",
            "trigger": "BEFORE_STORE",
            "resolution": "Return DataProcessResult.failure('DUPLICATE_EMAIL') without creating record",
            "severity": "CRITICAL",
        },
        {
            "arbiterId": "arb-flow01-registration-idempotency",
            "flowId": FLOW_ID, "cfId": "CF-2", "seededAt": NOW,
            "name": "RegistrationIdempotencyArbitrator",
            "description": bfa["CF-2"],
            "scope": ["T47"],
            "checkType": "idempotency",
            "trigger": "BEFORE_PROCESS",
            "resolution": "setIfAbsent(auth_attempt:<userId>:<correlationId>). Return existing on collision.",
            "severity": "HIGH",
        },
        {
            "arbiterId": "arb-flow01-resend-rate-limit",
            "flowId": FLOW_ID, "cfId": "CF-3", "seededAt": NOW,
            "name": "ResendRateLimitArbitrator",
            "description": bfa["CF-3"],
            "scope": ["T48"],
            "checkType": "rate-limit",
            "trigger": "ON_RESEND_REQUEST",
            "resolution": "Check last_resend_at via IScopedMemoryService. Rate limit value from FREEDOM config.",
            "severity": "HIGH",
        },
        {
            "arbiterId": "arb-flow01-onboarding-completion-gate",
            "flowId": FLOW_ID, "cfId": "CF-4", "seededAt": NOW,
            "name": "OnboardingCompletionGateArbitrator",
            "description": bfa["CF-4"],
            "scope": ["T49"],
            "checkType": "completion-gate",
            "trigger": "BEFORE_EMIT_COMPLETED",
            "resolution": "completedSteps.length must equal requiredSteps.length before UserOnboardingCompleted emits.",
            "severity": "CRITICAL",
        },
        {
            "arbiterId": "arb-flow01-token-revocation-ordering",
            "flowId": FLOW_ID, "cfId": "CF-5", "seededAt": NOW,
            "name": "TokenRevocationOrderingArbitrator",
            "description": bfa["CF-5"],
            "scope": ["T48"],
            "checkType": "ordering",
            "trigger": "ON_EMAIL_CHANGE",
            "resolution": "DNA-8: storeDocument(revoke existing) BEFORE storeDocument(new token).",
            "severity": "CRITICAL",
        },
        {
            "arbiterId": "arb-flow01-no-pii-in-events",
            "flowId": FLOW_ID, "cfId": "CF-8", "seededAt": NOW,
            "name": "NoPiiInEventsArbitrator",
            "description": bfa["CF-8"],
            "scope": ["T47", "T48", "T49"],
            "checkType": "pii-protection",
            "trigger": "BEFORE_ENQUEUE",
            "resolution": "Event payload may contain userId/tokenId/correlationId only. Flag email, password, name, phone as BUILD_FAILURE.",
            "severity": "CRITICAL",
        },
    ]

    # Write as NDJSON bulk file
    lines = []
    for arb in arbiters:
        lines.append(json.dumps({"index": {"_index": "xiigen-arbiters", "_id": arb["arbiterId"]}}))
        lines.append(json.dumps(arb))
        print(f"  ✅ arbiter {arb['arbiterId']}")

    bulk_path = ARBITERS_DIR / "flow-01-arbiters.bulk.ndjson"
    bulk_path.write_text("\n".join(lines) + "\n")
    print(f"  → {bulk_path.relative_to(REPO_ROOT)}")


# ── 6. EVENT SCHEMAS (12 files) ───────────────────────────────────────────────
# 6 exist in contracts/events/FLOW-01/ — copy + adapt them
# 6 are missing — derive from task type definitions

SK419_REQUIRED = ["specversion", "id", "source", "type", "datacontenttype", "time", "traceparent", "tenantId"]

def event_schema(event_type: str, domain: str, data_props: dict, source_service: str) -> dict:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": event_type,
        "description": f"CloudEvent: {event_type}",
        "type": "object",
        "source": "server",
        "required": SK419_REQUIRED,
        "properties": {
            "specversion": {"type": "string", "const": "1.0"},
            "id": {"type": "string", "description": "UUID — unique per event instance"},
            "source": {"type": "string", "const": f"xiigen/{source_service}"},
            "type": {"type": "string", "const": f"xiigen.{domain}.{event_type.lower().replace(' ','-')}.v1"},
            "datacontenttype": {"type": "string", "const": "application/json"},
            "time": {"type": "string", "format": "date-time"},
            "traceparent": {"type": "string"},
            "tenantId": {"type": "string", "description": "Tenant scope — required on every event (DNA-5)"},
            "data": {
                "type": "object",
                "description": f"Event data — no PII (CF-8). userId as reference only.",
                "required": list(data_props.keys()),
                "properties": data_props,
            },
        },
        "additionalProperties": False,
        "seededAt": NOW,
        "flowId": FLOW_ID,
    }

def generate_event_schemas():
    print("\n=== EVENT SCHEMAS (12) ===")

    # Copy and adapt existing 6 from contracts/events/FLOW-01
    existing = list(EXISTING_SCHEMAS.glob("*.schema.json"))
    for schema_file in existing:
        dest = SCHEMAS_DIR / schema_file.name
        data = json.loads(schema_file.read_text())
        # Ensure seededAt + flowId present
        data.setdefault("seededAt", NOW)
        data.setdefault("flowId", FLOW_ID)
        write(dest, data, f"(existing) {schema_file.name}")

    # Generate 6 missing schemas
    missing_schemas = {
        "EmailVerificationTokenIssued": event_schema(
            "EmailVerificationTokenIssued",
            "user-registration",
            {
                "userId": {"type": "string"},
                "tokenId": {"type": "string", "description": "Token reference — NOT the raw token value"},
                "expiresAt": {"type": "string", "format": "date-time"},
                "correlationId": {"type": "string"},
            },
            "email-verification",
        ),
        "EmailVerificationResendRequested": event_schema(
            "EmailVerificationResendRequested",
            "user-registration",
            {
                "userId": {"type": "string"},
                "previousTokenId": {"type": "string"},
                "correlationId": {"type": "string"},
            },
            "email-verification",
        ),
        "UserOnboardingStepCompleted": event_schema(
            "UserOnboardingStepCompleted",
            "user-registration",
            {
                "userId": {"type": "string"},
                "stepId": {"type": "string"},
                "completedSteps": {"type": "array", "items": {"type": "string"}},
                "remainingSteps": {"type": "integer"},
                "correlationId": {"type": "string"},
            },
            "onboarding-delivery",
        ),
        "WorkspaceProvisioningStarted": event_schema(
            "WorkspaceProvisioningStarted",
            "user-registration",
            {
                "userId": {"type": "string"},
                "workspaceId": {"type": "string"},
                "correlationId": {"type": "string"},
            },
            "onboarding-delivery",
        ),
        "UserRegistrationRateLimited": event_schema(
            "UserRegistrationRateLimited",
            "user-registration",
            {
                "correlationId": {"type": "string"},
                "retryAfterSeconds": {"type": "integer"},
            },
            "user-registration-initiator",
        ),
        "EmailChangeRequested": event_schema(
            "EmailChangeRequested",
            "user-registration",
            {
                "userId": {"type": "string"},
                "previousTokenId": {"type": "string"},
                "newTokenId": {"type": "string"},
                "correlationId": {"type": "string"},
            },
            "email-verification",
        ),
    }

    for name, schema in missing_schemas.items():
        filename = f"{name}.schema.json"
        write(SCHEMAS_DIR / filename, schema, f"(derived) {filename}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("FLOW-01 PHASE A FIXTURE GENERATOR")
    print(f"Output: {FIXTURES.relative_to(REPO_ROOT)}/")
    print("=" * 60)

    makedirs()
    state = load_state()
    topology = load_topology()

    generate_contracts(state)
    generate_prompts()
    generate_rag_patterns(state)
    generate_flow_definitions(topology)
    generate_arbiters(state)
    generate_event_schemas()

    # Summary
    total = (
        len(list(CONTRACTS_DIR.glob("*.json"))) +
        len(list(PROMPTS_DIR.glob("t4*.json"))) +
        len(list(RAG_DIR.glob("*.json"))) +
        len(list(FLOWDEF_DIR.glob("*.json"))) +
        len(list(ARBITERS_DIR.glob("*.ndjson"))) +
        len(list(SCHEMAS_DIR.glob("*.json")))
    )
    print(f"\n{'='*60}")
    print(f"DONE. {total} fixture files generated.")
    print(f"  contracts/          {len(list(CONTRACTS_DIR.glob('*.json')))}")
    print(f"  prompts/            {len(list(PROMPTS_DIR.glob('t4*.json')))}")
    print(f"  rag-patterns/       {len(list(RAG_DIR.glob('*.json')))}")
    print(f"  flow-definitions/   {len(list(FLOWDEF_DIR.glob('*.json')))}")
    print(f"  arbiters/           {len(list(ARBITERS_DIR.glob('*.ndjson')))} (bulk file)")
    print(f"  event-schemas/      {len(list(SCHEMAS_DIR.glob('*.json')))}")
    print(f"\nNext: run FLOW-01-INFRASTRUCTURE-GATE.md, then SESSION-A.md")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
