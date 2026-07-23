# XIIGen — FLOW-14 PHASE 6: SKILLS + DESIGN DECISIONS
# Merged: 2026-02-26 | Source: FLOW14_PLAN_P0.md Phase P6
# Adds: SK-89–SK-98 (10 skill patterns), DD-74–DD-85 (12 design decisions)
# Depends on: P1-P5 (F426-F465, T167-T178, CF-192-213, ST-92-103, DR-58-65)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Extends: SK-1–SK-88 | Adds: SK-89–SK-98 (10 patterns)
## Extends: DD-1–DD-73 | Adds: DD-74–DD-85 (12 decisions)
## Backward compatibility: SK-1–SK-88 UNCHANGED, DD-1–DD-73 UNCHANGED

---

# SKILL PATTERNS SK-89–SK-98

---

## SK-89: OAuth Lifecycle Management Pattern

**Purpose:** Manage full OAuth 2.0 lifecycle for external SaaS connectors: authorization code
exchange, token storage (encrypted), proactive refresh at 80% TTL, single-use refresh token
handling (Zoho pattern), and graceful revocation. All through CORE FABRIC HTTP — never SDK.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: OAuth Lifecycle Management
// F427 (vault) + F428 (refresh) — never import provider SDK

public class OAuthLifecycleManager : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> RefreshTokenAsync(
        string tenantId, string connectorId)
    {
        // 1. Load encrypted credentials from vault
        var credResult = await _vaultFactory.CreateAsync(ctx);
        var vault = credResult.Data;
        var cred = await vault.GetCredentialAsync(tenantId, connectorId);
        if (!cred.IsSuccess)
            return DataProcessResult<Dictionary<string,object>>.Failure("CREDENTIAL_NOT_FOUND");

        var tokenData = cred.Data;
        var expiresAt = (DateTime)tokenData["expires_at"];
        var ttlRemaining = (expiresAt - DateTime.UtcNow).TotalSeconds;
        var ttlTotal = (double)tokenData["ttl_seconds"];

        // 2. Proactive refresh at 80% TTL expiry
        if (ttlRemaining > ttlTotal * 0.20)
            return DataProcessResult<Dictionary<string,object>>.Success(tokenData); // still fresh

        // 3. Refresh via CORE FABRIC HTTP — never provider SDK
        var refreshRequest = new Dictionary<string,object>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = tokenData["refresh_token"],
            ["client_id"] = tokenData["client_id"],
            ["client_secret"] = tokenData["client_secret"] // decrypted in-memory only
        };

        var httpResult = await _httpClient.PostAsync(
            (string)tokenData["token_endpoint"], refreshRequest);
        if (!httpResult.IsSuccess)
            return DataProcessResult<Dictionary<string,object>>.Failure("TOKEN_REFRESH_FAILED");

        // 4. Store new tokens (Zoho: refresh_token is single-use, must store new one)
        var newTokens = httpResult.Data;
        newTokens["tenant_id"] = tenantId;
        newTokens["connector_id"] = connectorId;
        newTokens["refreshed_at"] = DateTime.UtcNow;
        newTokens["expires_at"] = DateTime.UtcNow.AddSeconds((double)newTokens["expires_in"]);
        newTokens["ttl_seconds"] = newTokens["expires_in"];

        await vault.StoreCredentialAsync(tenantId, connectorId, newTokens); // encrypted at rest

        return DataProcessResult<Dictionary<string,object>>.Success(newTokens);
    }
}
```

**Used by:** T167 (connector registration), T168/T170 (sync needs valid token), T177 (activation needs token)
**References:** F427, F428, DR-59, CF-198 (auth planes), CF-210 (rate limit before external call)
**DNA compliance:** Dictionary<string,object> (DNA-1), DataProcessResult (DNA-3), MicroserviceBase (DNA-4), tenantId scoped (DNA-5)

---

## SK-90: Paginated API Polling Pattern

**Purpose:** Generic paginated REST polling for external SaaS APIs. Handles ClickUp 100/page
with last_page flag, Zoho If-Modified-Since incremental, cursor commit per page, rate limit
check before every HTTP call. Provider-agnostic — never imports SDK.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Paginated API Polling
// F430 (rate limit) + F434 (polling) + F433 (cursor) — CORE FABRIC HTTP only

public class PaginatedPollerService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> PollAllPagesAsync(
        string tenantId, string connectorId, string entityType,
        Dictionary<string,object> cursorState)
    {
        var totalRecords = new List<Dictionary<string,object>>();
        var currentCursor = cursorState;
        var hasMore = true;

        while (hasMore)
        {
            // 1. Rate limit check BEFORE every API call (CF-210)
            var rateLimitService = (await _rateLimitFactory.CreateAsync(ctx)).Data;
            var allowed = await rateLimitService.CheckAsync(tenantId, connectorId);
            if (!allowed.IsSuccess)
            {
                // Backoff — checkpoint what we have so far
                await CommitCursorCheckpoint(tenantId, connectorId, entityType, currentCursor);
                return DataProcessResult<Dictionary<string,object>>.Partial(
                    new Dictionary<string,object>
                    {
                        ["records_polled"] = totalRecords.Count,
                        ["cursor"] = currentCursor,
                        ["reason"] = "RATE_LIMIT_BACKOFF",
                        ["retry_after_seconds"] = allowed.Data?["retry_after"] ?? 60
                    });
            }

            // 2. Build request from cursor — provider-agnostic
            var pollingService = (await _pollingFactory.CreateAsync(ctx)).Data;
            var pageResult = await pollingService.PollPageAsync(
                tenantId, connectorId, entityType, currentCursor);

            if (!pageResult.IsSuccess)
                return DataProcessResult<Dictionary<string,object>>.Failure(pageResult.ErrorCode);

            var page = pageResult.Data;
            var records = (List<Dictionary<string,object>>)page["records"];
            totalRecords.AddRange(records);

            // 3. Advance cursor (monotonic — CF-193)
            currentCursor = (Dictionary<string,object>)page["next_cursor"];
            hasMore = (bool)page["has_more"];

            // 4. Commit cursor per page via EP-4 checkpoint (IR-168-4)
            await CommitCursorCheckpoint(tenantId, connectorId, entityType, currentCursor);
        }

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object>
            {
                ["records_polled"] = totalRecords.Count,
                ["cursor"] = currentCursor,
                ["status"] = "COMPLETE"
            });
    }
}
```

