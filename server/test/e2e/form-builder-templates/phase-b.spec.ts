/**
 * T638 TemplateVersionPublisher — Phase B tests
 * FLOW-23: Form Builder Templates
 *
 * Tests: T638-1 through T638-5
 *   T638-1: OCC publish on DRAFT → VersionPublished emitted
 *   T638-2: Publish on PUBLISHED → VersionImmutableRejected emitted
 *   T638-3: Schema evolution violation (field removed) → SchemaEvolutionInvalid
 *   T638-4: storeDocument(audit) before enqueue(VersionPublished) — DNA-8
 *   T638-5: VersionPublished payload carries version number
 */

import 'reflect-metadata';
import { TemplateVersionPublisherService } from '../../../src/engine/flows/form-builder-templates/template-version-publisher.service';

describe('T638 TemplateVersionPublisher', () => {
  let service: TemplateVersionPublisherService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    updateDocument: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
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

    mockDb.searchDocuments.mockImplementation((index: string, _filter: Record<string, unknown>) => {
      if (index === 'xiigen-templates') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              templateId: 'template-draft',
              status: 'DRAFT',
              version: 1,
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
            },
          ],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.updateDocument.mockImplementation(
      (_index: string, _id: string, _data: Record<string, unknown>) => {
        callOrder.push('updateDocument:xiigen-templates');
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockDb.storeDocumentWithOCC.mockImplementation(
      (
        index: string,
        _doc: Record<string, unknown>,
        _id?: string,
        _opts?: Record<string, unknown>,
      ) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new TemplateVersionPublisherService(
      mockDb as unknown as ConstructorParameters<typeof TemplateVersionPublisherService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TemplateVersionPublisherService>[1],
      mockCls as unknown as ConstructorParameters<typeof TemplateVersionPublisherService>[2],
    );
  });

  test('T638-1: OCC publish on DRAFT → VersionPublished emitted', async () => {
    const result = await service.publishTemplate({
      templateId: 'template-draft',
      version: 1,
    });

    expect(result.isSuccess).toBe(true);
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'VersionPublished',
      expect.objectContaining({
        templateId: 'template-draft',
        version: 2,
      }),
    );
  });

  test('T638-2: Publish on PUBLISHED → VersionImmutableRejected emitted', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [
        {
          templateId: 'template-published',
          status: 'PUBLISHED',
          version: 2,
        },
      ],
    });

    const result = await service.publishTemplate({
      templateId: 'template-published',
      version: 2,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VERSION_IMMUTABLE');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'VersionImmutableRejected',
      expect.objectContaining({
        status: 'PUBLISHED',
      }),
    );
  });

  test('T638-3: Schema evolution violation (field removed) → SchemaEvolutionInvalid', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [
        {
          templateId: 'template-evo',
          status: 'DRAFT',
          version: 1,
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      ],
    });

    const result = await service.publishTemplate({
      templateId: 'template-evo',
      version: 1,
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCHEMA_EVOLUTION_INVALID');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'SchemaEvolutionInvalid',
      expect.objectContaining({
        removedField: 'email',
      }),
    );
  });

  test('T638-4: storeDocument(audit) before enqueue(VersionPublished) — DNA-8', async () => {
    const result = await service.publishTemplate({
      templateId: 'template-draft',
      version: 1,
    });

    expect(result.isSuccess).toBe(true);

    const auditIndex = callOrder.findIndex((c) => c === 'storeDocument:xiigen-publication-audit');
    const enqueueIndex = callOrder.findIndex((c) => c === 'enqueue:VersionPublished');

    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(enqueueIndex).toBeGreaterThanOrEqual(0);
    expect(auditIndex).toBeLessThan(enqueueIndex);
  });

  test('T638-5: VersionPublished payload carries version number', async () => {
    const result = await service.publishTemplate({
      templateId: 'template-draft',
      version: 1,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.version).toBe(2);

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'VersionPublished',
      expect.objectContaining({
        version: 2,
      }),
    );
  });
});
