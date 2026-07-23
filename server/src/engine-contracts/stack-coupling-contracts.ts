/**
 * FLOW-37: Engine Self-Awareness — Multi-Stack Porting
 * BFA rules: CF-799, CF-800, CF-805, CF-806
 *
 * CF-799: INCOMPATIBLE stacks MUST be flagged BEFORE any AF-1 genesis prompt submission.
 * CF-800: T591 HybridGenesisPromptBuilder MUST NOT run without T590 coupling audit output.
 * CF-805: StackCouplingAuditor must evaluate all 10 coupling dimensions per stack.
 * CF-806: HybridGenesisPromptBuilder must produce exactly 4 mandatory sections.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const STACK_COUPLING_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-799',
    flowId: 'FLOW-37',
    type: 'INCOMPATIBLE_GUARD',
    description:
      'INCOMPATIBLE stacks MUST be flagged synchronously BEFORE any AF-1 genesis prompt submission — no generation for incompatible combinations',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-800',
    flowId: 'FLOW-37',
    type: 'ORDERING',
    description:
      'HybridGenesisPromptBuilder (T591) MUST NOT run without StackCouplingAuditor (T590) output — coupling audit is required input for prompt assembly',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-805',
    flowId: 'FLOW-37',
    type: 'COMPLETENESS',
    description:
      'StackCouplingAuditor must evaluate all 10 coupling dimensions per element per stack — partial audit is AUDIT_INCOMPLETE failure',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-806',
    flowId: 'FLOW-37',
    type: 'FORMAT',
    description:
      'HybridGenesisPrompt must contain exactly 4 mandatory sections: NEUTRAL_IRON_RULES, CONCEPT_DESCRIPTION, EVENT_CONTRACTS, STACK_IMPLEMENTATIONS — 3-section output is a format violation',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
