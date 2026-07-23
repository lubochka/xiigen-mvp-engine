/**
 * DnaPatternValidator — enforces 9 DNA patterns on generated code.
 *
 * Used by AF-7 (Compliance) and AF-9 (Judge) stations.
 *
 * DNA Patterns:
 *   1. ParseDocument — Record<string, unknown>, not typed models
 *   2. BuildQueryFilters — empty fields auto-skipped
 *   3. DataProcessResult<T> — never throw for business logic
 *   4. MicroserviceBase — 20 components inherited
 *   5. Scope Isolation — tenantId on every query
 *   6. DynamicController — no entity-specific controllers
 *   7. Idempotency — idempotency key generation on mutations
 *   8. Outbox-before-queue — storeDocument() BEFORE enqueueAsync()
 *   9. CloudEvents — CloudEvent envelope for inter-service events
 *
 * Phase 7.2: Guardrails.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

// ── DnaViolation ─────────────────────────────────────

export interface DnaViolation {
  /** Pattern ID: DNA-1 through DNA-9. */
  readonly patternId: string;
  /** Pattern name. */
  readonly patternName: string;
  /** Severity: 'error' blocks, 'warning' is advisory. */
  readonly severity: 'error' | 'warning';
  /** Human-readable message. */
  readonly message: string;
  /** Optional line hint. */
  readonly lineHint?: string;
}

/** Serialize DnaViolation to dict (DNA-1). */
export function dnaViolationToDict(v: DnaViolation): Record<string, unknown> {
  return {
    pattern_id: v.patternId,
    pattern_name: v.patternName,
    severity: v.severity,
    message: v.message,
    line_hint: v.lineHint ?? null,
  };
}

// ── Validation Context ───────────────────────────────

export interface DnaValidationContext {
  /** Is this a service file? (affects DNA-4 check) */
  isService?: boolean;
  /** Is this a controller file? (affects DNA-6 check) */
  isController?: boolean;
  /** File name hint for better error messages. */
  fileName?: string;
}

// ── Pattern Definitions ──────────────────────────────

interface PatternDef {
  id: string;
  name: string;
  check: (code: string, ctx: DnaValidationContext) => DnaViolation[];
}

// ── Validator ────────────────────────────────────────

@Injectable()
export class DnaPatternValidator {
  /** Patterns indicating typed models instead of dict (DNA-1). */
  private static readonly TYPED_MODEL_PATTERNS = [
    /class\s+\w+Model\b/,
    /class\s+\w+Entity\b/,
    /class\s+\w+Schema\b/,
    /TypedDict/,
    /interface\s+\w+Model\b/,
    /interface\s+\w+Entity\b/,
  ];

  /** Entity-specific controller pattern (DNA-6). */
  private static readonly ENTITY_CONTROLLER_PATTERN = /class\s+(\w+)Controller\b/g;

  /** Allowed controller names (DNA-6). */
  private static readonly ALLOWED_CONTROLLERS = new Set([
    'Dynamic',
    'Base',
    'Generic',
    'Health',
    'Tenant',
  ]);

  private readonly patterns: PatternDef[] = [
    { id: 'DNA-1', name: 'ParseDocument', check: this.checkDna1.bind(this) },
    { id: 'DNA-2', name: 'BuildQueryFilters', check: this.checkDna2.bind(this) },
    { id: 'DNA-3', name: 'DataProcessResult', check: this.checkDna3.bind(this) },
    { id: 'DNA-4', name: 'MicroserviceBase', check: this.checkDna4.bind(this) },
    { id: 'DNA-5', name: 'ScopeIsolation', check: this.checkDna5.bind(this) },
    { id: 'DNA-6', name: 'DynamicController', check: this.checkDna6.bind(this) },
    { id: 'DNA-7', name: 'Idempotency', check: this.checkDna7.bind(this) },
    { id: 'DNA-8', name: 'OutboxBeforeQueue', check: this.checkDna8.bind(this) },
    { id: 'DNA-9', name: 'CloudEvents', check: this.checkDna9.bind(this) },
  ];

