/**
 * Flow15EnterprisePlatformRagSeed — RAG patterns for FLOW-15 Enterprise Platform domain.
 * R1-1_F15 (R11): SESSION-GAP-R11
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow15EnterprisePlatformRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-15-enterprise-platform';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F15-EP-PAT-001',
        namespace: 'enterprise-platform',
        pattern: 'silo-one-way',
        description:
          'Silo graduation is one-way: shared→dedicated only. No downgrade path. ' +
          'Named check: silo_graduation_one_way.',
        codeExample:
          'async graduateToSilo(tenantId: string): Promise<DataProcessResult<void>> { /* one-way, no reverse */ }',
        tags: ['silo', 'graduation', 'one-way', 'dedicated', 'silo_graduation_one_way'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-EP-PAT-002',
        namespace: 'enterprise-platform',
        pattern: 'rls-f559',
        description: 'Row-Level Security uses IRlsPolicyProvisionService F559 — PLATFORM-ONLY.',
        codeExample:
          '@Inject(RLS_POLICY_PROVISION_SERVICE) private rls: IRlsPolicyProvisionService',
        tags: ['rls', 'policy', 'row-level', 'security', 'F559', 'PLATFORM-ONLY'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-EP-PAT-003',
        namespace: 'enterprise-platform',
        pattern: 'byok-versioning',
        description:
          'BYOK rotation always creates new version via IByokKeyVaultService F562. ' +
          'Named check: byok_rotation_creates_new_version_not_overwrites.',
        codeExample: 'await keyVault.createKeyVersion(tenantId, newKeyMaterial)',
        tags: [
          'byok',
          'key',
          'rotation',
          'version',
          'F562',
          'byok_rotation_creates_new_version_not_overwrites',
        ],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-EP-PAT-004',
        namespace: 'enterprise-platform',
        pattern: 'worm-audit-f561',
        description: 'Audit records use IWormAuditService F561 — append-only. No update/delete.',
        codeExample: 'await wormAudit.appendAuditRecord(tenantId, { action, timestamp, actor })',
        tags: ['worm', 'audit', 'append', 'immutable', 'F561', 'PLATFORM-ONLY'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-EP-PAT-005',
        namespace: 'enterprise-platform',
        pattern: 'ep4-saga-enterprise',
        description:
          'Enterprise onboarding is EP-4 durable saga: provision-silo → configure-rls → setup-byok → activate-worm → graduate.',
        codeExample: 'await sagaCheckpoint.save(sagaId, stepIndex, result); // after each step',
        tags: ['enterprise', 'onboard', 'saga', 'ep4', 'checkpoint'],
        flowId: 'FLOW-15',
      },
    ];

    let count = 0;
    for (const p of patterns) {
      const result = await this.upsertPattern(p);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }
}