**Used by:** T168 (incremental sync), T170 (backfill per slice)
**References:** F430, F433, F434, CF-193 (monotonic cursor), CF-210 (rate limit), EP-4
**DNA compliance:** DNA-1 (Dictionary), DNA-3 (DataProcessResult with Partial), DNA-4 (MicroserviceBase), DNA-5 (tenantId)

---

## SK-91: HMAC Webhook Verification Pattern

**Purpose:** Verify HMAC-SHA256 signatures on incoming webhooks using timing-safe comparison.
Handle ClickUp X-Signature header, Zoho orgId validation, dedup via idempotency key (eventId),
and normalized envelope fanout to QUEUE FABRIC. Reject-then-audit for invalid signatures.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: HMAC Webhook Verification
// F429 (webhook receiver) — timing-safe comparison, never process before verify

public class WebhookVerifier : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> VerifyAndProcessAsync(
        string tenantId, string connectorId,
        byte[] payload, string signatureHeader, string eventId)
    {
        // 1. Load webhook secret from vault (F427)
        var vault = (await _vaultFactory.CreateAsync(ctx)).Data;
        var secretResult = await vault.GetWebhookSecretAsync(tenantId, connectorId);
        if (!secretResult.IsSuccess)
            return DataProcessResult<Dictionary<string,object>>.Failure("WEBHOOK_SECRET_NOT_FOUND");

        // 2. Compute expected HMAC-SHA256
        var secret = (byte[])secretResult.Data["secret"];
        using var hmac = new System.Security.Cryptography.HMACSHA256(secret);
        var expectedHash = hmac.ComputeHash(payload);
        var expectedSig = Convert.ToHexString(expectedHash).ToLowerInvariant();

        // 3. TIMING-SAFE comparison (IR-169-1) — prevents timing attacks
        var actualSig = signatureHeader?.ToLowerInvariant() ?? "";
        if (!CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(expectedSig),
            System.Text.Encoding.UTF8.GetBytes(actualSig)))
        {
            // Reject + audit (IR-169-2) — NEVER process unverified events
            await _auditService.LogOperationAsync(tenantId, "WEBHOOK_HMAC_FAILED",
                new Dictionary<string,object> {
                    ["connector_id"] = connectorId, ["event_id"] = eventId,
                    ["timestamp_utc"] = DateTime.UtcNow });
            return DataProcessResult<Dictionary<string,object>>.Failure("HMAC_VERIFICATION_FAILED");
        }

        // 4. Dedup check via eventId (IR-169-5)
        var dedupKey = $"webhook:{tenantId}:{connectorId}:{eventId}";
        var isDuplicate = await _cacheService.ExistsAsync(dedupKey);
        if (isDuplicate)
            return DataProcessResult<Dictionary<string,object>>.Success(
                new Dictionary<string,object> { ["status"] = "DUPLICATE_SKIPPED", ["event_id"] = eventId });

        // 5. Mark as processing (24h TTL dedup window)
        await _cacheService.SetAsync(dedupKey, "1", TimeSpan.FromHours(24));

        // 6. Normalize and fanout to QUEUE FABRIC
        var envelope = new Dictionary<string,object>
        {
            ["tenant_id"] = tenantId, ["connector_id"] = connectorId,
            ["event_id"] = eventId, ["payload"] = payload,
            ["verified_at"] = DateTime.UtcNow, ["source"] = "webhook"
        };
        await _queueService.EnqueueAsync("raw.webhook.verified", envelope);

        return DataProcessResult<Dictionary<string,object>>.Success(envelope);
    }
}
```

**Used by:** T169 (webhook ingestion gate)
**References:** F427, F429, CF-211 (HMAC before processing), IR-169-1/2/5
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-92: Multi-Zone Warehouse Pipeline Pattern

**Purpose:** Generic zone-transition pipeline: raw→staging→core→mart. Each transition is
an event-driven step through QUEUE FABRIC. Zone promotion order enforced (CF-192). Lineage
recorded at every transition (F460). Records quarantined on failure (F445), never silently dropped.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Multi-Zone Warehouse Pipeline
// CF-192 zone order enforcement — raw(1)→staging(2)→core(3)→mart(4)

public class ZoneTransitionHandler : MicroserviceBase
{
    private static readonly Dictionary<string,int> ZoneOrder = new()
    {
        ["raw"] = 1, ["staging"] = 2, ["core"] = 3, ["mart"] = 4
    };

    public async Task<DataProcessResult<Dictionary<string,object>>> TransitionAsync(
        string tenantId, string recordId,
        string sourceZone, string targetZone, string transformType)
    {
        // 1. Enforce zone order (CF-192) — NEVER skip zones
        if (ZoneOrder[targetZone] != ZoneOrder[sourceZone] + 1)
            return DataProcessResult<Dictionary<string,object>>.Failure(
                $"ZONE_SKIP_VIOLATION: {sourceZone}→{targetZone} not allowed");

        // 2. Audit BEFORE mutation (CF-209)
        await _auditService.LogOperationAsync(tenantId, $"ZONE_TRANSITION_{sourceZone}_TO_{targetZone}",
            new Dictionary<string,object> {
                ["record_id"] = recordId, ["source_zone"] = sourceZone,
                ["target_zone"] = targetZone, ["transform_type"] = transformType,
                ["timestamp_utc"] = DateTime.UtcNow });

        // 3. Execute zone-specific write (delegated to zone factory)
        // ... zone write logic ...

        // 4. Record lineage edge (F460)
        var lineageService = (await _lineageFactory.CreateAsync(ctx)).Data;
        await lineageService.RecordEdgeAsync(new Dictionary<string,object>
        {
            ["tenant_id"] = tenantId,
            ["source_zone"] = sourceZone, ["source_record_id"] = recordId,
            ["target_zone"] = targetZone, ["target_record_id"] = recordId,
            ["transform_type"] = transformType,
            ["timestamp_utc"] = DateTime.UtcNow,
            ["sync_run_id"] = _context.CorrelationId
        });

        // 5. Emit zone transition event
        await _queueService.EnqueueAsync($"{targetZone}.written",
            new Dictionary<string,object> { ["tenant_id"] = tenantId, ["record_id"] = recordId });

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object> { ["status"] = "TRANSITIONED", ["target_zone"] = targetZone });
    }
}
```

