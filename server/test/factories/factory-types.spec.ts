/**
 * P6.1 Tests — Factory Foundation Types
 *
 * Tests: FabricType enum (8 values — 7 original + AUTH added in FLOW-01 Phase A0.5),
 *        FactoryResolutionContext, FactoryRegistryEntry, toDict (DNA-1),
 *        createResolutionContext helper.
 */

import { FabricType, ALL_FABRIC_TYPES, isValidFabricType } from '../../src/factories/fabric-type';

import {
  FactoryResolutionContext,
  createResolutionContext,
  resolutionContextToDict,
} from '../../src/factories/resolution-context';

import {
  FactoryRegistryEntry,
  createRegistryEntry,
  registryEntryToDict,
} from '../../src/factories/factory-interfaces';

// ═══════════════════════════════════════════════════════
// FabricType Enum
// ═══════════════════════════════════════════════════════

describe('FabricType', () => {
  it('should have exactly 8 fabric types (7 original + AUTH from FLOW-01 Phase A0.5)', () => {
    expect(ALL_FABRIC_TYPES).toHaveLength(8);
  });

  it.each([
    ['DATABASE', 'database'],
    ['QUEUE', 'queue'],
    ['AI_ENGINE', 'ai_engine'],
    ['RAG', 'rag'],
    ['FLOW_ENGINE', 'flow_engine'],
    ['CORE', 'core'],
    ['SECRETS', 'secrets'],
    ['AUTH', 'auth'],
  ])('should have %s = "%s"', (key, value) => {
    expect(FabricType[key as keyof typeof FabricType]).toBe(value);
  });

  it('should have unique values (no duplicates)', () => {
    const values = Object.values(FabricType);
    expect(new Set(values).size).toBe(values.length);
  });

  describe('isValidFabricType()', () => {
    it('should accept all 8 valid fabric types', () => {
      for (const ft of ALL_FABRIC_TYPES) {
        expect(isValidFabricType(ft)).toBe(true);
      }
    });

    it('should reject invalid strings', () => {
      expect(isValidFabricType('nosql')).toBe(false);
      expect(isValidFabricType('')).toBe(false);
      expect(isValidFabricType('DATABASE')).toBe(false); // uppercase
    });
  });
});

// ═══════════════════════════════════════════════════════
// FactoryResolutionContext
// ═══════════════════════════════════════════════════════

describe('FactoryResolutionContext', () => {
  describe('createResolutionContext()', () => {
    it('should create with required fields and defaults', () => {
      const ctx = createResolutionContext({
        tenantId: 'acme',
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        fabricType: FabricType.DATABASE,
      });
      expect(ctx.tenantId).toBe('acme');
      expect(ctx.factoryId).toBe('F166');
      expect(ctx.interfaceName).toBe('IInventoryService');
      expect(ctx.fabricType).toBe(FabricType.DATABASE);
      expect(ctx.provider).toBeUndefined();
      expect(ctx.config).toEqual({});
      expect(ctx.fallbackProviders).toEqual([]);
    });

    it('should allow overriding optional fields', () => {
      const ctx = createResolutionContext({
        tenantId: 'acme',
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        fabricType: FabricType.DATABASE,
        provider: 'postgresql',
        config: { index: 'inventory' },
        fallbackProviders: ['in_memory'],
      });
      expect(ctx.provider).toBe('postgresql');
      expect(ctx.config).toEqual({ index: 'inventory' });
      expect(ctx.fallbackProviders).toEqual(['in_memory']);
    });
  });

  describe('resolutionContextToDict() — DNA-1', () => {
    it('should serialize to snake_case dict', () => {
      const ctx = createResolutionContext({
        tenantId: 'acme',
        factoryId: 'F170',
        interfaceName: 'IListingService',
        fabricType: FabricType.AI_ENGINE,
        provider: 'claude',
        config: { temperature: 0.5 },
        fallbackProviders: ['gpt'],
      });
      const dict = resolutionContextToDict(ctx);
      expect(dict['tenant_id']).toBe('acme');
      expect(dict['factory_id']).toBe('F170');
      expect(dict['interface_name']).toBe('IListingService');
      expect(dict['fabric_type']).toBe('ai_engine');
      expect(dict['provider']).toBe('claude');
      expect(dict['config']).toEqual({ temperature: 0.5 });
      expect(dict['fallback_providers']).toEqual(['gpt']);
    });

    it('should use null for missing provider', () => {
      const ctx = createResolutionContext({
        tenantId: 'x',
        factoryId: 'F1',
        interfaceName: 'IFoo',
        fabricType: FabricType.CORE,
      });
      const dict = resolutionContextToDict(ctx);
      expect(dict['provider']).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════
// FactoryRegistryEntry
// ═══════════════════════════════════════════════════════

describe('FactoryRegistryEntry', () => {
  describe('createRegistryEntry()', () => {
    it('should create with required fields and defaults', () => {
      const entry = createRegistryEntry({
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        familyId: 'Family-25',
        fabricType: FabricType.DATABASE,
      });
      expect(entry.factoryId).toBe('F166');
      expect(entry.interfaceName).toBe('IInventoryService');
      expect(entry.familyId).toBe('Family-25');
      expect(entry.fabricType).toBe(FabricType.DATABASE);
      expect(entry.provider).toBe('stub');
      expect(entry.description).toBe('');
      expect(entry.methods).toEqual([]);
      expect(entry.status).toBe('PLANNED');
      expect(entry.version).toBe('1.0.0');
      expect(entry.config).toEqual({});
    });

    it('should allow overriding all fields', () => {
      const entry = createRegistryEntry({
        factoryId: 'F170',
        interfaceName: 'IListingGeneratorService',
        familyId: 'Family-25',
        fabricType: FabricType.AI_ENGINE,
        provider: 'llm',
        description: 'Generates marketplace listings',
        methods: ['generate', 'review'],
        status: 'ACTIVE',
        version: '2.0.0',
        config: { temperature: 0.5 },
      });
      expect(entry.provider).toBe('llm');
      expect(entry.status).toBe('ACTIVE');
      expect(entry.methods).toEqual(['generate', 'review']);
    });
  });

  describe('registryEntryToDict() — DNA-1', () => {
    it('should serialize to snake_case dict', () => {
      const entry = createRegistryEntry({
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        familyId: 'Family-25',
        fabricType: FabricType.DATABASE,
        provider: 'postgresql',
        description: 'Inventory data store',
      });
      const dict = registryEntryToDict(entry);
      expect(dict['factory_id']).toBe('F166');
      expect(dict['interface_name']).toBe('IInventoryService');
      expect(dict['family_id']).toBe('Family-25');
      expect(dict['fabric_type']).toBe('database');
      expect(dict['provider']).toBe('postgresql');
      expect(dict['description']).toBe('Inventory data store');
      expect(dict['methods']).toEqual([]);
      expect(dict['status']).toBe('PLANNED');
      expect(dict['version']).toBe('1.0.0');
      expect(dict['config']).toEqual({});
    });

    it('should not share reference with original', () => {
      const entry = createRegistryEntry({
        factoryId: 'F1',
        interfaceName: 'IFoo',
        familyId: 'Fam-1',
        fabricType: FabricType.CORE,
        config: { key: 'val' },
      });
      const dict = registryEntryToDict(entry);
      (dict['config'] as any)['injected'] = true;
      expect(entry.config).toEqual({ key: 'val' }); // not mutated
    });
  });
});
