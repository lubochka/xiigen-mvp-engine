export const QUOTA_MANAGER = 'QUOTA_MANAGER';

export interface QuotaCheckInput {
  tenantId: string;
  queryId: string;
  estimatedCost?: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

export interface IQuotaManager {
  check(input: QuotaCheckInput): Promise<{ isSuccess: boolean; data?: QuotaCheckResult }>;
  recordUsage(tenantId: string, queryId: string, cost: number): Promise<void>;
}