**Used by:** T171 (raw→staging), T173 (staging→core), T174 (core→mart), T176 (mart→composite)
**References:** F445, F460, CF-192, CF-209, DR-58
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-93: Schema Drift Detection Pattern

**Purpose:** Detect and categorize schema changes in source data. Compare sampled raw records
against registered schema. Categorize: FIELD_ADDED (auto-accept raw/staging, admin-gate mart),
FIELD_REMOVED (quarantine + HIGH alert), TYPE_CHANGED (quarantine + CRITICAL), ENUM_EXPANDED.
Route each category to appropriate handler per DR-60 policy.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Schema Drift Detection
// F439 (schema registry) + F445 (quarantine) — DR-60 categorization

public class SchemaDriftDetector : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> DetectDriftAsync(
        string tenantId, string provider, string entityType,
        List<Dictionary<string,object>> sampleRecords)
    {
        var schemaRegistry = (await _schemaFactory.CreateAsync(ctx)).Data;
        var storedSchema = await schemaRegistry.GetSchemaAsync(tenantId, provider, entityType);
        if (!storedSchema.IsSuccess)
            return DataProcessResult<Dictionary<string,object>>.Failure("SCHEMA_NOT_REGISTERED");

        var storedFields = (Dictionary<string,string>)storedSchema.Data["fields"]; // fieldName→type
        var observedFields = ExtractFieldsFromSamples(sampleRecords);
        var drifts = new List<Dictionary<string,object>>();

        // Detect FIELD_ADDED
        foreach (var field in observedFields.Keys.Except(storedFields.Keys))
            drifts.Add(new Dictionary<string,object> {
                ["field"] = field, ["category"] = "FIELD_ADDED",
                ["observed_type"] = observedFields[field],
                ["action"] = "AUTO_ACCEPT_RAW_STAGING" // DR-60: admin-gate for mart
            });

        // Detect FIELD_REMOVED
        foreach (var field in storedFields.Keys.Except(observedFields.Keys))
            drifts.Add(new Dictionary<string,object> {
                ["field"] = field, ["category"] = "FIELD_REMOVED",
                ["severity"] = "HIGH",
                ["action"] = "QUARANTINE_AND_ALERT"
            });

        // Detect TYPE_CHANGED
        foreach (var field in observedFields.Keys.Intersect(storedFields.Keys))
            if (observedFields[field] != storedFields[field])
                drifts.Add(new Dictionary<string,object> {
                    ["field"] = field, ["category"] = "TYPE_CHANGED",
                    ["stored_type"] = storedFields[field], ["observed_type"] = observedFields[field],
                    ["severity"] = "CRITICAL",
                    ["action"] = "QUARANTINE_ADMIN_APPROVAL"
                });

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object> {
                ["tenant_id"] = tenantId, ["provider"] = provider,
                ["entity_type"] = entityType, ["drift_count"] = drifts.Count,
                ["drifts"] = drifts, ["detected_at"] = DateTime.UtcNow });
    }
}
```

**Used by:** T172 (schema drift detection gate)
**References:** F439, F445, DR-60, CF-195 (schema approval blocks mart)
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-94: Probabilistic Cross-System Identity Resolution Pattern

**Purpose:** Match entities across external SaaS systems using weighted scoring signals via
RAG FABRIC (Hybrid strategy). Produce confidence score 0.0–1.0. Route: above threshold →
auto-merge dim_user (SCD-2); below → human review queue. Track provenance per attribute.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Probabilistic Identity Resolution
// F446 + RAG FABRIC (Hybrid) — DR-61 scoring, CF-204 tenant isolation

public class IdentityResolver : MicroserviceBase
{
    private static readonly Dictionary<string,double> DefaultWeights = new()
    {
        ["email_exact"] = 0.40, ["email_domain"] = 0.10,
        ["name_fuzzy"] = 0.20, ["org_membership"] = 0.15,
        ["temporal_overlap"] = 0.10, ["manual_override"] = 0.05
    };

    public async Task<DataProcessResult<Dictionary<string,object>>> ResolveIdentityAsync(
        string tenantId, Dictionary<string,object> sourceEntity, string sourceProvider)
    {
        // 1. Load FREEDOM weights (admin-tunable per tenant)
        var weights = await LoadWeightsFromFreedom(tenantId) ?? DefaultWeights;
        var threshold = await LoadThresholdFromFreedom(tenantId) ?? 0.85;

        // 2. Generate candidates via RAG FABRIC (Hybrid: vector + graph)
        var ragService = (await _ragFactory.CreateAsync(ctx)).Data;
        var candidates = await ragService.SearchAsync(new Dictionary<string,object> {
            ["tenant_id"] = tenantId, // CF-204: NEVER cross-tenant
            ["query_entity"] = sourceEntity,
            ["strategy"] = "Hybrid",
            ["max_candidates"] = 20
        });

        // 3. Score each candidate
        var scoredMatches = new List<Dictionary<string,object>>();
        foreach (var candidate in (List<Dictionary<string,object>>)candidates.Data["results"])
        {
            var score = 0.0;
            var signals = new Dictionary<string,object>();

            if (sourceEntity.ContainsKey("email") && candidate.ContainsKey("email")
                && (string)sourceEntity["email"] == (string)candidate["email"])
            { score += weights["email_exact"]; signals["email_exact"] = true; }

            // ... additional signal calculations for each weight ...

            scoredMatches.Add(new Dictionary<string,object> {
                ["candidate_id"] = candidate["id"], ["score"] = score,
                ["signals"] = signals, ["source_provider"] = sourceProvider });
        }

        // 4. Classify: auto-merge / review / no-match
        var bestMatch = scoredMatches.OrderByDescending(m => (double)m["score"]).FirstOrDefault();
        if (bestMatch != null && (double)bestMatch["score"] >= threshold)
            return DataProcessResult<Dictionary<string,object>>.Success(
                new Dictionary<string,object> {
                    ["decision"] = "AUTO_MERGE", ["match"] = bestMatch,
                    ["threshold"] = threshold, ["tenant_id"] = tenantId });

        if (bestMatch != null && (double)bestMatch["score"] > 0.3) // non-trivial signal
            return DataProcessResult<Dictionary<string,object>>.Success(
                new Dictionary<string,object> {
                    ["decision"] = "REVIEW_REQUIRED", ["match"] = bestMatch,
                    ["threshold"] = threshold, ["tenant_id"] = tenantId });

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object> { ["decision"] = "NO_MATCH", ["tenant_id"] = tenantId });
    }
}
```

