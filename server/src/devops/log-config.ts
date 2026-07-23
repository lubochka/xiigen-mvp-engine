/**
 * LogConfig — configuration for structured logging.
 *
 * LogLevel: DEBUG < INFO < WARN < ERROR
 * LogConfig: level, prettyPrint, includeTimestamp
 *
 * Phase 13.1.
 */

// ── LogLevel ────────────────────────────────────────

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/** Numeric priority for level filtering. Higher = more severe. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/** Check if a log level should be emitted given the configured minimum. */
export function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean {
  return LEVEL_PRIORITY[messageLevel] >= LEVEL_PRIORITY[configuredLevel];
}

// ── LogConfig ───────────────────────────────────────

export interface LogConfig {
  /** Minimum log level. Messages below this level are suppressed. */
  readonly level: LogLevel;
  /** If true, output indented JSON (dev mode). If false, compact single-line JSON. */
  readonly prettyPrint: boolean;
  /** If true, include ISO timestamp on every entry. */
  readonly includeTimestamp: boolean;
}

export const DEFAULT_LOG_CONFIG: LogConfig = {
  level: LogLevel.INFO,
  prettyPrint: false,
  includeTimestamp: true,
};

/** Build a LogConfig from partial overrides. */
export function createLogConfig(overrides?: Partial<LogConfig>): LogConfig {
  return { ...DEFAULT_LOG_CONFIG, ...overrides };
}
