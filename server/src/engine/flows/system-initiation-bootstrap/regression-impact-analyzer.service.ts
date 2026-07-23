/**
 * RegressionImpactAnalyzer — T541 [CHANGE_DETECTION].
 *
 * Graph traversal blast radius analysis before any promotion.
 *
 * CF-746: Regression check MUST run before any promotion — score-0 if skipped.
 *
 * After CASE A or CASE C promotion: scan active bundle manifests,
 * check minFlowVersions[flowId], set bundle DEGRADED if version below minimum.
 *
 * Implements replayArbiterOnBundle() for arbiter re-validation on bundle impact (v3).
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on bundle DEGRADED updates.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';
import type {
  Flow33Ai,
  Flow33BlastRadiusReport,
  Flow33DocumentUpdater,
  Flow33Queue,
} from './flow33-shared-interfaces';

export type PromotionCase = 'CASE_A' | 'CASE_B' | 'CASE_C';

export type BlastRadiusReport = Flow33BlastRadiusReport & {
  computedAt: string;
};

export interface ArbiterReplayResult {
  arbiterId: string;
  bundleId: string;
  score: number;
  passed: boolean;
  wouldHaveBlocked: boolean;
  notes: string[];
  replayedAt: string;
}

export interface BundleVersionCheckResult {
  bundleId: string;
  flowId: string;
  promotedVersion: string;
  requiredMinVersion: string;
  degraded: boolean;
}

export class RegressionImpactAnalyzer {
  constructor(
    private readonly db: Flow33DocumentUpdater,
    private readonly queue: Flow33Queue,
    private readonly ai: Flow33Ai,
  ) {}

  /**
   * Compute blast radius for a family — MUST be called before any promotion (CF-746).
   * Graph traversal: cycle-safe, depth-limited.
   */
  async computeBlastRadius(
    familyId: string,
    tenantId: string,
  ): Promise<DataProcessResult<BlastRadiusReport>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!familyId) return DataProcessResult.failure('MISSING_FAMILY_ID', 'familyId is required');

    // Graph traversal: find all dependent flows and families
    const edgesResult = await this.db.searchDocuments('flow33-graphrag-edges', { tenantId });
    const edges = edgesResult.isSuccess ? (edgesResult.data ?? []) : [];

    // Simple graph traversal — collect affected flows and families
    const affectedFlows = new Set<string>();
    const affectedFamilies = new Set<string>();
    const visited = new Set<string>([familyId]);
    const queue: string[] = [familyId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of edges) {
        if (edge['fromNodeId'] === current && !visited.has(edge['toNodeId'] as string)) {
          const toNode = edge['toNodeId'] as string;
          visited.add(toNode);
          queue.push(toNode);
          if ((edge['flowId'] as string)?.startsWith('FLOW-')) {
            affectedFlows.add(edge['flowId'] as string);
          }
          affectedFamilies.add(toNode);
        }
      }
    }
    affectedFamilies.delete(familyId);

    const reportId = randomUUID();
    const computedAt = new Date().toISOString();
    const report: BlastRadiusReport = {
      reportId,
      familyId,
      tenantId,
      affectedFlows: Array.from(affectedFlows),
      affectedFamilies: Array.from(affectedFamilies),
      blastRadius: affectedFamilies.size,
      computedAt,
    };

    // DNA-8: store BEFORE emit
    await this.db.storeDocument(
      'flow33-blast-radius-reports',
      report as unknown as Record<string, unknown>,
      reportId,
    );
    await this.queue.enqueue('regression.impact.analyzed', {
      reportId,
      familyId,
      tenantId,
      blastRadius: report.blastRadius,
      computedAt,
    });

    return DataProcessResult.success(report);
  }

  /**
   * Check bundle version compatibility after CASE A or CASE C promotion.
   * Sets bundle to DEGRADED if promoted flow version < minFlowVersions[flowId].
   * DNA-8: updateDocument() BEFORE enqueue() on DEGRADED status.
   */
  async checkBundleVersionsAfterPromotion(
    flowId: string,
    promotedVersion: string,
    tenantId: string,
    promotionCase: PromotionCase,
  ): Promise<DataProcessResult<BundleVersionCheckResult[]>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    // Only run for CASE A and CASE C — CASE B does not trigger bundle check
    if (promotionCase === 'CASE_B') {
      return DataProcessResult.success([]);
    }

    // Scan all active bundles that include this flow in requiredFlows[]
    const bundlesResult = await this.db.searchDocuments('flow33-bundle-manifests', {
      tenantId,
      status: 'ACTIVE',
    });
    if (!bundlesResult.isSuccess)
      return DataProcessResult.failure(bundlesResult.errorCode!, bundlesResult.errorMessage!);

    const results: BundleVersionCheckResult[] = [];

    for (const bundle of bundlesResult.data ?? []) {
      const requiredFlows = (bundle['requiredFlows'] as string[]) ?? [];
      const minFlowVersions = (bundle['minFlowVersions'] as Record<string, string>) ?? {};
      const bundleId = bundle['bundleId'] as string;

      if (!requiredFlows.includes(flowId)) continue;

      const minVersion = minFlowVersions[flowId];
      if (!minVersion) continue;

      const isDegraded = this.compareVersions(promotedVersion, minVersion) < 0;
      const checkResult: BundleVersionCheckResult = {
        bundleId,
        flowId,
        promotedVersion,
        requiredMinVersion: minVersion,
        degraded: isDegraded,
      };
      results.push(checkResult);

      if (isDegraded) {
        // DNA-8: updateDocument BEFORE enqueue
        await this.db.updateDocument('flow33-bundle-manifests', bundleId, {
          status: 'DEGRADED',
          degradedAt: new Date().toISOString(),
          degradedReason: `Flow ${flowId} promoted version ${promotedVersion} < required ${minVersion}`,
        });
        await this.queue.enqueue('bundle.degraded', {
          bundleId,
          flowId,
          promotedVersion,
          requiredMinVersion: minVersion,
          tenantId,
        });
      }
    }

    return DataProcessResult.success(results);
  }

  /**
   * Replay a specific arbiter against an accepted bundle.
   * Used to re-validate bundle impact when new arbiters are registered.
   */
  async replayArbiterOnBundle(
    arbiterId: string,
    bundleId: string,
    tenantId: string,
  ): Promise<DataProcessResult<ArbiterReplayResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!arbiterId) return DataProcessResult.failure('MISSING_ARBITER_ID', 'arbiterId is required');
    if (!bundleId) return DataProcessResult.failure('MISSING_BUNDLE_ID', 'bundleId is required');

    // Retrieve accepted bundle from bundle archive
    const bundleResult = await this.db.searchDocuments('flow33-bundle-manifests', {
      bundleId,
      tenantId,
    });
    if (!bundleResult.isSuccess)
      return DataProcessResult.failure(bundleResult.errorCode!, bundleResult.errorMessage!);
    if (!bundleResult.data?.length)
      return DataProcessResult.failure('BUNDLE_NOT_FOUND', `Bundle ${bundleId} not found`);

    const bundle = bundleResult.data[0];
    const bundleJson = JSON.stringify(bundle);

    // Run arbiter via AI fabric
    const prompt = `You are the ${arbiterId} Arbiter replaying against an accepted bundle. Bundle: ${bundleJson}. Score 0-10. Reply JSON: { score: number, passed: boolean, notes: string[] }`;
    const aiResult = await this.ai.generate(prompt);

    let score = 0;
    let passed = false;
    let notes: string[] = [];

    if (aiResult.isSuccess && aiResult.data) {
      try {
        const parsed = JSON.parse(aiResult.data);
        score = Number(parsed.score ?? 0);
        passed = typeof parsed.passed === 'boolean' ? parsed.passed : score >= 7;
        notes = Array.isArray(parsed.notes) ? parsed.notes : [String(parsed.notes ?? '')];
      } catch {
        notes = ['Failed to parse arbiter replay response'];
      }
    }

    const replayedAt = new Date().toISOString();
    const result: ArbiterReplayResult = {
      arbiterId,
      bundleId,
      score,
      passed,
      wouldHaveBlocked: !passed,
      notes,
      replayedAt,
    };

    return DataProcessResult.success(result);
  }

  /**
   * Simple semver comparison: -1 if a < b, 0 if equal, 1 if a > b.
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => v.replace(/^v/, '').split('.').map(Number);
    const [a1, a2 = 0, a3 = 0] = parseVersion(a);
    const [b1, b2 = 0, b3 = 0] = parseVersion(b);
    if (a1 !== b1) return a1 < b1 ? -1 : 1;
    if (a2 !== b2) return a2 < b2 ? -1 : 1;
    if (a3 !== b3) return a3 < b3 ? -1 : 1;
    return 0;
  }
}
