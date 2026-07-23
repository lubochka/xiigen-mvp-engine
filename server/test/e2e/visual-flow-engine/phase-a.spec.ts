/**
 * T617 FlowCanvasWriter — Phase A tests
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Tests: T617-1 through T617-5
 *   T617-1: BOLA violation → FlowCanvasUpdateFailed with BOLA_VIOLATION; no write
 *   T617-2: FLOW_IMMUTABLE — published flow write attempt → FlowImmutableRejected
 *   T617-3: DRAFT flow write → canvas updated and FlowCanvasUpdated emitted
 *   T617-4: storeDocument(audit) called before enqueue(FlowCanvasUpdated) — DNA-8
 *   T617-5: FlowCanvasUpdated payload carries required fields
 */

import 'reflect-metadata';
import { FlowCanvasWriterService } from '../../../src/engine/flows/visual-flow-engine/flow-canvas-writer.service';

describe('T617 FlowCanvasWriter', () => {
  let service: FlowCanvasWriterService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    deleteDocument: jest.fn(),
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

    // Default: flow exists and belongs to the current tenant in DRAFT state
    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-flow-canvases') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              flowId: filter['flowId'],
              tenantId: 'tenant-owner-001',
              status: 'DRAFT',
              version: '1',
              nodes: ['n1', 'n2'],
              edges: [],
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

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new FlowCanvasWriterService(
      mockDb as unknown as ConstructorParameters<typeof FlowCanvasWriterService>[0],
      mockQueue as unknown as ConstructorParameters<typeof FlowCanvasWriterService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof FlowCanvasWriterService>[2],
    );
  });

  // T617-1: BOLA violation — different tenant → FlowCanvasUpdateFailed
  test('T617-1: BOLA violation → FlowCanvasUpdateFailed emitted; no canvas write', async () => {
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [
            {
              flowId: 'flow-001',
              tenantId: 'tenant-other-999',
              status: 'DRAFT',
              version: '1',
            },
          ],
        }),
    );

    const result = await service.writeCanvas({
      flowId: 'flow-001',
      canvasData: { nodes: ['n1', 'n2'] },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BOLA_VIOLATION');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'FlowCanvasUpdateFailed',
      expect.objectContaining({
        reason: 'BOLA_VIOLATION',
        flowId: 'flow-001',
      }),
    );

    // No canvas storeDocument
    const canvasStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-flow-canvases',
    );
    expect(canvasStore).toBeUndefined();
  });

  // T617-2: FLOW_IMMUTABLE — published flow write attempt → FlowImmutableRejected
  test('T617-2: FLOW_IMMUTABLE guard — published flow write → FlowImmutableRejected emitted; no write', async () => {
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [
            {
              flowId: 'flow-002',
              tenantId: 'tenant-owner-001',
              status: 'PUBLISHED',
              version: '3',
            },
          ],
        }),
    );

    const result = await service.writeCanvas({
      flowId: 'flow-002',
      canvasData: { nodes: ['n1'] },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FLOW_IMMUTABLE');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'FlowImmutableRejected',
      expect.objectContaining({
        flowId: 'flow-002',
        status: 'PUBLISHED',
      }),
    );

    // No canvas write
    const canvasStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-flow-canvases',
    );
    expect(canvasStore).toBeUndefined();
  });

  // T617-3: DRAFT flow write → canvas updated
  test('T617-3: DRAFT flow write succeeds — canvas updated and FlowCanvasUpdated emitted', async () => {
    const result = await service.writeCanvas({
      flowId: 'flow-003',
      canvasData: { nodes: ['n1', 'n2', 'n3'] },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('status', 'DRAFT');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'FlowCanvasUpdated',
      expect.objectContaining({ flowId: 'flow-003' }),
    );
  });

  // T617-4: storeDocument(audit) before enqueue(FlowCanvasUpdated) — DNA-8
  test('T617-4: storeDocument(audit) called before enqueue(FlowCanvasUpdated) — DNA-8 order verified', async () => {
    const result = await service.writeCanvas({
      flowId: 'flow-004',
      canvasData: { nodes: ['n1'] },
    });

    expect(result.isSuccess).toBe(true);

    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-canvas-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:FlowCanvasUpdated');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T617-5: FlowCanvasUpdated payload carries required fields
  test('T617-5: FlowCanvasUpdated payload carries: flowId, tenantId, updatedAt', async () => {
    const result = await service.writeCanvas({
      flowId: 'flow-005',
      canvasData: { nodes: ['n1'] },
    });

    expect(result.isSuccess).toBe(true);

    const updatedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'FlowCanvasUpdated',
    );
    expect(updatedCall).toBeDefined();
    const payload = updatedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('flowId', 'flow-005');
    expect(payload).toHaveProperty('tenantId', 'tenant-owner-001');
    expect(payload).toHaveProperty('updatedAt');
  });
});
