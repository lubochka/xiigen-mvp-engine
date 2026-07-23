/**
 * ServiceCatalogGenerator — produces a searchable catalog of all services in the engine.
 *
 * Reads FactoryRegistry + TaskTypeRegistry and produces:
 * - Factory entries with fabric resolution, status, methods, DNA checklist
 * - Contract entries with archetype, factory deps, quality gates, BFA registration
 * - Summary stats: total, by fabric, by status, by family
 * - Fabric resolution map: which factories resolve through which fabrics
 *
 * DNA-1: dict output (Record<string, unknown>).
 * DNA-3: returns DataProcessResult.
 *
 * Phase 11.4.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { FactoryRegistry } from '../factories/factory-registry';
import { FactoryRegistryEntry } from '../factories/factory-interfaces';
import { FabricType } from '../factories/fabric-type';
import { TaskTypeRegistry } from '../engine-contracts/task-type-registry';

// ── DNA Checklist ───────────────────────────────────

/** DNA patterns a factory can comply with. */
const DNA_CHECKS: ReadonlyArray<{
  id: string;
  label: string;
  check: (entry: FactoryRegistryEntry) => boolean;
}> = [
  { id: 'DNA-1', label: 'Dict-only payloads (ParseDocument)', check: () => true },
  { id: 'DNA-2', label: 'BuildSearchFilter', check: (e) => e.fabricType === FabricType.DATABASE },
  { id: 'DNA-3', label: 'DataProcessResult returns', check: () => true },
  {
    id: 'DNA-4',
    label: 'MicroserviceBase inheritance',
    check: (e) => e.fabricType === FabricType.CORE,
  },
  { id: 'DNA-5', label: 'Scope isolation (tenantId)', check: () => true },
  { id: 'DNA-6', label: 'DynamicController', check: () => false },
];

// ── Catalog Types ───────────────────────────────────

export interface CatalogFactoryEntry {
  factory_id: string;
  interface_name: string;
  fabric_type: string;
  provider: string;
  family_id: string;
  status: string;
  methods: string[];
  version: string;
  description: string;
  dna_checklist: Array<{ id: string; label: string; applicable: boolean }>;
}

export interface CatalogContractEntry {
  task_type_id: string;
  name: string;
  archetype: string;
  family_id: string;
  factory_dependencies: Array<Record<string, unknown>>;
  quality_gates: Array<Record<string, unknown>>;
  bfa_registration: Record<string, unknown>;
  iron_rules: string[];
}

export interface CatalogSummary {
  total_factories: number;
  total_contracts: number;
  by_fabric: Record<string, number>;
  by_status: Record<string, number>;
  by_family: Record<string, number>;
}

export interface ServiceCatalog {
  factories: CatalogFactoryEntry[];
  contracts: CatalogContractEntry[];
  summary: CatalogSummary;
  fabric_resolution_map: Record<string, string[]>;
  generated_at: string;
}

// ── Generator ───────────────────────────────────────

@Injectable()
export class ServiceCatalogGenerator {
  /**
   * Generate a complete service catalog from the factory and task type registries.
   * DNA-1: output is Record<string, unknown>.
   * DNA-3: returns DataProcessResult.
   */
  generate(
    factoryRegistry: FactoryRegistry,
    taskTypeRegistry: TaskTypeRegistry,
  ): DataProcessResult<ServiceCatalog> {
    // ── Factory entries ────────────────────────────
    const allFactories = factoryRegistry.listAll();
    const factoryEntries: CatalogFactoryEntry[] = allFactories.map((dict) =>
      this.buildFactoryEntry(dict),
    );

    // ── Contract entries ──────────────────────────
    const allContracts = taskTypeRegistry.listAll();
    const contractEntries: CatalogContractEntry[] = allContracts.map((dict) =>
      this.buildContractEntry(dict),
    );

    // ── Summary stats ─────────────────────────────
    const summary = this.buildSummary(factoryEntries, contractEntries);

    // ── Fabric resolution map ─────────────────────
    const fabricResolutionMap = this.buildFabricResolutionMap(factoryEntries);

    const catalog: ServiceCatalog = {
      factories: factoryEntries,
      contracts: contractEntries,
      summary,
      fabric_resolution_map: fabricResolutionMap,
      generated_at: new Date().toISOString(),
    };

    return DataProcessResult.success(catalog);
  }

