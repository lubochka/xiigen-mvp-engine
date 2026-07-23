# SKILLS FACTORY RAG — FLOW-18 DELTA
## DevOps Platforms / Flow Creation Engine
## Extends: SKILLS_FACTORY_RAG_MERGED.md (SK-1-SK-98)
## Range: SK-99-SK-110 (12 skill patterns)
## Status: FLOW-18 COMPLETE ✅

---

## SKILL PATTERNS — SK-99-SK-110

These patterns are retrieved by AF-4 (RAG Task Context) during flow/step code generation.
Each pattern provides a reusable implementation template for FLOW-18 factory implementations.
All patterns enforce 6 DNA patterns. Language: C# 13 (.NET 9) primary; alternatives noted.

---

### SK-99 — Flow Definition Registry Pattern

```
SKILL: SK-99
NAME: Flow Definition Registry Pattern
RETRIEVED BY: AF-4 for T179, T180, T192, T193
PURPOSE: Dual-store flow definition with ES search + PG lineage

PATTERN (C# 13):

// CORRECT — DNA compliant
public class FlowDefinitionRegistryService(
    IDatabaseService esDb,
    IDatabaseService pgDb,
    IQueueService queue,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<string>> RegisterDefinitionAsync(
        Dictionary<string, object> definitionDoc)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        // DNA-1: ParseDocument — always Dictionary
        var doc = ObjectProcessor.ParseDocument(definitionDoc);
        doc["tenantId"] = tenantId;  // DNA-5

        // Dual write: PG for lineage (atomic)
        var pgResult = await pgDb.StoreDocument("flow_definitions", doc);
        if (!pgResult.Success) return pgResult;

        // ES for search
        var esResult = await esDb.StoreDocument("flow_definition_index", doc);

        // Publish CloudEvent
        await queue.EnqueueAsync("flow.definition.registered", doc);

        return DataProcessResult<string>.Ok(doc["id"].ToString());
    }

    public async Task<DataProcessResult<List<Dictionary<string, object>>>> SearchDefinitionsAsync(
        string? name, string? owner, string? status)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        // DNA-2: BuildSearchFilter skips empty fields
        var filter = BuildSearchFilter(new {
            tenantId,
            name,
            owner,
            status
        });

        return await esDb.SearchDocuments("flow_definition_index", filter);
    }
}

// WRONG — violations:
// - new NpgsqlConnection() [fabric violation]
// - class FlowDefinition { public string Name } [DNA-1 violation]
// - throw Exception("not found") [DNA-3 violation]

ALTERNATIVE (Node.js/TypeScript):
// IDatabaseService.storeDocument() → same interface, different runtime
// MicroserviceBase.buildSearchFilter() → same DNA-2 pattern

RAG TAGS: flow-definition, dual-store, ES+PG, registry, DNA-1, DNA-2, DNA-5
```

---

### SK-100 — Version Compatibility Check Pattern

