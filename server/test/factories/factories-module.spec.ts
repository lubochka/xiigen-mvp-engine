/**
 * P6.2 Tests — FactoriesModule
 *
 * Tests: auto-registration of 6 bridge factories in FactoryRegistry,
 * correct metadata, fabric type coverage, module wiring.
 */

import { FactoryRegistry } from '../../src/factories/factory-registry';
import { FabricType, ALL_FABRIC_TYPES } from '../../src/factories/fabric-type';
import { FactoriesModule, FABRIC_BRIDGE_ENTRIES } from '../../src/factories/factories.module';
import { DataProcessResult } from '../../src/kernel/data-process-result';

describe('FactoriesModule', () => {
  let registry: FactoryRegistry;
  let module: FactoriesModule;

  beforeEach(() => {
    registry = new FactoryRegistry();
    module = new FactoriesModule(registry);
  });

  describe('onModuleInit', () => {
    it('should register exactly 6 bridge factories', () => {
      module.onModuleInit();
      expect(registry.count).toBe(6);
    });

    it('should register one factory per non-CORE fabric', () => {
      module.onModuleInit();
      const expectedFabrics = [
        FabricType.DATABASE,
        FabricType.QUEUE,
        FabricType.AI_ENGINE,
        FabricType.RAG,
        FabricType.FLOW_ENGINE,
        FabricType.SECRETS,
      ];
      for (const ft of expectedFabrics) {
        const found = registry.findByFabric(ft);
        expect(found.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should not register a CORE fabric bridge (CORE is MicroserviceBase, not a factory)', () => {
      module.onModuleInit();
      const coreFactories = registry.findByFabric(FabricType.CORE);
      expect(coreFactories).toHaveLength(0);
    });

    it('should register all factories with family=FABRIC_BRIDGES', () => {
      module.onModuleInit();
      const bridges = registry.findByFamily('FABRIC_BRIDGES');
      expect(bridges).toHaveLength(6);
    });

    it('should register all factories with status=CORE', () => {
      module.onModuleInit();
      const coreEntries = registry.findByStatus('CORE');
      expect(coreEntries).toHaveLength(6);
    });

    it('should register all factories with provider=fabric_resolver', () => {
      module.onModuleInit();
      const all = registry.listAll();
      for (const entry of all) {
        expect(entry.provider).toBe('fabric_resolver');
      }
    });

    it('should register FABRIC_DATABASE factory', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_DATABASE');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.interfaceName).toBe('IDatabaseService');
      expect(result.data!.fabricType).toBe(FabricType.DATABASE);
    });

    it('should register FABRIC_QUEUE factory', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_QUEUE');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.interfaceName).toBe('IQueueService');
      expect(result.data!.fabricType).toBe(FabricType.QUEUE);
    });

    it('should register FABRIC_AI_ENGINE factory', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_AI_ENGINE');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.interfaceName).toBe('IAiProvider');
      expect(result.data!.fabricType).toBe(FabricType.AI_ENGINE);
    });

    it('should register FABRIC_RAG factory', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_RAG');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.interfaceName).toBe('IRagService');
      expect(result.data!.fabricType).toBe(FabricType.RAG);
    });

    it('should register FABRIC_FLOW_ENGINE factory', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_FLOW_ENGINE');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.interfaceName).toBe('IFlowDefinition|IFlowOrchestrator');
      expect(result.data!.fabricType).toBe(FabricType.FLOW_ENGINE);
    });

    it('should register FABRIC_SECRETS factory', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_SECRETS');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.interfaceName).toBe('ISecretsService');
      expect(result.data!.fabricType).toBe(FabricType.SECRETS);
    });

    it('should not overwrite if called twice (duplicates rejected)', () => {
      module.onModuleInit();
      expect(registry.count).toBe(6);
      // Second init will try to register same IDs — they should silently fail
      module.onModuleInit();
      expect(registry.count).toBe(6);
    });
  });

  describe('FABRIC_BRIDGE_ENTRIES metadata', () => {
    it('should have exactly 6 entries', () => {
      expect(FABRIC_BRIDGE_ENTRIES).toHaveLength(6);
    });

    it('should have unique factoryIds', () => {
      const ids = FABRIC_BRIDGE_ENTRIES.map((e) => e.factoryId);
      expect(new Set(ids).size).toBe(6);
    });

    it('should have unique fabricTypes', () => {
      const types = FABRIC_BRIDGE_ENTRIES.map((e) => e.fabricType);
      expect(new Set(types).size).toBe(6);
    });

    it('should only use valid FabricType values', () => {
      for (const entry of FABRIC_BRIDGE_ENTRIES) {
        expect(ALL_FABRIC_TYPES).toContain(entry.fabricType);
      }
    });

    it('each entry should have at least one method', () => {
      for (const entry of FABRIC_BRIDGE_ENTRIES) {
        expect(entry.methods.length).toBeGreaterThan(0);
      }
    });

    it('each entry should have a non-empty description', () => {
      for (const entry of FABRIC_BRIDGE_ENTRIES) {
        expect(entry.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('DNA compliance', () => {
    it('all registered entries should serialize to snake_case dict (DNA-1)', () => {
      module.onModuleInit();
      const all = registry.listAll();
      for (const dict of all) {
        // DNA-1: snake_case keys
        expect(dict).toHaveProperty('factory_id');
        expect(dict).toHaveProperty('interface_name');
        expect(dict).toHaveProperty('family_id');
        expect(dict).toHaveProperty('fabric_type');
        expect(dict).not.toHaveProperty('factoryId');
        expect(dict).not.toHaveProperty('interfaceName');
      }
    });

    it('registry.get returns DataProcessResult (DNA-3)', () => {
      module.onModuleInit();
      const result = registry.get('FABRIC_DATABASE');
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });
});
