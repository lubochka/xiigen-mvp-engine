/**
 * IProjectTrackerService — Fabric interface for project card tracking.
 *
 * DNA compliance:
 *   DNA-1: All data is Record<string, unknown> — no typed models.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 *   DNA-5: No tenantId parameter — read from TenantContext via CLS.
 *
 * Providers: InMemoryProjectTrackerProvider (default), EsProjectTrackerProvider (production).
 * FREEDOM config key: projectTrackerProvider ("in_memory" | "elasticsearch")
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export abstract class IProjectTrackerService {
  /**
   * Create a project tracking card.
   * @param data Card fields: title, description, epicId, labels, status, etc.
   * @returns Created card with generated card_id.
   */
  abstract createCard(
    data: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Update an existing card's fields.
   * @param cardId The card identifier.
   * @param updates Fields to merge into the card.
   */
  abstract updateCard(
    cardId: string,
    updates: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Retrieve a single card by ID.
   * @param cardId The card identifier.
   */
  abstract getCard(cardId: string): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Log time spent on a card.
   * @param cardId The card identifier.
   * @param minutes Number of minutes to log.
   */
  abstract logTime(cardId: string, minutes: number): Promise<DataProcessResult<void>>;

  /**
   * Add a comment to an existing card.
   * @param cardId The card identifier.
   * @param comment The comment text to append.
   */
  abstract addComment(cardId: string, comment: string): Promise<DataProcessResult<void>>;

  /**
   * List cards matching a filter.
   * @param filter Key-value pairs to match (all fields are ANDed).
   */
  abstract listCards(
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;
}

export const PROJECT_TRACKER_SERVICE = Symbol('IProjectTrackerService');