```
SKILL: SK-100
NAME: Version Compatibility Check Pattern
RETRIEVED BY: AF-4 for T180, T179, T508
PURPOSE: Detect breaking changes between flow versions using ES diff analysis

PATTERN (C# 13):

public class BackwardCompatibilityCheckerService(
    IDatabaseService esDb,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<CompatibilityReport>> CheckCompatibilityAsync(
        string flowId, string fromVersion, string toVersion)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        var filter = BuildSearchFilter(new { tenantId, flowId, version = fromVersion });
        var oldVersionResult = await esDb.SearchDocuments("flow_versions", filter);
        if (!oldVersionResult.Success) return DataProcessResult<CompatibilityReport>.Fail(oldVersionResult.Error);

        var newFilter = BuildSearchFilter(new { tenantId, flowId, version = toVersion });
        var newVersionResult = await esDb.SearchDocuments("flow_versions", newFilter);

        // DNA-1: work with Dictionary, not typed models
        var oldDef = oldVersionResult.Data.First();
        var newDef = newVersionResult.Data.First();

        var breakingChanges = DetectBreakingChanges(oldDef, newDef);

        var report = new Dictionary<string, object> {
            ["tenantId"] = tenantId,
            ["flowId"] = flowId,
            ["fromVersion"] = fromVersion,
            ["toVersion"] = toVersion,
            ["breakingChanges"] = breakingChanges,
            ["isCompatible"] = breakingChanges.Count == 0
        };

        return DataProcessResult<CompatibilityReport>.Ok(ObjectProcessor.ParseDocument(report));
    }

    private List<string> DetectBreakingChanges(
        Dictionary<string,object> oldDef, Dictionary<string,object> newDef)
    {
        var changes = new List<string>();
        var oldSteps = (List<object>)oldDef.GetValueOrDefault("steps", new List<object>());
        var newSteps = (List<object>)newDef.GetValueOrDefault("steps", new List<object>());
        // Detect removed steps, changed required inputs, removed outputs
        // ... (pattern continues)
        return changes;
    }
}

RAG TAGS: compatibility, version-diff, flow-versions, breaking-change, ES-diff
```

---

### SK-101 — Execution Start with Quota Gate Pattern

```
SKILL: SK-101
NAME: Execution Start with Quota Gate Pattern
RETRIEVED BY: AF-4 for T181, T186
PURPOSE: Quota check BEFORE execution record creation — CF-217 enforcement

PATTERN (C# 13):

public class FlowExecutionService(
    IDatabaseService pgDb,
    IQueueService queue,
    ITenantQuotaService quotaService,
    ITraceContextService traceCtx,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<string>> StartExecutionAsync(
        Dictionary<string, object> startRequest)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        // CF-217: quota BEFORE execution create
        var quotaResult = await quotaService.CheckQuotaAsync(tenantId, "concurrent_executions");
        if (!quotaResult.Success)
            return DataProcessResult<string>.Fail("QUOTA_EXCEEDED");

        // Init trace context
        var traceContext = await traceCtx.CreateTraceContextAsync();

        // DNA-1: execution as Dictionary
        var execution = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
            ["tenantId"] = tenantId,  // DNA-5
            ["flowId"] = startRequest["flowId"],
            ["flowVersion"] = startRequest["flowVersion"],
            ["status"] = "CREATED",
            ["traceparent"] = traceContext["traceparent"],
            ["startedAt"] = DateTime.UtcNow
        });

        var storeResult = await pgDb.StoreDocument("flow_executions", execution);
        if (!storeResult.Success) return DataProcessResult<string>.Fail(storeResult.Error);

        // Consume quota slot after record created
        await quotaService.ConsumeQuotaAsync(tenantId, "concurrent_executions");

        // Publish CloudEvent via queue (never HTTP)
        await queue.EnqueueAsync("flow.execution.started", execution);

        return DataProcessResult<string>.Ok(execution["id"].ToString());
    }
}

RAG TAGS: execution-start, quota-gate, trace-context, CF-217, IR-181-1, DNA-5
```

---

### SK-102 — Approval Gate Pattern (Hard Stop)