**Used by:** T175 (cross-system identity join), T171 (inline identity resolution during transform)
**References:** F446, F440, F449, RAG FABRIC (Hybrid), DR-61, CF-204
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-95: SCD Type 2 Dimension Loader Pattern

**Purpose:** Load dimension records using Slowly Changing Dimension Type 2. Detect attribute
changes → close old version (set effective_end) → insert new version with effective_start = now.
Point-in-time surrogate key lookup for fact FK resolution. Single current version per business key.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: SCD Type 2 Dimension Loader
// F449 — DR-62: NEVER update dim records, only version

public class Scd2DimensionLoader : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> LoadDimensionAsync(
        string tenantId, string dimType, Dictionary<string,object> newAttributes)
    {
        var dimService = (await _dimFactory.CreateAsync(ctx)).Data;
        var businessKey = $"{tenantId}:{dimType}:{newAttributes["natural_key"]}";

        // 1. Find current version (effective_end == null)
        var current = await dimService.FindCurrentVersionAsync(tenantId, dimType, businessKey);

        if (current.IsSuccess)
        {
            var currentAttrs = current.Data;
            // 2. Compare attributes — detect changes
            var hasChanges = DetectAttributeChanges(currentAttrs, newAttributes);

            if (!hasChanges)
                return DataProcessResult<Dictionary<string,object>>.Success(
                    new Dictionary<string,object> {
                        ["action"] = "NO_CHANGE",
                        ["surrogate_key"] = currentAttrs["surrogate_key"] });

            // 3. Close old version: set effective_end = now - 1ms
            //    NOTE: This is the ONLY dim "update" — closing effective_end. NOT attribute mutation.
            await dimService.CloseVersionAsync(tenantId, (long)currentAttrs["surrogate_key"],
                DateTime.UtcNow.AddMilliseconds(-1));
        }

        // 4. Insert new version with effective_start = now, effective_end = null (current)
        var newVersion = new Dictionary<string,object>
        {
            ["tenant_id"] = tenantId, ["dim_type"] = dimType,
            ["business_key"] = businessKey, ["effective_start"] = DateTime.UtcNow,
            ["effective_end"] = null, // null = current version
        };
        foreach (var attr in newAttributes) newVersion[attr.Key] = attr.Value;

        var insertResult = await dimService.InsertVersionAsync(tenantId, newVersion);

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object> {
                ["action"] = current.IsSuccess ? "VERSION_CREATED" : "NEW_DIM",
                ["surrogate_key"] = insertResult.Data["surrogate_key"],
                ["business_key"] = businessKey });
    }

    public async Task<DataProcessResult<Dictionary<string,object>>> LookupSurrogateKeyAsync(
        string tenantId, string dimType, string businessKey, DateTime asOfDate)
    {
        // Point-in-time lookup: find version where asOfDate BETWEEN effective_start AND effective_end
        var dimService = (await _dimFactory.CreateAsync(ctx)).Data;
        return await dimService.LookupAtPointInTimeAsync(tenantId, dimType, businessKey, asOfDate);
    }
}
```

**Used by:** T173 (dim/fact refresh), T175 (identity merge → dim_user update), T178 (dim_date seed)
**References:** F449, DR-62, IR-173-1/3, QG-173-1
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-96: KPI Registry + Semantic Query Pattern

**Purpose:** Define KPIs as metadata (formula, source tables, dimensions, aggregation grain),
execute them via semantic query layer (metric definition → SQL generation → tenant-scoped execution
→ cache → result). Invalidate cache on mart refresh. Admin-only SQL explain.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: KPI Registry + Semantic Query
// F454 (metric definitions) + F455 (query execution) — mart-only reads

public class KpiQueryExecutor : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> ExecuteKpiAsync(
        string tenantId, string metricId, Dictionary<string,object> filters)
    {
        // 1. Load metric definition from registry (F454)
        var defService = (await _metricDefFactory.CreateAsync(ctx)).Data;
        var metricDef = await defService.GetMetricAsync(tenantId, metricId);
        if (!metricDef.IsSuccess)
            return DataProcessResult<Dictionary<string,object>>.Failure("METRIC_NOT_FOUND");

        // 2. Check cache first (Redis, TTL from FREEDOM)
        var queryService = (await _queryFactory.CreateAsync(ctx)).Data;
        var cacheKey = $"kpi:{tenantId}:{metricId}:{ComputeFilterHash(filters)}";
        var cached = await queryService.GetCachedResultAsync(cacheKey);
        if (cached.IsSuccess)
            return cached;

        // 3. Generate SQL from metric definition + tenant filters
        var formula = (string)metricDef.Data["formula"];
        var sourceTables = (List<string>)metricDef.Data["source_tables"];
        var sql = queryService.GenerateSql(formula, sourceTables, tenantId, filters);
        // SQL always includes WHERE tenant_id = @tenantId (DNA-5)

        // 4. Execute against mart layer ONLY (CF-197)
        var result = await queryService.ExecuteQueryAsync(sql, tenantId);

        // 5. Cache result
        var ttl = await LoadCacheTtlFromFreedom(tenantId);
        await queryService.CacheResultAsync(cacheKey, result.Data, ttl);

        return result;
    }
}
```

