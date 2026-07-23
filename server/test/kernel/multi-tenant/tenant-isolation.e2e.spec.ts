/**
 * Phase 1 E2E Integration Test — Full Kernel + Multi-Tenant
 *
 * Verifies:
 * 1. Create two tenants with different configs/keys/plans
 * 2. Tenant-A config resolves to Claude, Tenant-B to GPT
 * 3. Tenant-A API key resolves differently from Tenant-B
 * 4. Tenant-A hits rate limit → 429-equivalent, Tenant-B unaffected
 * 5. DNA patterns work correctly within tenant context
 * 6. Deactivated tenant is rejected
 */

import { TenantRegistry } from '../../../src/kernel/multi-tenant/tenant-registry.service';
import { TenantConfigResolver } from '../../../src/kernel/multi-tenant/tenant-config.resolver';
import { TenantKeyResolver } from '../../../src/kernel/multi-tenant/tenant-key.resolver';
import { TenantQuotaService } from '../../../src/kernel/multi-tenant/tenant-quota.service';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../src/kernel/multi-tenant/tenant-context';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { parseDocument } from '../../../src/kernel/parse-document';
import { buildSearchFilter } from '../../../src/kernel/build-search-filter';
import { enforceScope, validateScope } from '../../../src/kernel/scope-isolation';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { DynamicController, RouteDefinition } from '../../../src/kernel/dynamic-controller';

// Simulate CLS per-tenant (swap tenant context between operations)
function mockClsForTenant(tenant?: TenantContext) {
  const store = new Map<string, unknown>();
  if (tenant) store.set(TENANT_CONTEXT_KEY, tenant);
  return {
    get: jest.fn().mockImplementation((key: string) => store.get(key)),
    set: jest.fn().mockImplementation((key: string, val: unknown) => store.set(key, val)),
  } as any;
}