```
SKILL: SK-102
NAME: Hard Stop Approval Gate Pattern
RETRIEVED BY: AF-4 for T182
PURPOSE: Queue-based approval — no HTTP blocking (DR-69, CF-224)

PATTERN (C# 13):

public class HardStopApprovalService(
    IQueueService queue,
    IDatabaseService pgDb,
    IExecutionAuditService auditService,
    ICloudEventsEnvelopeService cloudEvents,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<string>> RequestApprovalAsync(
        string executionId, string stepKey, Dictionary<string, object> context)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        // Store approval request record (DNA-1)
        var approvalRecord = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
            ["tenantId"] = tenantId,  // DNA-5
            ["executionId"] = executionId,
            ["stepKey"] = stepKey,
            ["status"] = "PENDING",
            ["requestedAt"] = DateTime.UtcNow,
            ["expiresAt"] = DateTime.UtcNow.AddHours(24)
        });

        await pgDb.StoreDocument("approval_records", approvalRecord);
        await auditService.AppendAuditEventAsync(executionId, "HardStopEntered", approvalRecord);

        // Publish via QUEUE FABRIC — never block HTTP (DR-69)
        var cloudEvent = await cloudEvents.WrapEventAsync("flow.hardstop.entered", approvalRecord);
        await queue.EnqueueAsync("approval_requests", cloudEvent);

        // DNA-3: return DataProcessResult — not throw
        return DataProcessResult<string>.Ok(approvalRecord["id"].ToString());
    }

    // Approver calls this via API → publishes to queue → orchestrator resumes
    public async Task<DataProcessResult<bool>> SubmitApprovalDecisionAsync(
        string approvalId, bool approved, string approverId)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        // CF-219: validate approver belongs to tenant
        // (validation delegated to F485 ITenantConfigService)

        var decision = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
            ["tenantId"] = tenantId,
            ["approvalId"] = approvalId,
            ["approved"] = approved,
            ["approverId"] = approverId,
            ["decidedAt"] = DateTime.UtcNow
        });

        await pgDb.StoreDocument("approval_decisions", decision);
        var cloudEvent = await cloudEvents.WrapEventAsync(
            approved ? "flow.hardstop.approved" : "flow.hardstop.rejected", decision);
        await queue.EnqueueAsync("approval_decisions", cloudEvent);

        return DataProcessResult<bool>.Ok(true);
    }
}

RAG TAGS: hard-stop, approval-gate, queue-based, CF-224, DR-69, IR-182-2, CloudEvents
```

---

### SK-103 — Fan-Out Dispatch with Checkpoint Pattern

```
SKILL: SK-103
NAME: Fan-Out Dispatch with Checkpoint Pattern
RETRIEVED BY: AF-4 for T183, T191
PURPOSE: Checkpoint BEFORE each dispatch — DR-67, CF-226

PATTERN (C# 13):

public class StepFanOutCoordinator(
    IStepExecutionService stepSvc,
    IExecutionStateService stateService,
    IStepDispatcherService dispatcher,
    IIdempotencyService idempotency,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<List<string>>> DispatchParallelStepsAsync(
        string executionId, List<Dictionary<string, object>> stepDefs)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();
        var dispatchedIds = new List<string>();

        foreach (var stepDef in stepDefs)
        {
            var stepKey = stepDef["stepKey"].ToString();
            var idempotencyKey = $"{executionId}:{stepKey}:{Guid.NewGuid()}";

            // Check idempotency before any action
            var dedupResult = await idempotency.CheckIdempotencyKeyAsync(idempotencyKey);
            if (dedupResult.Success) { dispatchedIds.Add(dedupResult.Data.ToString()); continue; }

            // Register key
            await idempotency.RegisterIdempotencyKeyAsync(idempotencyKey);

            // Create step execution record
            var stepExec = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
                ["tenantId"] = tenantId,  // DNA-5
                ["executionId"] = executionId,
                ["stepKey"] = stepKey,
                ["status"] = "PENDING"
            });
            await stepSvc.CreateStepExecutionAsync(stepExec);

            // DR-67: CHECKPOINT BEFORE DISPATCH
            await stateService.SaveCheckpointAsync(executionId, stepExec);

            // Dispatch via QUEUE FABRIC only
            await dispatcher.DispatchStepAsync(stepExec);

            dispatchedIds.Add(stepExec["id"].ToString());
        }

        return DataProcessResult<List<string>>.Ok(dispatchedIds);
    }
}

RAG TAGS: fan-out, checkpoint-before-dispatch, idempotency, DR-67, CF-226, IR-183-1
```

---

### SK-104 — Durable Retry Saga Pattern

