/**
 * BFA Peer-Flow Rules — cross-flow dependency checks.
 *
 * These rules enforce that a flow requiring a peer flow (e.g., FLOW-14's T198
 * requires FLOW-13) cannot be promoted unless the peer is ACTIVE.
 *
 * Rule type: peerFlowMustBeActive
 * Severity: blocking — promotion halted if peer is not ACTIVE.
 *
 * DNA-3: all validation methods return DataProcessResult, never throw.
 */

export interface BfaPeerFlowRule {
  /** Unique BFA rule identifier. */
  readonly ruleId: string;
  /** Human-readable description. */
  readonly description: string;
  /** The task type that has the peer dependency. */
  readonly taskTypeId: string;
  /** The flow that contains the dependent task type. */
  readonly flowId: string;
  /** Rule classification — determines validation handler. */
  readonly ruleType: 'peerFlowMustBeActive';
  /** Peer flows that MUST be ACTIVE before this flow can be promoted. */
  readonly sourceFlows: string[];
  /** blocking = deployment halted; warning = logged but not blocking. */
  readonly severity: 'blocking' | 'warning';
  /** Error code returned when rule is violated. */
  readonly errorCode: string;
  /** Error message returned when rule is violated. */
  readonly errorMessage: string;
}

/**
 * BFA_PEER_FLOW_RULES — all peerFlowMustBeActive rules across all flows.
 *
 * These rules are validated by BfaCrossFlowValidator during flow promotion.
 * Any rule with severity:'blocking' will halt promotion if the peer is not ACTIVE.
 */
export const BFA_PEER_FLOW_RULES: readonly BfaPeerFlowRule[] = [
  // ── FLOW-14: Data Pipeline & ETL ──────────────────────────────────────────
  {
    ruleId: 'CF-FLOW14-PEER-001',
    description:
      'T198 CrossFlowAnalyticsExecutor in FLOW-14 requires FLOW-13 (Data Warehouse & Retention) ' +
      'to be ACTIVE before FLOW-14 can be promoted. T198 executes cross-flow analytics ' +
      'queries against FLOW-13 warehouse infrastructure.',
    taskTypeId: 'T198',
    flowId: 'FLOW-14',
    ruleType: 'peerFlowMustBeActive',
    sourceFlows: ['FLOW-13'],
    severity: 'blocking',
    errorCode: 'PEER_FLOW_NOT_ACTIVE',
    errorMessage: 'FLOW-14 T198 requires FLOW-13 to be ACTIVE. Promote FLOW-13 first.',
  },
  // ── FLOW-15: MVP Builder & App Platform ────────────────────────────────────
  // CF-241: AI add-on task types must not use FLOW-14 platform metering (G1-1_F15 R12)
  {
    ruleId: 'CF-241',
    description:
      'AI add-on task types in FLOW-15 (T_START+27 through T_START+31) must not use ' +
      'FLOW-14 platform metering service. Metering must be separate to prevent AI token ' +
      'usage from being co-mingled with platform usage. silentFailureRisk: AI add-on usage ' +
      'billed to platform quota or vice versa.',
    taskTypeId: 'T_START+27..T_START+31',
    flowId: 'FLOW-15',
    ruleType: 'peerFlowMustBeActive',
    sourceFlows: ['FLOW-14'],
    severity: 'blocking',
    errorCode: 'AI_ADDON_METERING_SEPARATION',
    errorMessage:
      'FLOW-15 AI add-on task types must not inject FLOW-14 platform metering. ' +
      'Use separate AI add-on metering service. Remediation: use AI_ADDON_METER, never FLOW14_METER_SERVICE.',
  },
] as const;

/**
 * getPeerFlowRulesForFlow — returns all peer-flow rules for a given flowId.
 * Used by BfaCrossFlowValidator during promotion checks.
 */
export function getPeerFlowRulesForFlow(flowId: string): readonly BfaPeerFlowRule[] {
  return BFA_PEER_FLOW_RULES.filter((rule) => rule.flowId === flowId);
}
