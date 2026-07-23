/**
 * FLOW-45: History Bootstrap
 * BFA rules: CF-803, CF-804
 *
 * CF-803: arch-philosophy.json must be seeded before any flow begins execution (bootstrap boundary).
 * CF-804: ARCH_PATTERN records must have knowledgeScope=GLOBAL — available to all tenants.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const HISTORY_BOOTSTRAP_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-803',
    flowId: 'FLOW-45',
    type: 'BOOTSTRAP_BOUNDARY',
    description:
      'arch-philosophy.json MUST be seeded before any flow begins execution — bootstrap order is non-negotiable',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-804',
    flowId: 'FLOW-45',
    type: 'KNOWLEDGE_SCOPE',
    description:
      'ARCH_PATTERN records must have knowledgeScope=GLOBAL — architectural philosophy is platform knowledge, not tenant-private',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
