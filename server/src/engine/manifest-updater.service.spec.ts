/**
 * ManifestUpdaterService unit tests — SS-03
 *
 * Covers:
 *   - Fabric interface registration in both indices
 *   - Alias auto-derivation (human-readable from interface name)
 *   - Caller-provided aliases merged with auto-derived
 *   - Task type registration with TASK_TYPE capability type
 *   - Flow status update
 *   - Fail-open when ES is unreachable (errors returned, never thrown)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ManifestUpdaterService } from './manifest-updater.service';

function mockFetchSuccess() {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({ result: 'updated' }),
  } as unknown as Response);
}

describe('ManifestUpdaterService', () => {
  let updater: ManifestUpdaterService;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ManifestUpdaterService],
    }).compile();

    updater = module.get(ManifestUpdaterService);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('should register new fabric interfaces in both indices', async () => {
    fetchMock = mockFetchSuccess();

    const result = await updater.updateAfterPhaseF('FLOW-40', {
      newFabricInterfaces: [
        {
          token: 'SSE_CONNECTION_POOL',
          name: 'ISseConnectionPool',
          category: 'SSE',
          aliases: ['sse pool', 'server-sent events'],
        },
      ],
      flowStatus: 'ACTIVE',
    });

    expect(result.added).toContain('FABRIC: ISseConnectionPool');
    expect(result.errors).toHaveLength(0);

    // Verify fabric-registry upsert was called
    const registryCalls = fetchMock.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[0] === 'string' && (args[0] as string).includes('xiigen-fabric-registry'),
    );
    expect(registryCalls.length).toBeGreaterThan(0);

    const bodyArg = JSON.parse(registryCalls[0][1]?.body as string) as {
      doc: { aliases: string[] };
    };
    const aliases: string[] = bodyArg.doc?.aliases ?? [];

    // Must include: class name, token, auto-derived, and caller-provided
    expect(aliases).toContain('ISseConnectionPool');
    expect(aliases).toContain('SSE_CONNECTION_POOL');
    expect(aliases).toContain('sse pool');
    expect(aliases).toContain('server-sent events');
    // Auto-derived human-readable should also be present
    expect(aliases.some((a) => a.includes('sse connection pool') || a.includes('sse'))).toBe(true);
  });

  it('should derive human-readable alias even when caller provides none', async () => {
    fetchMock = mockFetchSuccess();

    const result = await updater.updateAfterPhaseF('FLOW-01', {
      newFabricInterfaces: [
        {
          token: 'MESSAGING_SERVICE',
          name: 'IMessagingService',
          category: 'MESSAGING',
          // no aliases provided — should auto-derive "messaging"
        },
      ],
      flowStatus: 'ACTIVE',
    });

    expect(result.added).toContain('FABRIC: IMessagingService');

    const registryCalls = fetchMock.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[0] === 'string' && (args[0] as string).includes('xiigen-fabric-registry'),
    );
    const bodyArg = JSON.parse(registryCalls[0][1]?.body as string) as {
      doc: { aliases: string[] };
    };
    const aliases: string[] = bodyArg.doc?.aliases ?? [];

    expect(aliases).toContain('messaging'); // auto-derived
    expect(aliases).toContain('IMessagingService');
    expect(aliases).toContain('MESSAGING_SERVICE');
  });

  it('should fail-open when ES is unreachable', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await updater.updateAfterPhaseF('FLOW-01', {
      flowStatus: 'ACTIVE',
    });

    // Should NOT throw — errors are returned, not propagated
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should update flow status to ACTIVE', async () => {
    fetchMock = mockFetchSuccess();

    const result = await updater.updateAfterPhaseF('FLOW-01', {
      flowStatus: 'ACTIVE',
    });

    expect(result.updated).toContain('flow-FLOW-01: ACTIVE');
  });

  it('should update flow status to PARTIAL', async () => {
    fetchMock = mockFetchSuccess();

    const result = await updater.updateAfterPhaseF('FLOW-99', {
      flowStatus: 'PARTIAL',
    });

    expect(result.updated).toContain('flow-FLOW-99: PARTIAL');
  });

  it('should register task types with TASK_TYPE capability type', async () => {
    fetchMock = mockFetchSuccess();

    const result = await updater.updateAfterPhaseF('FLOW-01', {
      newTaskTypes: ['T47', 'T48'],
      flowStatus: 'ACTIVE',
    });

    expect(result.added).toContain('TASK_TYPE: T47');
    expect(result.added).toContain('TASK_TYPE: T48');

    // Verify TASK_TYPE type was used in the upsert calls for task types
    const taskTypeCalls = fetchMock.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[0] === 'string' &&
        (args[0] as string).includes('xiigen-capability-manifest') &&
        (args[0] as string).includes('tasktype-'),
    );
    expect(taskTypeCalls.length).toBe(2);

    const body0 = JSON.parse(taskTypeCalls[0][1]?.body as string) as { doc: { type: string } };
    expect(body0.doc?.type).toBe('TASK_TYPE');
  });

  it('should handle empty phaseOutput gracefully (flow status only)', async () => {
    fetchMock = mockFetchSuccess();

    const result = await updater.updateAfterPhaseF('FLOW-01', {
      flowStatus: 'ACTIVE',
    });

    expect(result.errors).toHaveLength(0);
    expect(result.updated).toHaveLength(1);
    expect(result.added).toHaveLength(0);
  });
});