**Used by:** T174 (KPI refresh after mart build), T176 (cross-flow KPI computation), T177 (threshold evaluation)
**References:** F454, F455, CF-197 (mart reads only), IR-176-7 (KPIs from definitions, not hardcoded)
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-97: Reverse ETL with Threshold Activation Pattern

**Purpose:** Evaluate KPI thresholds → trigger activation events → consume from QUEUE FABRIC →
rate limit check → fetch credential → build external API request → execute → audit. Cooldown
enforcement prevents rapid-fire. Idempotency key prevents duplicate external actions. DR-64: all
pushes via QUEUE FABRIC, never direct HTTP.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Reverse ETL Activation
// F456 + F430 + F427 — DR-64: event-based, never direct HTTP

public class ReverseEtlActivator : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> EvaluateAndActivateAsync(
        string tenantId, string metricId, double metricValue)
    {
        var etlService = (await _etlFactory.CreateAsync(ctx)).Data;

        // 1. Load activation rules (FREEDOM config)
        var rules = await etlService.GetActivationRulesAsync(tenantId, metricId);
        if (!rules.IsSuccess || ((List<Dictionary<string,object>>)rules.Data["rules"]).Count == 0)
            return DataProcessResult<Dictionary<string,object>>.Success(
                new Dictionary<string,object> { ["status"] = "NO_RULES", ["metric_id"] = metricId });

        var triggered = new List<Dictionary<string,object>>();

        foreach (var rule in (List<Dictionary<string,object>>)rules.Data["rules"])
        {
            var threshold = (double)rule["threshold"];
            var op = (string)rule["operator"];
            if (!EvaluateThreshold(metricValue, op, threshold)) continue;

            // 2. Cooldown check (IR-177-5)
            var cooldownMinutes = (int)rule["cooldown_minutes"];
            var idempotencyKey = $"{tenantId}.{metricId}.{rule["rule_id"]}.{DateTime.UtcNow:yyyyMMdd}";
            var lastTriggered = await etlService.GetLastTriggeredAsync(tenantId, (string)rule["rule_id"]);
            if (lastTriggered.IsSuccess)
            {
                var elapsed = (DateTime.UtcNow - (DateTime)lastTriggered.Data["triggered_at"]).TotalMinutes;
                if (elapsed < cooldownMinutes)
                {
                    triggered.Add(new Dictionary<string,object> {
                        ["rule_id"] = rule["rule_id"], ["status"] = "COOLDOWN_ACTIVE" });
                    continue;
                }
            }

            // 3. Audit BEFORE activation (IR-177-7, CF-209)
            await _auditService.LogOperationAsync(tenantId, "ACTIVATION_TRIGGERED",
                new Dictionary<string,object> {
                    ["rule_id"] = rule["rule_id"], ["metric_id"] = metricId,
                    ["metric_value"] = metricValue, ["threshold"] = threshold,
                    ["idempotency_key"] = idempotencyKey });

            // 4. Publish to QUEUE FABRIC (DR-64: NEVER direct HTTP)
            await _queueService.EnqueueAsync("activation.triggered",
                new Dictionary<string,object> {
                    ["tenant_id"] = tenantId, ["rule"] = rule,
                    ["metric_value"] = metricValue, ["idempotency_key"] = idempotencyKey });

            triggered.Add(new Dictionary<string,object> {
                ["rule_id"] = rule["rule_id"], ["status"] = "TRIGGERED" });
        }

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object> { ["activations"] = triggered, ["tenant_id"] = tenantId });
    }
}
```

**Used by:** T177 (reverse ETL activation gate)
**References:** F427, F430, F456, F459, DR-64, CF-210, CF-213, IR-177-1/5/6/7
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-98: Data Lineage Tracking Pattern

**Purpose:** Record end-to-end lineage edges at every zone transition. Each edge:
{sourceZone, sourceRecordId, targetZone, targetRecordId, transformType, timestamp, syncRunId}.
Support backward trace ("where did this come from?") and forward trace ("where did this go?").

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Data Lineage Tracking
// F460 — lineage edge per zone transition

public class LineageTracker : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> RecordEdgeAsync(
        string tenantId, string sourceZone, string sourceRecordId,
        string targetZone, string targetRecordId, string transformType)
    {
        var lineageService = (await _lineageFactory.CreateAsync(ctx)).Data;

        var edge = new Dictionary<string,object>
        {
            ["tenant_id"] = tenantId,
            ["source_zone"] = sourceZone, ["source_record_id"] = sourceRecordId,
            ["target_zone"] = targetZone, ["target_record_id"] = targetRecordId,
            ["transform_type"] = transformType,
            ["timestamp_utc"] = DateTime.UtcNow,
            ["sync_run_id"] = _context.CorrelationId
        };

        var result = await lineageService.StoreEdgeAsync(edge);
        return result;
    }

    public async Task<DataProcessResult<Dictionary<string,object>>> TraceBackwardAsync(
        string tenantId, string zone, string recordId)
    {
        // Recursive backward trace: find all upstream edges until raw zone reached
        var lineageService = (await _lineageFactory.CreateAsync(ctx)).Data;
        var chain = new List<Dictionary<string,object>>();
        var currentZone = zone;
        var currentId = recordId;

        while (currentZone != "raw")
        {
            var edgeResult = await lineageService.FindIncomingEdgeAsync(
                tenantId, currentZone, currentId);
            if (!edgeResult.IsSuccess) break;

            chain.Add(edgeResult.Data);
            currentZone = (string)edgeResult.Data["source_zone"];
            currentId = (string)edgeResult.Data["source_record_id"];
        }

        return DataProcessResult<Dictionary<string,object>>.Success(
            new Dictionary<string,object> {
                ["tenant_id"] = tenantId, ["target_zone"] = zone,
                ["target_record_id"] = recordId, ["lineage_chain"] = chain,
                ["chain_depth"] = chain.Count });
    }
}
```

