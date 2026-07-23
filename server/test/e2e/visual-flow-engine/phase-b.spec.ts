/**
 * T618 FlowPublicationOrchestrator — Phase B tests
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Tests: T618-1 through T618-5
 *   T618-1: Cycle in graph → CycleDetected emitted; no publication
 *   T618-2: Type incompatible edge → TypeMismatch emitted; no publication
 *   T618-3: OCC version conflict → FlowPublicationConflict; no publication
 *   T618-4: storeDocument(audit) before enqueue(FlowPublished) — DNA-8
 *   T618-5: FlowPublished payload carries required fields
 */

import 'reflect-metadata';
import { FlowPublicationOrchestratorService } from '../../../src/engine/flows/visual-flow-engine/flow-publication-orchestrator.service';

describe('T618 FlowPublicationOrchestrator', () => {
  let service: FlowPublicationOrchestratorService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockTenantContext = {
    getCurrentTenantId: jest.fn().mockReturnValue({
      isSuccess: true,
      data: 'tenant-owner-001',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: flow with acyclic graph and compatible edge types
    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-flow-canvases') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              flowId: filter['flowId'],
              tenantId: 'tenant-owner-001',
              status: 'DRAFT',
              version: '2',
              nodes: ['n1', 'n2', 'n3'],
              edges: [
                { from: 'n1', to: 'n2', sourceOutputType: 'string', targetInputType: 'string' },
                { from: 'n2', to: 'n3', sourceOutputType: 'number', targetInputType: 'number' },
              ],
            },
          ],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        return Promise.resolve({ isSuccess: true, data: { seqNo: 1, primaryTerm: 1 } });
      },
    );

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new FlowPublicationOrchestratorService(
      mockDb as unknown as ConstructorParameters<typeof FlowPublicationOrchestratorService>[0],
      mockQueue as unknown as ConstructorParameters<typeof FlowPublicationOrchestratorService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof FlowPublicationOrchestratorService>[2],
    );
  });

  // T618-1: Cycle in graph → CycleDetected emitted; no publication
  test('T618-1: cyclic graph → CycleDetected emitted; no FlowPublished', async () => {
    // Graph: n1→n2→n3→n1 (cycle)
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [
            {
              flowId: 'flow-pub-001',
              tenantId: 'tenant-owner-001',
              status: 'DRAFT',
              version: '1',
              nodes: ['n1', 'n2', 'n3'],
              edges: [
                { from: 'n1', to: 'n2' },
                { from: 'n2', to: 'n3' },
                { from: 'n3', to: 'n1' }, // cycle!
              ],
            },
          ],
        }),
    );

    const result = await service.publishFlow({
      flowId: 'flow-pub-001',
      expectedVersion: '1',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CYCLE_DETECTED');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'CycleDetected',
      expect.objectContaining({ flowId: 'flow-pub-001' }),
    );

    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('FlowPublished', expect.anything());
  });

  // T618-2: Type incompatible edge → TypeMismatch emitted
  test('T618-2: type-incompatible edge → TypeMismatch emitted; no FlowPublished', async () => {
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [
            {
              flowId: 'flow-pub-002',
              tenantId: 'tenant-owner-001',
              status: 'DRAFT',
              version: '1',
              nodes: ['n1', 'n2'],
              edges: [
                {
                  from: 'n1',
                  to: 'n2',
                  sourceOutputType: 'string',
                  targetInputType: 'number', // incompatible!
                },
              ],
            },
          ],
        }),
    );

    const result = await service.publishFlow({
      flowId: 'flow-pub-002',
      expectedVersion: '1',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TYPE_MISMATCH');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'TypeMismatch',
      expect.objectContaining({
        flowId: 'flow-pub-002',
        sourceOutputType: 'string',
        targetInputType: 'number',
      }),
    );

    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('FlowPublished', expect.anything());
  });

  // T618-3: OCC version conflict → FlowPublicationConflict
  test('T618-3: OCC version conflict → FlowPublicationConflict; no FlowPublished', async () => {
    const result = await service.publishFlow({
      flowId: 'flow-pub-003',
      expectedVersion: '99', // wrong version; actual is '2'
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OCC_CONFLICT');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'FlowPublicationConflict',
      expect.objectContaining({
        flowId: 'flow-pub-003',
        expectedVersion: '99',
      }),
    );

    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('FlowPublished', expect.anything());
  });

  // T618-4: storeDocument(audit) before enqueue(FlowPublished) — DNA-8
  test('T618-4: storeDocument(audit) called before enqueue(FlowPublished) — DNA-8 order verified', async () => {
    const result = await service.publishFlow({
      flowId: 'flow-pub-004',
      expectedVersion: '2',
    });

    expect(result.isSuccess).toBe(true);

    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-publication-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:FlowPublished');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T618-5: FlowPublished payload carries required fields
  test('T618-5: FlowPublished payload carries: flowId, tenantId, version, publishedAt', async () => {
    const result = await service.publishFlow({
      flowId: 'flow-pub-005',
      expectedVersion: '2',
    });

    expect(result.isSuccess).toBe(true);

    const publishedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'FlowPublished',
    );
    expect(publishedCall).toBeDefined();
    const payload = publishedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('flowId', 'flow-pub-005');
    expect(payload).toHaveProperty('tenantId', 'tenant-owner-001');
    expect(payload).toHaveProperty('version');
    expect(payload).toHaveProperty('publishedAt');
  });
});
