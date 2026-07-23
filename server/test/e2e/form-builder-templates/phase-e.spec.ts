/**
 * T641-T642 Phase E tests
 * FLOW-23: Form Builder Templates
 *
 * T641 LayoutSolverInvoke (5 tests)
 * T642 TemplateModeRenderer (6 tests)
 */

import 'reflect-metadata';
import { LayoutSolverInvokeService } from '../../../src/engine/flows/form-builder-templates/layout-solver-invoke.service';
import { TemplateModeRendererService } from '../../../src/engine/flows/form-builder-templates/template-mode-renderer.service';

describe('T641 LayoutSolverInvoke', () => {
  let service: LayoutSolverInvokeService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });
    mockDb.storeDocument.mockResolvedValue({ isSuccess: true });
    mockDb.storeDocumentWithOCC.mockResolvedValue({ isSuccess: true });

    service = new LayoutSolverInvokeService(
      mockDb as unknown as ConstructorParameters<typeof LayoutSolverInvokeService>[0],
      mockCls as unknown as ConstructorParameters<typeof LayoutSolverInvokeService>[1],
    );
  });

  test('T641-1: Pure computation — no storeDocument, returns solvedLayout', async () => {
    const result = await service.solveLayout({
      templateId: 'template-001',
      constraints: { type: 'flex', children: [] },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.solvedLayout).toBeDefined();
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  test('T641-2: Validate constraint type before solve', async () => {
    const result = await service.solveLayout({
      templateId: 'template-001',
      constraints: { type: 'invalid-type' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_CONSTRAINT_TYPE');
  });

  test('T641-3: Validate child constraints', async () => {
    const result = await service.solveLayout({
      templateId: 'template-001',
      constraints: {
        type: 'column',
        children: [{ type: 'invalid-child-type' }],
      },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_CHILD_CONSTRAINT');
  });

  test('T641-4: Solved layout includes computed dimensions', async () => {
    const result = await service.solveLayout({
      templateId: 'template-001',
      constraints: {
        type: 'flex',
        maxWidth: 500,
        maxHeight: 300,
        children: [{ type: 'row', flex: 2 }],
      },
    });

    expect(result.isSuccess).toBe(true);
    const solvedLayout = result.data?.solvedLayout as Record<string, unknown> | undefined;
    expect((solvedLayout?.dimensions as Record<string, unknown>)?.width).toBe(500);
    expect((solvedLayout?.dimensions as Record<string, unknown>)?.height).toBe(300);
    expect(solvedLayout?.children).toBeDefined();
  });

  test('T641-5: Returns solvedAt timestamp', async () => {
    const result = await service.solveLayout({
      templateId: 'template-001',
      constraints: { type: 'grid' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.solvedAt).toBeDefined();
    expect(typeof result.data?.solvedAt).toBe('string');
  });
});

describe('T642 TemplateModeRenderer', () => {
  let service: TemplateModeRendererService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
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

    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-templates') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              templateId: 'template-001',
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
              status: 'PUBLISHED',
              version: 1,
            },
          ],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockResolvedValue({ isSuccess: true });
    mockDb.storeDocumentWithOCC.mockResolvedValue({ isSuccess: true });
    mockQueue.enqueue.mockResolvedValue({ isSuccess: true });

    service = new TemplateModeRendererService(
      mockDb as unknown as ConstructorParameters<typeof TemplateModeRendererService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TemplateModeRendererService>[1],
      mockCls as unknown as ConstructorParameters<typeof TemplateModeRendererService>[2],
    );
  });

  test('T642-1: Render requires readOnly mode', async () => {
    const result = await service.renderTemplate({
      templateId: 'template-001',
      readOnly: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_MODE');
  });

  test('T642-2: Render returns canvasSnapshot', async () => {
    const result = await service.renderTemplate({
      templateId: 'template-001',
      readOnly: true,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.canvasSnapshot).toBeDefined();
    expect((result.data?.canvasSnapshot as Record<string, unknown>)?.readOnlyMode).toBe(true);
  });

  test('T642-3: Canvas snapshot includes template metadata', async () => {
    const result = await service.renderTemplate({
      templateId: 'template-001',
      readOnly: true,
    });

    expect(result.isSuccess).toBe(true);
    const snapshot = result.data?.canvasSnapshot as Record<string, unknown> | undefined;
    expect(snapshot?.templateId).toBe('template-001');
    expect(snapshot?.version).toBe(1);
    expect(snapshot?.status).toBe('PUBLISHED');
  });

  test('T642-4: Render stores audit record', async () => {
    await service.renderTemplate({
      templateId: 'template-001',
      readOnly: true,
    });

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-render-audit',
      expect.objectContaining({
        templateId: 'template-001',
        mode: 'readonly',
      }),
    );
  });

  test('T642-5: Template not found returns error', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [],
    });

    const result = await service.renderTemplate({
      templateId: 'unknown-template',
      readOnly: true,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TEMPLATE_NOT_FOUND');
  });

  test('T642-6: Render includes schema property count', async () => {
    const result = await service.renderTemplate({
      templateId: 'template-001',
      readOnly: true,
    });

    expect(result.isSuccess).toBe(true);
    const snapshot = result.data?.canvasSnapshot as Record<string, unknown> | undefined;
    const schema = snapshot?.schema as Record<string, unknown> | undefined;
    expect(schema?.propertyCount).toBe(1);
  });
});