```
SKILL: SK-104
NAME: Durable Retry Saga Pattern
RETRIEVED BY: AF-4 for T185
PURPOSE: Bounded retry with idempotency — CF-227, IR-185-1

PATTERN (C# 13):

public class StepRetrySaga(
    IStepExecutionService stepSvc,
    IRetrySchedulerService retrySvc,
    IIdempotencyService idempotency,
    IStepDispatcherService dispatcher,
    IExecutionAuditService audit,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<bool>> HandleStepFailureAsync(
        Dictionary<string, object> stepExecution, string errorCode)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();
        var attempt = (int)stepExecution.GetValueOrDefault("attempt", 1);
        var maxAttempts = GetMaxAttemptsFromPolicy(stepExecution);

        if (attempt >= maxAttempts)
        {
            // Escalate to DLQ
            await audit.AppendAuditEventAsync(
                stepExecution["executionId"].ToString(), "StepDLQEscalation", stepExecution);
            await dispatcher.RequeueStepAsync(stepExecution, queue: "dlq");
            return DataProcessResult<bool>.Ok(false); // DNA-3: no throw
        }

        // IR-185-1: idempotency BEFORE retry dispatch
        var retryKey = $"retry:{stepExecution["id"]}:{attempt + 1}";
        var existingResult = await idempotency.CheckIdempotencyKeyAsync(retryKey);
        if (existingResult.Success) return DataProcessResult<bool>.Ok(true); // already scheduled

        await idempotency.RegisterIdempotencyKeyAsync(retryKey);

        // Calculate backoff with jitter
        var backoffMs = CalculateExponentialBackoff(attempt) + Random.Shared.Next(0, 1000);

        var retryDoc = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
            ["tenantId"] = tenantId,
            ["stepExecutionId"] = stepExecution["id"],
            ["attempt"] = attempt + 1,
            ["retryAt"] = DateTime.UtcNow.AddMilliseconds(backoffMs),
            ["idempotencyKey"] = retryKey
        });

        await retrySvc.ScheduleRetryAsync(retryDoc);
        return DataProcessResult<bool>.Ok(true);
    }
}

RAG TAGS: retry-saga, DLQ, idempotency-before-retry, exponential-backoff, CF-227, IR-185-1
```

---

### SK-105 — Webhook Ingestion with HMAC Dedup Pattern

```
SKILL: SK-105
NAME: Webhook Ingestion with HMAC Dedup Pattern
RETRIEVED BY: AF-4 for T186
PURPOSE: HMAC first, dedup second — CF-229, IR-186-1

PATTERN (C# 13):

public class WebhookSourceService(
    IQueueService queue,
    IDatabaseService redisDb,
    IIdempotencyService idempotency,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<bool>> ReceiveWebhookAsync(
        string tenantId, string endpointId, string payload, string hmacSignature)
    {
        // CF-229, IR-186-1: HMAC FIRST — always
        var hmacResult = await VerifyHmacAsync(tenantId, endpointId, payload, hmacSignature);
        if (!hmacResult.Success)
            return DataProcessResult<bool>.Fail("HMAC_INVALID"); // DNA-3: no throw

        // Dedup via idempotency service
        var dedupeKey = $"webhook:{tenantId}:{endpointId}:{ComputePayloadHash(payload)}";
        var existingResult = await idempotency.CheckIdempotencyKeyAsync(dedupeKey);
        if (existingResult.Success) return DataProcessResult<bool>.Ok(true); // already processed

        await idempotency.RegisterIdempotencyKeyAsync(dedupeKey);

        // Publish to queue for trigger matching
        var webhookEvent = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
            ["tenantId"] = tenantId,  // DNA-5: never from payload (IR-186-4)
            ["endpointId"] = endpointId,
            ["payload"] = payload,
            ["receivedAt"] = DateTime.UtcNow
        });

        await queue.EnqueueAsync("webhook_events", webhookEvent);
        return DataProcessResult<bool>.Ok(true);
    }
}

RAG TAGS: webhook, HMAC-first, dedup, CF-229, IR-186-1, IR-186-4, DNA-5
```

---

### SK-106 — Multi-Tenant Provisioning Pattern

