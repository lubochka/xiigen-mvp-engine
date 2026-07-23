/**
 * EsProjectTrackerProvider — IProjectTrackerService backed by Elasticsearch.
 *
 * Stores project cards in 'xiigen-project-cards' ES index.
 * Tenant isolation enforced via TenantContext from CLS (DNA-5).
 * All data is Record<string, unknown> (DNA-1).
 * All methods return DataProcessResult<T> (DNA-3).
 *
 * connectionType: TENANT_PRIVATE (cards are tenant-owned, never exported)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IProjectTrackerService } from '../interfaces/project-tracker.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

const PROJECT_CARDS_INDEX = 'xiigen-project-cards';

@Injectable()
export class EsProjectTrackerProvider extends IProjectTrackerService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {
    super();
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  async createCard(
    data: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const cardId = `card-${randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();

    const card: Record<string, unknown> = {
      ...data,
      card_id: cardId,
      tenant_id: tenantId,
      status: data['status'] ?? 'todo',
      connection_type: 'TENANT_PRIVATE',
      created_at: now,
      updated_at: now,
    };

    const storeResult = await this.db.storeDocument(PROJECT_CARDS_INDEX, card, cardId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    return DataProcessResult.success(card);
  }

  async updateCard(
    cardId: string,
    updates: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!cardId) return DataProcessResult.failure('INVALID_ID', 'cardId cannot be empty');

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const getResult = await this.db.getDocument(PROJECT_CARDS_INDEX, cardId);
    if (!getResult.isSuccess)
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    const existing = getResult.data!;
    // Verify tenant ownership
    if (existing['tenant_id'] !== tenantId) {
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);
    }

    const updated: Record<string, unknown> = {
      ...existing,
      ...updates,
      card_id: cardId,
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    };

    const storeResult = await this.db.storeDocument(PROJECT_CARDS_INDEX, updated, cardId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    return DataProcessResult.success(updated);
  }

  async getCard(cardId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!cardId) return DataProcessResult.failure('INVALID_ID', 'cardId cannot be empty');

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const getResult = await this.db.getDocument(PROJECT_CARDS_INDEX, cardId);
    if (!getResult.isSuccess)
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    const card = getResult.data!;
    // Verify tenant ownership (DNA-5: tenant isolation)
    if (card['tenant_id'] !== tenantId) {
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);
    }

    return DataProcessResult.success(card);
  }

  async logTime(cardId: string, minutes: number): Promise<DataProcessResult<void>> {
    if (!cardId) return DataProcessResult.failure('INVALID_ID', 'cardId cannot be empty');
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return DataProcessResult.failure('INVALID_MINUTES', 'minutes must be a positive number');
    }

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const getResult = await this.db.getDocument(PROJECT_CARDS_INDEX, cardId);
    if (!getResult.isSuccess)
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    const card = getResult.data!;
    if (card['tenant_id'] !== tenantId) {
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);
    }

    const timeEntries = (card['time_log'] as Array<Record<string, unknown>>) ?? [];
    timeEntries.push({ minutes, logged_at: new Date().toISOString() });

    const updated: Record<string, unknown> = {
      ...card,
      time_log: timeEntries,
      updated_at: new Date().toISOString(),
    };

    const storeResult = await this.db.storeDocument(PROJECT_CARDS_INDEX, updated, cardId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    return DataProcessResult.success(undefined);
  }

  async listCards(
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    // Always filter by tenant_id (DNA-5: tenant isolation)
    const searchFilter: Record<string, unknown> = {
      ...filter,
      tenant_id: tenantId,
    };

    return this.db.searchDocuments(PROJECT_CARDS_INDEX, searchFilter);
  }

  async addComment(cardId: string, comment: string): Promise<DataProcessResult<void>> {
    if (!cardId) return DataProcessResult.failure('INVALID_ID', 'cardId cannot be empty');
    if (!comment) return DataProcessResult.failure('INVALID_COMMENT', 'comment cannot be empty');

    const getResult = await this.getCard(cardId);
    if (!getResult.isSuccess)
      return DataProcessResult.failure(getResult.errorCode!, getResult.errorMessage!);

    const card = getResult.data!;
    const comments = (card['comments'] as string[]) ?? [];
    comments.push(comment);

    const storeResult = await this.db.storeDocument(
      PROJECT_CARDS_INDEX,
      { ...card, comments },
      cardId,
    );
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    return DataProcessResult.success(undefined);
  }
}
