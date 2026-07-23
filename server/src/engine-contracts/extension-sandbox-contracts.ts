import { DataProcessResult } from '../kernel/data-process-result';

export interface SandboxExecutionOptions {
  timeoutMs: number;
  allowedOutputKeys?: string[];
  sandboxId: string;
}

export type SandboxFailureCode =
  | 'SANDBOX_NETWORK_DENIED'
  | 'SANDBOX_ENV_DENIED'
  | 'SANDBOX_TIMEOUT'
  | 'SANDBOX_INVALID_CODE'
  | 'SANDBOX_EXECUTION_ERROR';

export interface IExtensionSandbox {
  execute(
    hookCode: string,
    inputPayload: Record<string, unknown>,
    options: SandboxExecutionOptions,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  validateHookCode(hookCode: string): DataProcessResult<void>;
}
