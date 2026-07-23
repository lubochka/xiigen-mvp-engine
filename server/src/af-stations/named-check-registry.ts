// server/src/af-stations/named-check-registry.ts
// Maps target stack to appropriate named checks.
// Used by validate.handler to select the right checks per stack.
// GAP-NEW-24 (R0): Externalized NamedCheckRegistry for per-flow registration.

// ── NamedCheckFn + NamedCheckRegistry (GAP-NEW-24) ───────────────────────────

export type NamedCheckFn = (ctx: Record<string, unknown>) => Promise<boolean>;

export interface INamedCheckRegistry {
  getCheck(key: string): NamedCheckFn | undefined;
  registerFlow(flowId: string, checks: Record<string, NamedCheckFn>): void;
  hasCheck(key: string): boolean;
  listKeys(): string[];
}

export class NamedCheckRegistry implements INamedCheckRegistry {
  private readonly checks = new Map<string, NamedCheckFn>();

  getCheck(key: string): NamedCheckFn | undefined {
    return this.checks.get(key);
  }

  registerFlow(_flowId: string, checks: Record<string, NamedCheckFn>): void {
    Object.entries(checks).forEach(([k, fn]) => this.checks.set(k, fn));
  }

  hasCheck(key: string): boolean {
    return this.checks.has(key);
  }

  listKeys(): string[] {
    return Array.from(this.checks.keys());
  }
}

export const globalNamedCheckRegistry = new NamedCheckRegistry();

// ── Legacy stack-based named checks ──────────────────────────────────────────

export interface CheckResult {
  passed: boolean;
  message?: string;
}

export interface NamedCheck {
  name: string;
  command?: string;
  checker?: (code: string) => CheckResult;
}

// Placeholder checkers — these would be implemented as full check functions
function nestjsArchitectureChecker(code: string): CheckResult {
  const passed = /extends\s+MicroserviceBase|@Injectable/.test(code);
  return { passed, message: passed ? undefined : 'NestJS architecture patterns not found' };
}

function dnaPrinciplesChecker(code: string): CheckResult {
  const hasThrow = /throw\s+new\s+(Not|Bad|Conflict)/.test(code);
  return {
    passed: !hasThrow,
    message: hasThrow ? 'DNA-3: must not throw for business logic' : undefined,
  };
}

function asyncDefChecker(code: string): CheckResult {
  // All Python I/O functions should be async def
  const hasSync = /^def \w+.*self\.db\./m.test(code);
  return {
    passed: !hasSync,
    message: hasSync ? 'Python I/O functions must use async def' : undefined,
  };
}

function pydanticModelChecker(code: string): CheckResult {
  const hasBaseModel = /class \w+\(BaseModel\)/.test(code);
  return {
    passed: hasBaseModel,
    message: hasBaseModel ? undefined : 'Python models must use Pydantic BaseModel',
  };
}

export const NAMED_CHECKS_BY_STACK: Record<string, NamedCheck[]> = {
  NestJS: [
    { name: 'tsc_compile', command: 'npx tsc --noEmit' },
    { name: 'eslint_ts', command: 'npx eslint --ext .ts --max-warnings 0' },
    { name: 'nestjs_patterns', checker: nestjsArchitectureChecker },
    { name: 'dna_principles', checker: dnaPrinciplesChecker },
  ],
  FastAPI: [
    { name: 'mypy_typecheck', command: 'python -m mypy --strict .' },
    { name: 'ruff_lint', command: 'python -m ruff check .' },
    { name: 'fastapi_startup', command: 'python -c "from main import app; print(\'OK\')"' },
    { name: 'async_compliance', checker: asyncDefChecker },
    { name: 'pydantic_models', checker: pydanticModelChecker },
  ],
  Vue3: [
    { name: 'vue_tsc', command: 'npx vue-tsc --noEmit' },
    { name: 'eslint_vue', command: 'npx eslint --ext .vue --max-warnings 0' },
  ],
  React: [
    { name: 'tsc_compile', command: 'npx tsc --noEmit' },
    { name: 'eslint_react', command: 'npx eslint --ext .tsx,.ts --max-warnings 0' },
  ],
};

export function getNamedChecks(targetStack: string): NamedCheck[] {
  return NAMED_CHECKS_BY_STACK[targetStack] ?? NAMED_CHECKS_BY_STACK['NestJS'];
}
