/**
 * Unit tests for GraduationResolverService — B-3.
 *
 * 9 tests (4 original + 5 persistence):
 *   1-4: original resolution + regression tests
 *   5. onModuleInit: graduated tier in DB → resolveGeneratorForTier returns OSS model
 *   6. onModuleInit: no DB records → resolveGeneratorForTier returns 'AI_ENGINE' (safe default)
 *   7. graduateTier() → storeDocument called with eventType='GRADUATION_STATE', graduated=true
 *   8. checkForRegression revert → storeDocument called with graduated=false
 *   9. onModuleInit when db.searchDocuments throws → no throw, all tiers ungraduated
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { GraduationResolverService } from './graduation-resolver.service';

describe('GraduationResolverService', () => {
  let service: GraduationResolverService;

  beforeEach(() => {
    // No FreedomConfigManager injected — tests rely on built-in fallbacks
    service = new GraduationResolverService();
  });

  it('resolveGeneratorForTier returns AI_ENGINE (paid model) when tier not graduated', () => {
    const result = service.resolveGeneratorForTier(1);
    expect(result).toBe('AI_ENGINE');
  });

  it('resolveGeneratorForTier returns OSS model string when tier is graduated', () => {
    service.graduateTier(3);
    const result = service.resolveGeneratorForTier(3);
    // Default OSS model when no FreedomConfigManager injected
    expect(result).toBe('deepseek-coder-v2');
  });

  it('checkForRegression reverts graduated→false after 2 consecutive failures', async () => {
    // Tier 1 threshold default = 0.05 — send score below threshold twice
    service.graduateTier(1);
    expect(service.isTierGraduated(1)).toBe(true);

    // First failure — should NOT revert yet
    await service.checkForRegression(1, 0.01);
    expect(service.isTierGraduated(1)).toBe(true);
    expect(service.getConsecutiveFailures(1)).toBe(1);

    // Second failure — should revert (regressionConsecutiveFailures default = 2)
    await service.checkForRegression(1, 0.01);
    expect(service.isTierGraduated(1)).toBe(false);
    expect(service.getConsecutiveFailures(1)).toBe(0);
  });

  it('checkForRegression does NOT revert on first failure (only reverts at threshold)', async () => {
    service.graduateTier(2);
    expect(service.isTierGraduated(2)).toBe(true);

    // Single below-threshold failure
    await service.checkForRegression(2, 0.01);

    // Should still be graduated after just one failure
    expect(service.isTierGraduated(2)).toBe(true);
    expect(service.getConsecutiveFailures(2)).toBe(1);
  });

  // ── Persistence tests ──────────────────────────────────────────────────────

  it('onModuleInit: graduated tier in DB → resolveGeneratorForTier returns OSS model', async () => {
    const mockDb = {
      searchDocuments: jest
        .fn()
        .mockImplementation(async (_index: string, filter: Record<string, unknown>) => {
          const tier = filter['tier'];
          if (tier === 3) {
            return DataProcessResult.success([
              { eventType: 'GRADUATION_STATE', tier: 3, graduated: true, consecutiveFailures: 0 },
            ]);
          }
          return DataProcessResult.success([]);
        }),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const svc = new GraduationResolverService(undefined, undefined, mockDb as any);
    await svc.onModuleInit();
    // Tier 3 was graduated in DB — should resolve to OSS model
    expect(svc.resolveGeneratorForTier(3)).toBe('deepseek-coder-v2');
    // Tier 1 had no record — should still be AI_ENGINE
    expect(svc.resolveGeneratorForTier(1)).toBe('AI_ENGINE');
  });

  it('onModuleInit: no DB records → all tiers remain AI_ENGINE (safe default)', async () => {
    const mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const svc = new GraduationResolverService(undefined, undefined, mockDb as any);
    await svc.onModuleInit();
    expect(svc.resolveGeneratorForTier(1)).toBe('AI_ENGINE');
    expect(svc.resolveGeneratorForTier(3)).toBe('AI_ENGINE');
  });

  it('graduateTier() persists state: storeDocument called with eventType=GRADUATION_STATE, graduated=true', async () => {
    const mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const svc = new GraduationResolverService(undefined, undefined, mockDb as any);
    svc.graduateTier(2);
    // Allow non-blocking persist to fire
    await new Promise((r) => setTimeout(r, 20));
    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-calibration-baseline',
      expect.objectContaining({ eventType: 'GRADUATION_STATE', tier: 2, graduated: true }),
      'graduation-state::tier-2',
    );
  });

  it('checkForRegression revert persists: storeDocument called with graduated=false', async () => {
    const mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const svc = new GraduationResolverService(undefined, undefined, mockDb as any);
    svc.graduateTier(1);
    // Clear calls from graduateTier persist
    await new Promise((r) => setTimeout(r, 20));
    (mockDb.storeDocument as jest.Mock).mockClear();

    // Trigger 2 consecutive failures to revert (threshold default = 2)
    await svc.checkForRegression(1, 0.01);
    await svc.checkForRegression(1, 0.01);
    await new Promise((r) => setTimeout(r, 20));

    const persistCall = (mockDb.storeDocument as jest.Mock).mock.calls.find(
      (c) =>
        c[0] === 'xiigen-calibration-baseline' &&
        c[1]?.['eventType'] === 'GRADUATION_STATE' &&
        c[1]?.['graduated'] === false,
    );
    expect(persistCall).toBeDefined();
    expect(persistCall![2]).toBe('graduation-state::tier-1');
  });

  it('onModuleInit: db.searchDocuments throws → DNA-3: no throw, all tiers ungraduated', async () => {
    const mockDb = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('ES down')),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const svc = new GraduationResolverService(undefined, undefined, mockDb as any);
    // Must not throw
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
    // All tiers remain ungraduated (safe default)
    expect(svc.resolveGeneratorForTier(1)).toBe('AI_ENGINE');
    expect(svc.resolveGeneratorForTier(5)).toBe('AI_ENGINE');
  });
});
