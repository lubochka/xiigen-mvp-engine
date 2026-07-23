/**
 * Tests for RagContextStation.selectSkillsForContext (SK-block injection).
 * Phase 11 — File 1 gate.
 */

import { RagContextStation, SkillBlock } from '../../src/af-stations/af4-rag-context';
import { StationInput } from '../../src/af-stations/base';

describe('RagContextStation.selectSkillsForContext', () => {
  let station: RagContextStation;

  beforeEach(() => {
    station = new RagContextStation();
  });

  it('returns SK-PLAN for iteration ≤ 2', () => {
    const input = new StationInput({ tenantId: 't1', metadata: { iteration: 1 } });
    const blocks = station.selectSkillsForContext(input);
    expect(blocks.some((b: SkillBlock) => b.key === 'SK-PLAN')).toBe(true);
  });

  it('returns SK-DNA for dna_compliance < 0.7', () => {
    const input = new StationInput({
      tenantId: 't1',
      metadata: { iteration: 99 },
      spec: { dna_compliance: 0.5 },
    });
    const blocks = station.selectSkillsForContext(input);
    expect(blocks.some((b: SkillBlock) => b.key === 'SK-DNA')).toBe(true);
  });

  it('returns SK-TEST for test_quality < 0.5', () => {
    const input = new StationInput({
      tenantId: 't1',
      metadata: { iteration: 99 },
      spec: { test_quality: 0.3, dna_compliance: 1.0 },
    });
    const blocks = station.selectSkillsForContext(input);
    expect(blocks.some((b: SkillBlock) => b.key === 'SK-TEST')).toBe(true);
  });

  it('returns SK-DOCS for is_last_step true', () => {
    const input = new StationInput({
      tenantId: 't1',
      metadata: { iteration: 99, is_last_step: true },
      spec: { dna_compliance: 1.0, test_quality: 1.0 },
    });
    const blocks = station.selectSkillsForContext(input);
    expect(blocks.some((b: SkillBlock) => b.key === 'SK-DOCS')).toBe(true);
  });

  it('never returns more than 3 blocks when all 5 conditions are triggered (MACHINE cap)', () => {
    const input = new StationInput({
      tenantId: 't1',
      spec: { dna_compliance: 0.5, test_quality: 0.3, factory_dependencies: [{}] },
      metadata: { iteration: 1, is_last_step: true },
    });
    const blocks = station.selectSkillsForContext(input);
    expect(blocks.length).toBeLessThanOrEqual(3);
  });

  it('includes skillBlocks array in execute() output data', async () => {
    const input = new StationInput({
      tenantId: 't1',
      taskType: 'generate-service',
      spec: { dna_compliance: 0.5 },
    });
    const result = await station.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data?.data?.skillBlocks)).toBe(true);
  });
});