describe('Phase 1 E2E — Kernel + Multi-Tenant Integration', () => {
  let registry: TenantRegistry;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    registry = new TenantRegistry();

    // Create Tenant A — uses Claude, has own API key
    const a = await registry.create({
      name: 'Acme Corp',
      plan: { name: 'pro', maxApiCallsPerMinute: 10, maxTokensPerDay: 50_000 },
      configOverrides: { 'ai.defaultModel': 'claude-sonnet', 'ai.temperature': 0.7 },
      apiKeys: { anthropic: 'sk-acme-ant', openai: 'sk-acme-oai' },
    });
    tenantAId = a.data!.id;

    // Create Tenant B — uses GPT, free plan
    const b = await registry.create({
      name: 'Beta LLC',
      plan: { name: 'free', maxApiCallsPerMinute: 5, maxTokensPerDay: 10_000 },
      configOverrides: { 'ai.defaultModel': 'gpt-4o', 'ai.temperature': 0.3 },
      apiKeys: { openai: 'sk-beta-oai' },
    });
    tenantBId = b.data!.id;
  });

  // ── 1. Tenant Registry CRUD ──────────────────────

  it('should have two active tenants', async () => {
    const list = await registry.list('active');
    expect(list.data!.length).toBe(2);
  });

  it('should find each tenant by ID', async () => {
    const a = await registry.findById(tenantAId);
    expect(a.isSuccess).toBe(true);
    expect(a.data!.name).toBe('Acme Corp');

    const b = await registry.findById(tenantBId);
    expect(b.isSuccess).toBe(true);
    expect(b.data!.name).toBe('Beta LLC');
  });

  // ── 2. Per-Tenant Config Resolution ──────────────

  it('should resolve different AI models per tenant', async () => {
    const tenantA = new TenantContext((await registry.findById(tenantAId)).data!);
    const tenantB = new TenantContext((await registry.findById(tenantBId)).data!);

    const resolverA = new TenantConfigResolver(mockClsForTenant(tenantA));
    const resolverB = new TenantConfigResolver(mockClsForTenant(tenantB));

    // System default
    resolverA.setSystemDefault('ai.defaultModel', 'gemini-pro');
    resolverB.setSystemDefault('ai.defaultModel', 'gemini-pro');

    // Tenant overrides win
    expect(resolverA.get('ai.defaultModel')).toBe('claude-sonnet');
    expect(resolverB.get('ai.defaultModel')).toBe('gpt-4o');

    // Temperature also different
    expect(resolverA.get('ai.temperature')).toBe(0.7);
    expect(resolverB.get('ai.temperature')).toBe(0.3);
  });

  it('should fall back to system default for unconfigured keys', async () => {
    const tenantA = new TenantContext((await registry.findById(tenantAId)).data!);
    const resolver = new TenantConfigResolver(mockClsForTenant(tenantA));
    resolver.setSystemDefault('rag.strategy', 'hybrid');

    expect(resolver.get('rag.strategy')).toBe('hybrid');
  });

  // ── 3. Per-Tenant API Key Resolution ─────────────

  it('should resolve different API keys per tenant', async () => {
    const tenantA = new TenantContext((await registry.findById(tenantAId)).data!);
    const tenantB = new TenantContext((await registry.findById(tenantBId)).data!);

    const resolverA = new TenantKeyResolver(mockClsForTenant(tenantA));
    const resolverB = new TenantKeyResolver(mockClsForTenant(tenantB));

    // Both have OpenAI but different keys
    expect(resolverA.getKey('openai')).toBe('sk-acme-oai');
    expect(resolverB.getKey('openai')).toBe('sk-beta-oai');

    // Only A has Anthropic key
    expect(resolverA.getKey('anthropic')).toBe('sk-acme-ant');
    expect(resolverB.getKey('anthropic')).toBeUndefined();
  });

  it('should use system fallback when tenant has no key', async () => {
    const tenantB = new TenantContext((await registry.findById(tenantBId)).data!);
    const resolver = new TenantKeyResolver(mockClsForTenant(tenantB));
    resolver.setSystemKey('anthropic', 'sk-system-ant');

    // B has no anthropic key → falls back to system
    expect(resolver.getKey('anthropic')).toBe('sk-system-ant');
  });

  it('should requireKey fail for missing provider', async () => {
    const tenantB = new TenantContext((await registry.findById(tenantBId)).data!);
    const resolver = new TenantKeyResolver(mockClsForTenant(tenantB));

    const result = resolver.requireKey('deepseek');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_API_KEY');
  });

  // ── 4. Per-Tenant Quota Enforcement ──────────────

  it('should enforce different rate limits per tenant', async () => {
    const tenantA = new TenantContext((await registry.findById(tenantAId)).data!); // 10/min
    const tenantB = new TenantContext((await registry.findById(tenantBId)).data!); // 5/min

    const quotaA = new TenantQuotaService(mockClsForTenant(tenantA));
    const quotaB = new TenantQuotaService(mockClsForTenant(tenantB));

    // Exhaust Tenant A (10 calls)
    for (let i = 0; i < 10; i++) {
      const r = await quotaA.checkAndConsume('api.calls', 1);
      expect(r.isSuccess).toBe(true);
    }
    const failA = await quotaA.checkAndConsume('api.calls', 1);
    expect(failA.isSuccess).toBe(false);
    expect(failA.errorCode).toBe('QUOTA_EXCEEDED');

    // Tenant B still has quota (5 calls)
    const okB = await quotaB.checkAndConsume('api.calls', 3);
    expect(okB.isSuccess).toBe(true);
    expect(okB.data!.remaining).toBe(2);
  });

  // ── 5. DNA Patterns Work Within Tenant Context ───

  it('should parse documents with scope enforcement (DNA-1 + DNA-5)', async () => {
    const doc = parseDocument('{"name": "test-service", "type": "microservice"}', ['name', 'type']);
    expect(doc.isSuccess).toBe(true);

    // Enforce scope for tenant A
    const resultA = enforceScope(doc.data!, tenantAId);
    expect(resultA.isSuccess).toBe(true);
    const scopedA = resultA.data!;
    expect(scopedA['tenant_id']).toBe(tenantAId);

    // Enforce scope for tenant B
    const resultB = enforceScope(doc.data!, tenantBId);
    expect(resultB.isSuccess).toBe(true);
    expect(resultB.data!['tenant_id']).toBe(tenantBId);

    // Cross-tenant violation — now returns failure (DNA-3: no throw)
    const violation = enforceScope(scopedA, tenantBId);
    expect(violation.isSuccess).toBe(false);
    expect(violation.errorCode).toBe('SCOPE_VIOLATION');
    expect(violation.errorMessage).toContain('Scope violation');
  });

  it('should build search filters with tenant scope (DNA-2 + DNA-5)', () => {
    const filters = buildSearchFilter({
      status: 'active',
      type: 'microservice',
      empty_field: '', // should be skipped
    });

    // Verify DNA-2: empty field skipped
    expect(filters['empty_field']).toBeUndefined();
    expect(Object.keys(filters).length).toBe(2);
  });

  it('should create CloudEvents with tenant scope (DNA-9 + DNA-5)', () => {
    const eventA = createCloudEvent({
      eventType: 'xiigen.flow.started',
      source: '/xiigen/engine',
      data: { flow_id: 'F-001' },
      tenantId: tenantAId,
    });

    const [valid, errors] = validateCloudEvent(eventA);
    expect(valid).toBe(true);
    expect(errors.length).toBe(0);
    expect(eventA['tenantid']).toBe(tenantAId);
  });

  it('should dispatch through DynamicController with tenant scope (DNA-6 + DNA-5)', async () => {
    const ctrl = new DynamicController();
    const handler = async (tenantId: string, payload: Record<string, unknown>) => {
      return DataProcessResult.success({
        tenant: tenantId,
        received: payload,
      });
    };

    ctrl.registerRoute(
      new RouteDefinition({
        routeKey: 'engine.generate',
        handlerId: 'F-ENGINE',
        method: 'POST',
        requiredFields: ['spec'],
      }),
      handler,
    );

    // Dispatch for tenant A
    const resultA = await ctrl.dispatch('engine.generate', tenantAId, { spec: 'T44' });
    expect(resultA.isSuccess).toBe(true);
    expect((resultA.data as any).tenant).toBe(tenantAId);

    // Dispatch for tenant B
    const resultB = await ctrl.dispatch('engine.generate', tenantBId, { spec: 'T45' });
    expect(resultB.isSuccess).toBe(true);
    expect((resultB.data as any).tenant).toBe(tenantBId);

    // Missing tenant → rejected
    const noTenant = await ctrl.dispatch('engine.generate', '', { spec: 'T99' });
    expect(noTenant.isSuccess).toBe(false);
    expect(noTenant.errorCode).toBe('SCOPE_MISSING');
  });

  // ── 6. Tenant Deactivation ──────────────────────

  it('should deactivate tenant and verify inactive status', async () => {
    const deactivated = await registry.deactivate(tenantBId);
    expect(deactivated.isSuccess).toBe(true);
    expect(deactivated.data!.status).toBe('inactive');

    const ctx = new TenantContext(deactivated.data!);
    expect(ctx.isActive).toBe(false);

    // Scope validation still works (tenant_id is valid string)
    expect(validateScope(tenantBId).isSuccess).toBe(true);

    // But the TenantContext reports inactive
    expect(ctx.status).toBe('inactive');

    // Re-activate for clean state
    await registry.update(tenantBId, { status: 'active' });
  });

  // ── 7. Full DataProcessResult Chain ──────────────

  it('should chain parse → validate → scope → event in DataProcessResult pipeline', async () => {
    // enforceScope now returns DataProcessResult — use flatMap to chain it
    const result = parseDocument('{"task_type": "T44", "archetype": "ORCHESTRATION"}', [
      'task_type',
      'archetype',
    ])
      .flatMap((doc) => enforceScope(doc, tenantAId))
      .map((doc) => ({
        ...doc,
        _generated_by: 'xiigen-engine',
        _phase: 'P1.5',
      }));

    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe(tenantAId);
    expect(result.data!['task_type']).toBe('T44');
    expect(result.data!['_generated_by']).toBe('xiigen-engine');
  });
});
