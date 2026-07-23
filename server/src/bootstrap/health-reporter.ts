/**
 * HealthReporter — aggregate health from all registered fabrics.
 *
 * Status levels:
 *   HEALTHY  — all checked fabrics report healthy
 *   DEGRADED — some fabrics healthy, some down/unknown
 *   DOWN     — all checked fabrics are down
 *   UNKNOWN  — no fabrics registered for health checks
 *
 * DNA-1: dict-based status.  DNA-3: DataProcessResult returns.  DNA-5: scope_id on every check.
 *
 * Phase 9.2: Bootstrap module.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { validateScope } from '../kernel/scope-isolation';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

/** Health check function signature. */
export type FabricHealthFn = (
  tenantId: string,
) => Promise<DataProcessResult<Record<string, unknown>>>;

@Injectable()
export class HealthReporter {
  private readonly checks = new Map<string, FabricHealthFn>();
  private lastResults: Record<string, Record<string, unknown>> = {};
  private readonly timeoutSeconds: number;

  constructor(@Optional() timeoutSeconds = 5.0) {
    this.timeoutSeconds = timeoutSeconds;
  }

  /** Register a fabric health check function. */
  register(fabricName: string, healthFn: FabricHealthFn): void {
    this.checks.set(fabricName, healthFn);
  }

  /** Remove a fabric from health checks. Returns true if was registered. */
  unregister(fabricName: string): boolean {
    return this.checks.delete(fabricName);
  }

  /** Run health checks on all registered fabrics. */
  async checkAll(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    const scopeCheck = validateScope(tenantId);
    if (!scopeCheck.isSuccess) {
      return DataProcessResult.failure('SCOPE_MISSING', 'tenant_id required (DNA-5)');
    }

    if (this.checks.size === 0) {
      return DataProcessResult.success({
        status: HealthStatus.UNKNOWN,
        fabrics: {},
        scope_id: tenantId,
        checked_at: Date.now(),
        message: 'No fabrics registered for health checks',
      });
    }

    const fabricResults: Record<string, Record<string, unknown>> = {};
    let healthyCount = 0;
    let downCount = 0;

    for (const [name, healthFn] of this.checks.entries()) {
      try {
        const result = await healthFn(tenantId);
        if (result.isSuccess) {
          fabricResults[name] = { status: HealthStatus.HEALTHY, details: result.data ?? {} };
          healthyCount++;
        } else {
          fabricResults[name] = {
            status: HealthStatus.DOWN,
            error_code: result.errorCode,
            error_message: result.errorMessage,
          };
          downCount++;
        }
      } catch (err) {
        fabricResults[name] = {
          status: HealthStatus.DOWN,
          error_code: 'HEALTH_CHECK_EXCEPTION',
          error_message: String(err),
        };
        downCount++;
      }
    }

    const total = this.checks.size;
    let overall: HealthStatus;
    if (healthyCount === total) overall = HealthStatus.HEALTHY;
    else if (downCount === total) overall = HealthStatus.DOWN;
    else overall = HealthStatus.DEGRADED;

    this.lastResults = fabricResults;

    return DataProcessResult.success({
      status: overall,
      fabrics: fabricResults,
      scope_id: tenantId,
      checked_at: Date.now(),
      healthy: healthyCount,
      down: downCount,
      total,
    });
  }

  /** Check a single fabric's health. */
  async checkSingle(
    tenantId: string,
    fabricName: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const scopeCheck = validateScope(tenantId);
    if (!scopeCheck.isSuccess) {
      return DataProcessResult.failure('SCOPE_MISSING', 'tenant_id required (DNA-5)');
    }

    const healthFn = this.checks.get(fabricName);
    if (!healthFn) {
      return DataProcessResult.failure(
        'FABRIC_NOT_REGISTERED',
        `No health check registered for fabric '${fabricName}'`,
      );
    }

    try {
      const result = await healthFn(tenantId);
      const status = result.isSuccess ? HealthStatus.HEALTHY : HealthStatus.DOWN;
      return DataProcessResult.success({
        fabric: fabricName,
        status,
        scope_id: tenantId,
        checked_at: Date.now(),
        ...(result.isSuccess
          ? { details: result.data ?? {} }
          : { error_code: result.errorCode, error_message: result.errorMessage }),
      });
    } catch (err) {
      return DataProcessResult.success({
        fabric: fabricName,
        status: HealthStatus.DOWN,
        scope_id: tenantId,
        checked_at: Date.now(),
        error_code: 'HEALTH_CHECK_EXCEPTION',
        error_message: String(err),
      });
    }
  }

  /** List registered fabric names. */
  get registeredFabrics(): string[] {
    return [...this.checks.keys()];
  }

  /** Last check results. */
  get lastCheckResults(): Record<string, Record<string, unknown>> {
    return { ...this.lastResults };
  }
}
