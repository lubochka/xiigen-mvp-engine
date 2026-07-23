/**
 * T629 FormSchemaPublisher — Phase A tests
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Tests: T629-1 through T629-5
 *   T629-1: Schema DRAFT state, no fields → SchemaPublishFailed with NO_FIELDS_DEFINED
 *   T629-2: Schema field without validation rules → SchemaPublishFailed with FIELD_NO_VALIDATION_RULES
 *   T629-3: Valid schema with fields and validation rules → DRAFT→PUBLISHED transition
 *   T629-4: Published schema.fields immutable — no updates allowed on published version
 *   T629-5: SchemaPublished event emitted with schemaId, version, fieldCount
 */

import 'reflect-metadata';
import { FormSchemaPublisherService } from '../../../src/engine/flows/dynamic-forms-workflows/form-schema-publisher.service';

describe('T629 FormSchemaPublisher', () => {
  let service: FormSchemaPublisherService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-form-schemas') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              schemaId: filter['schemaId'],
              status: 'DRAFT',
              version: 1,
              fields: [
                {
                  name: 'email',
                  type: 'string',
                  required: true,
                  validationRules: { minLength: 5, maxLength: 255 },
                },
              ],
            },
          ],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation(() => Promise.resolve({ isSuccess: true }));

    mockQueue.enqueue.mockImplementation(() => Promise.resolve({ isSuccess: true }));

    service = new FormSchemaPublisherService(
      mockDb as unknown as ConstructorParameters<typeof FormSchemaPublisherService>[0],
      mockQueue as unknown as ConstructorParameters<typeof FormSchemaPublisherService>[1],
      mockCls as unknown as ConstructorParameters<typeof FormSchemaPublisherService>[2],
    );
  });

  // T629-1: Schema DRAFT, no fields
  test('T629-1: Schema with no fields → SchemaPublishFailed with NO_FIELDS_DEFINED', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({
        isSuccess: true,
        data: [{ schemaId: 'schema-001', status: 'DRAFT', version: 1, fields: [] }],
      }),
    );

    const result = await service.publishSchema({ schemaId: 'schema-001' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_FIELDS_DEFINED');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'SchemaPublishFailed',
      expect.objectContaining({
        schemaId: 'schema-001',
        reason: 'NO_FIELDS_DEFINED',
      }),
    );
  });

  // T629-2: Field without validation rules
  test('T629-2: Field without validation rules → SchemaPublishFailed', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({
        isSuccess: true,
        data: [
          {
            schemaId: 'schema-002',
            status: 'DRAFT',
            version: 1,
            fields: [
              {
                name: 'email',
                type: 'string',
                required: true,
                validationRules: {},
              },
            ],
          },
        ],
      }),
    );

    const result = await service.publishSchema({ schemaId: 'schema-002' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FIELD_NO_VALIDATION_RULES');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'SchemaPublishFailed',
      expect.objectContaining({
        reason: 'FIELD_NO_VALIDATION_RULES',
        fieldName: 'email',
      }),
    );
  });

  // T629-3: Valid schema → DRAFT→PUBLISHED
  test('T629-3: Valid schema with fields and validation rules → DRAFT→PUBLISHED', async () => {
    const result = await service.publishSchema({ schemaId: 'schema-003' });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        schemaId: 'schema-003',
        status: 'PUBLISHED',
        version: 2,
      }),
    );
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'SchemaPublished',
      expect.objectContaining({
        schemaId: 'schema-003',
        version: 2,
        fieldCount: 1,
      }),
    );
  });

  // T629-4: Published schema immutable
  test('T629-4: Published schema.fields immutable', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({
        isSuccess: true,
        data: [
          {
            schemaId: 'schema-004',
            status: 'PUBLISHED',
            version: 2,
            fields: [{ name: 'email', type: 'string', validationRules: { minLength: 5 } }],
          },
        ],
      }),
    );

    const result = await service.publishSchema({ schemaId: 'schema-004' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCHEMA_NOT_DRAFT');
  });

  // T629-5: SchemaPublished event payload
  test('T629-5: SchemaPublished event includes schemaId, version, fieldCount, publishedAt', async () => {
    await service.publishSchema({ schemaId: 'schema-005' });

    const enqueueCall = mockQueue.enqueue.mock.calls.find((call) => call[0] === 'SchemaPublished');
    expect(enqueueCall).toBeDefined();
    expect(enqueueCall![1]).toHaveProperty('schemaId', 'schema-005');
    expect(enqueueCall![1]).toHaveProperty('version');
    expect(enqueueCall![1]).toHaveProperty('fieldCount');
    expect(enqueueCall![1]).toHaveProperty('publishedAt');
  });
});
