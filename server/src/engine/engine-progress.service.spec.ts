import { Test, TestingModule } from '@nestjs/testing';
import { EngineProgressService, EngineProgressReport } from './engine-progress.service';
import { DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { SHADOW_RUN_SERVICE } from '../fabrics/shadow-run/shadow-run.service';
import { ClsService } from 'nestjs-cls';

function makeMockDb(overrides: Partial<{ searchDocuments: jest.Mock }> = {}) {
  return {
    searchDocuments: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeMockShadowRun(overrides: Partial<{ getGapScore: jest.Mock }> = {}) {
  return {
    getGapScore: jest
      .fn()
      .mockResolvedValue({ taskTypeId: 'T47', status: 'ACTIVE', gapScore: 0.1 }),
    recordAttempt: jest.fn(),
    getFlowSummary: jest.fn(),
    ...overrides,
  };
}

function makeMockCls(tenantId: string | null = null) {
  return {
    get: jest.fn().mockReturnValue(tenantId ? { tenantId } : null),
  };
}

async function buildService(
  mockDb: object,
  mockShadow?: object,
  mockCls?: object,
): Promise<EngineProgressService> {
  const providers: any[] = [
    EngineProgressService,
    { provide: DATABASE_SERVICE, useValue: mockDb },
    { provide: ClsService, useValue: mockCls ?? makeMockCls() },
  ];
  if (mockShadow !== undefined) {
    providers.push({ provide: SHADOW_RUN_SERVICE, useValue: mockShadow });
  }
  const module: TestingModule = await Test.createTestingModule({ providers }).compile();
  return module.get(EngineProgressService);
}

describe('EngineProgressService', () => {
  // ─── Test 1: Report shape ──────────────────────────────────────────────────
  it('returns report with generatedAt and dpoThreshold:80', async () => {
    const svc = await buildService(makeMockDb());
    const report = await svc.getReport();

    expect(report.generatedAt).toBeDefined();
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
    expect(report.dpoThreshold).toBe(80);
  });

  // ─── Test 2: validDpoTriples count ────────────────────────────────────────
  it('counts validDpoTriples correctly from mock DB result', async () => {
    const fakeTriples = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const mockDb = makeMockDb({
      searchDocuments: jest.fn().mockResolvedValue(fakeTriples),
    });
    const svc = await buildService(mockDb);
    const report = await svc.getReport();

    // First call is for validDpoTriples
    expect(report.validDpoTriples).toBe(3);
  });

  // ─── Test 3: flowsToGraduation formula ────────────────────────────────────
  it('calculates flowsToGraduation = ceil((80 - validDpoTriples) / 4)', async () => {
    // Simulate 12 valid triples: ceil((80 - 12) / 4) = ceil(68/4) = ceil(17) = 17
    const fakeTriples = Array.from({ length: 12 }, (_, i) => ({ id: String(i) }));
    const mockDb = makeMockDb({
      searchDocuments: jest.fn().mockResolvedValue(fakeTriples),
    });
    const svc = await buildService(mockDb);
    const report = await svc.getReport();

    expect(report.flowsToGraduation).toBe(17);
  });

  // ─── Test 4: fail-open partial failure ────────────────────────────────────
  it('fail-open: DB succeeds for DPO count but shadow run throws → resolves with real validDpoTriples, UNKNOWN gap scores, error recorded', async () => {
    const fakeTriples = [{ id: 'a' }, { id: 'b' }];
    const mockDb = makeMockDb({
      searchDocuments: jest.fn().mockResolvedValue(fakeTriples),
    });
    const mockShadow = {
      getGapScore: jest.fn().mockRejectedValue(new Error('shadow DB unavailable')),
      recordAttempt: jest.fn(),
      getFlowSummary: jest.fn(),
    };

    const svc = await buildService(mockDb, mockShadow);
    const report = await svc.getReport();

    // Does not throw
    expect(report).toBeDefined();
    // Real validDpoTriples (from successful DB call)
    expect(report.validDpoTriples).toBe(2);
    // All shadow gap scores should be UNKNOWN
    for (const score of Object.values(report.shadowGapScores)) {
      expect(score).toBe('UNKNOWN');
    }
    // Errors array should contain shadow run errors
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors.some((e) => e.includes('shadowGap'))).toBe(true);
  });

  // ─── Test 5: fail-open total failure ──────────────────────────────────────
  it('fail-open: all DB calls throw → resolves with validDpoTriples=0, all UNKNOWN, errors populated, function does NOT throw', async () => {
    const mockDb = makeMockDb({
      searchDocuments: jest.fn().mockRejectedValue(new Error('Elasticsearch down')),
    });

    const svc = await buildService(mockDb);

    // Must NOT throw
    let report: EngineProgressReport | undefined;
    await expect(
      svc.getReport().then((r) => {
        report = r;
      }),
    ).resolves.not.toThrow();

    expect(report).toBeDefined();
    expect(report!.validDpoTriples).toBe(0);
    // All shadow gap scores UNKNOWN (no shadow service injected)
    for (const score of Object.values(report!.shadowGapScores)) {
      expect(score).toBe('UNKNOWN');
    }
    expect(report!.errors.length).toBeGreaterThan(0);
  });

  // ─── Test SCOPE-1: tenantId + knowledgeScope filter applied ──────────────
  it('SCOPE-1: when CLS returns tenantId, searchDocuments receives tenantId+knowledgeScope filter', async () => {
    const mockDb = makeMockDb();
    const mockCls = makeMockCls('tenant-xyz');
    const svc = await buildService(mockDb, undefined, mockCls);
    await svc.getReport();

    // First searchDocuments call (validDpoTriples) should include tenant filter
    const firstCallArgs = mockDb.searchDocuments.mock.calls[0];
    expect(firstCallArgs[1]).toMatchObject({ tenantId: 'tenant-xyz', knowledgeScope: 'PRIVATE' });
  });

  // ─── Test SCOPE-2: no tenant context → no filter applied ──────────────────
  it('SCOPE-2: when CLS returns null tenant, no tenantId filter applied', async () => {
    const mockDb = makeMockDb();
    const mockCls = makeMockCls(null); // CLS present but no tenant
    const svc = await buildService(mockDb, undefined, mockCls);
    await svc.getReport();

    const firstCallArgs = mockDb.searchDocuments.mock.calls[0];
    expect(firstCallArgs[1]).not.toHaveProperty('tenantId');
    expect(firstCallArgs[1]).not.toHaveProperty('knowledgeScope');
  });

  // ─── Test SCOPE-3: fail-open when CLS throws ─────────────────────────────
  it('SCOPE-3: when CLS throws, report resolves without errors (fail-open)', async () => {
    const mockDb = makeMockDb();
    const throwingCls = {
      get: jest.fn().mockImplementation(() => {
        throw new Error('CLS unavailable');
      }),
    };
    const svc = await buildService(mockDb, undefined, throwingCls);
    const report = await svc.getReport();

    expect(report).toBeDefined();
    expect(report.validDpoTriples).toBeDefined();
  });

  // ─── Test 6: fail-open complete report structure ──────────────────────────
  it('fail-open: even when all indices throw, all required fields are present', async () => {
    const mockDb = makeMockDb({
      searchDocuments: jest.fn().mockRejectedValue(new Error('total failure')),
    });

    const svc = await buildService(mockDb);
    const report = await svc.getReport();

    // All required fields must be present
    expect(report).toHaveProperty('validDpoTriples');
    expect(report).toHaveProperty('monoModelTriples');
    expect(report).toHaveProperty('tierCoverage');
    expect(report).toHaveProperty('shadowGapScores');
    expect(report).toHaveProperty('errors');
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('dpoThreshold');
    expect(report).toHaveProperty('flowsToGraduation');
    expect(report).toHaveProperty('tierCoverageGaps');
    expect(report).toHaveProperty('promptVersionsImproved');
    expect(report).toHaveProperty('ragQualityScore');

    // tierCoverage must be an array with 5 entries (one per tier)
    expect(Array.isArray(report.tierCoverage)).toBe(true);
    expect(report.tierCoverage.length).toBe(5);

    // errors is an array
    expect(Array.isArray(report.errors)).toBe(true);
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
