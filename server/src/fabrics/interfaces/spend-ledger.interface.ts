/**
 * ISpendLedgerService — F830
 *
 * PLATFORM-ONLY factory. APPEND-ONLY ledger per DD-169.
 * Only INSERT operations are permitted. UPDATE and DELETE are FORBIDDEN.
 *
 * To issue corrections, use INSERT with type='CREDIT' and reference the original charge.
 * Example: { type: 'CREDIT', referenceChargeId: 'xxx', amount: 0.20, reason: 'OVERSPEND_CORRECTION' }
 *
 * Rule 4: All methods return DataProcessResult<T>.
 * Rule 6: No tenantId parameter — read from AsyncLocalStorage.
 */
import { DataProcessResult } from '../../kernel/data-process-result';

export const SPEND_LEDGER_SERVICE = 'SPEND_LEDGER_SERVICE';

export abstract class ISpendLedgerService {
  /**
   * Inserts a new ledger entry. This is the ONLY write operation.
   * Entry type must be one of: 'CHARGE', 'CREDIT', 'ADJUSTMENT'
   * Entry MUST include fraudCheckId for CHARGE entries (DD-177).
   * No UPDATE. No DELETE. Append-only.
   */
  abstract insert(
    entry: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Retrieves a ledger entry by ID (read-only).
   */
  abstract findById(id: string): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Retrieves all ledger entries for an auction (read-only).
   */
  abstract findByAuctionId(
    auctionId: string,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;

  /**
   * Retrieves all ledger entries for a campaign — for spend reporting (read-only).
   */
  abstract findByCampaignId(
    campaignId: string,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}