  /**
   * Validate code against all 9 DNA patterns.
   * Returns list of violations (empty = fully compliant).
   */
  validate(code: string, context?: DnaValidationContext): DataProcessResult<DnaViolation[]> {
    if (!code || !code.trim()) {
      return DataProcessResult.failure('EMPTY_CODE', 'No code to validate');
    }

    const ctx = context ?? {};
    const violations: DnaViolation[] = [];

    for (const pattern of this.patterns) {
      const found = pattern.check(code, ctx);
      violations.push(...found);
    }

    return DataProcessResult.success(violations);
  }

  /**
   * Quick check: true if no error-level violations.
   */
  isCompliant(code: string, context?: DnaValidationContext): boolean {
    const result = this.validate(code, context);
    if (!result.isSuccess) return false;
    return !result.data!.some((v) => v.severity === 'error');
  }

  /**
   * Get violation count by severity.
   */
  summarize(violations: DnaViolation[]): { errors: number; warnings: number; total: number } {
    const errors = violations.filter((v) => v.severity === 'error').length;
    const warnings = violations.filter((v) => v.severity === 'warning').length;
    return { errors, warnings, total: violations.length };
  }

  // ── Per-pattern checks ───────────────────────────

  /** DNA-1: Use Record<string, unknown>, not typed models. */
  private checkDna1(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const violations: DnaViolation[] = [];
    for (const pattern of DnaPatternValidator.TYPED_MODEL_PATTERNS) {
      if (pattern.test(code)) {
        violations.push({
          patternId: 'DNA-1',
          patternName: 'ParseDocument',
          severity: 'error',
          message: `Found typed model pattern '${pattern.source}'. Use Record<string, unknown> instead.`,
        });
      }
    }

    // C-1 Fix: Also detect business data interfaces (not just classes)
    // Fabric interfaces (IXxxService, IXxxProvider, etc.) are permitted.
    const interfaceViolations = this.findInterfaceDeclarations(code);
    for (const location of interfaceViolations) {
      violations.push({
        patternId: 'DNA-1',
        patternName: 'ParseDocument',
        severity: 'error',
        message:
          `Typed interface found for business data. Use Record<string, unknown>. ` +
          `Exception: fabric interface definitions (IQueueService, IDatabaseService, etc.) are permitted. ` +
          `(${location})`,
      });
    }

    return violations;
  }

  /**
   * C-1 Fix: Detect interface declarations that violate DNA-1.
   *
   * Permitted patterns (fabric interfaces):
   *   - Starts with 'I' AND ends with 'Service', 'Provider', 'Factory', 'Fabric', 'Repository'
   *   - Named fabric interfaces in the explicit allow-list
   *
   * Flagged: all other export interface declarations (business data typed interfaces).
   */
  private findInterfaceDeclarations(code: string): string[] {
    const violations: string[] = [];
    const lines = code.split('\n');
    const PERMITTED_PREFIXES = ['I', 'Has', 'Can', 'Is'];
    const FABRIC_SUFFIXES = ['Service', 'Provider', 'Factory', 'Fabric', 'Repository'];
    const EXPLICIT_PERMIT = new Set([
      'IQueueService',
      'IDatabaseService',
      'IAiProvider',
      'IRagService',
      'ISecretsService',
      'IFlowOrchestrator',
      'IFreedomService',
      'IFreedomConfigService',
      'IScopedMemoryService',
      'IMemoryService',
      'IExternalServiceFactory',
      'IMrrAnalyticsService',
      'IRetrospectiveService',
      'ICycleRouter',
      'INodeHandler',
      'IGraphRagService',
      'IGraphLearningService',
      'IGraphConfigReader',
      'IBfaValidator',
      'ISchedulerService',
      'ICodeRepositoryService',
      'IProjectTrackerService',
      'IReviewEligibilityService',
      'IReviewNotificationService',
      'IReviewOwnershipService',
    ]);

    lines.forEach((line, idx) => {
      const match = line.match(/^export\s+interface\s+(\w+)/);
      if (!match) return;

      const name = match[1];

      // Named explicit permit
      if (EXPLICIT_PERMIT.has(name)) return;

      // Fabric interface pattern: starts with allowed prefix AND ends with fabric suffix
      if (
        PERMITTED_PREFIXES.some((p) => name.startsWith(p)) &&
        FABRIC_SUFFIXES.some((s) => name.endsWith(s))
      ) {
        return;
      }

      violations.push(`Line ${idx + 1}: interface ${name}`);
    });

    return violations;
  }

