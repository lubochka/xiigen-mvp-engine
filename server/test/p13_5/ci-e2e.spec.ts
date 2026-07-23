/**
 * P13.5 Tests — GitHub Actions CI + DevOps Module + Phase 13 E2E
 *
 * CI Workflow:
 *   - has push and pull_request triggers
 *   - has server-ci and client-ci jobs
 *   - has docker-build job
 *   - server-ci: checkout, node 20, cache, lint, format:check, test, build
 *   - client-ci: same structure
 *   - docker-build needs server-ci + client-ci
 *
 * E2E (Engine Completeness #27–#30):
 *   #27: Docker builds — server + client Dockerfiles valid
 *   #28: Structured logging — JSON with tenantId + correlationId
 *   #29: Health probes — HealthReporter compatible with structured logging
 *   #30: CI pipeline — lint → test → build for both server and client
 */

import * as fs from 'fs';
import * as path from 'path';
import { CiValidator } from '../../src/devops/ci-validator';
import { DockerfileValidator } from '../../src/devops/dockerfile-validator';
import { ComposeValidator } from '../../src/devops/compose-validator';
import { StructuredLogger, type LogEntry } from '../../src/devops/structured-logger';
import { handleCorrelation, type ClsContextWriter } from '../../src/devops/correlation-middleware';
import { RequestLogger } from '../../src/devops/request-logger';
import { LogLevel } from '../../src/devops/log-config';

// ── Helpers ─────────────────────────────────────────

function readFile(filePath: string): string | null {
  const serverRoot = path.resolve(__dirname, '../../');
  const projectRoot = path.resolve(__dirname, '../../../');
  for (const base of [serverRoot, projectRoot]) {
    try {
      return fs.readFileSync(path.resolve(base, filePath), 'utf-8');
    } catch {
      /* next */
    }
  }
  return null;
}

function captureSink(): { entries: string[]; sink: (json: string) => void } {
  const entries: string[] = [];
  return { entries, sink: (json: string) => entries.push(json) };
}

function parseEntries(entries: string[]): LogEntry[] {
  return entries.map((e) => JSON.parse(e));
}

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

// ══════════════════════════════════════════════════════
// CI Workflow Validation
// ══════════════════════════════════════════════════════