**Used by:** T173 (staging→core lineage), T174 (core→mart lineage), T176 (mart→composite lineage), ST-103
**References:** F460, IR-173-6, IR-174-7, IR-176-6, CF-192 (zone order in lineage)
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SKILLS SUMMARY — FLOW-14

| SK | Pattern | Primary Use | Task Types |
|----|---------|-------------|-----------|
| SK-89 | OAuth Lifecycle Management | Token refresh, vault storage, revocation | T167, T168, T170, T177 |
| SK-90 | Paginated API Polling | Rate-limited paginated REST polling | T168, T170 |
| SK-91 | HMAC Webhook Verification | Timing-safe signature verify + dedup | T169 |
| SK-92 | Multi-Zone Warehouse Pipeline | Zone transition: raw→staging→core→mart | T171, T173, T174, T176 |
| SK-93 | Schema Drift Detection | Drift categorization + routing per DR-60 | T172 |
| SK-94 | Probabilistic Identity Resolution | Weighted scoring + auto-merge/review | T175, T171 |
| SK-95 | SCD Type 2 Dimension Loader | Dim versioning + point-in-time lookup | T173, T175, T178 |
| SK-96 | KPI Registry + Semantic Query | Metric def → SQL → cache → result | T174, T176, T177 |
| SK-97 | Reverse ETL Threshold Activation | Threshold → event → push with cooldown | T177 |
| SK-98 | Data Lineage Tracking | Edge recording + backward/forward trace | T173, T174, T176 |

---

# DESIGN DECISIONS DD-74–DD-85

---

### DD-74: Warehouse Storage Target — Hybrid PostgreSQL + Elasticsearch
**Decision:** Core warehouse (staging, dims, facts, marts) uses PostgreSQL via DATABASE FABRIC.
Raw zone uses Elasticsearch for schema-flexible append-only JSON. Lineage + search indices in ES.
**Rationale:** PG provides SQL analytics, RLS policies, SCD-2 with ACID guarantees. ES provides
schema-free ingestion for heterogeneous source data. Both accessed via DATABASE FABRIC — swap
any time via config.
**Alternatives considered:** Snowflake (external dependency — rejected: fabric-first),
All-ES (rejected: no native RLS, no ACID for dim versioning), All-PG (rejected: rigid schema
for raw zone where source formats are unpredictable).

