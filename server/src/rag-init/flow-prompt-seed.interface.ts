/**
 * IFlowPromptSeed — contract for per-module prompt seeding.
 * P22: Bootstrap Phase 8 calls seedPrompts() after ragSeed().
 * Every module MUST ship a {domain}.prompts.ts implementing this interface.
 */
import { DataProcessResult } from '../kernel/data-process-result';

export interface IFlowPromptSeed {
  readonly domainId: string;
  seedPrompts(): Promise<DataProcessResult<number>>;
}
