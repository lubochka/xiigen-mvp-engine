# FLOW-20 SKILLS FACTORY RAG
## Sponsored Content + Graph API + Deep Search + Multi-Tenant Isolation
## Skill Patterns: SK-99–SK-112 (14 skill patterns)
## Save Point: FLOW20:P4:SKILLS ✅

---

```
Pre-FLOW-20: SK-1–SK-98 (98 total)
Post-FLOW-20: SK-1–SK-112 (112 total, +14)

Each skill follows format:
SKILL ID | NAME | DOMAIN | USED BY | PATTERN | IMPLEMENTATION
PRIMARY (.NET 9/C# 13) + ALTERNATIVES (Node.js, Python, Java, Rust, PHP)
AI AGENT PROMPT
```

---

## SK-99 — Graph Auth Per-Node/Field Pattern

```
SKILL:    SK-99
NAME:     Graph Auth Per-Node/Field Pattern
DOMAIN:   Graph API / Permission Engine
USED BY:  T179, T180, T191 (AF-4 RAG retrieval)
PATTERN:  IPermissionDecisionService called per node + per edge + per field.
          Returns Dictionary<string, object> projection mask (authorized fields only).
          Partial-error result assembled by IPartialErrorBuilderService.
          Never single per-request authorization decision.
```

