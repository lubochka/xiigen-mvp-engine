/**
 * PromptVersionStore — in-memory store for prompt versions with status management.
 *
 * Supports champion/candidate/retired lifecycle:
 *   - registerVersion: add a new prompt version
 *   - getChampion: get the current champion for a task type + role
 *   - getCandidates: get all active candidates
 *   - promote: candidate → champion (retires previous champion)
 *   - retire: any version → retired
 *
 * DNA-3: all methods return DataProcessResult.
 *
 * Phase 12.3.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { type PromptVersion } from './prompt-types';

@Injectable()
export class PromptVersionStore {
  private readonly versions: PromptVersion[] = [];

  /**
   * Register a new prompt version.
   */
  registerVersion(version: PromptVersion): DataProcessResult<boolean> {
    if (!version.id) {
      return DataProcessResult.failure('MISSING_ID', 'Prompt version id required');
    }
    if (!version.taskType) {
      return DataProcessResult.failure('MISSING_TASK_TYPE', 'taskType required');
    }
    if (!version.role) {
      return DataProcessResult.failure('MISSING_ROLE', 'role required');
    }

    // Reject duplicates
    if (this.versions.some((v) => v.id === version.id)) {
      return DataProcessResult.failure('DUPLICATE', `Version ${version.id} already exists`);
    }

    this.versions.push(version);
    return DataProcessResult.success(true);
  }

  /**
   * Get the current champion for a task type and role.
   * Returns null if no champion exists.
   */
  getChampion(taskType: string, role: string): DataProcessResult<PromptVersion | null> {
    const champion = this.versions.find(
      (v) => v.taskType === taskType && v.role === role && v.status === 'champion',
    );
    return DataProcessResult.success(champion ?? null);
  }

  /**
   * Get all active candidates for a task type and role.
   */
  getCandidates(taskType: string, role: string): DataProcessResult<PromptVersion[]> {
    const candidates = this.versions.filter(
      (v) => v.taskType === taskType && v.role === role && v.status === 'candidate',
    );
    return DataProcessResult.success(candidates);
  }

  /**
   * Promote a candidate to champion.
   * The current champion (if any) for the same taskType+role is retired.
   */
  promote(versionId: string): DataProcessResult<boolean> {
    const version = this.versions.find((v) => v.id === versionId);
    if (!version) {
      return DataProcessResult.failure('NOT_FOUND', `Version ${versionId} not found`);
    }
    if (version.status === 'retired') {
      return DataProcessResult.failure('ALREADY_RETIRED', `Version ${versionId} is retired`);
    }

    // Retire the current champion for the same taskType+role
    const currentChampion = this.versions.find(
      (v) => v.taskType === version.taskType && v.role === version.role && v.status === 'champion',
    );
    if (currentChampion) {
      currentChampion.status = 'retired';
    }

    // Promote
    version.status = 'champion';
    return DataProcessResult.success(true);
  }

  /**
   * Retire a version.
   */
  retire(versionId: string): DataProcessResult<boolean> {
    const version = this.versions.find((v) => v.id === versionId);
    if (!version) {
      return DataProcessResult.failure('NOT_FOUND', `Version ${versionId} not found`);
    }
    if (version.status === 'retired') {
      return DataProcessResult.failure('ALREADY_RETIRED', `Version ${versionId} already retired`);
    }

    version.status = 'retired';
    return DataProcessResult.success(true);
  }

  /**
   * List all versions, optionally filtered by task type.
   */
  listVersions(taskType?: string): DataProcessResult<PromptVersion[]> {
    let results = [...this.versions];
    if (taskType) {
      results = results.filter((v) => v.taskType === taskType);
    }
    return DataProcessResult.success(results);
  }

  /**
   * Get a single version by ID.
   */
  getById(versionId: string): DataProcessResult<PromptVersion> {
    const version = this.versions.find((v) => v.id === versionId);
    if (!version) {
      return DataProcessResult.failure('NOT_FOUND', `Version ${versionId} not found`);
    }
    return DataProcessResult.success(version);
  }

  /**
   * Total version count.
   */
  get count(): number {
    return this.versions.length;
  }

  /**
   * Clear all versions (for testing).
   */
  clear(): void {
    this.versions.length = 0;
  }

  /** Export full store state for snapshot persistence. */
  exportState(): PromptVersion[] {
    return [...this.versions];
  }

  /** Import store state from a snapshot. Clears existing data first. */
  importState(versions: PromptVersion[]): void {
    this.versions.length = 0;
    this.versions.push(...versions);
  }
}
