/**
 * P13.1 Tests — Structured Logging + Request Correlation
 */

import {
  LogLevel,
  shouldLog,
  DEFAULT_LOG_CONFIG,
  createLogConfig,
} from '../../src/devops/log-config';
import {
  StructuredLogger,
  type LogEntry,
  type ClsContextReader,
} from '../../src/devops/structured-logger';
import {
  handleCorrelation,
  getCorrelationId,
  CORRELATION_HEADER,
  CORRELATION_CLS_KEY,
  type ClsContextWriter,
  type RequestLike,
  type ResponseLike,
} from '../../src/devops/correlation-middleware';
import { RequestLogger } from '../../src/devops/request-logger';

// ── Test Helpers ────────────────────────────────────

/** Capture log output into an array. */
function captureSink(): { entries: string[]; sink: (json: string) => void } {
  const entries: string[] = [];
  return { entries, sink: (json: string) => entries.push(json) };
}

/** Parse captured log entries as LogEntry objects. */
function parseEntries(entries: string[]): LogEntry[] {
  return entries.map((e) => JSON.parse(e));
}

/** Simple CLS mock. */
function mockCls(data: Record<string, unknown> = {}): ClsContextWriter {
  const store = new Map<string, unknown>(Object.entries(data));
  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    set<T>(key: string, value: T): void {
      store.set(key, value);
    },
  };
}

/** Simple request mock. */
function mockRequest(headers: Record<string, string> = {}): RequestLike {
  return { headers };
}

/** Simple response mock. */
function mockResponse(): ResponseLike & { headers: Record<string, string> } {
  const h: Record<string, string> = {};
  return {
    headers: h,
    setHeader(name: string, value: string) {
      h[name] = value;
    },
  };
}

// ══════════════════════════════════════════════════════
// LogConfig
// ══════════════════════════════════════════════════════

