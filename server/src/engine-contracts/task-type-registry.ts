/**
 * TaskTypeRegistry — in-memory catalog of engine contracts (task types).
 *
 * Validates contracts before storing. Rejects duplicates.
 * Supports lookup by taskTypeId, archetype, family.
 *
 * DNA-1: listAll returns dict payloads.
 * DNA-3: All methods return DataProcessResult.
 *
 * Phase 6.4: Contract infrastructure.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

@Injectable()
export class TaskTypeRegistry {
  private readonly contracts = new Map<string, EngineContract>();

  /**
   * Register a new engine contract. Validates before storing. Rejects duplicates.
   */
  register(contract: EngineContract): DataProcessResult<boolean> {
    // Validate first
    const validation = contract.validate();
    if (!validation.isSuccess) {
      return DataProcessResult.failure(
        'CONTRACT_INVALID',
        `Cannot register ${contract.taskTypeId || '?'}: ${validation.errorMessage}`,
      );
    }

    if (this.contracts.has(contract.taskTypeId)) {
      return DataProcessResult.failure(
        'CONTRACT_EXISTS',
        `Task type ${contract.taskTypeId} already registered`,
      );
    }

    this.contracts.set(contract.taskTypeId, contract);
    return DataProcessResult.success(true);
  }

  /**
   * Get a contract by task type ID.
   */
  get(taskTypeId: string): DataProcessResult<EngineContract> {
    const contract = this.contracts.get(taskTypeId);
    if (!contract) {
      return DataProcessResult.failure(
        'CONTRACT_NOT_FOUND',
        `Task type ${taskTypeId} not in registry`,
      );
    }
    return DataProcessResult.success(contract);
  }

  /**
   * List all contracts as dicts (DNA-1).
   */
  listAll(): Array<Record<string, unknown>> {
    return [...this.contracts.values()].map((c) => c.toDict());
  }

  /**
   * List all contracts matching an archetype.
   */
  listByArchetype(archetype: ContractArchetype): EngineContract[] {
    return [...this.contracts.values()].filter((c) => c.archetype === archetype);
  }

  /**
   * List all contracts in a given family.
   */
  listByFamily(familyId: string): EngineContract[] {
    return [...this.contracts.values()].filter((c) => c.familyId === familyId);
  }

  /**
   * Number of registered contracts.
   */
  get count(): number {
    return this.contracts.size;
  }

  /**
   * Check if a task type is registered.
   */
  has(taskTypeId: string): boolean {
    return this.contracts.has(taskTypeId);
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.contracts.clear();
  }
}
