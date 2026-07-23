/**
 * StructuredLogger — JSON-formatted logger with consistent fields.
 *
 * Every log entry includes:
 *   timestamp, level, message, correlationId, tenantId, module, metadata
 *
 * Reads correlationId and tenantId from CLS (AsyncLocalStorage) when available.
 * Output: one JSON line per entry to stdout (or captured sink for testing).
 *
 * Phase 13.1.
 */

import { Injectable, Optional } from '@nestjs/common';
import { LogLevel, shouldLog, type LogConfig, DEFAULT_LOG_CONFIG } from './log-config';

// ── Log Entry ───────────────────────────────────────

export interface LogEntry {
  timestamp: string | null;
  level: string;
  message: string;
  correlationId: string | null;
  tenantId: string | null;
  module: string | null;
  [key: string]: unknown;
}

// ── CLS Context Reader ─────────────────────────────

/**
 * Minimal interface for reading CLS context.
 * Avoids hard dependency on nestjs-cls so the logger can work standalone.
 */
export interface ClsContextReader {
  get<T>(key: string): T | undefined;
}

// ── Log Sink ────────────────────────────────────────

/** Where log entries are written. Default: stdout. Override for testing. */
export type LogSink = (json: string) => void;

const STDOUT_SINK: LogSink = (json: string) => process.stdout.write(json + '\n');

// ── Logger ──────────────────────────────────────────

@Injectable()
export class StructuredLogger {
  private readonly config: LogConfig;
  private readonly moduleName: string | null;
  private readonly cls: ClsContextReader | null;
  private readonly sink: LogSink;

  constructor(
    @Optional()
    params?: {
      config?: Partial<LogConfig>;
      module?: string;
      cls?: ClsContextReader;
      sink?: LogSink;
    },
  ) {
    this.config = { ...DEFAULT_LOG_CONFIG, ...params?.config };
    this.moduleName = params?.module ?? null;
    this.cls = params?.cls ?? null;
    this.sink = params?.sink ?? STDOUT_SINK;
  }

  /**
   * Create a child logger with a module name pre-set.
   * Inherits config, CLS, and sink from parent.
   */
  child(moduleName: string): StructuredLogger {
    return new StructuredLogger({
      config: this.config,
      module: moduleName,
      cls: this.cls ?? undefined,
      sink: this.sink,
    });
  }

  /**
   * Primary log method.
   */
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(level, this.config.level)) return;

    const entry: LogEntry = {
      timestamp: this.config.includeTimestamp ? new Date().toISOString() : null,
      level,
      message,
      correlationId: this.readCls<string>('correlationId') ?? null,
      tenantId: this.readClsTenantId(),
      module: this.moduleName,
    };

    // Merge metadata
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        if (!(key in entry)) {
          entry[key] = value;
        }
      }
    }

    // Strip null fields in compact mode
    const clean = this.config.prettyPrint ? entry : this.stripNulls(entry);

    const json = this.config.prettyPrint ? JSON.stringify(clean, null, 2) : JSON.stringify(clean);

    this.sink(json);
  }

  // ── Convenience Methods ───────────────────────────

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  // ── Helpers ───────────────────────────────────────

  private readCls<T>(key: string): T | undefined {
    if (!this.cls) return undefined;
    try {
      return this.cls.get<T>(key);
    } catch {
      return undefined;
    }
  }

  private readClsTenantId(): string | null {
    // Try TenantContext object first (as stored by P1 middleware)
    const tenantCtx = this.readCls<{ tenantId?: string }>('tenant');
    if (tenantCtx?.tenantId) return tenantCtx.tenantId;

    // Try direct tenantId key
    const directId = this.readCls<string>('tenantId');
    if (directId) return directId;

    return null;
  }

  private stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}
