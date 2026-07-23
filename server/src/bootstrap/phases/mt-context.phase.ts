/**
 * Phase 9: MT_CONTEXT — Multi-tenant context validation on startup.
 *
 * Validates that the following are reachable before the engine accepts traffic:
 *   - ITenantRegistry (can list tenants)
 *   - IIdempotencyStore (can check and set a key)
 *   - FreedomConfigManager (can perform a getConfig call)
 *
 * If any validation fails, returns DataProcessResult.failure — the engine
 * bootstrap sequence will mark this phase as FAILED and may abort.
 *
 * This phase is a probe only — it does not modify state.
 *
 * P26 BOOT-9.
 */

import { DataProcessResult } from '../../kernel/data-process-result';
import { ITenantRegistry } from '../../kernel/multi-tenant/tenant-registry.interface';
import { IIdempotencyStore, IdempotencyKey } from '../../kernel/multi-tenant/idempotency.types';
import { FreedomConfigManager } from '../../freedom/config-manager';

export interface MtContextPhaseOptions {
  tenantRegistry: ITenantRegistry;
  idempotencyStore: IIdempotencyStore;
  freedomConfigManager: FreedomConfigManager;
}

/**
 * Run Phase 9: MT_CONTEXT probe.
 *
 * @returns success if all three services are reachable.
 * @returns failure with code 'MT_CONTEXT_FAILED' if any probe fails.
 */
export async function runMtContextPhase(
  options: MtContextPhaseOptions,
): Promise<DataProcessResult<Record<string, unknown>>> {
  const errors: string[] = [];

  // ── Probe 1: ITenantRegistry ────────────────────
  try {
    const listResult = await options.tenantRegistry.list();
    if (!listResult.isSuccess) {
      errors.push(`TenantRegistry.list() failed: ${listResult.errorMessage}`);
    }
  } catch (e) {
    errors.push(`TenantRegistry unreachable: ${String(e)}`);
  }

  // ── Probe 2: IIdempotencyStore ──────────────────
  const probeKey: IdempotencyKey = {
    tenantId: '__boot_probe__',
    key: `boot-probe-${Date.now()}`,
    ttlSeconds: 5,
  };
  try {
    const setResult = await options.idempotencyStore.checkAndSet(probeKey);
    if (!setResult.isSuccess) {
      errors.push(`IdempotencyStore.checkAndSet() failed: ${setResult.errorMessage}`);
    } else {
      // Clean up probe key
      await options.idempotencyStore.release(probeKey);
    }
  } catch (e) {
    errors.push(`IdempotencyStore unreachable: ${String(e)}`);
  }

  // ── Probe 3: FreedomConfigManager ───────────────
  try {
    // A getConfig call against a non-existent key should return NOT_FOUND (not throw).
    const cfgResult = options.freedomConfigManager.getConfig(
      '__boot_probe__',
      '__boot_probe_key__',
    );
    // NOT_FOUND is acceptable — it means the service is reachable.
    if (!cfgResult.isSuccess && cfgResult.errorCode !== 'NOT_FOUND') {
      errors.push(
        `FreedomConfigManager.getConfig() returned unexpected error: ${cfgResult.errorMessage}`,
      );
    }
  } catch (e) {
    errors.push(`FreedomConfigManager unreachable: ${String(e)}`);
  }

  // ── Result ──────────────────────────────────────
  if (errors.length > 0) {
    return DataProcessResult.failure(
      'MT_CONTEXT_FAILED',
      `MT_CONTEXT phase failed: ${errors.join('; ')}`,
    );
  }

  return DataProcessResult.success({
    phase: 'MT_CONTEXT',
    probes: ['tenant_registry', 'idempotency_store', 'freedom_config_manager'],
    status: 'all_reachable',
  });
}
