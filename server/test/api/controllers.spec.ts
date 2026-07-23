/**
 * P9.3 Tests — HealthController + TenantController
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantRegistry } from '../../src/kernel/multi-tenant/tenant-registry.service';
import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { HealthReporter, HealthStatus, FabricHealthFn } from '../../src/bootstrap/health-reporter';
import { HealthController } from '../../src/api/health.controller';
import { TenantController } from '../../src/api/tenant.controller';

// ── Helpers ─────────────────────────────────────────

const healthyFn: FabricHealthFn = async () => DataProcessResult.success({ ok: true });
const downFn: FabricHealthFn = async () => DataProcessResult.failure('DOWN', 'down');

// ══════════════════════════════════════════════════════
// HealthController
// ══════════════════════════════════════════════════════

describe('HealthController', () => {
  let reporter: HealthReporter;
  let controller: HealthController;

  beforeEach(() => {
    reporter = new HealthReporter();
    controller = new HealthController(reporter);
  });

  it('live should always return 200 OK', async () => {
    const result = await controller.live();
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('OK');
  });

  it('ready should return READY when all healthy', async () => {
    reporter.register('database', healthyFn);
    const result = await controller.ready('system');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('READY');
  });

  it('ready should return READY when degraded (some fabrics down)', async () => {
    reporter.register('database', healthyFn);
    reporter.register('queue', downFn);
    const result = await controller.ready('system');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.health_status).toBe(HealthStatus.DEGRADED);
  });

  it('ready should fail when all fabrics down', async () => {
    reporter.register('database', downFn);
    reporter.register('queue', downFn);
    const result = await controller.ready('system');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_READY');
  });

  it('ready should work with no fabrics registered', async () => {
    const result = await controller.ready('system');
    expect(result.isSuccess).toBe(true);
    // UNKNOWN status → still ready (no fabrics to check)
  });

  it('ready should default to system tenant when empty', async () => {
    const result = await controller.ready('');
    expect(result.isSuccess).toBe(true);
  });

  it('status should return full health report', async () => {
    reporter.register('database', healthyFn);
    reporter.register('queue', downFn);
    const result = await controller.status('system');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe(HealthStatus.DEGRADED);
    expect(result.data!.fabrics).toBeDefined();
    expect(result.data!.timestamp).toBeDefined();
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const result = await controller.live();
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// TenantController
// ══════════════════════════════════════════════════════

describe('TenantController', () => {
  let registry: TenantRegistry;
  let freedom: FreedomConfigManager;
  let controller: TenantController;

  beforeEach(() => {
    registry = new TenantRegistry();
    freedom = new FreedomConfigManager();
    controller = new TenantController(registry, freedom);
  });

  // ── Create ────────────────────────────────────

  it('should create a tenant', async () => {
    const result = await controller.create({ name: 'Acme Corp' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.name).toBe('Acme Corp');
    expect(result.data!.id).toBeDefined();
  });

  it('should reject duplicate tenant name', async () => {
    await controller.create({ name: 'Acme Corp' });
    const result = await controller.create({ name: 'Acme Corp' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_NAME');
  });

  it('should reject empty tenant name', async () => {
    const result = await controller.create({ name: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_INPUT');
  });

  // ── List ──────────────────────────────────────

  it('should list tenants', async () => {
    await controller.create({ name: 'Tenant A' });
    await controller.create({ name: 'Tenant B' });
    const result = await controller.list();
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(2);
  });

  it('should list empty when no tenants', async () => {
    const result = await controller.list();
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(0);
  });

  // ── Get by ID ─────────────────────────────────

  it('should get tenant by ID', async () => {
    const created = await controller.create({ name: 'Acme Corp' });
    const id = created.data!.id as string;
    const result = await controller.getById(id);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.name).toBe('Acme Corp');
  });

  it('should fail for non-existent tenant', async () => {
    const result = await controller.getById('non-existent-id');
    expect(result.isSuccess).toBe(false);
  });

  it('should reject missing tenantId on getById (DNA-5)', async () => {
    const result = await controller.getById('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── Update Config ─────────────────────────────

  it('should update tenant FREEDOM config', async () => {
    const created = await controller.create({ name: 'Acme Corp' });
    const id = created.data!.id as string;
    const result = await controller.updateConfig(id, {
      config_key: 'T44:batch_size',
      task_type: 'T44',
      value: '100',
      value_type: 'string',
      description: 'Batch size',
      editable_by: 'admin',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.config_updated).toBe(true);
  });

  it('should reject config update for non-existent tenant', async () => {
    const result = await controller.updateConfig('non-existent', {
      config_key: 'test',
      value: '1',
      value_type: 'string',
    });
    expect(result.isSuccess).toBe(false);
  });

  it('should reject config update with missing tenantId (DNA-5)', async () => {
    const result = await controller.updateConfig('', {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── Set Keys ──────────────────────────────────

  it('should set per-tenant API keys', async () => {
    const created = await controller.create({ name: 'Acme Corp' });
    const id = created.data!.id as string;
    const result = await controller.setKeys(id, { anthropic: 'sk-ant-xxx', openai: 'sk-xxx' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.keys_updated).toBe(true);
    expect(result.data!.key_count).toBe(2);
  });

  it('should reject setKeys with missing tenantId (DNA-5)', async () => {
    const result = await controller.setKeys('', {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── Set Quotas ────────────────────────────────

  it('should set per-tenant quotas', async () => {
    const created = await controller.create({ name: 'Acme Corp' });
    const id = created.data!.id as string;
    const result = await controller.setQuotas(id, { maxRequestsPerMinute: 60 });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.quotas_updated).toBe(true);
  });

  it('should reject setQuotas with missing tenantId (DNA-5)', async () => {
    const result = await controller.setQuotas('', {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── Deactivate ────────────────────────────────

  it('should deactivate (soft delete) a tenant', async () => {
    const created = await controller.create({ name: 'Acme Corp' });
    const id = created.data!.id as string;
    const result = await controller.deactivate(id);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('inactive');
    expect(result.data!.deactivated).toBe(true);

    // Verify tenant shows inactive
    const fetched = await controller.getById(id);
    expect(fetched.isSuccess).toBe(true);
    expect(fetched.data!.status).toBe('inactive');
  });

  it('should reject deactivate with missing tenantId (DNA-5)', async () => {
    const result = await controller.deactivate('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should reject deactivate for non-existent tenant', async () => {
    const result = await controller.deactivate('non-existent');
    expect(result.isSuccess).toBe(false);
  });

  // ── DNA-3 ─────────────────────────────────────

  it('should return DataProcessResult on all operations (DNA-3)', async () => {
    const create = await controller.create({ name: 'Test' });
    expect(create).toBeInstanceOf(DataProcessResult);
    const list = await controller.list();
    expect(list).toBeInstanceOf(DataProcessResult);
  });
});
