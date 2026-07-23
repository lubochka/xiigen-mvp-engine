/**
 * T620 CodeInjectionProcessor — Phase D tests
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Tests: T620-1 through T620-5
 *   T620-1: Version lock held → InjectionConflict emitted; no pre-write audit
 *   T620-2: Pre-write audit (PRE_WRITE phase) stored BEFORE injection — ORDER 2 verified
 *   T620-3: Injection failure → FAILED audit phase stored; no CodeInjected
 *   T620-4: storeDocument(result audit) before enqueue(CodeInjected) — DNA-8
 *   T620-5: CodeInjected payload carries required fields
 */

import 'reflect-metadata';
import { CodeInjectionProcessorService } from '../../../src/engine/flows/visual-flow-engine/code-injection-processor.service';

describe('T620 CodeInjectionProcessor', () => {
  let service: CodeInjectionProcessorService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockTenantContext = {
    getCurrentTenantId: jest.fn().mockReturnValue({
      isSuccess: true,
      data: 'tenant-injector-001',
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

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new CodeInjectionProcessorService(
      mockDb as unknown as ConstructorParameters<typeof CodeInjectionProcessorService>[0],
      mockQueue as unknown as ConstructorParameters<typeof CodeInjectionProcessorService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof CodeInjectionProcessorService>[2],
    );
  });

  // T620-1: Version lock held → InjectionConflict emitted; no pre-write audit
  test('T620-1: version lock held → InjectionConflict emitted; no pre-write audit stored', async () => {
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [
            { lockKey: 'injection-version-lock:node-001:v3', nodeId: 'node-001', version: 'v3' },
          ],
        }),
    );

    const result = await service.processInjection({
      nodeId: 'node-001',
      version: 'v3',
      payload: { code: 'function() {}' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INJECTION_CONFLICT');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'InjectionConflict',
      expect.objectContaining({
        nodeId: 'node-001',
        version: 'v3',
      }),
    );

    // No pre-write audit stored
    const auditStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-injection-audit',
    );
    expect(auditStore).toBeUndefined();
  });

  // T620-2: Pre-write audit (PRE_WRITE) stored BEFORE injection — ORDER 2
  test('T620-2: pre-write audit (PRE_WRITE phase) stored before injection results — ORDER 2 verified', async () => {
    const result = await service.processInjection({
      nodeId: 'node-002',
      version: 'v1',
      payload: { code: 'return 42;' },
    });

    expect(result.isSuccess).toBe(true);

    // Pre-write audit must appear before injection result
    const preWriteIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-injection-audit');
    const injectionResultIdx = callOrder.findIndex(
      (c) => c === 'storeDocument:xiigen-injection-results',
    );
    expect(preWriteIdx).toBeGreaterThanOrEqual(0);
    expect(injectionResultIdx).toBeGreaterThanOrEqual(0);
    expect(preWriteIdx).toBeLessThan(injectionResultIdx);

    // Verify pre-write audit has PRE_WRITE phase
    const preWriteCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) =>
        c[0] === 'xiigen-injection-audit' &&
        (c[1] as Record<string, unknown>)['phase'] === 'PRE_WRITE',
    );
    expect(preWriteCall).toBeDefined();
  });

  // T620-3: Injection failure → FAILED audit phase stored
  test('T620-3: injection failure → FAILED audit phase stored; no CodeInjected emitted', async () => {
    let storeCallCount = 0;
    mockDb.storeDocument.mockImplementation(
      (index: string, doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        storeCallCount++;
        // Fail on injection results write (lock + preWriteAudit + results = 3rd storeDocument on results index)
        if (index === 'xiigen-injection-results') {
          return Promise.reject(new Error('Injection target write failed'));
        }
        return Promise.resolve({ isSuccess: true, data: doc });
      },
    );

    const result = await service.processInjection({
      nodeId: 'node-003',
      version: 'v1',
      payload: { code: 'invalid' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INJECTION_FAILED');

    // FAILED audit phase stored (append-only)
    const failedAuditCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) =>
        c[0] === 'xiigen-injection-audit' &&
        (c[1] as Record<string, unknown>)['phase'] === 'FAILED',
    );
    expect(failedAuditCall).toBeDefined();

    // No CodeInjected emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('CodeInjected', expect.anything());

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'InjectionFailed',
      expect.objectContaining({ nodeId: 'node-003', version: 'v1' }),
    );
  });

  // T620-4: storeDocument(result audit) before enqueue(CodeInjected) — DNA-8
  test('T620-4: storeDocument(result audit COMPLETE phase) before enqueue(CodeInjected) — DNA-8 order verified', async () => {
    const result = await service.processInjection({
      nodeId: 'node-004',
      version: 'v2',
      payload: { code: 'return true;' },
    });

    expect(result.isSuccess).toBe(true);

    // Find COMPLETE audit index position
    const completeAuditIdx = callOrder.lastIndexOf('storeDocument:xiigen-injection-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:CodeInjected');
    expect(completeAuditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(completeAuditIdx).toBeLessThan(emitIdx);
  });

  // T620-5: CodeInjected payload carries required fields
  test('T620-5: CodeInjected payload carries: nodeId, version, tenantId, injectedAt', async () => {
    const result = await service.processInjection({
      nodeId: 'node-005',
      version: 'v1',
      payload: { code: 'function add(a,b) { return a+b; }' },
    });

    expect(result.isSuccess).toBe(true);

    const injectedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'CodeInjected',
    );
    expect(injectedCall).toBeDefined();
    const payload = injectedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('nodeId', 'node-005');
    expect(payload).toHaveProperty('version', 'v1');
    expect(payload).toHaveProperty('tenantId', 'tenant-injector-001');
    expect(payload).toHaveProperty('injectedAt');
  });
});
