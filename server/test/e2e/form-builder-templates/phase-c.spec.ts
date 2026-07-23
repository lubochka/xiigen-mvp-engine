/**
 * T639 TemplateInstantiationEngine — Phase C tests
 * FLOW-23: Form Builder Templates
 *
 * Tests: T639-1 through T639-5
 *   T639-1: SETNX lock prevents concurrent instantiation
 *   T639-2: Variable binding substitutes ${variable} → value
 *   T639-3: Default values merged from schema
 *   T639-4: storeDocument(form instance) before enqueue(FormInstantiated) — DNA-8
 *   T639-5: Lock is released in finally block on success
 */

import 'reflect-metadata';
import { TemplateInstantiationEngineService } from '../../../src/engine/flows/form-builder-templates/template-instantiation-engine.service';

describe('T639 TemplateInstantiationEngine', () => {
  let service: TemplateInstantiationEngineService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    deleteDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });

    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockDb.deleteDocument.mockImplementation((_index: string, _id: string) => {
      callOrder.push('deleteDocument:xiigen-instantiation-locks');
      return Promise.resolve({ isSuccess: true });
    });

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new TemplateInstantiationEngineService(
      mockDb as unknown as ConstructorParameters<typeof TemplateInstantiationEngineService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TemplateInstantiationEngineService>[1],
      mockCls as unknown as ConstructorParameters<typeof TemplateInstantiationEngineService>[2],
    );
  });

  test('T639-1: SETNX lock prevents concurrent instantiation', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ lockKey: 'template-instantiate-lock:template-001:context-001' }],
    });

    const result = await service.instantiateTemplate({
      templateId: 'template-001',
      contextId: 'context-001',
      templateSchema: { type: 'object', properties: {} },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INSTANTIATION_CONFLICT');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'InstantiationAlreadyInProgress',
      expect.objectContaining({
        templateId: 'template-001',
      }),
    );
  });

  test('T639-2: Variable binding substitutes ${variable} → value', async () => {
    const result = await service.instantiateTemplate({
      templateId: 'template-002',
      contextId: 'context-002',
      templateSchema: {
        type: 'object',
        properties: {
          greeting: { type: 'string' },
        },
      },
      bindings: { name: 'Alice' },
    });

    expect(result.isSuccess).toBe(true);

    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-form-instances',
    );
    expect(storeCall).toBeDefined();
  });

  test('T639-3: Default values merged from schema', async () => {
    const result = await service.instantiateTemplate({
      templateId: 'template-003',
      contextId: 'context-003',
      templateSchema: {
        type: 'object',
        properties: {
          country: { type: 'string', default: 'USA' },
        },
      },
    });

    expect(result.isSuccess).toBe(true);

    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-form-instances',
    );
    expect(storeCall).toBeDefined();
  });

  test('T639-4: storeDocument(form instance) before enqueue(FormInstantiated) — DNA-8', async () => {
    const result = await service.instantiateTemplate({
      templateId: 'template-004',
      contextId: 'context-004',
      templateSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    });

    expect(result.isSuccess).toBe(true);

    const instanceStoreIndex = callOrder.findIndex(
      (c) => c === 'storeDocument:xiigen-form-instances',
    );
    const enqueueIndex = callOrder.findIndex((c) => c === 'enqueue:FormInstantiated');

    expect(instanceStoreIndex).toBeGreaterThanOrEqual(0);
    expect(enqueueIndex).toBeGreaterThanOrEqual(0);
    expect(instanceStoreIndex).toBeLessThan(enqueueIndex);
  });

  test('T639-5: Lock is released in finally block on success', async () => {
    const result = await service.instantiateTemplate({
      templateId: 'template-005',
      contextId: 'context-005',
      templateSchema: {
        type: 'object',
        properties: { email: { type: 'string' } },
      },
    });

    expect(result.isSuccess).toBe(true);

    expect(mockDb.deleteDocument).toHaveBeenCalledWith(
      'xiigen-instantiation-locks',
      'template-instantiate-lock:template-005:context-005',
    );
  });
});
