/**
 * RequestLogger — logs HTTP request start and response completion.
 *
 * Uses StructuredLogger for output. Includes method, path, statusCode,
 * durationMs, correlationId, and tenantId on every entry.
 *
 * Phase 13.1.
 */

import { Injectable } from '@nestjs/common';
import { LogLevel } from './log-config';
import { StructuredLogger } from './structured-logger';

@Injectable()
export class RequestLogger {
  private readonly logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger.child('http');
  }

  /**
   * Log request start.
   */
  logRequest(
    method: string,
    path: string,
    tenantId?: string | null,
    correlationId?: string | null,
  ): void {
    this.logger.info('Request started', {
      method: method.toUpperCase(),
      path,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(correlationId ? { correlation_id: correlationId } : {}),
      phase: 'start',
    });
  }

  /**
   * Log response completion.
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    correlationId?: string | null,
  ): void {
    const level: LogLevel =
      statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    this.logger.log(level, 'Request completed', {
      method: method.toUpperCase(),
      path,
      status_code: statusCode,
      duration_ms: Math.round(durationMs * 100) / 100,
      ...(correlationId ? { correlation_id: correlationId } : {}),
      phase: 'end',
    });
  }

  /**
   * Log a request error.
   */
  logError(method: string, path: string, error: string, correlationId?: string | null): void {
    this.logger.error('Request error', {
      method: method.toUpperCase(),
      path,
      error,
      ...(correlationId ? { correlation_id: correlationId } : {}),
      phase: 'error',
    });
  }
}
