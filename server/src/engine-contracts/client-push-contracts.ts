/**
 * FLOW-40: Client Push Infrastructure
 * BFA rules: CF-797, CF-798
 * Factory: F1518 (ISseConnectionPool)
 *
 * CF-797: FlowEventBridge MUST NOT emit into user-facing flow domains.
 *         Prevents engine-internal events from being surfaced directly to client connections.
 * CF-798: ISseConnectionPool.pushEvent must scope by tenantId.
 *         Cross-tenant delivery is prohibited — each push is bound to the originating tenant.
 */

export const CLIENT_PUSH_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-797',
    flowId: 'FLOW-40',
    type: 'CROSS_DOMAIN_READ',
    description: 'FlowEventBridge MUST NOT emit into user-facing flow domains',
    violationSeverity: 'BUILD_FAILURE',
  },
  {
    ruleId: 'CF-798',
    flowId: 'FLOW-40',
    type: 'TENANT_ISOLATION',
    description: 'ISseConnectionPool.pushEvent must scope by tenantId',
    violationSeverity: 'BUILD_FAILURE',
  },
];
