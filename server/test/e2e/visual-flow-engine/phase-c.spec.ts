/**
 * T619 NodeTypeRegistrar — Phase C tests
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Tests: T619-1 through T619-5
 *   T619-1: SETNX lock held → NodeTypeAlreadyExists emitted; no write
 *   T619-2: Successful registration → dual write (nodeType + capabilityIndex) both called
 *   T619-3: Second write failure → redis.del(lockKey) called in catch block
 *   T619-4: storeDocument(audit) before enqueue(NodeTypeRegistered) — DNA-8
 *   T619-5: NodeTypeRegistered payload carries required fields
 */

import 'reflect-metadata';
import { NodeTypeRegistrarService } from '../../../src/engine/flows/visual-flow-engine/node-type-registrar.service';

describe('T619 NodeTypeRegistrar', () => {
  let service: NodeTypeRegistrarService;

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
      data: 'tenant-operator-001',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: no existing lock
    mockDb.searchDocuments.mockImplementation((_index: string, _filter: Record<string, unknown>) =>
      Promise.resolve({ isSuccess: true, data: [] }),
    );

    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockDb.deleteDocument.mockImplementation((index: string, _id: string) => {
      callOrder.push(`deleteDocument:${index}`);
      return Promise.resolve({ isSuccess: true });
    });

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new NodeTypeRegistrarService(
      mockDb as unknown as ConstructorParameters<typeof NodeTypeRegistrarService>[0],
      mockQueue as unknown as ConstructorParameters<typeof NodeTypeRegistrarService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof NodeTypeRegistrarService>[2],
    );
  });

  // T619-1: SETNX lock held → NodeTypeAlreadyExists emitted
  test('T619-1: SETNX lock held → NodeTypeAlreadyExists emitted; no node type written', async () => {
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [{ lockKey: 'node-type-reg-lock:text-input', nodeTypeId: 'text-input' }],
        }),
    );

    const result = await service.registerNodeType({
      nodeTypeId: 'text-input',
      capabilities: ['input'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NODE_TYPE_ALREADY_EXISTS');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'NodeTypeAlreadyExists',
      expect.objectContaining({ nodeTypeId: 'text-input' }),
    );

    // No node type write
    const nodeTypeStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-node-types',
    );
    expect(nodeTypeStore).toBeUndefined();
  });

  // T619-2: Successful registration → dual write both called
  test('T619-2: successful registration → nodeType AND capabilityIndex both written', async () => {
    const result = await service.registerNodeType({
      nodeTypeId: 'number-transform',
      capabilities: ['transform', 'compute'],
    });

    expect(result.isSuccess).toBe(true);

    // Both dual-write targets called
    const nodeTypeStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-node-types',
    );
    expect(nodeTypeStore).toBeDefined();

    const capabilityStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-node-capabilities',
    );
    expect(capabilityStore).toBeDefined();
  });

  // T619-3: Second write fails → redis.del called to release lock
  test('T619-3: second write failure → redis.del(lockKey) called in catch block', async () => {
    let storeCallCount = 0;
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        storeCallCount++;
        // Fail on capability index write (third storeDocument call: lock + nodeType + capability)
        if (storeCallCount === 3) {
          return Promise.reject(new Error('Capability index write failed'));
        }
        return Promise.resolve({ isSuccess: true });
      },
    );

    const result = await service.registerNodeType({
      nodeTypeId: 'failing-node-type',
      capabilities: ['transform'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NODE_TYPE_WRITE_FAILED');

    // redis.del called to release lock
    expect(mockDb.deleteDocument).toHaveBeenCalledWith(
      'xiigen-node-type-locks',
      expect.stringContaining('node-type-reg-lock:failing-node-type'),
    );
  });

  // T619-4: storeDocument(audit) before enqueue(NodeTypeRegistered) — DNA-8
  test('T619-4: storeDocument(audit) before enqueue(NodeTypeRegistered) — DNA-8 order verified', async () => {
    const result = await service.registerNodeType({
      nodeTypeId: 'audit-test-node',
      capabilities: ['test'],
    });

    expect(result.isSuccess).toBe(true);

    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-node-type-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:NodeTypeRegistered');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T619-5: NodeTypeRegistered payload carries required fields
  test('T619-5: NodeTypeRegistered payload carries: nodeTypeId, tenantId, registeredAt', async () => {
    const result = await service.registerNodeType({
      nodeTypeId: 'output-node',
      capabilities: ['output', 'emit'],
    });

    expect(result.isSuccess).toBe(true);

    const registeredCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'NodeTypeRegistered',
    );
    expect(registeredCall).toBeDefined();
    const payload = registeredCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('nodeTypeId', 'output-node');
    expect(payload).toHaveProperty('tenantId', 'tenant-operator-001');
    expect(payload).toHaveProperty('registeredAt');
  });
});
