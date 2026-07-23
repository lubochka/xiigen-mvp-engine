/**
 * DnaComplianceChecker — T398 [ARBITRATION].
 *
 * Checks that a generated code assembly complies with all 9 DNA patterns.
 * Idempotent by assemblyId — second call returns existing result without re-checking.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface DnaCheckResult {
  checkId: string;
  assemblyId: string;
  passed: boolean;
  violations: string[];
  checkedAt: string;
}

const DNA_RULES = [
  'DNA-1: No typed models — all data as Record<string, unknown>',
  'DNA-2: All queries use BuildSearchFilter',
  'DNA-3: All methods return DataProcessResult — never throw',
  'DNA-4: All services extend MicroserviceBase',
  'DNA-5: Tenant scope via AsyncLocalStorage — no tenantId param on fabric methods',
  'DNA-6: No entity-specific controllers — use DynamicController',
  'DNA-7: Idempotency keys on all queue consumers',
  'DNA-8: storeDocument() BEFORE enqueue()',
  'DNA-9: CloudEvents envelope on inter-service events',
];

export class DnaComplianceChecker {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async check(
    tenantId: string,
    assemblyId: string,
    codeArtifacts: Record<string, unknown>[],
  ): Promise<DataProcessResult<DnaCheckResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!assemblyId)
      return DataProcessResult.failure('MISSING_ASSEMBLY_ID', 'assemblyId is required');

    // Idempotency check
    const existing = await this.db.searchDocuments('flow26-dna-checks', { assemblyId, tenantId });
    if (existing.isSuccess && existing.data!.length > 0) {
      const e = existing.data![0];
      return DataProcessResult.success({
        checkId: e['checkId'] as string,
        assemblyId: e['assemblyId'] as string,
        passed: e['passed'] as boolean,
        violations: e['violations'] as string[],
        checkedAt: e['checkedAt'] as string,
      });
    }

    // Scan for violations in artifact metadata
    const violations: string[] = [];
    for (const artifact of codeArtifacts) {
      const flags = (artifact['dnaFlags'] as string[]) ?? [];
      for (const rule of DNA_RULES) {
        const ruleId = rule.split(':')[0];
        if (flags.includes(`VIOLATION:${ruleId}`)) {
          violations.push(`${ruleId} violation in artifact ${artifact['artifactId'] ?? 'unknown'}`);
        }
      }
    }

    const passed = violations.length === 0;
    const checkId = randomUUID();
    const checkedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      checkId,
      tenantId,
      assemblyId,
      passed,
      violations,
      checkedAt,
    };

    const stored = await this.db.storeDocument('flow26-dna-checks', doc, checkId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.dna.checked', {
      checkId,
      tenantId,
      assemblyId,
      passed,
      checkedAt,
    });

    return DataProcessResult.success({ checkId, assemblyId, passed, violations, checkedAt });
  }
}
