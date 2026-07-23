/**
 * FLOW-33 Integration — Phase D.
 *
 * Full bootstrap simulation orchestrating T536 → T537 → T538 → T542 → T539 → T540 → T541.
 * Implements the 3-case after-regeneration protocol from the blast radius report.
 *
 * 3-Case Protocol (from FLOW-33-D plan):
 *   CASE A — blast radius within threshold → auto-promote → ACTIVE
 *   CASE B — blast radius exceeds threshold → EscalationBriefing (options A/B/C) — STOP
 *   CASE C — blast radius empty → ACTIVE immediately, no downstream tests
 *
 * Bundle version check runs after CASE A and CASE C promotions.
 * CASE B: flow not promoted → bundle unaffected.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every state write.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type {
  Flow33BlastRadiusReport,
  Flow33DocumentUpdater,
  Flow33EscalationBriefing,
  Flow33FreedomConfig,
  Flow33Queue,
} from './flow33-shared-interfaces';

export type PromotionCase = 'CASE_A' | 'CASE_B' | 'CASE_C';
export type FlowLifecycleStatus = 'GENERATED' | 'PROMOTED' | 'ACTIVE' | 'REGRESSED' | 'DEGRADED';

export interface BlastRadiusThresholds {
  directDependencies: number; // D-VIS-1: 0 — block if any direct dep affected
  transitiveDependencies: number; // D-VIS-1: 2 — block if >2 transitive deps affected
}

export type EscalationBriefing = Flow33EscalationBriefing;

export interface AfterRegenerationResult {
  flowId: string;
  promotionCase: PromotionCase;
  newStatus: FlowLifecycleStatus;
  bundleChecks?: BundleCheckSummary[];
  escalationBriefing?: EscalationBriefing;
}

export interface BundleCheckSummary {
  bundleId: string;
  degraded: boolean;
  reason?: string;
}

export type BlastRadiusReport = Flow33BlastRadiusReport;

/** Default thresholds from D-VIS-1 decision */
const DEFAULT_THRESHOLDS: BlastRadiusThresholds = {
  directDependencies: 0,
  transitiveDependencies: 2,
};

export class Flow33Integration {
  constructor(
    private readonly db: Flow33DocumentUpdater,
    private readonly queue: Flow33Queue,
    private readonly freedom: Flow33FreedomConfig,
  ) {}

  /**
   * Read blast radius thresholds from FREEDOM config (D-VIS-1 defaults).
   */
  private async readThresholds(): Promise<BlastRadiusThresholds> {
    const result = await this.freedom.get('blast_radius_promotion_threshold');
    if (!result.isSuccess || !result.data) return DEFAULT_THRESHOLDS;
    const cfg = result.data as Record<string, number>;
    return {
      directDependencies: Number(
        cfg['directDependencies'] ?? DEFAULT_THRESHOLDS.directDependencies,
      ),
      transitiveDependencies: Number(
        cfg['transitiveDependencies'] ?? DEFAULT_THRESHOLDS.transitiveDependencies,
      ),
    };
  }

  /**
   * Classify promotion case from blast radius report.
   * CASE C: empty blast radius
   * CASE A: within thresholds
   * CASE B: exceeds thresholds
   */
  private classifyPromotion(
    report: BlastRadiusReport,
    thresholds: BlastRadiusThresholds,
  ): PromotionCase {
    if (report.blastRadius === 0 && report.affectedFlows.length === 0) return 'CASE_C';

    const directCount = report.affectedFlows.length;
    const transitiveCount = report.affectedFamilies.length;

    if (
      directCount > thresholds.directDependencies ||
      transitiveCount > thresholds.transitiveDependencies
    ) {
      return 'CASE_B';
    }
    return 'CASE_A';
  }

  /**
   * Apply the 3-case after-regeneration protocol.
   *
   * CASE A: Auto-promote → ACTIVE if downstream tests pass, REGRESSED if they fail
   * CASE B: EscalationBriefing → STOP (requiresApproval: true)
   * CASE C: Instant ACTIVE — no downstream tests
   *
   * Bundle version check runs after CASE A and CASE C (not CASE B — flow not promoted).
   * DNA-8: storeDocument() BEFORE enqueue() on every status write.
   */
  async applyAfterRegenerationProtocol(
    flowId: string,
    newVersion: string,
    tenantId: string,
    report: BlastRadiusReport,
  ): Promise<DataProcessResult<AfterRegenerationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    if (!newVersion) return DataProcessResult.failure('MISSING_VERSION', 'newVersion is required');

