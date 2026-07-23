/**
 * P6.1 Tests — FactoryRegistry
 *
 * Tests: register (success, duplicate rejection, invalid entry),
 *        get (found, not found), findByFamily, findByFabric, findByStatus,
 *        updateStatus, listAll (DNA-1), count, has, clear.
 *        DNA-3: all returns are DataProcessResult.
 */

import { FactoryRegistry } from '../../src/factories/factory-registry';
import { FabricType } from '../../src/factories/fabric-type';
import { createRegistryEntry, FactoryRegistryEntry } from '../../src/factories/factory-interfaces';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeEntry(
  factoryId: string,
  fabricType: FabricType = FabricType.DATABASE,
  familyId = 'Family-25',
  status = 'PLANNED',
): FactoryRegistryEntry {
  return createRegistryEntry({
    factoryId,
    interfaceName: `I${factoryId}Service`,
    familyId,
    fabricType,
    status,
  });
}

describe('FactoryRegistry', () => {
  let registry: FactoryRegistry;

  beforeEach(() => {
    registry = new FactoryRegistry();
  });

  // ── register ──────────────────────────────────────

  describe('register()', () => {
    it('should register a factory entry successfully', () => {
      const result = registry.register(makeEntry('F166'));
      expect(result.isSuccess).toBe(true);
      expect(registry.count).toBe(1);
    });

    it('should reject duplicate factory IDs', () => {
      registry.register(makeEntry('F166'));
      const result = registry.register(makeEntry('F166'));
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('FACTORY_EXISTS');
    });

    it('should reject entry with empty factoryId', () => {
      const entry = createRegistryEntry({
        factoryId: '',
        interfaceName: 'IFoo',
        familyId: 'Fam',
        fabricType: FabricType.CORE,
      });
      const result = registry.register(entry);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_ENTRY');
    });

    it('should register multiple entries', () => {
      registry.register(makeEntry('F166'));
      registry.register(makeEntry('F167'));
      registry.register(makeEntry('F168'));
      expect(registry.count).toBe(3);
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = registry.register(makeEntry('F1'));
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── get ────────────────────────────────────────────

  describe('get()', () => {
    it('should return registered entry', () => {
      const entry = makeEntry('F166', FabricType.DATABASE, 'Family-25');
      registry.register(entry);
      const result = registry.get('F166');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.factoryId).toBe('F166');
      expect(result.data!.fabricType).toBe(FabricType.DATABASE);
    });

    it('should return failure for unregistered factory', () => {
      const result = registry.get('F999');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('FACTORY_NOT_FOUND');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      expect(registry.get('F1')).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── findByFamily ──────────────────────────────────

  describe('findByFamily()', () => {
    it('should return entries matching family', () => {
      registry.register(makeEntry('F166', FabricType.DATABASE, 'Family-25'));
      registry.register(makeEntry('F167', FabricType.DATABASE, 'Family-25'));
      registry.register(makeEntry('F168', FabricType.QUEUE, 'Family-26'));

      const result = registry.findByFamily('Family-25');
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.familyId === 'Family-25')).toBe(true);
    });

    it('should return empty array for unknown family', () => {
      expect(registry.findByFamily('Family-99')).toEqual([]);
    });
  });

  // ── findByFabric ──────────────────────────────────

  describe('findByFabric()', () => {
    it('should return entries matching fabric type', () => {
      registry.register(makeEntry('F166', FabricType.DATABASE));
      registry.register(makeEntry('F167', FabricType.DATABASE));
      registry.register(makeEntry('F168', FabricType.QUEUE));
      registry.register(makeEntry('F170', FabricType.AI_ENGINE));

      const dbEntries = registry.findByFabric(FabricType.DATABASE);
      expect(dbEntries).toHaveLength(2);

      const queueEntries = registry.findByFabric(FabricType.QUEUE);
      expect(queueEntries).toHaveLength(1);

      const aiEntries = registry.findByFabric(FabricType.AI_ENGINE);
      expect(aiEntries).toHaveLength(1);
    });

    it('should return empty for unused fabric type', () => {
      registry.register(makeEntry('F1', FabricType.DATABASE));
      expect(registry.findByFabric(FabricType.SECRETS)).toEqual([]);
    });
  });

  // ── findByStatus ──────────────────────────────────

  describe('findByStatus()', () => {
    it('should return entries matching status', () => {
      registry.register(makeEntry('F166', FabricType.DATABASE, 'Fam', 'ACTIVE'));
      registry.register(makeEntry('F167', FabricType.DATABASE, 'Fam', 'PLANNED'));
      registry.register(makeEntry('F168', FabricType.DATABASE, 'Fam', 'ACTIVE'));

      expect(registry.findByStatus('ACTIVE')).toHaveLength(2);
      expect(registry.findByStatus('PLANNED')).toHaveLength(1);
      expect(registry.findByStatus('RETIRED')).toHaveLength(0);
    });
  });

  // ── updateStatus ──────────────────────────────────

  describe('updateStatus()', () => {
    it('should update existing entry status', () => {
      registry.register(makeEntry('F166'));
      const result = registry.updateStatus('F166', 'ACTIVE');
      expect(result.isSuccess).toBe(true);
      expect(registry.get('F166').data!.status).toBe('ACTIVE');
    });

    it('should support promotion ladder transitions', () => {
      registry.register(makeEntry('F166'));
      registry.updateStatus('F166', 'GENERATED');
      registry.updateStatus('F166', 'INJECTED');
      registry.updateStatus('F166', 'MINIMAL');
      registry.updateStatus('F166', 'CORE');
      expect(registry.get('F166').data!.status).toBe('CORE');
    });

    it('should return failure for unknown factory', () => {
      const result = registry.updateStatus('F999', 'ACTIVE');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('FACTORY_NOT_FOUND');
    });
  });

  // ── has ────────────────────────────────────────────

  describe('has()', () => {
    it('should return true for registered factory', () => {
      registry.register(makeEntry('F166'));
      expect(registry.has('F166')).toBe(true);
    });

    it('should return false for unregistered factory', () => {
      expect(registry.has('F999')).toBe(false);
    });
  });

  // ── listAll ───────────────────────────────────────

  describe('listAll()', () => {
    it('should return all entries as dicts (DNA-1)', () => {
      registry.register(makeEntry('F166', FabricType.DATABASE));
      registry.register(makeEntry('F167', FabricType.QUEUE));
      const all = registry.listAll();
      expect(all).toHaveLength(2);
      // Verify snake_case keys (DNA-1)
      expect(all[0]['factory_id']).toBeDefined();
      expect(all[0]['interface_name']).toBeDefined();
      expect(all[0]['family_id']).toBeDefined();
      expect(all[0]['fabric_type']).toBeDefined();
    });

    it('should return empty array initially', () => {
      expect(registry.listAll()).toEqual([]);
    });
  });

  // ── listIds ───────────────────────────────────────

  describe('listIds()', () => {
    it('should return all factory IDs', () => {
      registry.register(makeEntry('F166'));
      registry.register(makeEntry('F167'));
      const ids = registry.listIds();
      expect(ids).toContain('F166');
      expect(ids).toContain('F167');
      expect(ids).toHaveLength(2);
    });
  });

  // ── clear ─────────────────────────────────────────

  describe('clear()', () => {
    it('should remove all entries', () => {
      registry.register(makeEntry('F166'));
      registry.register(makeEntry('F167'));
      registry.clear();
      expect(registry.count).toBe(0);
      expect(registry.has('F166')).toBe(false);
    });
  });
});
