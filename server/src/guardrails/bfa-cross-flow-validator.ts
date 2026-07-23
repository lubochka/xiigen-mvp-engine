/**
 * BfaCrossFlowValidator — validates a new flow's BFA registration against
 * ALL existing ACTIVE flows in xiigen-flow-registry before deployment.
 *
 * Rule 13: "New flows MUST pass BFA cross-flow validation against all existing
 *           31 flows before deployment."
 *
 * Process:
 *   1. Load all ACTIVE flows from xiigen-flow-registry
 *   2. Load each flow's stored BFA registration from xiigen-bfa-registrations
 *   3. Seed a fresh in-memory BusinessFlowArbiter with all existing registrations
 *   4. Run checkConflicts() for the new flow
 *   5. Return a BfaValidationReport — passes iff errors === 0
 *
 * storeBfaRegistration() persists a registration AFTER successful validation.
 * DNA-8: store before any downstream event.
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * Stage 2, S11.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { BusinessFlowArbiter } from './bfa';
import { BfaRegistration } from '../engine-contracts/contract-schema';
import { getPeerFlowRulesForFlow } from './bfa-peer-flow-rules';

export interface BfaConflictDetail {
  conflictType: string;
  value: string;
  existingFlow: string;
  severity: 'error' | 'warning';
}

export interface BfaValidationReport {
  flowId: string;
  passed: boolean;
  checkedAgainst: number;
  conflicts: BfaConflictDetail[];
  errors: number;
  warnings: number;
  validatedAt: string;
}

const FLOW_REGISTRY_INDEX = 'xiigen-flow-registry';
const BFA_REGISTRY_INDEX = 'xiigen-bfa-registrations';

@Injectable()
export class BfaCrossFlowValidator {
  private readonly logger = new Logger(BfaCrossFlowValidator.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  // ─── validate ──────────────────────────────────────────────────────────────

  /**
   * Validate a new flow's registration against all existing ACTIVE flows.
   * Returns a report. report.passed === false means deployment is blocked.
   */
  async validate(
    flowId: string,
    registration: BfaRegistration,
  ): Promise<DataProcessResult<BfaValidationReport>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }

    const validatedAt = new Date().toISOString();

    // Load all existing ACTIVE flows
    const registryResult = await this.db.searchDocuments(
      FLOW_REGISTRY_INDEX,
      { status: 'ACTIVE' },
      200,
    );
    const existingFlows = (registryResult.isSuccess ? (registryResult.data ?? []) : []) as Array<
      Record<string, unknown>
    >;

    // Seed a fresh arbiter with all existing registrations
    const arbiter = new BusinessFlowArbiter();
    let checkedAgainst = 0;

    for (const flow of existingFlows) {
      const existingFlowId = String(flow['flowId'] ?? '');
      if (!existingFlowId || existingFlowId === flowId) continue;

      const bfaResult = await this.db.getDocument(BFA_REGISTRY_INDEX, existingFlowId);
      if (!bfaResult.isSuccess || !bfaResult.data) continue;

      arbiter.registerFlow(existingFlowId, bfaResult.data as unknown as BfaRegistration);
      checkedAgainst++;
    }

    // Check the new flow against the seeded arbiter
    const conflictResult = arbiter.checkConflicts(flowId, registration);
    if (!conflictResult.isSuccess) {
      return DataProcessResult.failure(conflictResult.errorCode!, conflictResult.errorMessage!);
    }

    const conflicts = (conflictResult.data ?? []) as BfaConflictDetail[];
    const errors = conflicts.filter((c) => c.severity === 'error').length;
    const warnings = conflicts.filter((c) => c.severity === 'warning').length;

    const report: BfaValidationReport = {
      flowId,
      passed: errors === 0,
      checkedAgainst,
      conflicts,
      errors,
      warnings,
      validatedAt,
    };

    this.logger.log(
      `BFA validation for ${flowId}: passed=${report.passed} errors=${errors} ` +
        `warnings=${warnings} checkedAgainst=${checkedAgainst}`,
    );

    return DataProcessResult.success(report);
  }

  // ─── validatePeerFlows ───────────────────────────────────────────────────

  /**
   * Validate peerFlowMustBeActive rules for a given flowId.
   *
   * Called during flow promotion. Any blocking rule whose peer flow is not
   * ACTIVE in xiigen-flow-registry will return a failure (halts promotion).
   *
   * DNA-3: returns DataProcessResult, never throws.
   * Rule 13: peer-flow checks are part of BFA validation before deployment.
   */
  async validatePeerFlows(
    flowId: string,
  ): Promise<DataProcessResult<{ allPeersActive: boolean; violations: string[] }>> {
    const rules = getPeerFlowRulesForFlow(flowId);

    if (rules.length === 0) {
      return DataProcessResult.success({ allPeersActive: true, violations: [] });
    }

    const violations: string[] = [];

    for (const rule of rules) {
      for (const peerFlowId of rule.sourceFlows) {
        const peerResult = await this.db.searchDocuments(
          FLOW_REGISTRY_INDEX,
          { flowId: peerFlowId, status: 'ACTIVE' },
          1,
        );

        const isActive = peerResult.isSuccess && (peerResult.data ?? []).length > 0;

        if (!isActive) {
          const msg = `${rule.ruleId}: ${rule.errorMessage} (peer: ${peerFlowId})`;
          violations.push(msg);

          this.logger.warn(`BFA peer-flow violation for ${flowId}: ${msg}`);

          if (rule.severity === 'blocking') {
            return DataProcessResult.failure(rule.errorCode, rule.errorMessage);
          }
        }
      }
    }

    return DataProcessResult.success({
      allPeersActive: violations.length === 0,
      violations,
    });
  }

  // ─── storeBfaRegistration ─────────────────────────────────────────────────

  /**
   * Persist a flow's BFA registration after successful validation.
   * Call this BEFORE any downstream promotion event (DNA-8).
   */
  async storeBfaRegistration(
    flowId: string,
    registration: BfaRegistration,
  ): Promise<DataProcessResult<boolean>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const doc: Record<string, unknown> = {
      ...(registration as unknown as Record<string, unknown>),
      flowId,
      storedAt: new Date().toISOString(),
    };
    const result = await this.db.storeDocument(BFA_REGISTRY_INDEX, doc, flowId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(true);
  }
}
