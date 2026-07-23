/**
 * NamedCheckRegistry — injectable registry for FLOW-19 named check evaluators.
 *
 * GAP-NEW-24: Replaces the static NAMED_CHECKS Record approach for flow-specific
 * checks. Each flow module (e.g. Flow19NamedChecksModule) registers its evaluators
 * via onModuleInit() without touching validate.handler source.
 *
 * The af-stations/named-check-registry.ts is a separate concern (stack-based
 * command checks). This registry handles code-evaluation checks (EvaluatorFn).
 */
import { Injectable } from '@nestjs/common';

export type EvaluatorFn = (
  code: string,
  contract?: Record<string, unknown>,
) => { pass: boolean; reason?: string };

@Injectable()
export class NamedCheckRegistry {
  private evaluators = new Map<string, EvaluatorFn>();

  register(name: string, evaluator: EvaluatorFn): void {
    if (this.evaluators.has(name)) {
      throw new Error(`NamedCheck '${name}' already registered — use unique names`);
    }
    this.evaluators.set(name, evaluator);
  }

  get(name: string): EvaluatorFn | undefined {
    return this.evaluators.get(name);
  }

  has(name: string): boolean {
    return this.evaluators.has(name);
  }

  getAll(): Map<string, EvaluatorFn> {
    return new Map(this.evaluators);
  }
}
