/**
 * QueryExecutionRagSeed — RAG patterns for FLOW-13 query execution domain.
 * Extends FlowRagSeedBase; provides three-layer security gate + F426-guard patterns.
 *
 * CRITICAL: F426 does NOT exist. QuotaManager is T187 — an INLINE service.
 * The three-layer gate order: (1) T187 inline quota, (2) F422 RLS PLATFORM-ONLY,
 * (3) F423 PII masking PLATFORM-ONLY.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class QueryExecutionRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-13-query-execution';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F13-QE-PAT-001',
        namespace: 'query-execution',
        pattern: 'three_layer_security_gate_quota_rls_pii',
        description:
          'THREE steps in order before warehouse read: (1) T187 inline quota check, ' +
          '(2) F422 RLS PLATFORM-ONLY, (3) F423 PII masking PLATFORM-ONLY. ' +
          'F426 does NOT exist. Never skip or reorder these steps.',
        codeExample:
          '// Step 1: T187 inline quota (cheapest — fail fast)\n' +
          'const quotaResult = await this.quotaManager.check({ tenantId, queryId });\n' +
          "if (!quotaResult.allowed) return DataProcessResult.failure('QUOTA_EXCEEDED', 'Daily or monthly limit reached');\n\n" +
          '// Step 2: F422 RLS PLATFORM_ONLY\n' +
          'const rlsResult = await this.rowLevelSecurity.apply(tenantId, queryPlan);\n' +
          "if (!rlsResult.allowed) return DataProcessResult.failure('RLS_DENIED', 'Row-level security rejected query');\n\n" +
          '// Step 3: F423 PII masking BEFORE serialization\n' +
          'const raw = await this.warehouseReader.execute(tenantId, rlsResult.filteredQuery);\n' +
          'const masked = await this.piiMasking.mask(tenantId, raw);\n' +
          'return DataProcessResult.success(masked);',
        tags: ['security', 'quota', 'rls', 'pii', 'T173', 'T187', 'platform-only', 'F422', 'F423'],
        flowId: 'FLOW-13',
      },
      {
        patternId: 'F13-QE-PAT-002',
        namespace: 'query-execution',
        pattern: 'no_f426_quota_is_inline_t187',
        // Tag F426-guard: required per R13 pass criteria
        description:
          'F426 does NOT exist in FLOW-13. QuotaManager is T187 — an INLINE service implemented ' +
          'directly in the query execution pipeline. Do not generate factory F426 references. ' +
          'Do not inject F426 as a dependency. [F426-guard]',
        codeExample:
          '// CORRECT: T187 is inline — inject QuotaManager directly (no @Inject token)\n' +
          'constructor(\n' +
          '  private readonly quotaManager: QuotaManager, // T187 inline — no @Inject()\n' +
          '  @Inject(ROW_LEVEL_SECURITY_SERVICE) private readonly rowLevelSecurity: IRowLevelSecurityService, // F422\n' +
          '  @Inject(PII_MASKING_SERVICE) private readonly piiMasking: IPIIMaskingService, // F423\n' +
          ') {}\n\n' +
          '// WRONG: F426 does not exist\n' +
          '// @Inject(F426_QUOTA_FACTORY) private readonly quotaFactory: any  ← NEVER DO THIS',
        tags: ['F426-guard', 'T187', 'inline-service', 'quota', 'anti-pattern'],
        flowId: 'FLOW-13',
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'F13-QE-BFA-001',
        ruleId: 'CF-FLOW13-QE-1',
        rule: 'T173: Security gate order is inviolable: T187 quota (layer 1) → F422 RLS (layer 2) → F423 PII masking (layer 3). No reordering allowed.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T173',
      },
      {
        patternId: 'F13-QE-BFA-002',
        ruleId: 'CF-FLOW13-QE-2',
        rule: 'T173: F426 does NOT exist. T187 QuotaManager is an INLINE service. Never generate @Inject(F426) or any factory token for T187.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T173',
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'F13-QE-DR-001',
        title: 'ADR-F13-QE-001: Three-layer security gate for warehouse query execution',
        status: 'ACCEPTED',
        flowId: 'FLOW-13',
        rationale:
          'Quota check (T187 inline) must be first — cheapest gate, fail fast. ' +
          'RLS (F422 PLATFORM-ONLY) enforces row-level access before data retrieval. ' +
          'PII masking (F423 PLATFORM-ONLY) must run before any serialization.',
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }
}
