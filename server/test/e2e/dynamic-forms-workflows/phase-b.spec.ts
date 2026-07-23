/**
 * T630 FormSubmissionProcessor — Phase B tests
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Tests: T630-1 through T630-5
 *   T630-1: BOLA check — submitterTenantId !== form.tenantId → SubmissionRejected with UNAUTHORIZED
 *   T630-2: Validation against published schema — missing required field → validation errors
 *   T630-3: Type mismatch — submitted value type != field type → validation error
 *   T630-4: Validation errors returned as success (not failure) with error array
 *   T630-5: Submission stored before events emitted (outbox pattern)
 */

import 'reflect-metadata';
import { FormSubmissionProcessorService } from '../../../src/engine/flows/dynamic-forms-workflows/form-submission-processor.service';

describe('T630 FormSubmissionProcessor', () => {
  let service: FormSubmissionProcessorService;

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
              tenantId: 'tenant-001',
              status: 'PUBLISHED',
              fields: [
                {
                  name: 'email',
                  type: 'string',
                  required: true,
                  validationRules: { minLength: 5 },
                },
                {
                  name: 'age',
                  type: 'number',
                  required: false,
                  validationRules: {},
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

    service = new FormSubmissionProcessorService(
      mockDb as unknown as ConstructorParameters<typeof FormSubmissionProcessorService>[0],
      mockQueue as unknown as ConstructorParameters<typeof FormSubmissionProcessorService>[1],
      mockCls as unknown as ConstructorParameters<typeof FormSubmissionProcessorService>[2],
    );
  });

  // T630-1: BOLA check
  test('T630-1: BOLA check — submitterTenantId !== form.tenantId → UNAUTHORIZED (no submission stored)', async () => {
    mockCls.get.mockReturnValueOnce({ tenantId: 'tenant-999' });

    const result = await service.processSubmission({
      formId: 'form-001',
      data: { email: 'user@example.com' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNAUTHORIZED');
    // Early authorization failures do NOT trigger events (no submission stored yet)
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // T630-2: Missing required field
  test('T630-2: Missing required field → validation error', async () => {
    const result = await service.processSubmission({
      formId: 'form-002',
      data: { age: 25 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            error: 'REQUIRED_FIELD_MISSING',
          }),
        ]),
      }),
    );
  });

  // T630-3: Type mismatch
  test('T630-3: Type mismatch — field type string, submitted number → validation error', async () => {
    const result = await service.processSubmission({
      formId: 'form-003',
      data: { email: 123, age: '25' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            error: 'TYPE_MISMATCH',
          }),
        ]),
      }),
    );
  });

  // T630-4: Validation errors as success
  test('T630-4: Validation errors returned as success, never failure', async () => {
    const result = await service.processSubmission({
      formId: 'form-004',
      data: { email: 'hi' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.any(Array),
      }),
    );
  });

  // T630-5: Submission stored before events
  test('T630-5: Submission stored before events emitted (outbox pattern)', async () => {
    await service.processSubmission({
      formId: 'form-005',
      data: { email: 'user@example.com', age: 30 },
    });

    const storeCallIndex = mockDb.storeDocument.mock.invocationCallOrder[0];
    const queueCallIndex = mockQueue.enqueue.mock.invocationCallOrder[0];

    expect(storeCallIndex).toBeLessThan(queueCallIndex);
  });
});
