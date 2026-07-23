/**
 * FLOW-38: RAG Quality Feedback
 * BFA rules: CF-801, CF-802, CF-807
 *
 * CF-801: (cycleId, patternId) idempotency check BEFORE any qualityScore delta write.
 * CF-802: every qualityScore write carries cycleId — no untraced bulk updates.
 * CF-807: DistilledRuleExtractor runs ONLY when outcome=SUCCESS_WITHIN_BUDGET.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const RAG_QUALITY_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-801',
    flowId: 'FLOW-38',
    type: 'IDEMPOTENCY_GUARD',
    description:
      '(cycleId, patternId) idempotency check MUST execute before any qualityScore delta write; processing same pair twice must not apply delta twice',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-802',
    flowId: 'FLOW-38',
    type: 'TRACEABILITY',
    description:
      'Every qualityScore write MUST carry a cycleId reference — no untraced bulk updates permitted',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-807',
    flowId: 'FLOW-38',
    type: 'ORDERING',
    description:
      'DistilledRuleExtractor runs ONLY when CycleOutcomeClassifier confirms SUCCESS_WITHIN_BUDGET; WASTED_CYCLE must never trigger extraction',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