    const thresholds = await this.readThresholds();
    const promotionCase = this.classifyPromotion(report, thresholds);

    if (promotionCase === 'CASE_C') {
      return this.handleCaseC(flowId, newVersion, tenantId, report);
    }
    if (promotionCase === 'CASE_A') {
      return this.handleCaseA(flowId, newVersion, tenantId, report);
    }
    return this.handleCaseB(flowId, tenantId, report);
  }

  /** CASE C: Empty blast radius → ACTIVE immediately, then check bundles. */
  private async handleCaseC(
    flowId: string,
    newVersion: string,
    tenantId: string,
    _report: BlastRadiusReport,
  ): Promise<DataProcessResult<AfterRegenerationResult>> {
    const now = new Date().toISOString();
    const statusDoc: Record<string, unknown> = {
      flowId,
      tenantId,
      status: 'ACTIVE',
      promotionCase: 'CASE_C',
      promotedVersion: newVersion,
      promotedAt: now,
    };

    // DNA-8: store BEFORE emit
    await this.db.storeDocument('flow33-flow-lifecycle', statusDoc, `${tenantId}::${flowId}`);
    await this.queue.enqueue('flow.status.active', {
      flowId,
      tenantId,
      promotionCase: 'CASE_C',
      newVersion,
      promotedAt: now,
    });

    const bundleChecks = await this.checkBundles(flowId, newVersion, tenantId);

    return DataProcessResult.success({
      flowId,
      promotionCase: 'CASE_C',
      newStatus: 'ACTIVE',
      bundleChecks,
    });
  }

  /** CASE A: Within threshold → PROMOTED, run cross-flow tests, then ACTIVE or REGRESSED. */
  private async handleCaseA(
    flowId: string,
    newVersion: string,
    tenantId: string,
    _report: BlastRadiusReport,
  ): Promise<DataProcessResult<AfterRegenerationResult>> {
    const now = new Date().toISOString();

    // First set PROMOTED
    const promotedDoc: Record<string, unknown> = {
      flowId,
      tenantId,
      status: 'PROMOTED',
      promotionCase: 'CASE_A',
      promotedVersion: newVersion,
      promotedAt: now,
    };
    // DNA-8: store BEFORE emit
    await this.db.storeDocument('flow33-flow-lifecycle', promotedDoc, `${tenantId}::${flowId}`);
    await this.queue.enqueue('flow.status.promoted', {
      flowId,
      tenantId,
      promotionCase: 'CASE_A',
      newVersion,
      promotedAt: now,
    });

    // Run cross-flow edge checks (simulated — in real environment these are test suite runs)
    const crossFlowCheckResult = await this.db.searchDocuments('flow33-cross-flow-tests', {
      flowId,
      tenantId,
      status: 'FAILED',
    });
    const hasCrossFlowFailures =
      crossFlowCheckResult.isSuccess && (crossFlowCheckResult.data?.length ?? 0) > 0;

    const newStatus: FlowLifecycleStatus = hasCrossFlowFailures ? 'REGRESSED' : 'ACTIVE';
    const updatedAt = new Date().toISOString();

    // DNA-8: update BEFORE emit
    await this.db.updateDocument('flow33-flow-lifecycle', `${tenantId}::${flowId}`, {
      status: newStatus,
      updatedAt,
    });
    await this.queue.enqueue(`flow.status.${newStatus.toLowerCase()}`, {
      flowId,
      tenantId,
      promotionCase: 'CASE_A',
      newVersion,
      updatedAt,
    });

    const bundleChecks =
      newStatus === 'ACTIVE' ? await this.checkBundles(flowId, newVersion, tenantId) : [];

    return DataProcessResult.success({ flowId, promotionCase: 'CASE_A', newStatus, bundleChecks });
  }

  /** CASE B: Exceeds threshold → EscalationBriefing — STOP, requiresApproval. */
  private async handleCaseB(
    flowId: string,
    tenantId: string,
    report: BlastRadiusReport,
  ): Promise<DataProcessResult<AfterRegenerationResult>> {
    const now = new Date().toISOString();

    // Store REGRESSED status (flow not promoted in CASE B)
    const regressedDoc: Record<string, unknown> = {
      flowId,
      tenantId,
      status: 'REGRESSED',
      promotionCase: 'CASE_B',
      reason: 'Blast radius exceeded threshold',
      updatedAt: now,
    };
    // DNA-8: store BEFORE emit
    await this.db.storeDocument('flow33-flow-lifecycle', regressedDoc, `${tenantId}::${flowId}`);
    await this.queue.enqueue('flow.status.regressed', {
      flowId,
      tenantId,
      promotionCase: 'CASE_B',
      blastRadius: report.blastRadius,
      updatedAt: now,
    });

    const escalationBriefing: EscalationBriefing = {
      flowId,
      blastRadius: report.blastRadius,
      affectedFlows: report.affectedFlows,
      affectedFamilies: report.affectedFamilies,
      promotionCase: 'CASE_B',
      options: {
        A: `Re-run downstream test suites: npm run test:flow-matrix -- --flow=${flowId} for each affected flow. If all pass: promote ${flowId}, downstream flows re-verified → ACTIVE`,
        B: `Scope the regeneration: Revert to previous prompt version for the specific task type that caused impact. Re-run T541 on the scoped change.`,
        C: `Escalate to Luba with full impact report: blast radius ${report.blastRadius}, affected flows: [${report.affectedFlows.join(', ')}]`,
      },
      requiresApproval: true,
    };

    // No bundle action in CASE B — flow not promoted
    return DataProcessResult.success({
      flowId,
      promotionCase: 'CASE_B',
      newStatus: 'REGRESSED',
      escalationBriefing,
    });
  }

  /**
   * Check bundle version compatibility and set DEGRADED if needed.
   * Called after CASE A and CASE C promotions (not CASE B).
   */
  private async checkBundles(
    flowId: string,
    newVersion: string,
    tenantId: string,
  ): Promise<BundleCheckSummary[]> {
    const bundlesResult = await this.db.searchDocuments('flow33-bundle-manifests', {
      tenantId,
      status: 'ACTIVE',
    });
    if (!bundlesResult.isSuccess || !bundlesResult.data?.length) return [];

    const summaries: BundleCheckSummary[] = [];
    const now = new Date().toISOString();

    for (const bundle of bundlesResult.data) {
      const requiredFlows = (bundle['requiredFlows'] as string[]) ?? [];
      const minFlowVersions = (bundle['minFlowVersions'] as Record<string, string>) ?? {};
      const bundleId = bundle['bundleId'] as string;

      if (!requiredFlows.includes(flowId)) continue;

      const minVersion = minFlowVersions[flowId];
      if (!minVersion) continue;

      const isDegraded = this.compareVersions(newVersion, minVersion) < 0;
      summaries.push({
        bundleId,
        degraded: isDegraded,
        reason: isDegraded ? `${flowId} v${newVersion} < required v${minVersion}` : undefined,
      });

      if (isDegraded) {
        // DNA-8: updateDocument BEFORE enqueue
        await this.db.updateDocument('flow33-bundle-manifests', bundleId, {
          status: 'DEGRADED',
          degradedAt: now,
        });
        await this.queue.enqueue('bundle.degraded', {
          bundleId,
          flowId,
          promotedVersion: newVersion,
          requiredMinVersion: minVersion,
          tenantId,
          degradedAt: now,
        });
      }
    }

    return summaries;
  }

  private compareVersions(a: string, b: string): number {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
    const [a1, a2 = 0, a3 = 0] = parse(a);
    const [b1, b2 = 0, b3 = 0] = parse(b);
    if (a1 !== b1) return a1 < b1 ? -1 : 1;
    if (a2 !== b2) return a2 < b2 ? -1 : 1;
    if (a3 !== b3) return a3 < b3 ? -1 : 1;
    return 0;
  }
}
