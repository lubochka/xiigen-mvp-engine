/**
 * AnalyticsSegmentationService (T50 Node A2) — FLOW-02 Phase A
 *
 * Runs in parallel with A1 — consumes same QuestionnaireCompleted event.
 * GENERAL fallback: if segmentation fails, segment='GENERAL', degraded:true
 * Never blocks the flow — failure stores a degraded record (FLOW-02-RAG-degradable-analytics)
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const ANALYTICS_SEGMENTS_INDEX = 'xiigen-analytics-segments';

// Industry → segment mapping (MACHINE heuristic)
const INDUSTRY_SEGMENT_MAP: Record<string, string> = {
  tech: 'TECH_STARTUP',
  finance: 'FINTECH',
  health: 'HEALTHTECH',
  retail: 'ECOMMERCE',
  manufacturing: 'INDUSTRY',
  education: 'EDTECH',
};

export interface SegmentationInput {
  userId: string;
  tenantId: string;
  answers: Record<string, unknown>; // raw questionnaire answers
}

export interface SegmentationResult {
  segmentId: string;
  segment: string;
  confidence: number;
  degraded: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
@Injectable()
export class AnalyticsSegmentationService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T50', serviceName: 'AnalyticsSegmentationService', flowId: 'FLOW-02' }) });
  }

  async segment(input: SegmentationInput): Promise<DataProcessResult<SegmentationResult>> {
    try {
      if (!input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Analytics segmentation input validation failed',
        );
      }

      // Derive segment from questionnaire answers
      let segment = 'GENERAL';
      let confidence = 0.0;
      let degraded = false;

      try {
        const industry = (input.answers?.['industry'] as string | undefined)?.toLowerCase() ?? '';
        if (industry && INDUSTRY_SEGMENT_MAP[industry]) {
          segment = INDUSTRY_SEGMENT_MAP[industry];
          confidence = 0.85;
        } else if (industry) {
          segment = 'GENERAL';
          confidence = 0.5;
        } else {
          // No industry in answers — degraded
          segment = 'GENERAL';
          confidence = 0.0;
          degraded = true;
        }
      } catch {
        segment = 'GENERAL';
        confidence = 0.0;
        degraded = true;
      }

      const segmentId = `seg-${Date.now()}-${createHash('sha256').update(`${input.tenantId}:${input.userId}`).digest('hex').slice(0, 6)}`;

      const doc: Record<string, unknown> = {
        segment_id: segmentId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        segment,
        confidence,
        degraded,
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // Store record — even on degraded path, always store (FLOW-02-RAG-degradable-analytics)
      await this.dbFabric.storeDocument(ANALYTICS_SEGMENTS_INDEX, doc, segmentId);

      // Enqueue regardless of degraded status
      await this.queueFabric.enqueue('AnalyticsSegmentCompleted', {
        segmentId,
        segment,
        userId: input.userId,
        tenantId: input.tenantId,
        degraded,
      });

      // Always return success for analytics — degraded = degraded success, not failure
      return DataProcessResult.success({ segmentId, segment, confidence, degraded });
    } catch (err) {
      // On any error: store degraded record then return success (analytics NEVER fails the flow)
      const segmentId = `seg-degraded-${Date.now()}`;
      const degradedDoc: Record<string, unknown> = {
        segment_id: segmentId,
        user_id: input.userId ?? '',
        tenant_id: input.tenantId ?? '',
        segment: 'GENERAL',
        confidence: 0.0,
        degraded: true,
        error: String(err),
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };
      await this.dbFabric
        .storeDocument(ANALYTICS_SEGMENTS_INDEX, degradedDoc, segmentId)
        .catch(() => undefined);

      return DataProcessResult.success({
        segmentId,
        segment: 'GENERAL',
        confidence: 0.0,
        degraded: true,
      });
    }
  }
}
