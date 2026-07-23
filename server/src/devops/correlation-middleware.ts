/**
 * CorrelationIdMiddleware — generates or propagates a correlation ID per request.
 *
 * On each incoming request:
 * 1. Read X-Correlation-Id header (use if present) or generate corr-<uuid>
 * 2. Store in CLS as 'correlationId'
 * 3. Set X-Correlation-Id on response header
 *
 * Works with existing nestjs-cls setup from P1.
 * Implemented as a function-based handler for simplicity.
 *
 * Phase 13.1.
 */

import { randomUUID } from 'crypto';
import type { ClsContextReader } from './structured-logger';

// ── Constants ───────────────────────────────────────

export const CORRELATION_HEADER = 'X-Correlation-Id';
export const CORRELATION_CLS_KEY = 'correlationId';

// ── Minimal Request/Response interfaces ─────────────

export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

export interface ResponseLike {
  setHeader(name: string, value: string): void;
}

export interface ClsContextWriter extends ClsContextReader {
  set<T>(key: string, value: T): void;
}

// ── Middleware Function ─────────────────────────────

/**
 * Generate or read correlationId, store in CLS, set on response.
 * Returns the correlationId for the caller.
 */
export function handleCorrelation(
  req: RequestLike,
  res: ResponseLike,
  cls?: ClsContextWriter,
): string {
  // 1. Read from header or generate
  const headerValue =
    req.headers[CORRELATION_HEADER.toLowerCase()] ?? req.headers[CORRELATION_HEADER];
  const correlationId =
    typeof headerValue === 'string' && headerValue.trim()
      ? headerValue.trim()
      : `corr-${randomUUID().substring(0, 12)}`;

  // 2. Store in CLS
  if (cls) {
    try {
      cls.set(CORRELATION_CLS_KEY, correlationId);
    } catch {
      // CLS not active — silently continue
    }
  }

  // 3. Set response header
  try {
    res.setHeader(CORRELATION_HEADER, correlationId);
  } catch {
    // Response may be read-only in some test contexts
  }

  return correlationId;
}

/**
 * Extract correlationId from CLS or return null.
 */
export function getCorrelationId(cls?: ClsContextReader): string | null {
  if (!cls) return null;
  try {
    return cls.get<string>(CORRELATION_CLS_KEY) ?? null;
  } catch {
    return null;
  }
}