describe('GitHub Actions CI Workflow', () => {
  const content = readFile('.github/workflows/ci.yml');
  let validator: CiValidator;

  beforeAll(() => {
    validator = new CiValidator();
  });

  it('should exist and be non-empty', () => {
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(100);
  });

  it('should have workflow name', () => {
    expect(validator.hasWorkflowName(content!)).toBe(true);
  });

  it('should trigger on push to main', () => {
    expect(validator.hasTrigger(content!, 'push')).toBe(true);
  });

  it('should trigger on pull_request to main', () => {
    expect(validator.hasTrigger(content!, 'pull_request')).toBe(true);
  });

  it('should have server-ci job', () => {
    expect(validator.hasJob(content!, 'server-ci')).toBe(true);
  });

  it('should have client-ci job', () => {
    expect(validator.hasJob(content!, 'client-ci')).toBe(true);
  });

  it('should have docker-build job', () => {
    expect(validator.hasJob(content!, 'docker-build')).toBe(true);
  });

  // ── server-ci steps ───────────────────────────────

  it('server-ci should checkout', () => {
    expect(validator.hasStep(content!, 'server-ci', 'Checkout')).toBe(true);
  });

  it('server-ci should setup Node 24', () => {
    expect(validator.hasNodeSetup(content!, 'server-ci', '24')).toBe(true);
  });

  it('server-ci should cache node_modules', () => {
    expect(validator.usesCache(content!, 'server-ci')).toBe(true);
  });

  it('server-ci should run lint', () => {
    expect(validator.hasStep(content!, 'server-ci', 'Lint')).toBe(true);
  });

  it('server-ci should run format check', () => {
    expect(validator.hasStep(content!, 'server-ci', 'Format check')).toBe(true);
  });

  it('server-ci should run test', () => {
    expect(validator.hasStep(content!, 'server-ci', 'Test')).toBe(true);
  });

  it('server-ci should run build', () => {
    expect(validator.hasStep(content!, 'server-ci', 'Build')).toBe(true);
  });

  // ── client-ci steps ───────────────────────────────

  it('client-ci should checkout', () => {
    expect(validator.hasStep(content!, 'client-ci', 'Checkout')).toBe(true);
  });

  it('client-ci should setup Node 24', () => {
    expect(validator.hasNodeSetup(content!, 'client-ci', '24')).toBe(true);
  });

  it('client-ci should run test', () => {
    expect(validator.hasStep(content!, 'client-ci', 'Test')).toBe(true);
  });

  it('client-ci should run build', () => {
    expect(validator.hasStep(content!, 'client-ci', 'Build')).toBe(true);
  });

  // ── docker-build ──────────────────────────────────

  it('docker-build should depend on server-ci', () => {
    expect(validator.hasNeeds(content!, 'docker-build', 'server-ci')).toBe(true);
  });

  it('docker-build should depend on client-ci', () => {
    expect(validator.hasNeeds(content!, 'docker-build', 'client-ci')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Phase 13 E2E — Engine Completeness #27–#30
// ══════════════════════════════════════════════════════

describe('Phase 13 E2E — Engine Completeness', () => {
  // ── #27: Docker builds ────────────────────────────

  it('E2E #27a: server Dockerfile has multi-stage, healthcheck, CMD, port 3000', () => {
    const content = readFile('server/Dockerfile') ?? readFile('Dockerfile');
    expect(content).not.toBeNull();

    const v = new DockerfileValidator();
    expect(v.hasMultiStageBuilds(content!)).toBe(true);
    expect(v.hasHealthCheck(content!)).toBe(true);
    expect(v.hasCmdOrEntrypoint(content!)).toBe(true);
    expect(v.hasExposePort(content!, 3000)).toBe(true);
    expect(v.usesAlpine(content!)).toBe(true);
  });

  it('E2E #27b: client Dockerfile has multi-stage, nginx, SPA, port 80', () => {
    const dockerfile = readFile('client/Dockerfile');
    const nginxConf = readFile('client/nginx.conf');
    expect(dockerfile).not.toBeNull();
    expect(nginxConf).not.toBeNull();

    const v = new DockerfileValidator();
    expect(v.hasMultiStageBuilds(dockerfile!)).toBe(true);
    expect(v.hasExposePort(dockerfile!, 80)).toBe(true);
    expect(v.hasCmdOrEntrypoint(dockerfile!)).toBe(true);
    expect(v.nginxHasSpaRouting(nginxConf!)).toBe(true);
    expect(v.nginxHasGzip(nginxConf!)).toBe(true);
  });

  it('E2E #27c: docker-compose has server + client + health checks', () => {
    const content = readFile('docker-compose.yml');
    expect(content).not.toBeNull();

    const v = new ComposeValidator();
    expect(v.hasService(content!, 'server')).toBe(true);
    expect(v.hasService(content!, 'client')).toBe(true);
    expect(v.hasHealthCheck(content!, 'server')).toBe(true);
    expect(v.hasHealthCheck(content!, 'client')).toBe(true);
    expect(v.hasDependsOn(content!, 'client', 'server')).toBe(true);
  });

  // ── #28: Structured logging ───────────────────────

  it('E2E #28: structured logger produces JSON with tenantId + correlationId', () => {
    const cls = mockCls({
      tenant: { tenantId: 'tenant-e2e' },
      correlationId: 'corr-e2e-test',
    });
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, cls, module: 'engine' });

    logger.info('Generation complete', { taskType: 'T44', score: 0.85 });

    expect(entries).toHaveLength(1);
    const entry = parseEntries(entries)[0];

    // All required fields present
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Generation complete');
    expect(entry.correlationId).toBe('corr-e2e-test');
    expect(entry.tenantId).toBe('tenant-e2e');
    expect(entry.module).toBe('engine');
    expect(entry.taskType).toBe('T44');
    expect(entry.score).toBe(0.85);
    expect(entry.timestamp).toBeDefined();

    // Valid JSON (already parsed, so this confirms it)
    expect(() => JSON.parse(entries[0])).not.toThrow();
  });

  it('E2E #28b: correlation ID propagates through request lifecycle', () => {
    const cls = mockCls();
    const { entries, sink } = captureSink();

    // Simulate request with correlation middleware
    const req = { headers: { 'x-correlation-id': 'corr-lifecycle' } };
    const resHeaders: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        resHeaders[k] = v;
      },
    };

    const corrId = handleCorrelation(req, res, cls);
    expect(corrId).toBe('corr-lifecycle');
    expect(resHeaders['X-Correlation-Id']).toBe('corr-lifecycle');

    // Logger reads from CLS
    const logger = new StructuredLogger({ sink, cls });
    logger.info('After correlation set');

    const entry = parseEntries(entries)[0];
    expect(entry.correlationId).toBe('corr-lifecycle');
  });

  // ── #29: Health probes ────────────────────────────

  it('E2E #29: health probes work with structured logging', () => {
    const { entries, sink } = captureSink();
    const logger = new StructuredLogger({ sink, module: 'health' });
    const reqLogger = new RequestLogger(logger);

    // Simulate health probe request/response
    reqLogger.logRequest('GET', '/health/ready', 'system', 'corr-health');
    reqLogger.logResponse('GET', '/health/ready', 200, 5.2, 'corr-health');

    const parsed = parseEntries(entries);
    expect(parsed).toHaveLength(2);

    // Request start
    expect(parsed[0].message).toBe('Request started');
    expect(parsed[0].path).toBe('/health/ready');
    expect(parsed[0].method).toBe('GET');

    // Response end
    expect(parsed[1].message).toBe('Request completed');
    expect(parsed[1].status_code).toBe(200);
    expect(parsed[1].duration_ms).toBe(5.2);
  });

  // ── #30: CI pipeline ──────────────────────────────

  it('E2E #30: CI has lint → test → build for server and client', () => {
    const content = readFile('.github/workflows/ci.yml');
    expect(content).not.toBeNull();

    const v = new CiValidator();

    // Server: lint → test → build
    expect(v.hasStep(content!, 'server-ci', 'Lint')).toBe(true);
    expect(v.hasStep(content!, 'server-ci', 'Test')).toBe(true);
    expect(v.hasStep(content!, 'server-ci', 'Build')).toBe(true);

    // Client: lint → test → build
    expect(v.hasStep(content!, 'client-ci', 'Lint')).toBe(true);
    expect(v.hasStep(content!, 'client-ci', 'Test')).toBe(true);
    expect(v.hasStep(content!, 'client-ci', 'Build')).toBe(true);

    // Docker build depends on both
    expect(v.hasNeeds(content!, 'docker-build', 'server-ci')).toBe(true);
    expect(v.hasNeeds(content!, 'docker-build', 'client-ci')).toBe(true);
  });
});
