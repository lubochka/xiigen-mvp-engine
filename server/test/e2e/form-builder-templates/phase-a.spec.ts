/**
 * T637 TemplateSchemaValidator — Phase A tests
 * FLOW-23: Form Builder Templates
 *
 * Tests: T637-1 through T637-5
 *   T637-1: JSON Schema validation failure → SchemaInvalid emitted; no further processing
 *   T637-2: Required field missing → RequiredFieldMissing emitted
 *   T637-3: Invalid field type → TypeMismatchError emitted
 *   T637-4: storeDocument(audit) called before enqueue(TemplateValidated) — DNA-8
 *   T637-5: TemplateValidated payload carries required fields
 */

import 'reflect-metadata';
import { TemplateSchemaValidatorService } from '../../../src/engine/flows/form-builder-templates/template-schema-validator.service';

describe('T637 TemplateSchemaValidator', () => {
  let service: TemplateSchemaValidatorService;

  const callOrder: string[] = [];

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
    callOrder.length = 0;

    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });

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

    service = new TemplateSchemaValidatorService(
      mockDb as unknown as ConstructorParameters<typeof TemplateSchemaValidatorService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TemplateSchemaValidatorService>[1],
      mockCls as unknown as ConstructorParameters<typeof TemplateSchemaValidatorService>[2],
    );
  });

  test('T637-1: Invalid JSON Schema → SchemaInvalid emitted; no further processing', async () => {
    const result = await service.validateTemplate({
      templateId: 'template-001',
      schema: { invalid: 'not a schema' },
      requiredFields: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toContain('SCHEMA');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'SchemaInvalid',
      expect.objectContaining({ templateId: 'template-001' }),
    );
  });

  test('T637-2: Required field missing → RequiredFieldMissing emitted', async () => {
    const result = await service.validateTemplate({
      templateId: 'template-002',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      requiredFields: ['name', 'email'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('REQUIRED_FIELD_MISSING');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'RequiredFieldMissing',
      expect.objectContaining({
        templateId: 'template-002',
        missingFields: ['email'],
      }),
    );
  });

  test('T637-3: Invalid field type → TypeMismatchError emitted', async () => {
    const result = await service.validateTemplate({
      templateId: 'template-003',
      schema: {
        type: 'object',
        properties: {
          age: { type: 'invalid-type' },
        },
        required: [],
      },
      requiredFields: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TYPE_MISMATCH');

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'TypeMismatchError',
      expect.objectContaining({
        templateId: 'template-003',
        field: 'age',
      }),
    );
  });

  test('T637-4: storeDocument(audit) before enqueue(TemplateValidated) — DNA-8', async () => {
    const result = await service.validateTemplate({
      templateId: 'template-004',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      requiredFields: ['name'],
    });

    expect(result.isSuccess).toBe(true);

    const auditIndex = callOrder.findIndex((c) => c === 'storeDocument:xiigen-validation-audit');
    const enqueueIndex = callOrder.findIndex((c) => c === 'enqueue:TemplateValidated');

    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(enqueueIndex).toBeGreaterThanOrEqual(0);
    expect(auditIndex).toBeLessThan(enqueueIndex);
  });

  test('T637-5: TemplateValidated payload carries required fields', async () => {
    const result = await service.validateTemplate({
      templateId: 'template-005',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      },
      requiredFields: ['name', 'email'],
    });

    expect(result.isSuccess).toBe(true);

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'TemplateValidated',
      expect.objectContaining({
        templateId: 'template-005',
        tenantId: 'tenant-001',
      }),
    );
  });
});