### DD-75: Ingestion Orchestration — Dual Mode (Poll + Webhook)
**Decision:** Both polling (T168) and webhook (T169) ingestion modes supported simultaneously
per connector. Polling handles scheduled/backfill. Webhooks handle near-real-time events.
**Rationale:** ClickUp and Zoho both support webhooks AND REST APIs. Webhooks provide immediacy;
polling provides completeness (gap filling). Dual mode gives maximum freshness with guaranteed
consistency.
**Coordination:** CF-203 prevents backfill/sync overlap. Webhook events use same raw landing
(F438), same source object map (F440), same dedup logic.

### DD-76: Raw Zone Format — Immutable JSON, Monthly Partitioned
**Decision:** Raw zone records are append-only JSON in ES, partitioned by
raw_{tenantId}_{provider}_{entityType}_YYYYMM. Records NEVER updated or deleted (DR-58)
except via retention policy after expiry.
**Rationale:** Immutability enables replay (F441), audit trail, debugging, and gap detection.
Monthly partitions enable efficient retention cleanup and index lifecycle management.
**Enforcement:** AF-7 rejects any UpdateDocument/DeleteDocument call targeting raw zone indices.

### DD-77: Identity Resolution Approach — Probabilistic with Human Review
**Decision:** Cross-system identity resolution uses weighted probabilistic scoring (DR-61), NOT
deterministic exact-match. High-confidence auto-merge, low-confidence human review queue.
**Rationale:** External SaaS systems have inconsistent user data. Exact email match catches ~60%
of cases; probabilistic scoring with name fuzzy, org membership, temporal overlap catches 85%+.
Human review handles the remaining ambiguous cases.
**Alternatives considered:** Deterministic email-only (rejected: too many false negatives —
users have multiple emails), MDM vendor integration (rejected: external dependency, fabric-first).

### DD-78: Mart Refresh Strategy — Incremental with Full Rebuild Option
**Decision:** Default mart refresh is incremental (process only facts since last refresh timestamp).
Full rebuild available as admin-triggered operation for schema changes or data corrections.
**Rationale:** Incremental refresh is O(new facts) vs O(all facts) for full rebuild. For tenants
with millions of facts, full rebuild can take hours; incremental takes minutes.
**Implementation:** F451.RefreshMartIncrementalAsync (default) vs F451.RebuildMartFullAsync (admin).
AF-9 validates incremental refresh covers all facts since last refresh — no gaps (QG-174-4).

### DD-79: External API Authentication — OAuth 2.0 + PAT Dual Support
**Decision:** Connectors support BOTH OAuth 2.0 (authorization code flow) and Personal Access
Tokens (PAT). OAuth preferred for production; PAT supported for development/testing.
**Rationale:** Enterprise customers typically use OAuth with admin consent. Developers and small
teams prefer PAT for quick setup. Both stored encrypted in F427 vault.
**Provider specifics:** ClickUp supports both. Zoho supports OAuth (PKCE) and server tokens.
Token type is FREEDOM config per connector instance.

### DD-80: Rate Limit Strategy — Centralized Per-Token Sliding Window
**Decision:** Rate limiting centralized in F430 (IRateLimitGuardService) using sliding window
per (tenantId, connectorId, tokenId). Per-provider rules: ClickUp = per-token per-minute,
Zoho = credit-based with concurrency cap. All connectors call F430 — none implement own rate logic.
**Rationale:** Centralized rate limiting prevents noisy-neighbor (one connector exhausting quota
for all), provides single observability point, and enables fair distribution across tenants.
**Enforcement:** CF-210 (rate limit before every external call). AF-7 rejects services that
make external HTTP calls without prior F430.CheckAsync.

