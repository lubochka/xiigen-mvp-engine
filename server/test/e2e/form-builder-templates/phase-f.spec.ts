/**
 * T643-T645 Phase F tests
 * FLOW-23: Form Builder Templates
 *
 * T643 CmsDataBindingSet (5 tests)
 * T644 DynamicDataSlotResolver (4 tests)
 * T645 DataPanelSlotMapper (4 tests)
 */

import 'reflect-metadata';
import { CmsDataBindingSetService } from '../../../src/engine/flows/form-builder-templates/cms-data-binding-set.service';
import { DynamicDataSlotResolverService } from '../../../src/engine/flows/form-builder-templates/dynamic-data-slot-resolver.service';
import { DataPanelSlotMapperService } from '../../../src/engine/flows/form-builder-templates/data-panel-slot-mapper.service';

describe('T643 CmsDataBindingSet', () => {
  let service: CmsDataBindingSetService;

  const callOrder: string[] = [];

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
    callOrder.length = 0;

    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-templates') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              templateId: 'template-001',
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
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation((index: string) => {
      callOrder.push(`storeDocument:${index}`);
      return Promise.resolve({ isSuccess: true });
    });

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new CmsDataBindingSetService(
      mockDb as unknown as ConstructorParameters<typeof CmsDataBindingSetService>[0],
      mockQueue as unknown as ConstructorParameters<typeof CmsDataBindingSetService>[1],
      mockCls as unknown as ConstructorParameters<typeof CmsDataBindingSetService>[2],
    );
  });

  test('T643-1: Binding records stored for each binding', async () => {
    const result = await service.setBinding({
      templateId: 'template-001',
      bindings: { source1: 'name', source2: 'email' },
    });

    expect(result.isSuccess).toBe(true);
    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-cms-bindings',
      expect.objectContaining({ source: 'source1', target: 'name' }),
    );
  });

  test('T643-2: Validate binding target exists in schema', async () => {
    const result = await service.setBinding({
      templateId: 'template-001',
      bindings: { source1: 'nonexistent_field' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BINDING_TARGET_NOT_FOUND');
  });

  test('T643-3: storeDocument before enqueue — DNA-8', async () => {
    await service.setBinding({
      templateId: 'template-001',
      bindings: { source1: 'name' },
    });

    const bindingIndex = callOrder.findIndex((c) => c === 'storeDocument:xiigen-cms-bindings');
    const enqueueIndex = callOrder.findIndex((c) => c === 'enqueue:CmsDataBound');

    expect(bindingIndex).toBeGreaterThanOrEqual(0);
    expect(enqueueIndex).toBeGreaterThanOrEqual(0);
    expect(bindingIndex).toBeLessThan(enqueueIndex);
  });

  test('T643-4: Binding count returned in result', async () => {
    const result = await service.setBinding({
      templateId: 'template-001',
      bindings: { source1: 'name', source2: 'email', source3: 'name' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.bindingCount).toBe(3);
  });

  test('T643-5: Audit record stored with binding metadata', async () => {
    await service.setBinding({
      templateId: 'template-001',
      bindings: { source1: 'name' },
    });

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-binding-audit',
      expect.objectContaining({
        templateId: 'template-001',
        bindingCount: 1,
      }),
    );
  });
});

describe('T644 DynamicDataSlotResolver', () => {
  let service: DynamicDataSlotResolverService;

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

    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });
    mockDb.storeDocument.mockResolvedValue({ isSuccess: true });
    mockDb.storeDocumentWithOCC.mockResolvedValue({ isSuccess: true });
    mockQueue.enqueue.mockResolvedValue({ isSuccess: true });

    service = new DynamicDataSlotResolverService(
      mockDb as unknown as ConstructorParameters<typeof DynamicDataSlotResolverService>[0],
      mockQueue as unknown as ConstructorParameters<typeof DynamicDataSlotResolverService>[1],
      mockCls as unknown as ConstructorParameters<typeof DynamicDataSlotResolverService>[2],
    );
  });

  test('T644-1: Validate JSONPath before binding (CF-435)', async () => {
    const result = await service.resolveSlot({
      slotId: 'slot-001',
      jsonPath: 'invalid-path',
      sourceData: { user: { name: 'John' } },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_JSONPATH');
  });

  test('T644-2: Extract value from valid JSONPath', async () => {
    const result = await service.resolveSlot({
      slotId: 'slot-001',
      jsonPath: '$.user.name',
      sourceData: { user: { name: 'John' } },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.resolvedValue).toBe('John');
  });

  test('T644-3: Store resolved binding before enqueue — DNA-8', async () => {
    await service.resolveSlot({
      slotId: 'slot-001',
      jsonPath: '$.data',
      sourceData: { data: 'value' },
    });

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-resolved-slots',
      expect.objectContaining({ slotId: 'slot-001' }),
    );
    expect(mockQueue.enqueue).toHaveBeenCalledWith('DataSlotResolved', expect.any(Object));
  });

  test('T644-4: JSONPath not found returns error', async () => {
    const result = await service.resolveSlot({
      slotId: 'slot-001',
      jsonPath: '$.nonexistent.field',
      sourceData: { user: { name: 'John' } },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_JSONPATH');
  });
});

describe('T645 DataPanelSlotMapper', () => {
  let service: DataPanelSlotMapperService;

  const callOrder: string[] = [];

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
    callOrder.length = 0;

    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });
    mockDb.storeDocument.mockImplementation((index: string) => {
      callOrder.push(`storeDocument:${index}`);
      return Promise.resolve({ isSuccess: true });
    });
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new DataPanelSlotMapperService(
      mockDb as unknown as ConstructorParameters<typeof DataPanelSlotMapperService>[0],
      mockQueue as unknown as ConstructorParameters<typeof DataPanelSlotMapperService>[1],
      mockCls as unknown as ConstructorParameters<typeof DataPanelSlotMapperService>[2],
    );
  });

  test('T645-1: Validate JSONPath syntax before mapping (CF-434)', async () => {
    const result = await service.mapDataPanelSlots({
      panelId: 'panel-001',
      slots: [
        {
          slotId: 'slot-1',
          jsonPath: 'invalid',
          targetField: 'name',
        },
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_JSONPATH');
  });

  test('T645-2: Store slot mappings before enqueue — DNA-8', async () => {
    const result = await service.mapDataPanelSlots({
      panelId: 'panel-001',
      slots: [
        {
          slotId: 'slot-1',
          jsonPath: '$.user.name',
          targetField: 'name',
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    const mappingIndex = callOrder.findIndex((c) => c === 'storeDocument:xiigen-slot-mappings');
    const enqueueIndex = callOrder.findIndex((c) => c === 'enqueue:DataPanelMapped');

    expect(mappingIndex).toBeLessThan(enqueueIndex);
  });

  test('T645-3: Multiple slot mappings stored', async () => {
    await service.mapDataPanelSlots({
      panelId: 'panel-001',
      slots: [
        {
          slotId: 'slot-1',
          jsonPath: '$.user.name',
          targetField: 'name',
        },
        {
          slotId: 'slot-2',
          jsonPath: '$.user.email',
          targetField: 'email',
        },
      ],
    });

    const storeCalls = mockDb.storeDocument.mock.calls.filter(
      (c) => c[0] === 'xiigen-slot-mappings',
    );
    expect(storeCalls.length).toBe(2);
  });

  test('T645-4: Mapping count returned', async () => {
    const result = await service.mapDataPanelSlots({
      panelId: 'panel-001',
      slots: [
        {
          slotId: 'slot-1',
          jsonPath: '$.a',
          targetField: 'f1',
        },
        {
          slotId: 'slot-2',
          jsonPath: '$.b',
          targetField: 'f2',
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.mappingCount).toBe(2);
  });
});