describe('LogConfig', () => {
  it('should have default values', () => {
    expect(DEFAULT_LOG_CONFIG.level).toBe(LogLevel.INFO);
    expect(DEFAULT_LOG_CONFIG.prettyPrint).toBe(false);
    expect(DEFAULT_LOG_CONFIG.includeTimestamp).toBe(true);
  });

  it('should allow partial overrides', () => {
    const config = createLogConfig({ level: LogLevel.DEBUG, prettyPrint: true });
    expect(config.level).toBe(LogLevel.DEBUG);
    expect(config.prettyPrint).toBe(true);
    expect(config.includeTimestamp).toBe(true); // default kept
  });

  it('shouldLog filters by level priority', () => {
    expect(shouldLog(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
    expect(shouldLog(LogLevel.INFO, LogLevel.INFO)).toBe(true);
    expect(shouldLog(LogLevel.WARN, LogLevel.INFO)).toBe(true);
    expect(shouldLog(LogLevel.ERROR, LogLevel.INFO)).toBe(true);
    expect(shouldLog(LogLevel.INFO, LogLevel.ERROR)).toBe(false);
  });

  it('shouldLog passes everything at DEBUG level', () => {
    expect(shouldLog(LogLevel.DEBUG, LogLevel.DEBUG)).toBe(true);
    expect(shouldLog(LogLevel.INFO, LogLevel.DEBUG)).toBe(true);
    expect(shouldLog(LogLevel.ERROR, LogLevel.DEBUG)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// StructuredLogger
// ══════════════════════════════════════════════════════

describe('StructuredLogger', () => {
  it('should produce valid JSON output', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink });

    logger.info('test message');
    expect(entries).toHaveLength(1);

    const parsed = JSON.parse(entries[0]);
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe('object');
  });

  it('should include all required fields', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, module: 'engine' });

    logger.info('Generation complete');
    const entry = parseEntries(entries)[0];

    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Generation complete');
    expect(entry.module).toBe('engine');
  });

  it('should include timestamp when configured', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, config: { includeTimestamp: true } });

    logger.info('test');
    const entry = parseEntries(entries)[0];
    expect(entry.timestamp).toBeDefined();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should omit timestamp when disabled', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, config: { includeTimestamp: false } });

    logger.info('test');
    const entry = parseEntries(entries)[0];
    // In compact mode, null fields are stripped
    expect(entry.timestamp).toBeUndefined();
  });

  it('should filter by log level', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, config: { level: LogLevel.WARN } });

    logger.debug('should not appear');
    logger.info('should not appear');
    logger.warn('should appear');
    logger.error('should appear');

    expect(entries).toHaveLength(2);
    const parsed = parseEntries(entries);
    expect(parsed[0].level).toBe('warn');
    expect(parsed[1].level).toBe('error');
  });

  it('should include correlationId from CLS', () => {
    const cls = mockCls({ correlationId: 'corr-abc123' });
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, cls });

    logger.info('with correlation');
    const entry = parseEntries(entries)[0];
    expect(entry.correlationId).toBe('corr-abc123');
  });

  it('should include tenantId from CLS tenant context', () => {
    const cls = mockCls({ tenant: { tenantId: 'tenant-42' } });
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, cls });

    logger.info('with tenant');
    const entry = parseEntries(entries)[0];
    expect(entry.tenantId).toBe('tenant-42');
  });

  it('should include tenantId from direct CLS key', () => {
    const cls = mockCls({ tenantId: 'tenant-direct' });
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, cls });

    logger.info('with direct tenant');
    const entry = parseEntries(entries)[0];
    expect(entry.tenantId).toBe('tenant-direct');
  });

  it('should handle missing CLS gracefully', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink }); // no CLS

    logger.info('no context');
    const entry = parseEntries(entries)[0];
    // correlationId and tenantId stripped in compact mode
    expect(entry.correlationId).toBeUndefined();
    expect(entry.tenantId).toBeUndefined();
  });

  it('should merge metadata into log entry', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink });

    logger.info('scored', { taskType: 'T44', score: 0.85 });
    const entry = parseEntries(entries)[0];
    expect(entry.taskType).toBe('T44');
    expect(entry.score).toBe(0.85);
  });

  it('should not overwrite core fields with metadata', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink });

    logger.info('test', { level: 'HACKED', message: 'HACKED' });
    const entry = parseEntries(entries)[0];
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test');
  });

  it('should create child logger with module name', () => {
    const { entries, sink } = captureSink();
    const parent = new StructuredLogger({ sink });
    const child = parent.child('af-pipeline');

    child.info('step complete');
    const entry = parseEntries(entries)[0];
    expect(entry.module).toBe('af-pipeline');
  });

  it('child logger inherits config and CLS', () => {
    const cls = mockCls({ correlationId: 'corr-child' });
    const { entries, sink } = captureSink();
    const parent = new StructuredLogger({ sink, cls, config: { level: LogLevel.WARN } });
    const child = parent.child('child-mod');

    child.info('should be filtered');
    child.warn('should appear');

    expect(entries).toHaveLength(1);
    const entry = parseEntries(entries)[0];
    expect(entry.module).toBe('child-mod');
    expect(entry.correlationId).toBe('corr-child');
  });

  it('should produce pretty JSON when configured', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, config: { prettyPrint: true } });

    logger.info('pretty');
    expect(entries[0]).toContain('\n'); // indented = has newlines
  });

  it('should produce compact JSON by default', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink });

    logger.info('compact');
    expect(entries[0]).not.toContain('\n');
  });

  it('convenience methods use correct levels', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, config: { level: LogLevel.DEBUG } });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    const levels = parseEntries(entries).map((e) => e.level);
    expect(levels).toEqual(['debug', 'info', 'warn', 'error']);
  });
});

// ══════════════════════════════════════════════════════
// CorrelationIdMiddleware
// ══════════════════════════════════════════════════════

