/**
 * PrerequisiteCompletionGateService — SS-09 / T586
 *
 * Aggregation component for the prerequisite resolution loop.
 * Tracks dispatched PREREQ_GAP events per specId and counts resolved events
 * (fabric.interface.ready, freedom.key.registered, prereq.overlap.resolved)
 * until all prerequisites are met.
 *
 * When all gaps are resolved → caller should emit spec.prerequisites.met
 * and resume the original domain flow.
 *
 * Uses built-in fetch (Node 22+). No @nestjs/axios dependency required.
 * DNA-3: never throws — returns result objects or booleans.
 */

import { Injectable, Logger } from '@nestjs/common';

interface SpecPrereqTracker {
  specId: string;
  totalAutonomousGaps: number;
  resolvedCount: number;
  humanEscalationCount: number;
  humanResolvedCount: number;
  resolvedGapIds: string[];
  status: 'TRACKING' | 'ALL_RESOLVED' | 'BLOCKED_ON_HUMAN';
}

@Injectable()
export class PrerequisiteCompletionGateService {
  private readonly logger = new Logger(PrerequisiteCompletionGateService.name);
  private readonly esUrl = process.env.ES_URL || 'http://localhost:9200';
  private readonly trackers = new Map<string, SpecPrereqTracker>();

  /**
   * Called when T581 dispatches gaps for a specId.
   * Initializes tracking for this spec's prerequisite set.
   */
  initializeTracking(
    specId: string,
    autonomousGapCount: number,
    humanEscalationCount: number,
  ): void {
    this.trackers.set(specId, {
      specId,
      totalAutonomousGaps: autonomousGapCount,
      resolvedCount: 0,
      humanEscalationCount,
      humanResolvedCount: 0,
      resolvedGapIds: [],
      status: 'TRACKING',
    });
    this.logger.log(
      `Tracking ${specId}: ${autonomousGapCount} autonomous + ${humanEscalationCount} human gaps`,
    );
  }

  /**
   * Called when fabric.interface.ready, freedom.key.registered, or
   * prereq.overlap.resolved events arrive. Increments the count and
   * checks if all prerequisites are met.
   *
   * Returns true if ALL prerequisites are now resolved → caller should emit
   * spec.prerequisites.met and resume the original domain flow.
   */
  async recordResolution(specId: string, gapId: string, source: string): Promise<boolean> {
    const tracker = this.trackers.get(specId);
    if (!tracker) {
      this.logger.warn(`No tracker for specId ${specId} — resolution event for ${gapId} dropped`);
      return false;
    }

    if (tracker.resolvedGapIds.includes(gapId)) {
      this.logger.warn(`Duplicate resolution for ${gapId} on specId ${specId} — ignored`);
      return false;
    }

    tracker.resolvedGapIds.push(gapId);

    if (source === 'prereq.overlap.resolved') {
      tracker.humanResolvedCount++;
    } else {
      tracker.resolvedCount++;
    }

    const totalExpected = tracker.totalAutonomousGaps + tracker.humanEscalationCount;
    const totalResolved = tracker.resolvedCount + tracker.humanResolvedCount;

    this.logger.log(
      `${specId}: ${totalResolved}/${totalExpected} resolved (gap: ${gapId}, source: ${source})`,
    );

    if (totalResolved >= totalExpected) {
      tracker.status = 'ALL_RESOLVED';
      await this.updateSpecAuditReportStatus(specId);
      this.logger.log(
        `ALL PREREQUISITES MET for ${specId} — caller should emit spec.prerequisites.met`,
      );
      return true;
    }

    return false;
  }

  /**
   * Returns the current tracker state for a specId.
   */
  getTracker(specId: string): SpecPrereqTracker | undefined {
    return this.trackers.get(specId);
  }

  /**
   * Update the spec audit report to RESOLVED status (DNA-8: update before downstream notification).
   * Fail-open: if ES is unavailable, tracking still works — the in-memory state is authoritative.
   */
  private async updateSpecAuditReportStatus(specId: string): Promise<void> {
    try {
      const res = await fetch(
        `${this.esUrl}/xiigen-spec-audit-reports/_update/${encodeURIComponent(specId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc: { status: 'RESOLVED', resolvedAt: new Date().toISOString() },
          }),
        },
      );
      if (!res.ok) {
        this.logger.warn(`Failed to update spec audit report for ${specId}: ${res.status}`);
      }
    } catch (error) {
      // Fail-open: in-memory tracking is authoritative
      this.logger.warn(`ES update failed for ${specId}: ${error}`);
    }
  }
}
