/**
 * SpecAuditService unit tests — SS-04 + SS-05
 *
 * Covers:
 *   extractServiceReferences: Actors: lines (Pass 1), prose patterns (Pass 2), JSON (Pass 3)
 *   checkFabricRegistry: alias match, not-found, query shape (match vs term)
 *   scanForConstants: formula weights, time constants, thresholds, model names
 *   detectOverlaps: same-category detection, self-filter
 *   Full auditSpec: BLOCKING_GAPS verdict, CLEAN verdict
 *   SPEC-001/002/003 check definitions
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  SpecAuditService,
  SpecServiceReference,
  SPEC_001,
  SPEC_002,
  SPEC_003,
  SPEC_CHECKS,
} from './spec-audit.service';

// ── Fetch mock helpers ──

function mockFetchResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function mockFabricFound(interfaceToken: string, interfaceName: string) {
  return mockFetchResponse({
    hits: {
      total: { value: 1 },
      hits: [{ _source: { interfaceToken, interfaceName, status: 'ACTIVE' } }],
    },
  });
}

function mockFabricNotFound() {
  return mockFetchResponse({ hits: { total: { value: 0 }, hits: [] } });
}

describe('SpecAuditService', () => {
  let service: SpecAuditService;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpecAuditService],
    }).compile();

    service = module.get(SpecAuditService);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SPEC check definitions
  // ─────────────────────────────────────────────────────────────────────────

  describe('SPEC named check definitions', () => {
    it('should export SPEC_CHECKS with 3 entries', () => {
      expect(SPEC_CHECKS).toHaveLength(3);
    });

    it('SPEC-001 should have score-0 severity', () => {
      expect(SPEC_001.id).toBe('SPEC-001');
      expect(SPEC_001.severity).toBe('score-0');
      expect(SPEC_001.category).toBe('SPEC');
    });

    it('SPEC-002 should have score-reduce-20 severity', () => {
      expect(SPEC_002.id).toBe('SPEC-002');
      expect(SPEC_002.severity).toBe('score-reduce-20');
    });

    it('SPEC-003 should have score-0 severity', () => {
      expect(SPEC_003.id).toBe('SPEC-003');
      expect(SPEC_003.severity).toBe('score-0');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // extractServiceReferences
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractServiceReferences', () => {
    it('should extract services from Actors: line (high-confidence pass)', () => {
      const spec = `
        Actors: Auth Service, User Service, Email Service, Messaging Service
        Some prose about the flow.
      `;
      const refs = service.extractServiceReferences(spec);
      const names = refs.map((r) => r.name);

      expect(names).toContain('Auth Service');
      expect(names).toContain('User Service');
      expect(names).toContain('Email Service');
      expect(names).toContain('Messaging Service');
      expect(refs.filter((r) => r.source.includes('actors-list')).length).toBeGreaterThanOrEqual(4);
    });

    it('should extract "X Service" patterns from prose when no Actors: line', () => {
      const spec = `
        API Gateway forwards to Auth Service.
        Auth Service calls User Service.
        Messaging Service delivers questionnaire link.
      `;
      const refs = service.extractServiceReferences(spec);
      const names = refs.map((r) => r.name);

      expect(names).toContain('Auth Service');
      expect(names).toContain('User Service');
      expect(names).toContain('Messaging Service');
      expect(names).toContain('API Gateway');
    });

    it('should extract "X Provider" patterns', () => {
      const spec = 'Redirect to SSO Provider for authentication.';
      const refs = service.extractServiceReferences(spec);
      expect(refs.some((r) => r.name === 'SSO Provider')).toBe(true);
    });

    it('should deduplicate across Actors: line and prose', () => {
      const spec = `
        Actors: Auth Service, User Service
        Auth Service validates token.
        Auth Service checks expiry.
      `;
      const refs = service.extractServiceReferences(spec);
      const authRefs = refs.filter((r) => r.name === 'Auth Service');
      expect(authRefs).toHaveLength(1);
    });

    it('should handle structured JSON specs', () => {
      const spec = JSON.stringify({
        services: ['AuthService', 'UserService', { name: 'EmailService' }],
      });
      const refs = service.extractServiceReferences(spec);
      expect(refs).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // checkFabricRegistry
  // ─────────────────────────────────────────────────────────────────────────

  describe('checkFabricRegistry', () => {
    it('should find a registered interface via alias match', async () => {
      fetchMock = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockFabricFound('DATABASE_SERVICE', 'IDatabaseService'));

      const ref: SpecServiceReference = {
        name: 'Database Service',
        source: 'test',
        context: 'test',
      };
      const result = await service.checkFabricRegistry(ref);

      expect(result.fabricMatch.found).toBe(true);
      expect(result.fabricMatch.interfaceToken).toBe('DATABASE_SERVICE');
    });

    it('should return found=false for an unregistered service', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockFabricNotFound());

      const ref: SpecServiceReference = {
        name: 'Messaging Service',
        source: 'test',
        context: 'test',
      };
      const result = await service.checkFabricRegistry(ref);

      expect(result.fabricMatch.found).toBe(false);
    });

    it('should use match query for aliases and term query for keyword fields', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockFabricNotFound());

      const ref: SpecServiceReference = { name: 'Queue Service', source: 'test', context: 'test' };
      await service.checkFabricRegistry(ref);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        query: { bool: { should: Array<Record<string, unknown>> } };
      };
      const should = callBody.query.bool.should;

      expect(should[0]).toHaveProperty('match');
      expect(should[1]).toHaveProperty('match');
      expect(should[2]).toHaveProperty('term');
      expect(should[3]).toHaveProperty('term');
    });

    it('should fail-conservative when registry is unreachable', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const ref: SpecServiceReference = {
        name: 'Database Service',
        source: 'test',
        context: 'test',
      };
      const result = await service.checkFabricRegistry(ref);

      expect(result.fabricMatch.found).toBe(false); // fail-conservative (opposite of RequiredProviderValidator)
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // scanForConstants — SPEC-002
  // ─────────────────────────────────────────────────────────────────────────

  describe('scanForConstants (SPEC-002)', () => {
    it('should detect numeric weights in formulas', () => {
      const spec = 'Ranking: Match Score × 0.25 + Friend Score × 0.20 + Activity × 0.15';
      const candidates = service.scanForConstants(spec);
      const weights = candidates.filter((c) => c.classification === 'FREEDOM_PARAM_REQUIRED');

      expect(weights.length).toBeGreaterThanOrEqual(3);
      expect(weights.some((c) => c.value === '0.25')).toBe(true);
    });

    it('should include SK-451 reasoning in FREEDOM_PARAM_REQUIRED reason', () => {
      const spec = 'Weight: Score × 0.30';
      const candidates = service.scanForConstants(spec);

      expect(candidates[0].reason).toContain('SK-451');
      expect(candidates[0].reason).toContain('FREEDOM');
    });

    it('should detect formula weights: 0.20 and 0.15 from full formula', () => {
      const spec = 'Ranking: Match Score × 0.25 + Friend Score × 0.20 + Activity × 0.15';
      const candidates = service.scanForConstants(spec);

      expect(candidates.some((c) => c.value === '0.20')).toBe(true);
      expect(candidates.some((c) => c.value === '0.15')).toBe(true);
    });

    it('should detect time constants', () => {
      const spec = 'Token expires after 24 hours. Retry after 30 seconds.';
      const candidates = service.scanForConstants(spec);

      expect(candidates.some((c) => c.value.includes('24'))).toBe(true);
      expect(candidates.some((c) => c.value.includes('30'))).toBe(true);
    });

    it('should detect threshold values as NEEDS_REVIEW', () => {
      const spec = 'Convergence requires confidence >= 0.80';
      const candidates = service.scanForConstants(spec);

      expect(candidates.some((c) => c.value === '0.80')).toBe(true);
      const thresholds = candidates.filter((c) => c.classification === 'NEEDS_REVIEW');
      expect(thresholds.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect model names as FREEDOM_PARAM_REQUIRED', () => {
      const spec = 'Use gpt-4o for generation and claude-sonnet for scoring';
      const candidates = service.scanForConstants(spec);

      expect(candidates.some((c) => c.value.includes('gpt-4o'))).toBe(true);
      expect(candidates.some((c) => c.value.includes('claude-sonnet'))).toBe(true);
      expect(
        candidates.filter((c) => c.classification === 'FREEDOM_PARAM_REQUIRED').length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // detectOverlaps — SPEC-003
  // ─────────────────────────────────────────────────────────────────────────

  describe('detectOverlaps (SPEC-003)', () => {
    it('should detect same-category overlap with existing interface', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockFetchResponse({
          hits: {
            hits: [
              {
                _source: {
                  interfaceToken: 'AI_ENGINE',
                  interfaceName: 'IAiEngine',
                  serviceCategory: 'ML',
                },
              },
            ],
          },
        }),
      );

      const refs: SpecServiceReference[] = [
        {
          name: 'ML Service',
          source: 'test',
          context: 'Machine learning model training service',
        },
      ];
      const overlaps = await service.detectOverlaps(refs);

      expect(overlaps.length).toBe(1);
      expect(overlaps[0].existingInterface).toBe('IAiEngine');
      expect(overlaps[0].overlapType).toBe('SAME_CATEGORY');
    });

    it('should NOT flag a registered service as overlapping with itself', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockFetchResponse({
          hits: {
            hits: [
              {
                _source: {
                  interfaceToken: 'MESSAGING_SERVICE', // matches derivedToken
                  interfaceName: 'IMessagingService',
                  serviceCategory: 'MESSAGING',
                },
              },
            ],
          },
        }),
      );

      const refs: SpecServiceReference[] = [
        {
          name: 'Messaging Service',
          source: 'test',
          context: 'Send messages to users',
        },
      ];
      const overlaps = await service.detectOverlaps(refs);

      expect(overlaps).toHaveLength(0);
    });

    it('should fail-open when registry is unreachable (no overlaps reported)', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const refs: SpecServiceReference[] = [{ name: 'ML Service', source: 'test', context: '' }];
      const overlaps = await service.detectOverlaps(refs);

      expect(overlaps).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Full auditSpec
  // ─────────────────────────────────────────────────────────────────────────

  describe('auditSpec (full integration)', () => {
    it('should produce BLOCKING_GAPS for a spec with missing services', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockFabricNotFound());

      const spec = `
        Auth Service validates credentials.
        Messaging Service delivers questionnaire.
        Payment Service processes premium signup.
      `;
      const report = await service.auditSpec(spec, 'test-001');

      expect(report.verdict).toBe('BLOCKING_GAPS');
      expect(report.missingInterfaces.length).toBeGreaterThanOrEqual(1);
      expect(report.prereqGaps.some((g) => g.type === 'MISSING_FABRIC_INTERFACE')).toBe(true);
    });

    it('should produce CLEAN for a spec using only registered services', async () => {
      fetchMock = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockFabricFound('DATABASE_SERVICE', 'IDatabaseService'));

      const spec = 'Database Service stores the record.';
      const report = await service.auditSpec(spec, 'test-002');

      expect(report.missingInterfaces).toHaveLength(0);
      expect(report.verdict).toBe('CLEAN');
    });

    it('should produce BLOCKING_GAPS with constant candidates for spec with both', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockFabricNotFound());

      const spec = `
        Actors: Auth Service, Messaging Service, SSO Provider
        Token expires after 24 hours
        Retry after 30 seconds
      `;
      const report = await service.auditSpec(spec, 'full-audit-test');

      expect(report.verdict).toBe('BLOCKING_GAPS');
      expect(report.missingInterfaces.length).toBeGreaterThanOrEqual(1);
      expect(report.constantCandidates.some((c) => c.value.includes('24'))).toBe(true);
      expect(report.constantCandidates.some((c) => c.value.includes('30'))).toBe(true);
    });
  });
});
