import { Injectable, Inject } from '@nestjs/common';
import {
  IShadowRunService,
  ShadowRunRecord,
  ShadowRunGapResult,
  ShadowRunStatus,
} from './shadow-run.service';
import { IDatabaseService, DATABASE_SERVICE } from '../interfaces/database.interface';

@Injectable()
export class DeferredShadowRunProvider extends IShadowRunService {
  // Document ID convention: `${taskTypeId}::${flowId}`
  private readonly INDEX = 'xiigen-shadow-runs';
  private readonly STALLED_AFTER_FLOWS = 4; // FREEDOM config default; hardcoded interim per plan

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {
    super();
  }

  async recordAttempt(params: {
    taskTypeId: string;
    flowId: string;
    paidModelScore?: number;
    ossScore?: number;
  }): Promise<ShadowRunRecord> {
    try {
      const docId = `${params.taskTypeId}::${params.flowId}`;
      const existing = await this.getExisting(docId);
      const flowsInPending = (existing?.flowsInPending ?? 0) + 1;
      const status: ShadowRunStatus =
        params.ossScore != null
          ? 'ACTIVE'
          : flowsInPending >= this.STALLED_AFTER_FLOWS
            ? 'STALLED'
            : 'PENDING_LOCAL_MODEL';
      const gapScore =
        params.paidModelScore != null && params.ossScore != null
          ? params.paidModelScore - params.ossScore
          : undefined;
      const record: ShadowRunRecord = {
        taskTypeId: params.taskTypeId,
        flowId: params.flowId,
        status,
        paidModelScore: params.paidModelScore,
        ossScore: params.ossScore,
        gapScore,
        flowsInPending,
        stalledAfterFlows: this.STALLED_AFTER_FLOWS,
        recordedAt: new Date().toISOString(),
      };
      await this.storeRecord(docId, record);
      return record;
    } catch {
      // Never throws — return minimal record
      return {
        taskTypeId: params.taskTypeId,
        flowId: params.flowId,
        status: 'PENDING_LOCAL_MODEL',
        flowsInPending: 0,
        stalledAfterFlows: this.STALLED_AFTER_FLOWS,
        recordedAt: new Date().toISOString(),
      };
    }
  }

  async getGapScore(taskTypeId: string): Promise<ShadowRunGapResult> {
    try {
      const records = await this.searchByTaskType(taskTypeId);
      if (!records.length) {
        return { taskTypeId, status: 'PENDING_LOCAL_MODEL', gapScore: 'UNKNOWN' };
      }
      const latest = records[0];
      if (latest.status === 'STALLED')
        return { taskTypeId, status: 'STALLED', gapScore: 'STALLED' };
      if (latest.status === 'PENDING_LOCAL_MODEL')
        return { taskTypeId, status: 'PENDING_LOCAL_MODEL', gapScore: 'UNKNOWN' };
      return { taskTypeId, status: latest.status, gapScore: latest.gapScore ?? 'UNKNOWN' };
    } catch {
      return { taskTypeId, status: 'PENDING_LOCAL_MODEL', gapScore: 'UNKNOWN' };
    }
  }

  async getFlowSummary(flowId: string): Promise<ShadowRunRecord[]> {
    try {
      return await this.searchByFlow(flowId);
    } catch {
      return [];
    }
  }

  private async getExisting(docId: string): Promise<ShadowRunRecord | null> {
    const result = await this.db.getDocument(this.INDEX, docId);
    if (!result.isSuccess || !result.data) return null;
    return result.data as unknown as ShadowRunRecord;
  }

  private async storeRecord(docId: string, record: ShadowRunRecord): Promise<void> {
    await this.db.storeDocument(this.INDEX, record as unknown as Record<string, unknown>, docId);
  }

  private async searchByTaskType(taskTypeId: string): Promise<ShadowRunRecord[]> {
    const result = await this.db.searchDocuments(this.INDEX, { taskTypeId });
    if (!result.isSuccess || !result.data) return [];
    return result.data as unknown as ShadowRunRecord[];
  }

  private async searchByFlow(flowId: string): Promise<ShadowRunRecord[]> {
    const result = await this.db.searchDocuments(this.INDEX, { flowId });
    if (!result.isSuccess || !result.data) return [];
    return result.data as unknown as ShadowRunRecord[];
  }
}
