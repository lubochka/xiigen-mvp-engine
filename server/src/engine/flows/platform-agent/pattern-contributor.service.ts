/**
 * T655 PatternContributor — FLOW-46 Phase B
 *
 * Two contribution paths:
 *   Path A (agent-pure):     write directly to xiigen-rag-patterns +
 *                            xiigen-planning-decisions + xiigen-prompts under
 *                            MASTER + GLOBAL.
 *   Path B (tenant-derived): internal PatternSanitizer strips identifying
 *                            fields → consent gate → if SHARE writes shared
 *                            indices, if KEEP_PRIVATE writes tenant-private.
 *
 * Iron rules:
 *   IR-1: Path A no consent; Path B requires consent before GLOBAL write.
 *   IR-2: CF-841 sanitizer failure = abort + log + no retry.
 *   IR-3: PatternSanitizer is internal to T655; no separate service class.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../../../fabrics/interfaces/database.interface';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

const RAG_PATTERNS_INDEX = 'xiigen-rag-patterns';
const PLANNING_DECISIONS_INDEX = 'xiigen-planning-decisions';
const PROMPTS_INDEX = 'xiigen-prompts';
const CONTRIBUTIONS_INDEX = 'xiigen-agent-contributions';

const SENSITIVE_FIELDS = ['tenantId', 'tenantDomain', 'apiKeyHints'] as const;

export type ContributionPath = 'A' | 'B';
export type ContributionConsent = 'SHARE' | 'KEEP_PRIVATE';
export type ContributionStatus =
  | 'RECORDED'
  | 'SHARED'
  | 'KEPT_PRIVATE'
  | 'SANITIZATION_FAILED';

export interface ContributionInput {
  sessionId: string;
  patternId: string;
  path: ContributionPath;
  solution: Record<string, unknown>;
  sourceTenantId?: string;
  consent?: ContributionConsent;
}

export interface ContributionRecord {
  contributionId: string;
  sessionId: string;
  patternId: string;
  path: ContributionPath;
  status: ContributionStatus;
  tenantId: string;
  strippedCount: number;
  preSanitizationFields: string[];
  postSanitizationFields: string[];
}

@Injectable()
export class PatternContributor {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async contribute(
    input: ContributionInput,
  ): Promise<DataProcessResult<ContributionRecord>> {
    const existing = await this.db.searchDocuments(CONTRIBUTIONS_INDEX, {
      patternId: input.patternId,
      sessionId: input.sessionId,
    });
    if (existing.isSuccess && (existing.data ?? []).length > 0) {
      const prior = existing.data![0] as Record<string, unknown>;
      return DataProcessResult.success(prior as unknown as ContributionRecord);
    }

    if (input.path === 'A') {
      return this.executePathA(input);
    }
    return this.executePathB(input);
  }

  private async executePathA(
    input: ContributionInput,
  ): Promise<DataProcessResult<ContributionRecord>> {
    const contributionId = `contrib-${input.patternId}-${Date.now()}`;
    const preFields = Object.keys(input.solution);
    const baseDoc: Record<string, unknown> = {
      ...input.solution,
      patternId: input.patternId,
      tenantId: MASTER_TENANT_ID,
      knowledgeScope: 'GLOBAL',
      connectionType: 'FLOW_SCOPED',
      sourceType: 'AGENT_RUN',
      contributedBy: 'T655_PATTERN_CONTRIBUTOR_PATH_A',
      contributedAt: new Date().toISOString(),
    };

    for (const index of [RAG_PATTERNS_INDEX, PLANNING_DECISIONS_INDEX, PROMPTS_INDEX]) {
      const stored = await this.db.storeDocument(index, baseDoc, input.patternId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'PATH_A_WRITE_FAILED',
          stored.errorMessage ?? `Path A write to ${index} failed`,
        );
      }
    }

    const record: ContributionRecord = {
      contributionId,
      sessionId: input.sessionId,
      patternId: input.patternId,
      path: 'A',
      status: 'RECORDED',
      tenantId: MASTER_TENANT_ID,
      strippedCount: 0,
      preSanitizationFields: preFields,
      postSanitizationFields: preFields,
    };

    await this.writeAuditRecord(record);
    return DataProcessResult.success(record);
  }

  private async executePathB(
    input: ContributionInput,
  ): Promise<DataProcessResult<ContributionRecord>> {
    const contributionId = `contrib-${input.patternId}-${Date.now()}`;
    const preFields = Object.keys(input.solution);

    const sanitized = this.sanitize(input.solution);
    if (!sanitized) {
      const failureRecord: ContributionRecord = {
        contributionId,
        sessionId: input.sessionId,
        patternId: input.patternId,
        path: 'B',
        status: 'SANITIZATION_FAILED',
        tenantId: input.sourceTenantId ?? 'unknown',
        strippedCount: 0,
        preSanitizationFields: preFields,
        postSanitizationFields: [],
      };
      await this.writeAuditRecord(failureRecord);
      return DataProcessResult.failure(
        'SANITIZATION_FAILED',
        'CF-841: PatternSanitizer aborted; pattern not contributed and no retry permitted',
      );
    }

    const postFields = Object.keys(sanitized.payload);
    const consent: ContributionConsent = input.consent ?? 'KEEP_PRIVATE';
    const sharedDoc: Record<string, unknown> = {
      ...sanitized.payload,
      patternId: input.patternId,
      tenantId: consent === 'SHARE' ? MASTER_TENANT_ID : (input.sourceTenantId ?? 'unknown'),
      knowledgeScope: consent === 'SHARE' ? 'GLOBAL' : 'PRIVATE',
      connectionType: 'FLOW_SCOPED',
      sourceType: 'TENANT_DERIVED',
      contributedBy: 'T655_PATTERN_CONTRIBUTOR_PATH_B',
      contributedAt: new Date().toISOString(),
    };

    if (consent === 'SHARE') {
      for (const index of [RAG_PATTERNS_INDEX, PLANNING_DECISIONS_INDEX, PROMPTS_INDEX]) {
        const stored = await this.db.storeDocument(index, sharedDoc, input.patternId);
        if (!stored.isSuccess) {
          return DataProcessResult.failure(
            stored.errorCode ?? 'PATH_B_SHARE_WRITE_FAILED',
            stored.errorMessage ?? `Path B SHARE write to ${index} failed`,
          );
        }
      }
    } else {
      const stored = await this.db.storeDocument(RAG_PATTERNS_INDEX, sharedDoc, input.patternId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'PATH_B_PRIVATE_WRITE_FAILED',
          stored.errorMessage ?? 'Path B KEEP_PRIVATE write failed',
        );
      }
    }

    const record: ContributionRecord = {
      contributionId,
      sessionId: input.sessionId,
      patternId: input.patternId,
      path: 'B',
      status: consent === 'SHARE' ? 'SHARED' : 'KEPT_PRIVATE',
      tenantId: input.sourceTenantId ?? 'unknown',
      strippedCount: sanitized.strippedCount,
      preSanitizationFields: preFields,
      postSanitizationFields: postFields,
    };
    await this.writeAuditRecord(record);
    return DataProcessResult.success(record);
  }

  private sanitize(
    solution: Record<string, unknown>,
  ): { payload: Record<string, unknown>; strippedCount: number } | null {
    try {
      const cleaned: Record<string, unknown> = {};
      let stripped = 0;
      for (const [k, v] of Object.entries(solution)) {
        if ((SENSITIVE_FIELDS as readonly string[]).includes(k)) {
          stripped += 1;
          continue;
        }
        cleaned[k] = v;
      }
      return { payload: cleaned, strippedCount: stripped };
    } catch {
      return null;
    }
  }

  private async writeAuditRecord(record: ContributionRecord): Promise<void> {
    const auditDoc: Record<string, unknown> = {
      ...record,
      timestamp: new Date().toISOString(),
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'GLOBAL',
    };
    await this.db.storeDocument(CONTRIBUTIONS_INDEX, auditDoc, record.contributionId);
  }
}