  /** DNA-2: BuildQueryFilters should skip empty fields. */
  private checkDna2(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const violations: DnaViolation[] = [];
    const hasFilterCode = /filter|query/i.test(code) && /search|find|list/i.test(code);
    const usesBuildFilter = /buildSearchFilter|BuildQueryFilter/i.test(code);

    if (hasFilterCode && !usesBuildFilter) {
      const hasSkipLogic = /if\s*\(|skip|empty|null|undefined/i.test(code);
      if (!hasSkipLogic) {
        violations.push({
          patternId: 'DNA-2',
          patternName: 'BuildQueryFilters',
          severity: 'warning',
          message: 'Query filter code found without empty-field skipping. Use buildSearchFilter().',
        });
      }
    }
    return violations;
  }

  /** DNA-3: Must use DataProcessResult, not throw for business logic. */
  private checkDna3(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const violations: DnaViolation[] = [];
    const hasFunctions = /function\s|async\s|=>\s*\{/.test(code);

    if (hasFunctions && !code.includes('DataProcessResult')) {
      violations.push({
        patternId: 'DNA-3',
        patternName: 'DataProcessResult',
        severity: 'error',
        message:
          'Service code must return DataProcessResult<T>, not throw exceptions for business logic.',
      });
    }

    // C-7 Fix: Scoped throw detection — MicroserviceBase service methods only.
    // Excludes throw inside catch blocks (re-throw of infrastructure errors is permitted).
    const throwViolations = this.findThrowStatementsInServiceMethods(code);
    for (const location of throwViolations) {
      violations.push({
        patternId: 'DNA-3',
        patternName: 'DataProcessResult',
        severity: 'warning',
        message:
          `throw statement found in service method. Use DataProcessResult.failure() instead. ` +
          `Exception: throw inside catch blocks for infrastructure error re-throw is permitted. ` +
          `(${location})`,
        lineHint: location.substring(0, 80),
      });
    }

    return violations;
  }

  /**
   * C-7 Fix: Detect throw statements in MicroserviceBase service class methods.
   *
   * Scope:
   *   - Only flags throw inside classes that extend MicroserviceBase
   *   - Exempts throw inside catch blocks (infrastructure re-throw is acceptable)
   *   - Does not flag static utilities or non-service classes
   */
  private findThrowStatementsInServiceMethods(code: string): string[] {
    const violations: string[] = [];
    const lines = code.split('\n');
    let inServiceClass = false;
    let braceDepth = 0;
    let classBraceStart = 0;
    let catchDepth = 0;

    lines.forEach((line, idx) => {
      // Detect MicroserviceBase class entry
      if (/extends\s+MicroserviceBase/.test(line)) {
        inServiceClass = true;
        classBraceStart = braceDepth;
      }

      // Track brace depth
      const opens = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;

      // Detect catch block entry
      if (/\bcatch\s*\(/.test(line)) catchDepth++;
      if (inServiceClass && closes > 0 && catchDepth > 0) {
        catchDepth = Math.max(0, catchDepth - closes);
      }

      braceDepth += opens - closes;

      // Exit class when braces balance back to class level
      if (inServiceClass && braceDepth <= classBraceStart && idx > 0) {
        inServiceClass = false;
        catchDepth = 0;
      }

      // Flag throw inside service class but NOT inside catch block
      if (inServiceClass && catchDepth === 0 && /\bthrow\b/.test(line)) {
        violations.push(`Line ${idx + 1}: ${line.trim()}`);
      }
    });

    return violations;
  }

  /** DNA-4: Services must extend MicroserviceBase. */
  private checkDna4(code: string, ctx: DnaValidationContext): DnaViolation[] {
    if (!ctx.isService) return [];
    if (code.includes('MicroserviceBase')) return [];

    return [
      {
        patternId: 'DNA-4',
        patternName: 'MicroserviceBase',
        severity: 'error',
        message: 'Service must extend MicroserviceBase (20 architectural components).',
      },
    ];
  }

  /** DNA-5: tenant_id / tenantId on every query. */
  private checkDna5(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const queryKeywords = ['query', 'search', 'find', 'getAll', 'list', 'fetch'];
    const tenantKeywords = ['tenantId', 'tenant_id', 'scopeId', 'scope_id', 'TenantContext'];
    const hasQuery = queryKeywords.some((kw) => code.includes(kw));
    const hasTenant = tenantKeywords.some((kw) => code.includes(kw));

    if (hasQuery && !hasTenant) {
      return [
        {
          patternId: 'DNA-5',
          patternName: 'ScopeIsolation',
          severity: 'error',
          message: 'Query/search operations found without tenantId/scopeId. Add scope isolation.',
        },
      ];
    }
    return [];
  }

  /** DNA-6: No entity-specific controllers. */
  private checkDna6(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const violations: DnaViolation[] = [];
    const pattern = new RegExp(DnaPatternValidator.ENTITY_CONTROLLER_PATTERN.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];
      if (!DnaPatternValidator.ALLOWED_CONTROLLERS.has(name)) {
        violations.push({
          patternId: 'DNA-6',
          patternName: 'DynamicController',
          severity: 'error',
          message: `Entity-specific controller '${name}Controller' found. Use DynamicController pattern.`,
        });
      }
    }
    return violations;
  }

  /** DNA-7: Idempotency keys on mutations. */
  private checkDna7(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const hasMutation = /create|update|insert|upsert|save|put|post/i.test(code);
    const hasIdempotency = /idempotency|idempotent|IdempotencyKey|idempotency_key/i.test(code);

    if (hasMutation && !hasIdempotency) {
      return [
        {
          patternId: 'DNA-7',
          patternName: 'Idempotency',
          severity: 'warning',
          message: 'Mutation operations found without idempotency key handling.',
        },
      ];
    }
    return [];
  }

  /** DNA-8: storeDocument BEFORE enqueueAsync (outbox pattern). */
  private checkDna8(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const storeIdx = code.indexOf('storeDocument');
    const enqueueIdx = code.indexOf('enqueueAsync');

    if (storeIdx >= 0 && enqueueIdx >= 0 && enqueueIdx < storeIdx) {
      return [
        {
          patternId: 'DNA-8',
          patternName: 'OutboxBeforeQueue',
          severity: 'error',
          message:
            'enqueueAsync() called BEFORE storeDocument(). Outbox pattern requires store-first.',
        },
      ];
    }
    return [];
  }

  /** DNA-9: CloudEvents envelope for inter-service events. */
  private checkDna9(code: string, _ctx: DnaValidationContext): DnaViolation[] {
    const hasEventPublish = /emit|publish|enqueue|dispatch.*event/i.test(code);
    const hasCloudEvents = /CloudEvent|cloudevents|cloud_event/i.test(code);

    if (hasEventPublish && !hasCloudEvents) {
      return [
        {
          patternId: 'DNA-9',
          patternName: 'CloudEvents',
          severity: 'warning',
          message:
            'Event publishing found without CloudEvents envelope. Use CloudEvent<T> wrapper.',
        },
      ];
    }
    return [];
  }
}
