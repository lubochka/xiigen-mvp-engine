/**
 * DnaInterceptor — NestJS interceptor for DNA-3 compliance.
 *
 * Wraps controller responses in DataProcessResult format.
 * Validates scope isolation (DNA-5) from request context.
 * Logs violations without blocking (configurable enforce mode).
 *
 * Enforce modes:
 *   'log' — log violations only (default for P7)
 *   'warn' — log + add warning header
 *   'block' — reject non-compliant responses (for P9+)
 *
 * Phase 7.2: Guardrails.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

export type DnaEnforceMode = 'log' | 'warn' | 'block';

export interface DnaInterceptorConfig {
  /** Enforce mode: log | warn | block. Default: log. */
  enforceMode?: DnaEnforceMode;
  /** Log function (default: console.warn). */
  logger?: (message: string) => void;
}

/**
 * DnaInterceptor — wraps responses and validates DNA compliance.
 *
 * In NestJS, this would implement NestInterceptor.
 * For testability and P7 scope, we implement it as a standalone class
 * that can be integrated as an interceptor in P9.
 */
@Injectable()
export class DnaInterceptor {
  private readonly enforceMode: DnaEnforceMode;
  private readonly logger: (message: string) => void;
  private readonly violations: Array<Record<string, unknown>> = [];

  constructor(@Optional() config?: DnaInterceptorConfig) {
    this.enforceMode = config?.enforceMode ?? 'log';
    this.logger = config?.logger ?? (() => {}); // silent by default in tests
  }

  /**
   * Intercept a response and ensure DNA-3 compliance.
   * If response is already a DataProcessResult, passes through.
   * If not, wraps it in DataProcessResult.success().
   */
  intercept(
    response: unknown,
    context?: { tenantId?: string; path?: string },
  ): DataProcessResult<unknown> {
    // DNA-5: Check scope isolation
    if (context && !context.tenantId) {
      const violation = {
        pattern_id: 'DNA-5',
        message: `Request to ${context.path ?? 'unknown'} missing tenantId`,
        enforce_mode: this.enforceMode,
        timestamp: new Date().toISOString(),
      };
      this.violations.push(violation);
      this.logger(`[DNA-5] ${violation.message}`);

      if (this.enforceMode === 'block') {
        return DataProcessResult.failure(
          'DNA_5_VIOLATION',
          'Request missing tenantId — scope isolation required',
        );
      }
    }

    // DNA-3: Ensure response is DataProcessResult
    if (response instanceof DataProcessResult) {
      return response as DataProcessResult<unknown>;
    }

    // Wrap non-DataProcessResult responses
    const violation = {
      pattern_id: 'DNA-3',
      message: 'Response not wrapped in DataProcessResult',
      enforce_mode: this.enforceMode,
      timestamp: new Date().toISOString(),
    };
    this.violations.push(violation);
    this.logger(`[DNA-3] ${violation.message}`);

    if (this.enforceMode === 'block') {
      return DataProcessResult.failure(
        'DNA_3_VIOLATION',
        'Response must be wrapped in DataProcessResult<T>',
      );
    }

    // In log/warn mode, wrap the response
    return DataProcessResult.success(response);
  }

  /**
   * Get logged violations for inspection.
   */
  getViolations(): Array<Record<string, unknown>> {
    return [...this.violations];
  }

  /**
   * Get violation count.
   */
  get violationCount(): number {
    return this.violations.length;
  }

  /**
   * Current enforce mode.
   */
  getEnforceMode(): DnaEnforceMode {
    return this.enforceMode;
  }

  /**
   * Clear violations (for testing).
   */
  clearViolations(): void {
    this.violations.length = 0;
  }
}
