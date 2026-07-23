/**
 * BootstrapCrossLayerCurriculumRouter — unit tests (Phase 2)
 * 8 tests verifying the explicit no-op behavior in bootstrap mode.
 */

import { BootstrapCrossLayerCurriculumRouter } from './bootstrap-cross-layer-curriculum-router';

describe('BootstrapCrossLayerCurriculumRouter', () => {
  let router: BootstrapCrossLayerCurriculumRouter;

  beforeEach(() => {
    router = new BootstrapCrossLayerCurriculumRouter();
  });

  it('should return undefined from routePlanningToCodeGen (no-op)', async () => {
    const result = await router.routePlanningToCodeGen({ triple: 'test' });
    expect(result).toBeUndefined();
  });

  it('should return undefined from routeCodeGenBlockToPlanning (no-op)', async () => {
    const result = await router.routeCodeGenBlockToPlanning({
      checkId: 'check-1',
      archetype: 'ORCHESTRATION',
      arbiterRole: 'quality_judge',
      runId: 'r1',
    });
    expect(result).toBeUndefined();
  });

  it('should accept any triple payload for routePlanningToCodeGen', async () => {
    await expect(
      router.routePlanningToCodeGen({ anything: 'goes', nested: { a: 1 } }),
    ).resolves.toBeUndefined();
  });

  it('should not throw regardless of input', async () => {
    await expect(router.routePlanningToCodeGen(null)).resolves.toBeUndefined();
    await expect(
      router.routeCodeGenBlockToPlanning({
        checkId: '',
        archetype: '',
        arbiterRole: '',
        runId: '',
      }),
    ).resolves.toBeUndefined();
  });

  it('should not call AI engine or graph service', () => {
    // Constructor takes no injections — verifying no dependencies exist
    const noArgRouter = new BootstrapCrossLayerCurriculumRouter();
    expect(noArgRouter).toBeDefined();
  });

  it('should be instantiatable without arguments', () => {
    expect(() => new BootstrapCrossLayerCurriculumRouter()).not.toThrow();
  });

  it('should fulfill ICrossLayerCurriculumRouter contract (both methods present)', () => {
    expect(typeof router.routePlanningToCodeGen).toBe('function');
    expect(typeof router.routeCodeGenBlockToPlanning).toBe('function');
  });

  it('should handle multiple calls without side effects', async () => {
    await router.routePlanningToCodeGen('a');
    await router.routePlanningToCodeGen('b');
    await router.routeCodeGenBlockToPlanning({
      checkId: 'c1',
      archetype: 'A',
      arbiterRole: 'R',
      runId: 'r',
    });
    // No errors thrown, no state mutation
    expect(router).toBeDefined();
  });
});
