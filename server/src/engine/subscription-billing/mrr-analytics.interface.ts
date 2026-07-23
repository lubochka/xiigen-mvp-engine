/**
 * IMrrAnalyticsService — interface for MRR analytics (FLOW-12).
 *
 * DNA-5: tenantId read from ALS — no tenantId parameter on methods.
 * DNA-3: all methods return DataProcessResult, never throw.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export interface IMrrAnalyticsService {
  /**
   * Calculate MRR for the current tenant (from ALS context).
   * DNA-5: tenantId read from ALS — no parameter.
   */
  calculateMrr(): Promise<DataProcessResult<Record<string, unknown>>>;
}

export const MRR_ANALYTICS_SERVICE = Symbol('IMrrAnalyticsService');