```
SKILL: SK-106
NAME: Multi-Tenant Provisioning with RLS Pattern
RETRIEVED BY: AF-4 for T187
PURPOSE: Atomic provision + RLS enable — CF-220, IR-187-1

PATTERN (C# 13):

public class TenantProvisioningOrchestrator(
    ITenantRegistryService registry,
    ITenantRowLevelSecurityService rls,
    ITenantConfigService config,
    ITenantQuotaService quota,
    ITenantFeatureFlagService flags,
    IQueueService queue
) : MicroserviceBase
{
    public async Task<DataProcessResult<string>> ProvisionTenantAsync(
        Dictionary<string, object> tenantRequest)
    {
        string? tenantId = null;
        try
        {
            // Step 1: Create tenant record (generates tenantId)
            var tenantDoc = ObjectProcessor.ParseDocument(tenantRequest);
            var registryResult = await registry.ProvisionTenantAsync(tenantDoc);
            if (!registryResult.Success) return registryResult;
            tenantId = registryResult.Data;

            // Step 2: IR-187-1 — RLS BEFORE ANY DATA
            var rlsResult = await rls.EnableRlsAsync(tenantId);
            if (!rlsResult.Success) goto Rollback;

            var policyResult = await rls.CreateTenantPolicyAsync(tenantId);
            if (!policyResult.Success) goto Rollback;

            // Step 3: Seed config, quota, flags
            await config.SetConfigAsync(tenantId, GetDefaultConfig(tenantDoc));
            await quota.ResetQuotaAsync(tenantId, GetDefaultQuotas(tenantDoc));
            await flags.SetFlagAsync(tenantId, GetDefaultFlags(tenantDoc));

            // Publish provisioned event
            var tenantDocFull = ObjectProcessor.ParseDocument(new Dictionary<string, object> {
                ["tenantId"] = tenantId, ["status"] = "ACTIVE"
            });
            await queue.EnqueueAsync("tenant.provisioned", tenantDocFull);

            return DataProcessResult<string>.Ok(tenantId);

        Rollback:
            if (tenantId != null) await registry.SuspendTenantAsync(tenantId);
            return DataProcessResult<string>.Fail("PROVISION_ROLLBACK");
        }
        catch (Exception ex)
        {
            // DNA-3: catch and return, never rethrow for business logic
            if (tenantId != null) await registry.SuspendTenantAsync(tenantId);
            return DataProcessResult<string>.Fail(ex.Message);
        }
    }
}

RAG TAGS: tenant-provisioning, RLS-before-data, atomic-provision, rollback, CF-220, IR-187-1
```

---

### SK-107 — Schema Migration Expand/Migrate/Contract Pattern

```
SKILL: SK-107
NAME: Schema Migration Expand/Migrate/Contract Pattern
RETRIEVED BY: AF-4 for T188
PURPOSE: Safe schema migration with feature flag gating — DD-96, CF-222

PATTERN (pseudo-code — actual SQL + C# orchestration):

// EXPAND PHASE: additive only
ALTER TABLE flow_executions ADD COLUMN tenant_id UUID NULL;
CREATE INDEX CONCURRENTLY idx_flow_executions_tenant ON flow_executions(tenant_id);

// MIGRATE PHASE: backfill + dual-write enabled via feature flag
UPDATE flow_executions SET tenant_id = 'default-tenant-id' WHERE tenant_id IS NULL;
-- Application writes to both old path and new path (dual-write enabled)

// CONTRACT PHASE: only after feature flag EXPAND_COMPLETE = true
-- Feature flag gate: F492.IsEnabledAsync("schema_migration_contract_phase")
ALTER TABLE flow_executions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE flow_executions ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON flow_executions USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Invariant validation (ST-111)
SELECT COUNT(*) FROM flow_executions WHERE tenant_id IS NULL; -- must return 0

RAG TAGS: schema-migration, expand-migrate-contract, RLS, feature-flag, DD-96, CF-222, ST-111
```

---

### SK-108 — SAML/OIDC Federation Pattern