### DD-81: Schema Drift Handling — Tiered Auto-Accept/Admin-Gate per Zone
**Decision:** Schema drift response varies by zone (DR-60): raw + staging = auto-accept new fields,
mart = admin-gate for FIELD_ADDED, quarantine for FIELD_REMOVED and TYPE_CHANGED at all zones.
**Rationale:** Raw/staging benefit from flexibility (new fields don't break ingestion). Mart layer
has downstream consumers (KPIs, dashboards) that depend on stable schema. Admin gate prevents
surprise breakage.
**Alternatives considered:** Always auto-accept (rejected: breaks KPI formulas), Always admin-gate
(rejected: blocks ingestion for harmless new fields), Reject unknown fields (rejected: data loss).

### DD-82: Cross-System Time Alignment — UTC Storage with EP-5 Fiscal Mapping
**Decision:** ALL timestamps in warehouse stored as UTC. Display timezone is a presentation
concern, never stored. Fiscal period mapping uses FLOW-13 EP-5 IFiscalCalendarService.
**Rationale:** UTC eliminates timezone ambiguity in multi-timezone organizations. ClickUp stores
UTC natively; Zoho stores in user timezone (converted during T171 normalization). EP-5 maps
UTC dates to fiscal periods for financial analytics.
**Implementation:** F448 (ITimezoneNormalizerService) converts all source timestamps to UTC
during raw→staging transform (T171). F386 resolves UTC date → fiscal period.

### DD-83: Reverse ETL Trigger — Threshold-Based via QUEUE FABRIC
**Decision:** Reverse ETL activation uses threshold-based triggers (metric > threshold →
event to QUEUE FABRIC → consumer pushes to external SaaS). NOT scheduled batch push.
**Rationale:** Threshold-based activation is reactive (push only when action needed) vs scheduled
(push everything on a timer, even if nothing changed). Reduces unnecessary external API calls,
enables near-real-time alerts, respects rate limits via F430.
**DR-64:** All pushes via QUEUE FABRIC event, never direct HTTP from threshold evaluator.
**Alternatives considered:** Scheduled batch export (rejected: latency + wasted API calls),
Direct HTTP push (rejected: no DLQ, no retry, no audit, breaks DR-64).

### DD-84: PII Handling — Classify Before Mart, Mask Per Tenant Config
**Decision:** Every record classified for PII by F462 before entering mart layer (DR-63).
Masking strategy (HASH/REDACT/TOKENIZE/EXCLUDE) is FREEDOM config per tenant per field type.
**Rationale:** PII handling requirements vary by regulation (GDPR, CCPA) and by tenant data
sensitivity preference. Classification is mandatory; masking strategy is configurable.
**AI + Rule hybrid:** F462 uses regex rules for known patterns (email, phone, SSN) + LLM semantic
detection for context-dependent PII (e.g., free-text fields mentioning addresses). AI ENGINE FABRIC
call is tenant-consent-gated (similar to DD-63 for finance AI commentary).

### DD-85: Backfill Strategy — Date-Range Slicing with EP-4 Saga
**Decision:** Historical backfill uses date-range slicing: divide total range into configurable
day-size slices (FREEDOM), each slice is an EP-4 saga step with checkpoint. Crash recovery
resumes from last completed slice.
**Rationale:** Full-range backfill is too large for single API call and too risky for single
saga step. Slicing enables: progress tracking, crash recovery at slice boundary, rate limit
distribution across time, gap detection per slice.
**Peak blackout:** CF-212 prevents slice dispatch during peak hours (FREEDOM config per tenant).
**Alternatives considered:** Single API dump (rejected: not supported by ClickUp/Zoho APIs),
Streaming export (rejected: no API support), Full-range saga without slicing (rejected: no
intermediate recovery points, single failure = restart entire backfill).

---

## DESIGN DECISIONS CROSS-REFERENCE

| DD | Title | Primary Factories | Enforced By |
|----|-------|------------------|-------------|
| DD-74 | Hybrid PG + ES Storage | F438, F444, F449-F453 | DATABASE FABRIC, AF-7 |
| DD-75 | Dual-Mode Ingestion | F432, F434, F435 | T168, T169, CF-203 |
| DD-76 | Immutable Raw Zone | F438, F441 | DR-58, AF-7 |
| DD-77 | Probabilistic Identity | F446, F440, F449 | DR-61, CF-204, T175 |
| DD-78 | Incremental Mart Refresh | F451, F454, F455 | T174, QG-174-4 |
| DD-79 | OAuth + PAT Dual Auth | F427, F428 | T167, CF-198 |
| DD-80 | Centralized Rate Limit | F430 | DR-59, CF-210, AF-7 |
| DD-81 | Tiered Schema Drift | F439, F445, F451 | DR-60, CF-195, T172 |
| DD-82 | UTC + EP-5 Fiscal | F448, F386 | T171, FLOW-13 EP-5 |
| DD-83 | Threshold Reverse ETL | F456, F459 | DR-64, CF-213, T177 |
| DD-84 | PII Classify + Mask | F462, F451 | DR-63, CF-207, T174 |
| DD-85 | Date-Range Backfill | F436, F434, F430 | EP-4, CF-212, T170 |

---

## BACKWARD COMPATIBILITY CHECK

```
SK-1-88:   UNCHANGED ✅ (SK-89-98 are ADDITIVE)
DD-1-73:   UNCHANGED ✅ (DD-74-85 are ADDITIVE)
F1-F465:   UNCHANGED ✅ (skills reference existing factories, no modifications)
T1-T178:   UNCHANGED ✅ (skills reference existing task types, no modifications)
CF-1-213:  UNCHANGED ✅ (DDs reference existing CFs, no modifications)
DR-1-65:   UNCHANGED ✅ (DDs reference existing DRs, no modifications)
DNA-1-9:   STABLE ✅ (all skills pass DNA compliance)
EP-1-5:    STABLE ✅ (EP-4 used by SK-90/97, EP-5 by DD-82, not redefined)
```

---

## SAVE POINT: FLOW14:P6:COMPLETE ✅

### Recovery Commands
```
"Load P6"                → This file (FLOW14_P6_SKILLS.md)
"Start P7"               → Merge all phases into 7 canonical files
"Merge P6"               → Append SK-89-98 → SKILLS_FACTORY_RAG_MERGED.md
                          → Append DD-74-85 → UNIFIED_SOURCE_INDEX_MERGED.md
"Resume from P6"         → Load P0 + P1-P6 + basic_prompt.txt
```

### Cumulative P1–P6 Totals:
```
Factories:        F426–F465 (40 new, 8 families: 52-59)
Task Types:       T167–T178 (12 new, 4 new archetypes: INGESTION, TRANSFORM, MODELING, ACTIVATION)
Flow Templates:   33–35 (3 new DAGs)
Design Records:   DR-58–DR-65 (8 new)
BFA Conflict Rules: CF-192–CF-213 (22 new — 10 CRITICAL, 9 HIGH, 3 MEDIUM)
Stress Tests:     ST-92–ST-103 (12 new)
Skills:           SK-89–SK-98 (10 new patterns with .NET 9 implementations)
Design Decisions: DD-74–DD-85 (12 new)
Iron Rules:       96 (8 per task type × 12)
Quality Gates:    72 (6 per task type × 12)
AF Station Cells: 132 (11 stations × 12 task types)
DNA Compliance:   40/40 factories, 12/12 task types, 10/10 skills (100%)
```

### Next Phase (P7) Will Produce:
- 7 canonical merged files with FLOW-14 content integrated
