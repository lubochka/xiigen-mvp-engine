/**
 * Tests for RagContextStation (AF-4).
 *
 * Coverage focuses on Turn 6 (MVP Plan v3, Goals 4b + 4c + 4d) — the wiring
 * between AF-4 and TenantModuleRegistry that delivers Linked-mode RAG scope
 * expansion. Existing keyword-match behaviour is exercised indirectly by the
 * DI integration tests; here we verify the new linkedModules output field.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { StationInput, StationOutput } from './base';
import { RagContextStation } from './af4-rag-context';

function makeInput(overrides: Partial<StationInput> = {}): StationInput {
  return {
    tenantId: 'tenant-A',
    taskType: 'T50',
    spec: { archetype: 'ANALYSIS', factory_dependencies: [] },
    metadata: {},
    ...overrides,
  } as StationInput;
}

describe('RagContextStation — Turn 6 linkedModules wiring', () => {
  it('degrades gracefully when no TenantModuleRegistry is injected (linkedModules=[])', async () => {
    const station = new RagContextStation();
    const result = await station.execute(makeInput());
    expect(result.isSuccess).toBe(true);
    const data = (result.data as StationOutput).data as Record<string, unknown>;
    expect(data.linkedModules).toEqual([]);
    expect(data.linkedModuleCount).toBe(0);
  });

  it('populates linkedModules from TenantModuleRegistry.listLinkedModules', async () => {
    const listLinkedModules = jest
      .fn()
      .mockResolvedValue(DataProcessResult.success(['FLOW-LINKED-1', 'FLOW-LINKED-2']));
    const registry = {
      listLinkedModules,
    } as unknown as import('../engine/tenant-module-registry.service').TenantModuleRegistry;

    const station = new RagContextStation(registry);
    const result = await station.execute(makeInput({ tenantId: 'tenant-B' }));

    expect(result.isSuccess).toBe(true);
    const data = (result.data as StationOutput).data as Record<string, unknown>;
    expect(listLinkedModules).toHaveBeenCalledWith('tenant-B');
    expect(data.linkedModules).toEqual(['FLOW-LINKED-1', 'FLOW-LINKED-2']);
    expect(data.linkedModuleCount).toBe(2);
  });

  it('falls back to empty linkedModules when registry lookup fails', async () => {
    const listLinkedModules = jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('ES_DOWN', 'cluster unreachable'));
    const registry = {
      listLinkedModules,
    } as unknown as import('../engine/tenant-module-registry.service').TenantModuleRegistry;

    const station = new RagContextStation(registry);
    const result = await station.execute(makeInput());

    // Registry failure must not fail the station — generation should proceed
    // with whatever the in-memory keyword index yields.
    expect(result.isSuccess).toBe(true);
    const data = (result.data as StationOutput).data as Record<string, unknown>;
    expect(data.linkedModules).toEqual([]);
  });

  it('rejects missing tenantId (DNA-5)', async () => {
    const station = new RagContextStation();
    const result = await station.execute({
      tenantId: '',
      taskType: 'T50',
      spec: {},
      metadata: {},
    } as StationInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });
});
