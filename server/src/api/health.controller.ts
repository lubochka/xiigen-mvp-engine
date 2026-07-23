/**
 * HealthController — health probe endpoints.
 *
 * GET /health/live   — liveness probe (always 200)
 * GET /health/ready  — readiness probe (200 if HEALTHY/DEGRADED, 503 if DOWN)
 * GET /health/status — full fabric-by-fabric status
 *
 * DNA-1: All responses are Record<string, unknown>.
 * DNA-3: Uses DataProcessResult internally.
 *
 * Phase 9.3: API module.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { HealthReporter, HealthStatus } from '../bootstrap/health-reporter';

@Injectable()
export class HealthController {
  constructor(private readonly healthReporter: HealthReporter) {}

  /** GET /health/live — liveness probe. Always returns OK. */
  async live(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({
      status: 'OK',
      timestamp: Date.now(),
    });
  }

  /** GET /health/ready — readiness probe. 200 if HEALTHY/DEGRADED, failure if DOWN. */
  async ready(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      // For probes, use a default system scope
      tenantId = 'system';
    }

    const result = await this.healthReporter.checkAll(tenantId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        'HEALTH_CHECK_FAILED',
        result.errorMessage ?? 'Health check failed',
      );
    }

    const status = result.data!.status as string;
    if (status === HealthStatus.DOWN) {
      return DataProcessResult.failure(
        'NOT_READY',
        'Service is DOWN — not ready to accept traffic',
      );
    }

    return DataProcessResult.success({
      status: 'READY',
      health_status: status,
      timestamp: Date.now(),
    });
  }

  /** GET /health/status — full fabric-by-fabric health report. */
  async status(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) tenantId = 'system';

    const result = await this.healthReporter.checkAll(tenantId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        'HEALTH_CHECK_FAILED',
        result.errorMessage ?? 'Health check failed',
      );
    }

    return DataProcessResult.success({
      ...result.data!,
      timestamp: Date.now(),
    });
  }
}