**Primary (.NET 9 / C# 13)**
```csharp
// SK-99: Per-node/field permission pattern
public async Task<DataProcessResult<Dictionary<string, object>>> FilterAuthorizedFieldsAsync(
    string nodeId, string nodeType,
    IReadOnlyList<string> requestedFields,
    Dictionary<string, object> rawNodeData,
    ScopeContext scope)
{
    var permissionService = await _permissionFactory.CreateAsync(
        new FactoryResolutionContext { TenantId = scope.TenantId, ServiceType = "permission" });

    var errors = new List<Dictionary<string, object>>();
    var authorizedData = new Dictionary<string, object>();

    foreach (var field in requestedFields)
    {
        var decision = await permissionService.DecideAsync(
            nodeId, nodeType, field, scope);  // per-field decision

        if (decision.IsAuthorized)
            authorizedData[field] = rawNodeData.GetValueOrDefault(field);
        else if (decision.IsPartial)
            errors.Add(ObjectProcessor.BuildError("FIELD_PERMISSION_DENIED", field, nodeId));
        // unauthorized fields: silently excluded, never throw
    }

    return DataProcessResult<Dictionary<string, object>>.Success(authorizedData, errors);
}
```

**Node.js (TypeScript)**
```typescript
// SK-99 Node.js: Per-field permission filter
async function filterAuthorizedFields(
  nodeId: string, nodeType: string,
  requestedFields: string[],
  rawData: Record<string, unknown>,
  scope: ScopeContext
): Promise<DataProcessResult<Record<string, unknown>>> {
  const permSvc = await permissionFactory.createAsync({ tenantId: scope.tenantId });
  const errors: ErrorEntry[] = [];
  const authorized: Record<string, unknown> = {};

  for (const field of requestedFields) {
    const decision = await permSvc.decide(nodeId, nodeType, field, scope);
    if (decision.isAuthorized) authorized[field] = rawData[field];
    else if (decision.isPartial) errors.push(buildError('FIELD_PERMISSION_DENIED', field));
  }
  return DataProcessResult.success(authorized, errors);
}
```

**AI Agent Prompt**
```
You are implementing per-node/field graph permission filtering (SK-99).
Rules:
1. Call IPermissionDecisionService ONCE PER FIELD — never once per request.
2. Authorized fields → include in result Dictionary.
3. Unauthorized fields → silently excluded (no 403 for individual fields).
4. Partial-auth → build error entry via IPartialErrorBuilderService.
5. Return DataProcessResult<Dictionary> with data + errors array.
6. Never throw for permission denial — always DataProcessResult.
Reference: IR-179-2, DD-87, DR-68.
```

---

## SK-100 — Partial-Error Graph Response Pattern

```
SKILL:    SK-100
NAME:     Partial-Error Graph Response Pattern
DOMAIN:   Graph API / Response Assembly
USED BY:  T179, T191 (AF-4 RAG retrieval)
PATTERN:  HTTP 200 with { "data": {...}, "errors": [...] } for partial authorization.
          Never HTTP 403 for a node/field that is partially authorized.
          errors array: [{ "message": "...", "path": ["nodeId", "fieldName"], "code": "..." }]
          IPartialErrorBuilderService assembles errors (SK-99 feeds it).
```

**Primary (.NET 9)**
```csharp
// SK-100: Partial-error graph response builder
public DataProcessResult<GraphResponse> BuildPartialResponse(
    Dictionary<string, object> authorizedData,
    IReadOnlyList<Dictionary<string, object>> permissionErrors,
    string requestId)
{
    var response = new Dictionary<string, object>
    {
        ["data"] = authorizedData,
        ["errors"] = permissionErrors,       // always present, may be empty array
        ["request_id"] = requestId
    };
    // HTTP 200 even with errors — partial auth is a successful partial response
    return DataProcessResult<GraphResponse>.Success(
        ObjectProcessor.ParseDocument<GraphResponse>(response));
}
```

**AI Agent Prompt**
```
You are building a partial-error graph response (SK-100).
Rules:
1. ALWAYS return HTTP 200 for partial authorization — never 403.
2. Response shape: { "data": {...authorized fields...}, "errors": [...error entries...] }
3. errors array: even if empty, always present in response.
4. Each error entry: { "message": string, "path": [nodeId, fieldName], "code": string }
5. Use IPartialErrorBuilderService — never hand-craft error arrays.
6. DataProcessResult.Success even when errors is non-empty.
Reference: IR-179-3, DD-87, DR-68, QG-179-2.
```

---

## SK-101 — Webhook HMAC Delivery Pattern

```
SKILL:    SK-101
NAME:     Webhook HMAC Delivery Pattern
DOMAIN:   Webhooks / Outbound Delivery
USED BY:  T180, T181 (AF-4 RAG retrieval)
PATTERN:  HMAC-SHA256 computed over canonical payload before every HTTP dispatch.
          Signature in header: X-Webhook-Signature: sha256={hex_digest}
          Key namespace: "webhook:{appId}:{subscriptionId}"
          No delivery path exists without signing. No exceptions.
```

**Primary (.NET 9)**
```csharp
// SK-101: Webhook HMAC signing
public async Task<DataProcessResult<DeliveryOutcome>> DeliverWithHmacAsync(
    WebhookPayload payload, string appId, string subscriptionId,
    string endpointUrl, ScopeContext scope)
{
    var keyName = $"webhook:{appId}:{subscriptionId}";
    var secret = await _keyVault.GetSecretAsync(keyName, scope);
    if (!secret.IsSuccess) return DataProcessResult<DeliveryOutcome>.Error("HMAC_KEY_NOT_FOUND");

    var canonicalBody = JsonSerializer.Serialize(payload,
        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    var signature = ComputeHmacSha256(secret.Value, canonicalBody);
    var headers = new Dictionary<string, string>
    {
        ["X-Webhook-Signature"] = $"sha256={signature}",
        ["X-Delivery-Id"] = payload.DeliveryId,
        ["Content-Type"] = "application/json"
    };

    // deliver with signed headers — no unsigned path exists
    return await _httpClient.PostAsync(endpointUrl, canonicalBody, headers, scope);
}

private static string ComputeHmacSha256(string secret, string body)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
    return Convert.ToHexString(hash).ToLowerInvariant();
}
```

**Python**
```python
# SK-101 Python: HMAC webhook delivery
import hmac, hashlib, json

async def deliver_with_hmac(payload: dict, app_id: str, sub_id: str,
                             endpoint_url: str, scope: ScopeContext):
    key_name = f"webhook:{app_id}:{sub_id}"
    secret = await key_vault.get_secret(key_name, scope)
    if not secret.is_success:
        return DataProcessResult.error("HMAC_KEY_NOT_FOUND")

    body = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    sig = hmac.new(secret.value.encode(), body.encode(), hashlib.sha256).hexdigest()
    headers = {
        "X-Webhook-Signature": f"sha256={sig}",
        "X-Delivery-Id": payload["delivery_id"],
        "Content-Type": "application/json"
    }
    return await http_client.post(endpoint_url, body, headers, scope)
```

**AI Agent Prompt**
```
You are implementing HMAC-signed webhook delivery (SK-101).
Rules:
1. HMAC-SHA256 computed over canonical JSON body BEFORE every HTTP dispatch.
2. Signature header: X-Webhook-Signature: sha256={hex_digest}
3. Key namespace: "webhook:{appId}:{subscriptionId}" — never bare key.
4. No code path delivers without signing. No "if hmac_enabled" condition.
5. X-Delivery-Id header: unique delivery attempt ID (F497 dedup key).
6. Return DataProcessResult<DeliveryOutcome> — never throw on delivery failure.
Reference: IR-181-1, DD-92, DR-69, CF-216.
```

---

## SK-102 — Stateless Auction Redis-Only Pattern

```
SKILL:    SK-102
NAME:     Stateless Auction Redis-Only Pattern
DOMAIN:   Ads Delivery / Auction
USED BY:  T184 (AF-4 RAG retrieval)
PATTERN:  IAuctionEngineService is a pure stateless function. All mutable state
          (frequency caps, pacing, budget) accessed ONLY through Redis in critical path.
          No PG/ES write inside RunAuctionAsync. Budget decrement async via QUEUE.
          Target: p99 < 50ms.
```

**Primary (.NET 9)**
```csharp
// SK-102: Stateless auction — Redis-only critical path
public async Task<DataProcessResult<AuctionResult>> RunAuctionAsync(
    AuctionContext ctx, ScopeContext scope)
{
    // All reads: Redis only (frequency caps, pacing, budget estimates)
    var freqCap = await _freqCapService.GetRemainingAsync(ctx.CampaignId, ctx.UserId, scope);
    var pacingSignal = await _pacingService.GetPacingMultiplierAsync(ctx.CampaignId, scope);

    // Score eligible candidates (pre-loaded from eligibility cache)
    var scoredCandidates = ctx.EligibleAds
        .Where(ad => freqCap.IsWithinCap(ad.CampaignId))
        .Select(ad => new
        {
            Ad = ad,
            Score = ad.BidPrice * ad.QualityScore * pacingSignal.Multiplier
        })
        .OrderByDescending(x => x.Score)
        .ToList();

    if (!scoredCandidates.Any())
        return DataProcessResult<AuctionResult>.Success(AuctionResult.NoFill());

    var winner = scoredCandidates.First();

    // Async post-auction: never block auction on these
    _ = _queueService.EnqueueAsync("ads.impression.v1",
        ObjectProcessor.BuildEvent("impression_logged", winner.Ad.AdId, ctx), scope);
    _ = _queueService.EnqueueAsync("ads.budget.decrement.v1",
        ObjectProcessor.BuildEvent("budget_decrement", winner.Ad.CampaignId, ctx), scope);

    return DataProcessResult<AuctionResult>.Success(
        AuctionResult.Winner(winner.Ad, winner.Score));
}
// NO PG/ES writes inside this method. NO synchronous budget decrement.
```

**AI Agent Prompt**
```
You are implementing a stateless ad auction service (SK-102).
Rules:
1. RunAuctionAsync reads from Redis ONLY. Zero PG/ES/HTTP calls in critical path.
2. Budget decrement: QUEUE FABRIC async fire-and-forget AFTER returning result.
3. Impression log: QUEUE FABRIC async — never synchronous.
4. No-fill is DataProcessResult.Success with AuctionResult.NoFill() — never error.
5. Frequency cap + pacing from Redis counters (atomic INCR/GET).
6. Approved creatives only: eligibility filter must precede auction entry.
Target: p99 < 50ms. Any non-Redis call in critical path = BUILD FAILURE.
Reference: IR-184-1, DD-88, DR-71, DR-74, CF-222.
```

---

## SK-103 — PCI Tokenization Boundary Pattern

```
SKILL:    SK-103
NAME:     PCI Tokenization Boundary Pattern
DOMAIN:   Payments / Compliance
USED BY:  T182 (AF-4 RAG retrieval)
PATTERN:  IPaymentMethodService is the ONLY service that receives raw payment data.
          Tokenize first; return token reference only. Raw PAN never stored, logged,
          or queued. Token format: "vault:{provider}:{last4}:{token_id}"
```

**Primary (.NET 9)**
```csharp
// SK-103: PCI tokenization — raw data never persists
public async Task<DataProcessResult<string>> TokenizeAndBindAsync(
    // Raw payment data — handled ONLY in this method; never logged, stored, or forwarded
    string rawCardNumber, string expiryMonth, string expiryYear, string cvv,
    string billingAccountId, ScopeContext scope)
{
    // Step 1: Tokenize via external vault (raw data never leaves this method)
    var tokenResult = await _vault.TokenizeAsync(rawCardNumber, expiryMonth, expiryYear, cvv);
    if (!tokenResult.IsSuccess)
    {
        // Log failure WITHOUT any card data
        await _auditLog.AppendAsync(ObjectProcessor.BuildAuditEntry(
            "PAYMENT_TOKENIZATION_FAILED", billingAccountId, null), scope);
        return DataProcessResult<string>.Error("TOKENIZATION_FAILED");
    }

    // Step 2: Store only the token reference (PCI out-of-scope data)
    var tokenRef = $"vault:{tokenResult.Provider}:{tokenResult.Last4}:{tokenResult.TokenId}";
    await _billingAccountService.BindPaymentTokenAsync(billingAccountId, tokenRef, scope);

    await _auditLog.AppendAsync(ObjectProcessor.BuildAuditEntry(
        "PAYMENT_METHOD_REGISTERED", billingAccountId, tokenRef), scope);

    return DataProcessResult<string>.Success(tokenRef);
    // rawCardNumber, expiryYear, expiryMonth, cvv are now out of scope — GC'd
}
```

**AI Agent Prompt**
```
You are implementing PCI-compliant payment tokenization (SK-103).
Rules:
1. Raw card data (card_number, CVV, PAN) accepted in ONE method only.
2. Tokenize FIRST via vault. Store ONLY the token reference returned.
3. Raw card data: NEVER in any log entry, queue event, database field, or variable name.
4. Token format: "vault:{provider}:{last4}:{token_id}" — opaque reference only.
5. On tokenization failure: log failure with billingAccountId only (no card data in log).
6. Audit log: every attempt (success/fail) — WITHOUT card data.
PCI scan: any field named card_number/pan/cvv/full_card in ANY service = BUILD FAILURE.
Reference: IR-182-1, DD-93, DR-70, CF-219.
```

---

## SK-104 — Consent-Before-Evaluation Blocking Gate Pattern

```
SKILL:    SK-104
NAME:     Consent-Before-Evaluation Blocking Gate Pattern
DOMAIN:   Privacy / Targeting
USED BY:  T193, T184 (AF-4 RAG retrieval)
PATTERN:  IConsentLookupService called as FIRST step before targeting evaluation.
          No consent → skip targeting entirely (not post-filter).
          Returns ConsentContext dictionary consumed by downstream targeting steps.
```

**Primary (.NET 9)**
```csharp
// SK-104: Consent blocking gate — must be first step before targeting
public async Task<DataProcessResult<Dictionary<string, object>>> VerifyConsentAsync(
    string userId, string tenantId, ScopeContext scope)
{
    // Fast path: Redis cache (warmed from FLOW-08 F258 authoritative store)
    var cached = await _consentCache.GetAsync($"consent:{tenantId}:{userId}", scope);
    var consentState = cached.IsSuccess
        ? ObjectProcessor.ParseDocument(cached.Value)
        : await _consentStore.GetAuthoritativeAsync(userId, tenantId, scope)  // PG fallback
            .ContinueWith(t => t.Result.IsSuccess
                ? ObjectProcessor.ParseDocument(t.Result.Value)
                : new Dictionary<string, object> { ["targeting_allowed"] = false });

    await _auditLog.AppendAsync(ObjectProcessor.BuildAuditEntry(
        "CONSENT_CHECKED", userId, consentState), scope);

    var targetingAllowed = consentState.GetValueOrDefault("targeting_allowed") as bool? ?? false;

    if (!targetingAllowed)
        return DataProcessResult<Dictionary<string, object>>.Success(
            new Dictionary<string, object> { ["targeting_allowed"] = false, ["skip_targeting"] = true });

    return DataProcessResult<Dictionary<string, object>>.Success(consentState);
}
// CALLER MUST CHECK skip_targeting = true BEFORE evaluating ANY targeting criteria
```

**AI Agent Prompt**
```
You are implementing a consent-before-targeting blocking gate (SK-104).
Rules:
1. ConsentLookup is STEP 1 in auction pipeline — before ANY targeting call.
2. Redis fast path first; PG fallback on cache miss (never skip PG if cache empty).
3. No consent → return { targeting_allowed: false, skip_targeting: true }.
4. Caller checks skip_targeting BEFORE calling targeting evaluation service.
5. Post-filter approach (run targeting then filter) = BUILD FAILURE.
6. Consent withdrawal event must invalidate Redis cache within 30s (IR-193-4).
7. Audit log every consent check (even cached hits).
Reference: IR-193-1, DD-89, DR-72, CF-224.
```

---

## SK-105 — Append-Only Financial Ledger Pattern

```
SKILL:    SK-105
NAME:     Append-Only Financial Ledger Pattern
DOMAIN:   Finance / Billing
USED BY:  T185, T186, T188, T195, T197 (AF-4 RAG retrieval)
PATTERN:  SpendLedger is INSERT-only. No UPDATE, no DELETE on billed records.
          Corrections use offset entries referencing original entry ID.
          Idempotency key prevents duplicate billing on queue redelivery.
```

**Primary (.NET 9)**
```csharp
// SK-105: Append-only spend ledger
public async Task<DataProcessResult<string>> AppendLedgerEntryAsync(
    string eventId, string campaignId, string adId,
    decimal amount, string currency, string entryType,
    ScopeContext scope)
{
    // Idempotency: check if this eventId already billed
    var existing = await _ledgerStore.GetByEventIdAsync(eventId, scope);
    if (existing.IsSuccess)
        return DataProcessResult<string>.Success(existing.Value.EntryId); // idempotent return

    var entry = new Dictionary<string, object>
    {
        ["entry_id"] = Guid.NewGuid().ToString(),
        ["event_id"] = eventId,              // original event reference
        ["campaign_id"] = campaignId,
        ["ad_id"] = adId,
        ["amount"] = amount,
        ["currency"] = currency,
        ["entry_type"] = entryType,          // CHARGE | OFFSET_CORRECTION | FRAUD_REVERSAL
        ["created_at"] = DateTimeOffset.UtcNow,
        ["tenant_id"] = scope.TenantId
    };

    // INSERT ONLY — no update method exposed on ISpendLedgerService
    return await _ledgerStore.InsertAsync(entry, scope);
}

// Offset correction — references original entry
public async Task<DataProcessResult<string>> AppendOffsetCorrectionAsync(
    string originalEntryId, decimal correctionAmount, string reason, ScopeContext scope)
{
    return await AppendLedgerEntryAsync(
        eventId: $"correction:{originalEntryId}",
        // originalEntryId included in entry for audit chain
        entryType: "OFFSET_CORRECTION", ...);
}
```

**AI Agent Prompt**
```
You are implementing an append-only financial spend ledger (SK-105).
Rules:
1. ISpendLedgerService exposes AppendLedgerEntryAsync ONLY. No UpdateAsync, no DeleteAsync.
2. Idempotency: check event_id before insert. Duplicate event = return existing entry_id.
3. Corrections: AppendOffsetCorrectionAsync with reference to original_entry_id.
4. Entry types: CHARGE | OFFSET_CORRECTION | FRAUD_REVERSAL — all are appends.
5. No modification to any existing ledger record under any circumstance.
6. Tenant isolation: tenant_id on every entry; BuildSearchFilter skips empty fields.
PG schema: spend_ledger table has no update trigger; insert-only constraint enforced.
Reference: IR-185-3, DD-91, DR-75, CF-228.
```

---

## SK-106 — Edge-Only Tenant Resolution Pattern

```
SKILL:    SK-106
NAME:     Edge-Only Tenant Resolution Pattern
DOMAIN:   Multi-Tenant Security
USED BY:  All FLOW-20 task types (AF-4 RAG retrieval)
PATTERN:  TenantId resolved ONCE at API edge from validated token claims.
          All downstream services read tenantId from ScopeContext only.
          User-supplied tenantId header NEVER accepted. No re-resolution internally.
```

**Primary (.NET 9)**
```csharp
// SK-106: Edge-only tenant resolution
// API EDGE ONLY — called once per request in middleware
public async Task<DataProcessResult<ScopeContext>> ResolveTenantScopeAsync(
    HttpContext httpContext)
{
    // Token claims are validated by auth middleware (signature, expiry)
    var tenantIdClaim = httpContext.User.FindFirst("tenant_id")?.Value;
    if (string.IsNullOrEmpty(tenantIdClaim))
        return DataProcessResult<ScopeContext>.Error("TENANT_CLAIM_MISSING");

    // Validate against authoritative FLOW-08 tenant registry
    var tenant = await _tenantRegistry.GetByIdAsync(tenantIdClaim);
    if (!tenant.IsSuccess || tenant.Value.Status == "SUSPENDED")
        return DataProcessResult<ScopeContext>.Error("TENANT_INVALID_OR_SUSPENDED");

    // Build trusted scope context — propagated to ALL downstream services
    var scope = new ScopeContext
    {
        TenantId = tenantIdClaim,       // from validated token only
        AppId = httpContext.User.FindFirst("app_id")?.Value,
        Scopes = httpContext.User.FindAll("scope").Select(c => c.Value).ToList(),
        RequestId = httpContext.TraceIdentifier
    };

    httpContext.Items["ScopeContext"] = scope;
    return DataProcessResult<ScopeContext>.Success(scope);
}

// ALL downstream services:
public async Task<DataProcessResult<T>> AnyServiceMethodAsync(ScopeContext scope, ...)
{
    // scope.TenantId is ALWAYS from edge resolution — never re-read from request headers
    var filter = ObjectProcessor.BuildSearchFilter(new Dictionary<string, object>
    {
        ["tenant_id"] = scope.TenantId  // always present; never from user input
    });
    ...
}
```

**AI Agent Prompt**
```
You are implementing edge-only tenant resolution (SK-106).
Rules:
1. TenantId resolved ONCE in API middleware from validated JWT claim "tenant_id".
2. All downstream service methods accept ScopeContext — read scope.TenantId only.
3. NEVER read X-Tenant-Id header, body field tenantId, or query param tenant_id.
4. Validate tenantId claim against FLOW-08 tenant registry (F244) on resolution.
5. Suspended/deleted tenant → reject at edge (HTTP 403), not propagate.
6. Every database query: BuildSearchFilter with tenant_id = scope.TenantId.
User-supplied tenant = cross-tenant attack vector. Zero tolerance.
Reference: IR-190-8, DD-94, DR-77, CF-232.
```

---

## SK-107 — Fraud Gate Blocking Before Billing Pattern

```
SKILL:    SK-107
NAME:     Fraud Gate Blocking Before Billing Pattern
DOMAIN:   Fraud / Revenue Integrity
USED BY:  T185, T186, T197 (AF-4 RAG retrieval)
PATTERN:  Fraud scoring (IVT + click fraud + bot detection) as BLOCKING step.
          Fraudulent events → quarantine BEFORE billing event emitted.
          Billing pipeline only receives fraud-screened events.
```

**Primary (.NET 9)**
```csharp
// SK-107: Fraud gate — blocking before billing
public async Task<DataProcessResult<FraudGateResult>> EvaluateAsync(
    Dictionary<string, object> eventData, ScopeContext scope)
{
    // Parallel fraud signals — all evaluated, not short-circuit
    var (ivtResult, clickFraudResult, botResult) = await (
        _ivtService.ScoreAsync(eventData, scope),
        _clickFraudService.ScoreAsync(eventData, scope),
        _botDetectionService.ScoreAsync(eventData, scope)
    ).WhenAll();

    var maxFraudScore = new[] {
        ivtResult.Score, clickFraudResult.Score, botResult.Score
    }.Max();

    var fraudThreshold = await _config.GetFraudThresholdAsync(scope);

    if (maxFraudScore >= fraudThreshold)
    {
        // QUARANTINE synchronously — billing event NOT emitted
        await _quarantineService.QuarantineAsync(eventData,
            new Dictionary<string, object>
            {
                ["ivt_score"] = ivtResult.Score,
                ["click_fraud_score"] = clickFraudResult.Score,
                ["bot_score"] = botResult.Score,
                ["threshold"] = fraudThreshold
            }, scope);

        return DataProcessResult<FraudGateResult>.Success(FraudGateResult.Quarantined());
    }

    // ONLY clean events proceed to billing
    return DataProcessResult<FraudGateResult>.Success(FraudGateResult.Clean(maxFraudScore));
}
```

**AI Agent Prompt**
```
You are implementing a fraud gate that blocks before billing (SK-107).
Rules:
1. Fraud scoring runs BEFORE billing event emission — blocking, not async filter.
2. All fraud signals evaluated in parallel (IVT + click fraud + bot detection).
3. Any signal above threshold → quarantine synchronously, return Quarantined result.
4. Billing event emitted ONLY if FraudGateResult.IsClean = true.
5. Quarantine record MUST include fraud evidence (all signal scores + threshold).
6. Empty evidence on quarantine record = BUILD FAILURE (IR-197-7).
7. Advertiser credit: offset entry emitted after quarantine (F563).
Async quarantine = billing-then-quarantine = BUILD FAILURE.
Reference: IR-185-1, IR-185-2, DD-99, CF-227.
```

---

## SK-108 — Attribution Window FREEDOM Config Pattern

```
SKILL:    SK-108
NAME:     Attribution Window FREEDOM Config Pattern
DOMAIN:   Measurement / Attribution
USED BY:  T185, T186, T196 (AF-4 RAG retrieval)
PATTERN:  Attribution windows (click 1–90d, view 0–7d) stored in Elasticsearch
          FREEDOM config per advertiser account via IAttributionConfigService.
          Attribution engine reads config before every attribution decision.
          No hardcoded window values anywhere in service code.
```

**Primary (.NET 9)**
```csharp
// SK-108: Attribution window from FREEDOM config
public async Task<DataProcessResult<bool>> IsWithinWindowAsync(
    string advertiserId, string touchpointType,
    DateTimeOffset touchpointTime, DateTimeOffset conversionTime,
    ScopeContext scope)
{
    // Read FREEDOM config per advertiser — never hardcoded window
    var config = await _attributionConfig.GetConfigAsync(advertiserId, scope);
    if (!config.IsSuccess)
        return DataProcessResult<bool>.Error("ATTRIBUTION_CONFIG_NOT_FOUND");

    var windowDays = touchpointType switch
    {
        "click" => config.Value.GetValueOrDefault("click_window_days") as int? ?? 7,
        "view"  => config.Value.GetValueOrDefault("view_window_days")  as int? ?? 1,
        _ => throw new ArgumentException($"Unknown touchpoint type: {touchpointType}")
    };

    if (windowDays == 0 && touchpointType == "view")
        return DataProcessResult<bool>.Success(false); // view attribution disabled

    var elapsed = (conversionTime - touchpointTime).TotalDays;
    return DataProcessResult<bool>.Success(elapsed <= windowDays);
}
```

**AI Agent Prompt**
```
You are implementing attribution window evaluation from FREEDOM config (SK-108).
Rules:
1. Window values (click_window_days, view_window_days) from IAttributionConfigService per advertiser.
2. NEVER hardcode 7d, 28d, or any default window in service code.
3. view_window_days = 0 means view attribution disabled — return false, not error.
4. click_window_days valid range: 1–90. Out-of-range rejected by T196 config gate.
5. Config read before every attribution decision (not cached in service instance).
6. Attribution config changes effective within 60s (IR-196-8).
Reference: IR-185-4, DD-101, DR-77, CF-237.
```

---

## SK-109 — Graph Depth Limit FREEDOM Config Pattern

```
SKILL:    SK-109
NAME:     Graph Depth Limit FREEDOM Config Pattern
DOMAIN:   Graph API / Resource Protection
USED BY:  T179, T191 (AF-4 RAG retrieval)
PATTERN:  Max traversal depth from F466 FREEDOM config per tenant/app tier.
          Depth exceeded → partial-error (not 400, not infinite traversal).
          Depth limit enforced BEFORE domain service fan-out.
```

**Primary (.NET 9)**
```csharp
// SK-109: Graph depth limit from FREEDOM config
public async Task<DataProcessResult<int>> GetEffectiveDepthLimitAsync(
    string appId, int requestedDepth, ScopeContext scope)
{
    var config = await _graphDepthConfig.GetAsync(scope.TenantId, appId, scope);
    var maxDepth = config.IsSuccess
        ? config.Value.GetValueOrDefault("max_depth_hops") as int? ?? 3
        : 3; // safe default if config missing

    if (requestedDepth <= maxDepth)
        return DataProcessResult<int>.Success(requestedDepth);

    // Exceeded: return limit with partial-error signal
    return DataProcessResult<int>.Success(maxDepth,
        errors: new[] { ObjectProcessor.BuildError(
            "DEPTH_LIMIT_EXCEEDED",
            $"Requested depth {requestedDepth} exceeds limit {maxDepth}",
            "depth") });
}
// Caller uses result depth for fan-out; errors array flows into partial-error response
```

**AI Agent Prompt**
```
You are implementing graph traversal depth limiting from FREEDOM config (SK-109).
Rules:
1. Max depth from F466 IGraphDepthConfigService per tenant/app tier — never hardcoded.
2. Exceeded depth → return FREEDOM config limit with partial-error entry.
3. Return partial-error (HTTP 200 with errors), NOT HTTP 400.
4. Depth check BEFORE F489 domain service fan-out (enforce before any fan-out cost).
5. Safe default = 3 if FREEDOM config absent (never block, never throw).
6. Different app tiers may have different limits — always resolve per-request.
Reference: IR-191-1, DD-96, CF-237 (ST-113 adversarial depth test).
```

---

## SK-110 — Creative Review Gate Pattern (Approval Before Eligibility)

```
SKILL:    SK-110
NAME:     Creative Review Gate Pattern
DOMAIN:   Ads Review / Brand Safety
USED BY:  T183, T187, T184 (AF-4 RAG retrieval)
PATTERN:  Creative starts as PENDING on ingestion. T187 sets APPROVED/REJECTED.
          T184 eligibility check filters on approved status ONLY.
          No code path grants auction eligibility to PENDING or REJECTED creatives.
```

**Primary (.NET 9)**
```csharp
// SK-110: Approval gate — creative eligibility enforced before auction
// T183: Set initial status
public async Task<DataProcessResult<string>> IngestCreativeAsync(
    Dictionary<string, object> creativeData, ScopeContext scope)
{
    creativeData["approval_status"] = "PENDING";  // ALWAYS starts PENDING
    creativeData["auction_eligible"] = false;      // NEVER eligible until approved
    await _adCatalog.UpsertAsync(creativeData, scope);
    await _reviewQueue.EnqueueAsync(creativeData, scope);
    return DataProcessResult<string>.Success(creativeData["creative_id"].ToString());
}

// T184 eligibility filter: only approved creatives
public async Task<DataProcessResult<List<Dictionary<string, object>>>> LoadEligibleAdsAsync(
    AuctionContext ctx, ScopeContext scope)
{
    var filter = ObjectProcessor.BuildSearchFilter(new Dictionary<string, object>
    {
        ["tenant_id"] = scope.TenantId,
        ["approval_status"] = "APPROVED",   // hard filter — PENDING/REJECTED excluded
        ["auction_eligible"] = true,
        ["targeting_matches"] = ctx.ViewerSegment
    });
    return await _adCatalog.SearchAsync(filter, scope);
}
```

**AI Agent Prompt**
```
You are implementing creative approval gating before auction eligibility (SK-110).
Rules:
1. T183 ingestion: approval_status = "PENDING". Never "APPROVED" on ingestion.
2. auction_eligible = false until T187 sets "APPROVED".
3. T184 eligibility load: BuildSearchFilter with approval_status = "APPROVED" only.
4. No override path for admin to bypass approval gate.
5. T187 decision: APPROVED/REJECTED/RESTRICTED — all are append-only F518 records.
6. Status change propagation: F533 catalog updated AFTER F518 decision recorded.
Creative in auction without APPROVED status = BUILD FAILURE (IR-183-1, IR-184-2).
Reference: DD-100, CF-226, QG-183-6, QG-184-2.
```

---

## SK-111 — Political Ad Dual-Gate Pattern

```
SKILL:    SK-111
NAME:     Political Ad Dual-Gate Pattern
DOMAIN:   Ads Review / Regulatory Compliance
USED BY:  T187, T184 (AF-4 RAG retrieval)
PATTERN:  Political ads require BOTH automated classifier (F535) AND explicit
          verification service (F538). Classifier confidence is irrelevant —
          verification is mandatory regardless. One gate is never sufficient.
```

**Primary (.NET 9)**
```csharp
// SK-111: Political dual gate — both required, neither optional
public async Task<DataProcessResult<PoliticalGateResult>> EvaluatePoliticalAdAsync(
    Dictionary<string, object> creative, ScopeContext scope)
{
    // Gate 1: Automated classifier
    var classifierResult = await _contentClassifier.ClassifyAsync(creative, scope);
    var isPoliticalByClassifier = classifierResult.IsSuccess &&
        classifierResult.Value.GetValueOrDefault("category") as string == "political";

    // Gate 2: Explicit political verification (ALWAYS checked, not conditional)
    var verificationResult = await _politicalVerificationService
        .GetVerificationStatusAsync(creative, scope);

    var hasVerification = verificationResult.IsSuccess &&
        verificationResult.Value.GetValueOrDefault("status") as string == "VERIFIED";

    if (isPoliticalByClassifier && !hasVerification)
    {
        // Political by classifier, no verification → REJECTED
        return DataProcessResult<PoliticalGateResult>.Success(
            PoliticalGateResult.Rejected("POLITICAL_VERIFICATION_REQUIRED"));
    }

    if (!isPoliticalByClassifier && !hasVerification)
    {
        // Not classified as political + no verification → PASS (not political)
        return DataProcessResult<PoliticalGateResult>.Success(PoliticalGateResult.Pass());
    }

    // Has verification regardless of classifier → verified political ad
    return DataProcessResult<PoliticalGateResult>.Success(
        PoliticalGateResult.VerifiedPolitical());
}
```

**AI Agent Prompt**
```
You are implementing a political ad dual-gate (SK-111).
Rules:
1. Gate 1: Run F535 classifier. Gate 2: Check F538 political verification.
2. BOTH gates run — never short-circuit Gate 2 based on Gate 1 result.
3. Classifier says political + no verification → REJECT (regardless of confidence score).
4. Classifier says NOT political + has verification → VerifiedPolitical (user self-declared).
5. No verification AND not classified → Pass (truly non-political).
6. Human override of political gate = BUILD FAILURE (IR-187-1).
Classifier confidence = 99% does NOT eliminate verification requirement.
Reference: IR-187-2, DD-90, DR-73, CF-225, QG-187-1.
```

---

## SK-112 — Developer Analytics Append-Aggregate Pattern

```
SKILL:    SK-112
NAME:     Developer Analytics Append-Aggregate Pattern
DOMAIN:   Observability / Developer Platform
USED BY:  T198 (AF-4 RAG retrieval)
PATTERN:  Raw telemetry (Redis) aggregated every 5 min into append-only ES aggregate.
          Dashboard reads from aggregate only — never from raw telemetry.
          Aggregation is idempotent: same window aggregated twice = same result.
          SLO error budget updated in same aggregation run.
```

**Primary (.NET 9)**
```csharp
// SK-112: Append-aggregate developer analytics
public async Task<DataProcessResult<AggregationResult>> AggregateWindowAsync(
    DateTimeOffset windowStart, DateTimeOffset windowEnd, ScopeContext scope)
{
    // Idempotency: check if window already aggregated
    var existing = await _analyticsStore.GetWindowAggregateAsync(windowStart, windowEnd, scope);
    if (existing.IsSuccess)
        return DataProcessResult<AggregationResult>.Success(
            ObjectProcessor.ParseDocument<AggregationResult>(existing.Value));

    // Read raw telemetry from Redis (time-bounded)
    var rawEvents = await _telemetryStore.GetEventsInWindowAsync(windowStart, windowEnd, scope);

    var aggregate = new Dictionary<string, object>
    {
        ["window_start"] = windowStart,
        ["window_end"] = windowEnd,
        ["tenant_id"] = scope.TenantId,
        ["request_count"] = rawEvents.Count,
        ["error_count"] = rawEvents.Count(e => e["status_code"] as int? >= 400),
        ["p50_latency_ms"] = rawEvents.Percentile("latency_ms", 50),
        ["p99_latency_ms"] = rawEvents.Percentile("latency_ms", 99),
        ["quota_utilization_pct"] = rawEvents.QuotaUtilization(scope.TenantId)
    };

    // APPEND to aggregate store (not update)
    await _analyticsStore.AppendAggregateAsync(aggregate, scope);

    // Update error budget in same transaction
    var errorRate = (double)(int)aggregate["error_count"] / (int)aggregate["request_count"];
    await _errorBudgetService.UpdateAsync(scope.TenantId, windowStart, errorRate, scope);

    return DataProcessResult<AggregationResult>.Success(
        ObjectProcessor.ParseDocument<AggregationResult>(aggregate));
}
```

**AI Agent Prompt**
```
You are implementing developer analytics aggregation (SK-112).
Rules:
1. Aggregation window = 5 min (FREEDOM config default — not hardcoded).
2. Idempotency: GetWindowAggregateAsync before computing. Same window = return existing.
3. Aggregate is APPEND-ONLY (no update to historical aggregates).
4. Dashboard reads from F576 aggregate index only — never raw telemetry.
5. SLO error budget updated in same run as aggregation (same scope context).
6. Per-tenant aggregation: BuildSearchFilter with tenant_id on all queries.
7. Aggregation window change: FREEDOM config, takes effect within 60s.
Reference: IR-198-1, IR-198-8, CF-229.
```

---

## SKILLS SUMMARY — SK-99 through SK-112

| SK | Name | Domain | Used By | Key Pattern |
|----|------|--------|---------|-------------|
| SK-99 | Graph Auth Per-Node/Field | Graph API | T179, T180, T191 | Per-field F488 call; partial-auth |
| SK-100 | Partial-Error Graph Response | Graph API | T179, T191 | HTTP 200 + errors array |
| SK-101 | Webhook HMAC Delivery | Webhooks | T180, T181 | Mandatory HMAC; scoped key |
| SK-102 | Stateless Auction Redis-Only | Ads Delivery | T184 | Redis-only; async impression/budget |
| SK-103 | PCI Tokenization Boundary | Payments | T182 | Raw PAN never persists |
| SK-104 | Consent-Before-Evaluation Gate | Privacy | T193, T184 | Blocking gate; skip not filter |
| SK-105 | Append-Only Financial Ledger | Finance | T185, T186, T188, T195, T197 | INSERT only; offset corrections |
| SK-106 | Edge-Only Tenant Resolution | Multi-Tenant | All FLOW-20 | JWT claim → ScopeContext |
| SK-107 | Fraud Gate Blocking Before Billing | Fraud | T185, T186, T197 | Blocking; quarantine before bill |
| SK-108 | Attribution Window FREEDOM Config | Measurement | T185, T186, T196 | Per-advertiser window config |
| SK-109 | Graph Depth Limit FREEDOM Config | Graph API | T179, T191 | Partial-error on exceed; before fan-out |
| SK-110 | Creative Review Gate | Ads Review | T183, T187, T184 | PENDING on ingest; eligible only if APPROVED |
| SK-111 | Political Ad Dual-Gate | Regulatory | T187, T184 | Both classifier + verification |
| SK-112 | Developer Analytics Append-Aggregate | Observability | T198 | Idempotent append; dashboard from aggregate |

---

## SAVE POINT: FLOW20:P4:SKILLS ✅
## Phase 4 COMPLETE: SK-99–SK-112 (14 skill patterns, 14 primary + alternative implementations)
## Recovery: "Continue FLOW-20 Phase P5" → FLOW20_UNIFIED_SOURCE_INDEX.md
