/**
 * InMemoryProjectTrackerProvider — IProjectTrackerService implementation.
 *
 * Stores project cards in-memory. Used in tests and when no database is available.
 * Tenant isolation enforced via CLS TenantContext (DNA-5).
 *
 * connectionType: TENANT_PRIVATE (cards are tenant-owned, never exported)
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IProjectTrackerService } from '../interfaces/project-tracker.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

@Injectable()
export class InMemoryProjectTrackerProvider extends IProjectTrackerService {
  /** Key: `${tenantId}::${cardId}` → card Record */
  private readonly store = new Map<string, Record<string, unknown>>();
  /** Key: `${tenantId}::${cardId}` → time entries */
  private readonly timeLog = new Map<string, Array<Record<string, unknown>>>();

  constructor(private readonly cls: ClsService) {
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

  private storeKey(tenantId: string, cardId: string): string {
    return `${tenantId}::${cardId}`;
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
      ...structuredClone(data),
      card_id: cardId,
      tenant_id: tenantId,
      status: data['status'] ?? 'todo',
      connection_type: 'TENANT_PRIVATE',
      created_at: now,
      updated_at: now,
    };

    this.store.set(this.storeKey(tenantId, cardId), card);
    return DataProcessResult.success(structuredClone(card));
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

    const key = this.storeKey(tenantId, cardId);
    const existing = this.store.get(key);
    if (!existing) return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    const updated: Record<string, unknown> = {
      ...existing,
      ...structuredClone(updates),
      card_id: cardId, // immutable
      tenant_id: tenantId, // immutable
      updated_at: new Date().toISOString(),
    };

    this.store.set(key, updated);
    return DataProcessResult.success(structuredClone(updated));
  }

  async getCard(cardId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!cardId) return DataProcessResult.failure('INVALID_ID', 'cardId cannot be empty');

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const card = this.store.get(this.storeKey(tenantId, cardId));
    if (!card) return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    return DataProcessResult.success(structuredClone(card));
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

    const key = this.storeKey(tenantId, cardId);
    if (!this.store.has(key))
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    const entries = this.timeLog.get(key) ?? [];
    entries.push({ minutes, logged_at: new Date().toISOString() });
    this.timeLog.set(key, entries);

    return DataProcessResult.success(undefined);
  }

  async listCards(
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const prefix = `${tenantId}::`;
    const results: Array<Record<string, unknown>> = [];

    for (const [key, card] of this.store.entries()) {
      if (!key.startsWith(prefix)) continue;

      const matches = Object.entries(filter).every(([k, v]) => card[k] === v);
      if (matches) results.push(structuredClone(card));
    }

    return DataProcessResult.success(results);
  }

  async addComment(cardId: string, comment: string): Promise<DataProcessResult<void>> {
    if (!cardId) return DataProcessResult.failure('INVALID_ID', 'cardId cannot be empty');
    if (!comment) return DataProcessResult.failure('INVALID_COMMENT', 'comment cannot be empty');

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const key = this.storeKey(tenantId, cardId);
    if (!this.store.has(key))
      return DataProcessResult.failure('NOT_FOUND', `Card '${cardId}' not found`);

    const card = this.store.get(key)!;
    const comments = (card['comments'] as string[]) ?? [];
    comments.push(comment);
    this.store.set(key, { ...card, comments });

    return DataProcessResult.success(undefined);
  }

  // ── Testing helpers ───────────────────────────────────────────────────────

  get count(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.timeLog.clear();
  }
}
