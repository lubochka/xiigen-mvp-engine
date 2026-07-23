import { DataProcessResult } from '../kernel/data-process-result';

export interface SsrfValidationOptions {
  skipCache: boolean;
  allowlistId?: string;
}

export interface SsrfValidationResult {
  resolvedIp: string;
  isBlocked: boolean;
  blockReason?: 'RFC1918_PRIVATE' | 'LOOPBACK' | 'METADATA_SERVICE' | 'ALLOWLIST_MISS';
  url: string;
}

export interface ISsrfValidator {
  validateAndResolve(
    url: string,
    options?: SsrfValidationOptions,
  ): Promise<DataProcessResult<SsrfValidationResult>>;
}
