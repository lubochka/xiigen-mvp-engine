/**
 * DataRetentionRagSeed — RAG patterns for FLOW-13 data retention domain.
 * Extends FlowRagSeedBase; provides legal hold, approval token, tombstone patterns.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class DataRetentionRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-13-data-retention';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F13-DR-PAT-001',
        namespace: 'data-retention',
        pattern: 'legal_hold_blocks_deletion',
        description:
          'Before any delete or tombstone operation, check legal hold status. ' +
          'If a legal hold is active for the tenant or document, return failure with LEGAL_HOLD_ACTIVE code. ' +
          'Approval token must be validated before hold release.',
        codeExample:
          'const holdStatus = await this.legalHoldService.check({ tenantId, contentId });\n' +
          'if (holdStatus.data?.active) {\n' +
          "  return DataProcessResult.failure('LEGAL_HOLD_ACTIVE', 'Document under legal hold — deletion blocked');\n" +
          '}\n' +
          "const tokenValid = await this.approvalService.validate({ tenantId, contentId, approvalToken, operation: 'DATA_PURGE' });\n" +
          'if (!tokenValid.isSuccess || !tokenValid.data?.valid) {\n' +
          "  return DataProcessResult.failure('INVALID_APPROVAL_TOKEN', 'Approval token required for deletion');\n" +
          '}\n' +
          "await this.db.storeDocument('tombstones', { documentId, tenantId, deletedAt: new Date().toISOString() });\n" +
          "await this.db.deleteDocument('documents', documentId);",
        tags: ['legal-hold', 'approval-token', 'tombstone', 'retention', 'T186'],
        flowId: 'FLOW-13',
      },
      {
        patternId: 'F13-DR-PAT-002',
        namespace: 'data-retention',
        pattern: 'tombstone_before_delete',
        description:
          'Outbox pattern for deletion: storeDocument() tombstone record BEFORE deleteDocument(). ' +
          'Ensures audit trail survives even if delete fails mid-flight.',
        codeExample:
          '// Outbox: tombstone stored FIRST (DNA-8)\n' +
          "await this.db.storeDocument('tombstones', tombstoneRecord);\n" +
          '// Then delete the source document\n' +
          "await this.db.deleteDocument('documents', documentId);",
        tags: ['outbox', 'tombstone', 'DNA-8', 'deletion', 'audit-trail'],
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
        patternId: 'F13-DR-BFA-001',
        ruleId: 'CF-FLOW13-DR-1',
        rule: 'T186: ILegalHoldService.check() MUST be called BEFORE any purge. Active legal hold = emit ContentRetentionExtended, never purge.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T186',
      },
      {
        patternId: 'F13-DR-BFA-002',
        ruleId: 'CF-FLOW13-DR-2',
        rule: 'T186: IApprovalService.validate() MUST be called after legal hold check. Missing or invalid token = reject without purging.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T186',
      },
      {
        patternId: 'F13-DR-BFA-003',
        ruleId: 'CF-FLOW13-DR-3',
        rule: 'T186: DataPurged event MUST contain tombstoneRef only. rawContent, content, payload, body, data are PROHIBITED in DataPurged.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T186',
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
        patternId: 'F13-DR-DR-001',
        title: 'ADR-F13-DR-001: Three-gate chain for irreversible purge operations',
        status: 'ACCEPTED',
        flowId: 'FLOW-13',
        rationale:
          'Irreversible operations require: (1) legal hold check to prevent purge of legally protected content, ' +
          '(2) approval token to ensure explicit human authorization, (3) tombstone-only event to prevent data leakage.',
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