```
SKILL: SK-108
NAME: Identity Federation Pattern (SAML + OIDC)
RETRIEVED BY: AF-4 for T189
PURPOSE: Per-tenant IdP federation — always test before enable

PATTERN (C# 13, abbreviated):

public class SamlFederationService(
    IDatabaseService pgDb,
    ITenantConfigService configSvc,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<bool>> RegisterIdpMetadataAsync(
        string tenantId, Dictionary<string, object> idpMetadata)
    {
        // Validate metadata structure first
        var validationResult = ValidateSamlMetadata(idpMetadata);
        if (!validationResult.Success) return DataProcessResult<bool>.Fail(validationResult.Error);

        // Store metadata (DNA-1: Dictionary, not typed IdpConfig)
        var metaDoc = ObjectProcessor.ParseDocument(idpMetadata);
        metaDoc["tenantId"] = tenantId;  // DNA-5
        metaDoc["status"] = "TESTING";   // Test before ACTIVE

        await pgDb.StoreDocument("idp_metadata", metaDoc);

        // Config persisted but NOT active yet — requires test assertion first (IR-189-1)
        return DataProcessResult<bool>.Ok(true);
    }

    public async Task<DataProcessResult<bool>> EnableSsoAsync(string tenantId)
    {
        // Only enable if test assertion succeeded (IR-189-1)
        var filter = BuildSearchFilter(new { tenantId, status = "TEST_PASSED" });
        var metaResult = await pgDb.SearchDocuments("idp_metadata", filter);
        if (!metaResult.Success || !metaResult.Data.Any())
            return DataProcessResult<bool>.Fail("TEST_ASSERTION_REQUIRED");

        await configSvc.SetConfigAsync(tenantId, new Dictionary<string,object> { ["ssoEnabled"] = true });
        return DataProcessResult<bool>.Ok(true);
    }
}

RAG TAGS: SAML, OIDC, SSO, per-tenant, test-before-enable, IR-189-1, CF-225
```

---

### SK-109 — DevOps Bridge Connector Pattern

```
SKILL: SK-109
NAME: DevOps Bridge Connector Pattern (CORE FABRIC HTTP)
RETRIEVED BY: AF-4 for T190
PURPOSE: External CI/CD via CORE FABRIC — DR-73, CF-228

PATTERN (C# 13):

// CORRECT: CORE FABRIC HTTP — no SDK imports
public class JenkinsConnectorService(
    IHttpClientFactory httpFactory,  // ← CORE FABRIC provides this via MicroserviceBase
    ICredentialResolverService credentialSvc,
    IExecutionAuditService audit,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<string>> TriggerBuildAsync(
        string tenantId, string connectorId, Dictionary<string, object> buildParams)
    {
        // Never use raw credentials — always resolve via F480
        var credResult = await credentialSvc.ResolveCredentialAsync(tenantId, connectorId);
        if (!credResult.Success) return DataProcessResult<string>.Fail(credResult.Error);

        var client = httpFactory.CreateClient("jenkins"); // CORE FABRIC HTTP
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {credResult.Data}");

        // Build params as Dictionary (DNA-1)
        var payload = ObjectProcessor.ParseDocument(buildParams);
        var response = await client.PostAsJsonAsync("/job/build", payload);

        // Audit every external call
        await audit.AppendAuditEventAsync(
            buildParams.GetValueOrDefault("executionId", "").ToString(),
            "JenkinsBuildTriggered",
            ObjectProcessor.ParseDocument(new Dictionary<string, object> {
                ["tenantId"] = tenantId,
                ["connectorId"] = connectorId,
                ["statusCode"] = (int)response.StatusCode
            }));

        return DataProcessResult<string>.Ok(response.Headers.Location?.ToString() ?? "");
    }
}

// WRONG:
// using Jenkins.Client; ← DR-73 violation, CF-228
// var jenkins = new JenkinsClient(url, user, pass); ← direct provider import

RAG TAGS: DevOps-bridge, CORE-FABRIC-HTTP, no-SDK, credential-resolver, DR-73, CF-228, IR-190-1
```