describe('CorrelationMiddleware', () => {
  it('should generate correlationId when not present in header', () => {
    const req = mockRequest();
    const res = mockResponse();
    const cls = mockCls();

    const id = handleCorrelation(req, res, cls);
    expect(id).toMatch(/^corr-/);
  });

  it('should use existing X-Correlation-Id header', () => {
    const req = mockRequest({ 'x-correlation-id': 'corr-existing-123' });
    const res = mockResponse();
    const cls = mockCls();

    const id = handleCorrelation(req, res, cls);
    expect(id).toBe('corr-existing-123');
  });

  it('should store correlationId in CLS', () => {
    const req = mockRequest();
    const res = mockResponse();
    const cls = mockCls();

    handleCorrelation(req, res, cls);
    expect(cls.get(CORRELATION_CLS_KEY)).toMatch(/^corr-/);
  });

  it('should set response header', () => {
    const req = mockRequest();
    const res = mockResponse();
    const cls = mockCls();

    const id = handleCorrelation(req, res, cls);
    expect(res.headers[CORRELATION_HEADER]).toBe(id);
  });

  it('should work without CLS', () => {
    const req = mockRequest();
    const res = mockResponse();

    const id = handleCorrelation(req, res);
    expect(id).toMatch(/^corr-/);
    expect(res.headers[CORRELATION_HEADER]).toBe(id);
  });

  it('should generate unique IDs per request', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(handleCorrelation(mockRequest(), mockResponse()));
    }
    expect(ids.size).toBe(20);
  });

  it('getCorrelationId should read from CLS', () => {
    const cls = mockCls({ correlationId: 'corr-read-test' });
    expect(getCorrelationId(cls)).toBe('corr-read-test');
  });

  it('getCorrelationId should return null without CLS', () => {
    expect(getCorrelationId()).toBeNull();
    expect(getCorrelationId(undefined)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// RequestLogger
// ══════════════════════════════════════════════════════

describe('RequestLogger', () => {
  let captured: ReturnType<typeof captureSink>;
  let reqLogger: RequestLogger;

  beforeEach(() => {
    captured = captureSink();
    const logger = new StructuredLogger({ sink: captured.sink, config: { level: LogLevel.DEBUG } });
    reqLogger = new RequestLogger(logger);
  });

  it('should log request start with method and path', () => {
    reqLogger.logRequest('GET', '/health/live', 'tenant-1', 'corr-abc');
    const entry = parseEntries(captured.entries)[0];
    expect(entry.message).toBe('Request started');
    expect(entry.method).toBe('GET');
    expect(entry.path).toBe('/health/live');
    expect(entry.phase).toBe('start');
  });

  it('should log response with status and duration', () => {
    reqLogger.logResponse('POST', '/engine/generate', 200, 150.5, 'corr-abc');
    const entry = parseEntries(captured.entries)[0];
    expect(entry.message).toBe('Request completed');
    expect(entry.method).toBe('POST');
    expect(entry.status_code).toBe(200);
    expect(entry.duration_ms).toBe(150.5);
    expect(entry.phase).toBe('end');
  });

  it('should include correlationId in request log', () => {
    reqLogger.logRequest('GET', '/api/test', null, 'corr-xyz');
    const entry = parseEntries(captured.entries)[0];
    expect(entry.correlation_id).toBe('corr-xyz');
  });

  it('should include tenantId in request log', () => {
    reqLogger.logRequest('GET', '/api/test', 'tenant-99', null);
    const entry = parseEntries(captured.entries)[0];
    expect(entry.tenant_id).toBe('tenant-99');
  });

  it('should log 5xx responses as error level', () => {
    reqLogger.logResponse('GET', '/api/fail', 500, 50);
    const entry = parseEntries(captured.entries)[0];
    expect(entry.level).toBe('error');
  });

  it('should log 4xx responses as warn level', () => {
    reqLogger.logResponse('GET', '/api/notfound', 404, 10);
    const entry = parseEntries(captured.entries)[0];
    expect(entry.level).toBe('warn');
  });

  it('should log 2xx responses as info level', () => {
    reqLogger.logResponse('GET', '/api/ok', 200, 25);
    const entry = parseEntries(captured.entries)[0];
    expect(entry.level).toBe('info');
  });

  it('should use http module name', () => {
    reqLogger.logRequest('GET', '/test');
    const entry = parseEntries(captured.entries)[0];
    expect(entry.module).toBe('http');
  });

  it('should log errors', () => {
    reqLogger.logError('POST', '/api/crash', 'Connection refused', 'corr-err');
    const entry = parseEntries(captured.entries)[0];
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Request error');
    expect(entry.error).toBe('Connection refused');
    expect(entry.phase).toBe('error');
  });
});
