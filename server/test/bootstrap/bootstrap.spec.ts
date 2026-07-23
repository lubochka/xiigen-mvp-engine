/**
 * P9.2 Tests — HealthReporter + BootstrapSequence
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { HealthReporter, HealthStatus, FabricHealthFn } from '../../src/bootstrap/health-reporter';
import {
  BootstrapSequence,
  BootPhase,
  BootStatus,
  FabricInitFn,
} from '../../src/bootstrap/bootstrap-sequence';

// ── Helpers ─────────────────────────────────────────

const healthyFn: FabricHealthFn = async () => DataProcessResult.success({ ok: true });
const downFn: FabricHealthFn = async () => DataProcessResult.failure('DOWN', 'fabric is down');
const throwFn: FabricHealthFn = async () => {
  throw new Error('connection refused');
};
const successInit: FabricInitFn = async () => DataProcessResult.success({ initialized: true });
const failInit: FabricInitFn = async () =>
  DataProcessResult.failure('INIT_FAILED', 'cannot connect');
let transientCallCount = 0;
const transientInit: FabricInitFn = async () => {
  transientCallCount++;
  if (transientCallCount < 3) return DataProcessResult.failure('TRANSIENT', 'retry me');
  return DataProcessResult.success({ initialized: true });
};

// ══════════════════════════════════════════════════════
// HealthReporter
// ══════════════════════════════════════════════════════

describe('HealthReporter', () => {
  let reporter: HealthReporter;
  beforeEach(() => {
    reporter = new HealthReporter();
  });

  it('should return UNKNOWN when no fabrics registered', async () => {
    const result = await reporter.checkAll('t1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe(HealthStatus.UNKNOWN);
  });

  it('should return HEALTHY when all fabrics healthy', async () => {
    reporter.register('database', healthyFn);
    reporter.register('queue', healthyFn);
    const result = await reporter.checkAll('t1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe(HealthStatus.HEALTHY);
    expect(result.data!.healthy).toBe(2);
    expect(result.data!.down).toBe(0);
  });

  it('should return DOWN when all fabrics down', async () => {
    reporter.register('database', downFn);
    reporter.register('queue', downFn);
    const result = await reporter.checkAll('t1');
    expect(result.data!.status).toBe(HealthStatus.DOWN);
    expect(result.data!.down).toBe(2);
  });

  it('should return DEGRADED when some fabrics down', async () => {
    reporter.register('database', healthyFn);
    reporter.register('queue', downFn);
    const result = await reporter.checkAll('t1');
    expect(result.data!.status).toBe(HealthStatus.DEGRADED);
    expect(result.data!.healthy).toBe(1);
    expect(result.data!.down).toBe(1);
  });

  it('should handle health check exceptions gracefully', async () => {
    reporter.register('database', throwFn);
    const result = await reporter.checkAll('t1');
    expect(result.data!.status).toBe(HealthStatus.DOWN);
    const db = (result.data!.fabrics as any).database;
    expect(db.error_code).toBe('HEALTH_CHECK_EXCEPTION');
  });

  it('checkSingle should return single fabric status', async () => {
    reporter.register('database', healthyFn);
    const result = await reporter.checkSingle('t1', 'database');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe(HealthStatus.HEALTHY);
    expect(result.data!.fabric).toBe('database');
  });

  it('checkSingle should fail for unregistered fabric', async () => {
    const result = await reporter.checkSingle('t1', 'unknown');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FABRIC_NOT_REGISTERED');
  });

  it('should unregister fabrics', () => {
    reporter.register('database', healthyFn);
    expect(reporter.registeredFabrics).toContain('database');
    expect(reporter.unregister('database')).toBe(true);
    expect(reporter.registeredFabrics).not.toContain('database');
  });

  it('unregister should return false for unknown', () => {
    expect(reporter.unregister('unknown')).toBe(false);
  });

  it('should reject missing tenantId (DNA-5) on checkAll', async () => {
    const result = await reporter.checkAll('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });

  it('should reject missing tenantId (DNA-5) on checkSingle', async () => {
    reporter.register('database', healthyFn);
    const result = await reporter.checkSingle('', 'database');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });

  it('should store last check results', async () => {
    reporter.register('database', healthyFn);
    await reporter.checkAll('t1');
    expect(reporter.lastCheckResults).toHaveProperty('database');
  });

  it('should list registered fabrics', () => {
    reporter.register('database', healthyFn);
    reporter.register('queue', healthyFn);
    expect(reporter.registeredFabrics).toEqual(['database', 'queue']);
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const result = await reporter.checkAll('t1');
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// BootstrapSequence
// ══════════════════════════════════════════════════════

describe('BootstrapSequence', () => {
  beforeEach(() => {
    transientCallCount = 0;
  });

  it('should succeed with all 7 phases when all fabrics pass', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    boot.registerSecrets(successInit, healthyFn);
    boot.registerFabric(BootPhase.DATABASE, successInit, healthyFn);
    boot.registerFabric(BootPhase.QUEUE, successInit, healthyFn);
    boot.registerFabric(BootPhase.AI_ENGINE, successInit, healthyFn);
    boot.registerFabric(BootPhase.RAG, successInit, healthyFn);
    boot.registerFabric(BootPhase.FLOW_ENGINE, successInit, healthyFn);

    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('HEALTHY');
    expect(result.data!.failed_fabrics).toEqual([]);
  });

  it('should abort when secrets fail and requireSecrets=true', async () => {
    const boot = new BootstrapSequence({ requireSecrets: true, retryAttempts: 1 });
    boot.registerSecrets(failInit);

    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SECRETS_INIT_FAILED');
  });

  it('should continue when secrets fail and requireSecrets=false', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    boot.registerSecrets(failInit);
    boot.registerFabric(BootPhase.DATABASE, successInit, healthyFn);

    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('HEALTHY');
  });

  it('should report DEGRADED when a fabric fails but continue', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    boot.registerFabric(BootPhase.DATABASE, successInit, healthyFn);
    boot.registerFabric(BootPhase.QUEUE, failInit, downFn);

    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('DEGRADED');
    expect(result.data!.failed_fabrics).toContain(BootPhase.QUEUE);
  });

  it('should fail when requireAll=true and a fabric fails', async () => {
    const boot = new BootstrapSequence({
      requireSecrets: false,
      requireAllFabrics: true,
      retryAttempts: 1,
    });
    boot.registerFabric(BootPhase.DATABASE, successInit);
    boot.registerFabric(BootPhase.QUEUE, failInit);

    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BOOT_INCOMPLETE');
  });

  it('should retry on transient failure and succeed', async () => {
    transientCallCount = 0;
    const boot = new BootstrapSequence({
      requireSecrets: false,
      retryAttempts: 3,
      retryDelayMs: 10,
    });
    boot.registerFabric(BootPhase.DATABASE, transientInit, healthyFn);

    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('HEALTHY');
    expect(transientCallCount).toBe(3); // failed 2x, succeeded 3rd
  });

  it('should track phase results', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    boot.registerFabric(BootPhase.DATABASE, successInit, healthyFn);
    await boot.boot('t1', {});

    const results = boot.phaseResults;
    expect(results[BootPhase.DATABASE].status).toBe(BootStatus.SUCCESS);
    expect(results[BootPhase.CONFIG].status).toBe(BootStatus.SKIPPED);
  });

  it('should mark unregistered fabrics as SKIPPED', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    // Register nothing
    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(true);

    const results = boot.phaseResults;
    expect(results[BootPhase.DATABASE].status).toBe(BootStatus.SKIPPED);
    expect(results[BootPhase.QUEUE].status).toBe(BootStatus.SKIPPED);
  });

  it('should reject missing tenantId (DNA-5)', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false });
    const result = await boot.boot('', {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_MISSING');
  });

  it('should include elapsed_ms in result', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    const result = await boot.boot('t1', {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.elapsed_ms).toBeGreaterThanOrEqual(0);
  });

  it('should include scope_id in result', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    const result = await boot.boot('t1', {});
    expect(result.data!.scope_id).toBe('t1');
  });

  it('should pass fabric config sections to init functions', async () => {
    const capturedConfig: Record<string, unknown>[] = [];
    const capturingInit: FabricInitFn = async (_tid, cfg) => {
      capturedConfig.push(cfg);
      return DataProcessResult.success({ ok: true });
    };

    const boot = new BootstrapSequence({ requireSecrets: false, retryAttempts: 1 });
    boot.registerFabric(BootPhase.DATABASE, capturingInit);

    await boot.boot('t1', { database: { host: 'localhost', port: 5432 } });
    expect(capturedConfig[0]).toEqual({ host: 'localhost', port: 5432 });
  });

  it('should expose health reporter', () => {
    const reporter = new HealthReporter();
    const boot = new BootstrapSequence({ healthReporter: reporter });
    expect(boot.health).toBe(reporter);
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const boot = new BootstrapSequence({ requireSecrets: false });
    const result = await boot.boot('t1', {});
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
