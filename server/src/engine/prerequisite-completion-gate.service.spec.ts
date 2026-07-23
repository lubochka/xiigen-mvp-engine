/**
 * PrerequisiteCompletionGateService — unit tests (SS-09)
 *
 * Covers:
 *   initializeTracking: registers tracker with correct counts
 *   recordResolution: increments counts, deduplicates, returns true on completion
 *   getTracker: returns current tracker state
 *   ES update: called when all resolved, fails gracefully
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrerequisiteCompletionGateService } from './prerequisite-completion-gate.service';

describe('PrerequisiteCompletionGateService', () => {
  let service: PrerequisiteCompletionGateService;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrerequisiteCompletionGateService],
    }).compile();

    service = module.get(PrerequisiteCompletionGateService);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  // ── initializeTracking ────────────────────────────────────────────────────

  describe('initializeTracking', () => {
    it('should register a tracker for the specId', () => {
      service.initializeTracking('spec-001', 3, 1);
      const tracker = service.getTracker('spec-001');

      expect(tracker).toBeDefined();
      expect(tracker!.specId).toBe('spec-001');
      expect(tracker!.totalAutonomousGaps).toBe(3);
      expect(tracker!.humanEscalationCount).toBe(1);
      expect(tracker!.resolvedCount).toBe(0);
      expect(tracker!.humanResolvedCount).toBe(0);
      expect(tracker!.resolvedGapIds).toHaveLength(0);
      expect(tracker!.status).toBe('TRACKING');
    });

    it('should support zero human escalations', () => {
      service.initializeTracking('spec-002', 2, 0);
      const tracker = service.getTracker('spec-002');
      expect(tracker!.humanEscalationCount).toBe(0);
      expect(tracker!.status).toBe('TRACKING');
    });
  });

  // ── recordResolution ──────────────────────────────────────────────────────

  describe('recordResolution — no tracker', () => {
    it('should return false and not throw when no tracker exists', async () => {
      const result = await service.recordResolution(
        'unknown-spec',
        'gap-1',
        'fabric.interface.ready',
      );
      expect(result).toBe(false);
    });
  });

  describe('recordResolution — autonomous gaps', () => {
    beforeEach(() => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });

    it('should increment resolvedCount for fabric.interface.ready', async () => {
      service.initializeTracking('spec-A', 2, 0);
      await service.recordResolution('spec-A', 'gap-1', 'fabric.interface.ready');

      const tracker = service.getTracker('spec-A');
      expect(tracker!.resolvedCount).toBe(1);
      expect(tracker!.humanResolvedCount).toBe(0);
    });

    it('should return true and set status=ALL_RESOLVED when all gaps resolved', async () => {
      service.initializeTracking('spec-B', 2, 0);
      await service.recordResolution('spec-B', 'gap-1', 'fabric.interface.ready');
      const result = await service.recordResolution('spec-B', 'gap-2', 'freedom.key.registered');

      expect(result).toBe(true);
      const tracker = service.getTracker('spec-B');
      expect(tracker!.status).toBe('ALL_RESOLVED');
    });

    it('should return false until last gap resolves', async () => {
      service.initializeTracking('spec-C', 3, 0);
      const r1 = await service.recordResolution('spec-C', 'gap-1', 'fabric.interface.ready');
      const r2 = await service.recordResolution('spec-C', 'gap-2', 'fabric.interface.ready');
      const r3 = await service.recordResolution('spec-C', 'gap-3', 'freedom.key.registered');

      expect(r1).toBe(false);
      expect(r2).toBe(false);
      expect(r3).toBe(true);
    });
  });

  describe('recordResolution — human escalations', () => {
    beforeEach(() => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });

    it('should increment humanResolvedCount for prereq.overlap.resolved', async () => {
      service.initializeTracking('spec-D', 1, 1);
      await service.recordResolution('spec-D', 'gap-auto', 'fabric.interface.ready');
      const r2 = await service.recordResolution('spec-D', 'gap-human', 'prereq.overlap.resolved');

      expect(r2).toBe(true);
      const tracker = service.getTracker('spec-D');
      expect(tracker!.humanResolvedCount).toBe(1);
      expect(tracker!.status).toBe('ALL_RESOLVED');
    });
  });

  describe('recordResolution — deduplication', () => {
    it('should ignore duplicate gapId resolution', async () => {
      service.initializeTracking('spec-E', 2, 0);
      await service.recordResolution('spec-E', 'gap-1', 'fabric.interface.ready');
      const duplicate = await service.recordResolution('spec-E', 'gap-1', 'fabric.interface.ready');

      expect(duplicate).toBe(false);
      const tracker = service.getTracker('spec-E');
      expect(tracker!.resolvedCount).toBe(1); // Still 1, not 2
    });
  });

  describe('ES update failure (fail-open)', () => {
    it('should return true even when ES update fails', async () => {
      fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ES down'));

      service.initializeTracking('spec-F', 1, 0);
      const result = await service.recordResolution('spec-F', 'gap-1', 'fabric.interface.ready');

      // Even with ES failure, completion is correctly detected
      expect(result).toBe(true);
    });
  });
});