---

### SK-110 — AI Blueprint Generation with Promotion Ladder

```
SKILL: SK-110
NAME: AI Blueprint Generation with Promotion Ladder Pattern
RETRIEVED BY: AF-4 for T192, T193
PURPOSE: Multi-model blueprint generation → GENERATED tier entry — DR-72, CF-230

PATTERN (C# 13):

public class FlowBlueprintGeneratorService(
    IAiProvider aiProvider,       // ← AI ENGINE FABRIC
    IRagService ragService,       // ← RAG FABRIC
    IFlowSchemaValidatorService schemaValidator,
    IFlowDefinitionRegistryService registry,
    ITenantContextMiddlewareService tenantCtx
) : MicroserviceBase
{
    public async Task<DataProcessResult<string>> GenerateBlueprintAsync(
        string intent, Dictionary<string, object> context)
    {
        var tenantId = await tenantCtx.GetCurrentTenantIdAsync();

        // AF-4: RAG retrieval first (Hybrid strategy)
        var ragResult = await ragService.SearchAsync(intent, strategy: "hybrid");
        var patterns = ragResult.Data;

        // AF-5: Multi-model — parallel generation
        var prompt = BuildBlueprintPrompt(intent, patterns, context);
        var generationTasks = new[]
        {
            aiProvider.GenerateAsync(prompt, model: "claude"),
            aiProvider.GenerateAsync(prompt, model: "gpt-4")
        };
        var results = await Task.WhenAll(generationTasks);

        // AF-10: Merge/consensus
        var mergedBlueprint = MergeBlueprints(results.Select(r => r.Data).ToList());

        // DNA-1: blueprint as Dictionary
        var blueprintDoc = ObjectProcessor.ParseDocument(mergedBlueprint);
        blueprintDoc["tenantId"] = tenantId;  // DNA-5
        blueprintDoc["tier"] = "GENERATED";    // DR-72: always enter at GENERATED
        blueprintDoc["promotionStatus"] = "AWAITING_REVIEW";

        // Schema validation before storage
        var validationResult = await schemaValidator.ValidateDefinitionAsync(blueprintDoc);
        if (!validationResult.Success) return DataProcessResult<string>.Fail(validationResult.Error);

        // Store as DRAFT (not ACTIVE — promotion ladder)
        var storeResult = await registry.RegisterDefinitionAsync(blueprintDoc);
        return storeResult;
    }
}

RAG TAGS: AI-blueprint, multi-model, RAG-hybrid, promotion-ladder, GENERATED-tier, DR-72, CF-230
```

---

## SKILL-TO-TASK-TYPE MATRIX

| Skill | Primary Task Type | Secondary |
|-------|------------------|-----------|
| SK-99 Flow Definition Registry | T179, T192 | T180, T193 |
| SK-100 Version Compatibility Check | T180 | T179 |
| SK-101 Execution Start with Quota Gate | T181 | T186 |
| SK-102 Approval Gate (Hard Stop) | T182 | T190 |
| SK-103 Fan-Out Dispatch with Checkpoint | T183 | T191 |
| SK-104 Durable Retry Saga | T185 | T188 |
| SK-105 Webhook Ingestion with HMAC | T186 | — |
| SK-106 Multi-Tenant Provisioning | T187 | T189 |
| SK-107 Schema Migration Expand/Contract | T188 | — |
| SK-108 SAML/OIDC Federation | T189 | — |
| SK-109 DevOps Bridge Connector | T190 | T191 |
| SK-110 AI Blueprint Generation | T192 | T193 |

---
## SAVE POINT: FLOW18:SKILLS_FACTORY_RAG ✅
## Next: FLOW18_MASTER_EXECUTION_PLAN.md + FLOW18_SESSION_STATE.md
## Recovery: "Load FLOW18 skills — SK-99-SK-110, AF-4 RAG patterns"
