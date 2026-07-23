/**
 * SchemaRegistryRagSeed — RAG patterns for FLOW-13 schema registry domain.
 * Extends FlowRagSeedBase; provides additive vs breaking classification patterns.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class SchemaRegistryRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-13-schema-registry';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F13-SR-PAT-001',
        namespace: 'schema-registry',
        pattern: 'additive_vs_breaking_classification',
        description:
          'Schema changes are classified as ADDITIVE (new optional field, new enum value) or ' +
          'BREAKING (removed field, renamed field, changed type). ' +
          'BREAKING changes require explicit tenant approval before applying. ' +
          'ADDITIVE changes are auto-approved.',
        codeExample:
          "function classifySchemaChange(prev: Record<string, unknown>, next: Record<string, unknown>): 'ADDITIVE' | 'BREAKING' {\n" +
          '  const prevKeys = Object.keys(prev);\n' +
          '  const nextKeys = Object.keys(next);\n' +
          '  const removedKeys = prevKeys.filter(k => !nextKeys.includes(k));\n' +
          "  if (removedKeys.length > 0) return 'BREAKING';\n" +
          '  for (const key of prevKeys) {\n' +
          "    if (prev[key] !== next[key] && nextKeys.includes(key)) return 'BREAKING';\n" +
          '  }\n' +
          "  return 'ADDITIVE';\n" +
          '}',
        tags: ['schema-registry', 'additive', 'breaking', 'versioning', 'schema-change'],
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
        patternId: 'F13-SR-BFA-001',
        ruleId: 'CF-FLOW13-SR-1',
        rule: 'T171: classifyEvolution() MUST be called before any schema mutation. Breaking changes require explicit tenant approval. Never apply without approval.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T171',
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
        patternId: 'F13-SR-DR-001',
        title: 'ADR-F13-SR-001: Additive auto-approve, breaking requires explicit tenant approval',
        status: 'ACCEPTED',
        flowId: 'FLOW-13',
        rationale:
          'Additive schema changes are safe and do not break existing consumers. ' +
          'Breaking changes may break downstream consumers and require tenant to explicitly acknowledge the impact.',
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