  /**
   * Search the catalog by a text query (matches against factory/contract names, IDs, fabric types).
   */
  search(catalog: ServiceCatalog, query: string): DataProcessResult<ServiceCatalog> {
    const lowerQuery = query.toLowerCase();

    const factories = catalog.factories.filter(
      (f) =>
        f.factory_id.toLowerCase().includes(lowerQuery) ||
        f.interface_name.toLowerCase().includes(lowerQuery) ||
        f.fabric_type.toLowerCase().includes(lowerQuery) ||
        f.family_id.toLowerCase().includes(lowerQuery) ||
        f.status.toLowerCase().includes(lowerQuery),
    );

    const contracts = catalog.contracts.filter(
      (c) =>
        c.task_type_id.toLowerCase().includes(lowerQuery) ||
        c.name.toLowerCase().includes(lowerQuery) ||
        c.archetype.toLowerCase().includes(lowerQuery),
    );

    const summary = this.buildSummary(factories, contracts);
    const fabricResolutionMap = this.buildFabricResolutionMap(factories);

    return DataProcessResult.success({
      factories,
      contracts,
      summary,
      fabric_resolution_map: fabricResolutionMap,
      generated_at: catalog.generated_at,
    });
  }

  // ── Helpers ───────────────────────────────────────

  private buildFactoryEntry(dict: Record<string, unknown>): CatalogFactoryEntry {
    const fabricType = String(dict.fabric_type ?? '');
    // Build a mock-like FactoryRegistryEntry to check DNA
    const mockEntry: FactoryRegistryEntry = {
      factoryId: String(dict.factory_id ?? ''),
      interfaceName: String(dict.interface_name ?? ''),
      familyId: String(dict.family_id ?? ''),
      fabricType: fabricType as FabricType,
      provider: String(dict.provider ?? ''),
      description: String(dict.description ?? ''),
      methods: (dict.methods as string[]) ?? [],
      status: String(dict.status ?? ''),
      version: String(dict.version ?? ''),
      config: (dict.config as Record<string, unknown>) ?? {},
    };

    const dnaChecklist = DNA_CHECKS.map((check) => ({
      id: check.id,
      label: check.label,
      applicable: check.check(mockEntry),
    }));

    return {
      factory_id: mockEntry.factoryId,
      interface_name: mockEntry.interfaceName,
      fabric_type: fabricType,
      provider: mockEntry.provider,
      family_id: mockEntry.familyId,
      status: mockEntry.status,
      methods: [...mockEntry.methods],
      version: mockEntry.version,
      description: mockEntry.description,
      dna_checklist: dnaChecklist,
    };
  }

  private buildContractEntry(dict: Record<string, unknown>): CatalogContractEntry {
    return {
      task_type_id: String(dict.task_type_id ?? ''),
      name: String(dict.name ?? ''),
      archetype: String(dict.archetype ?? ''),
      family_id: String(dict.family_id ?? ''),
      factory_dependencies: (dict.factory_dependencies as Array<Record<string, unknown>>) ?? [],
      quality_gates: (dict.quality_gates as Array<Record<string, unknown>>) ?? [],
      bfa_registration: (dict.bfa_registration as Record<string, unknown>) ?? {},
      iron_rules: (dict.iron_rules as string[]) ?? [],
    };
  }

  private buildSummary(
    factories: CatalogFactoryEntry[],
    contracts: CatalogContractEntry[],
  ): CatalogSummary {
    const byFabric: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byFamily: Record<string, number> = {};

    for (const f of factories) {
      byFabric[f.fabric_type] = (byFabric[f.fabric_type] ?? 0) + 1;
      byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
      if (f.family_id) {
        byFamily[f.family_id] = (byFamily[f.family_id] ?? 0) + 1;
      }
    }

    return {
      total_factories: factories.length,
      total_contracts: contracts.length,
      by_fabric: byFabric,
      by_status: byStatus,
      by_family: byFamily,
    };
  }

  private buildFabricResolutionMap(factories: CatalogFactoryEntry[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const f of factories) {
      if (!map[f.fabric_type]) {
        map[f.fabric_type] = [];
      }
      map[f.fabric_type].push(f.factory_id);
    }
    return map;
  }
}
