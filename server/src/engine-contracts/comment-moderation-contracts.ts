import { DataProcessResult } from '../kernel/data-process-result';

export interface XssFilterResult {
  sanitizedBody: string;
  strippedElements: string[];
  xssDetected: boolean;
}

export interface ICommentXssFilter {
  sanitize(rawBody: string): Promise<DataProcessResult<XssFilterResult>>;
}

export interface ICommentStore {
  store(comment: Record<string, unknown>): Promise<DataProcessResult<void>>;
  getById(commentId: string): Promise<DataProcessResult<Record<string, unknown>>>;
  updateStatus(commentId: string, status: string): Promise<DataProcessResult<void>>;
}

export interface SpamDetectionResult {
  spam_probability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface ISpamDetector {
  detect(sanitizedBody: string): Promise<DataProcessResult<SpamDetectionResult>>;
}

export interface IBudgetCheckRequest {
  service: string;
  estimated_tokens: number;
}

export interface IBudgetCheckResult {
  allowed: boolean;
  remaining_budget?: number;
  reason?: 'BUDGET_EXCEEDED' | 'TENANT_NOT_FOUND' | 'SERVICE_UNKNOWN';
}

export interface IBudgetService {
  checkBudget(request: IBudgetCheckRequest): Promise<DataProcessResult<IBudgetCheckResult>>;
}
