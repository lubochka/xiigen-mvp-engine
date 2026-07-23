// file: server/src/guardrails/named-checks/marketplace-payments.named-checks.ts
// FLOW-16 BFA named check functions. CF-256 through CF-269.
// These checks operate on contract fields and context, not generated code.

import { CheckContext, CheckResult } from './named-check.types';

// ---------------------------------------------------------------------------
// CF-256: KYC verification required before any financial factory call
// ---------------------------------------------------------------------------
export function checkCF256_KycGatingRequired(ctx: CheckContext): CheckResult {
  const factories = ctx.contractFields?.['requiredFactories'] as string[] | undefined;
  const hasFinancialFactory = ['F571', 'F575'].some((f) => factories?.includes?.(f));
  const hasKycFactory = factories?.includes?.('F567');
  const passed = !hasFinancialFactory || !!hasKycFactory;
  return {
    passed,
    cfRule: 'CF-256',
    message: passed
      ? 'KYC factory F567 present alongside financial factories'
      : 'VIOLATION: Financial factory present (F571/F575) but KYC factory F567 is missing',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-257: Buyer KYC must gate T219 — no bypass
// ---------------------------------------------------------------------------
export function checkCF257_BuyerKycNoBypas(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T219')
    return { passed: true, cfRule: 'CF-257', message: 'N/A', severity: 'HIGH' };
  const hasBypassFlag = ctx.contractFields?.['kycBypass'] === true;
  return {
    passed: !hasBypassFlag,
    cfRule: 'CF-257',
    message: !hasBypassFlag
      ? 'T219 has no KYC bypass flag'
      : 'VIOLATION: T219 kycBypass:true detected — buyer KYC cannot be bypassed',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-258: Seller KYC must gate T220 — no bypass
// ---------------------------------------------------------------------------
export function checkCF258_SellerKycNoBypas(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T220')
    return { passed: true, cfRule: 'CF-258', message: 'N/A', severity: 'HIGH' };
  const hasBypassFlag = ctx.contractFields?.['kycBypass'] === true;
  return {
    passed: !hasBypassFlag,
    cfRule: 'CF-258',
    message: !hasBypassFlag
      ? 'T220 has no KYC bypass flag'
      : 'VIOLATION: T220 kycBypass:true detected — seller KYC cannot be bypassed',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-259: T221 CheckoutSaga must declare ep5Required and dna9Required
// ---------------------------------------------------------------------------
export function checkCF259_T221RequiresEP5AndDNA9(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T221')
    return { passed: true, cfRule: 'CF-259', message: 'N/A', severity: 'HIGH' };
  const ep5 = ctx.contractFields?.['ep5Required'] === true;
  const dna9 = ctx.contractFields?.['dna9Required'] === true;
  const passed = ep5 && dna9;
  return {
    passed,
    cfRule: 'CF-259',
    message: passed
      ? 'T221 has ep5Required:true and dna9Required:true'
      : `VIOLATION: T221 missing — ep5Required:${ep5} dna9Required:${dna9}`,
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-260: T221 compensationSaga must have lifoEnforced:true
// ---------------------------------------------------------------------------
export function checkCF260_T221CompensationLifo(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T221')
    return { passed: true, cfRule: 'CF-260', message: 'N/A', severity: 'HIGH' };
  const saga = ctx.contractFields?.['compensationSaga'] as Record<string, unknown> | undefined;
  const passed = saga?.['lifoEnforced'] === true;
  return {
    passed,
    cfRule: 'CF-260',
    message: passed
      ? 'T221 compensationSaga.lifoEnforced is true'
      : 'VIOLATION: T221 compensationSaga.lifoEnforced is not true — LIFO invariant broken',
    severity: 'CRITICAL',
  };
}

// ---------------------------------------------------------------------------
// CF-261: T221 S5:ConfirmOrder must have empty compensate
// ---------------------------------------------------------------------------
export function checkCF261_T221S5NoCompensation(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T221')
    return { passed: true, cfRule: 'CF-261', message: 'N/A', severity: 'HIGH' };
  const saga = ctx.contractFields?.['compensationSaga'] as Record<string, unknown> | undefined;
  const steps = saga?.['steps'] as Array<Record<string, unknown>> | undefined;
  const s5 = steps?.find((s) => s['name'] === 'S5:ConfirmOrder');
  const passed = s5?.['compensate'] === '';
  return {
    passed,
    cfRule: 'CF-261',
    message: passed
      ? 'T221 S5:ConfirmOrder has empty compensate (terminal commit)'
      : 'VIOLATION: T221 S5:ConfirmOrder has a compensate handler — terminal commit cannot be undone',
    severity: 'CRITICAL',
  };
}

// ---------------------------------------------------------------------------
// CF-262: Buyer dispute → seller payout freeze must be synchronous
// ---------------------------------------------------------------------------
export function checkCF262_DisputeTriggersSynchronousPayoutFreeze(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T223')
    return { passed: true, cfRule: 'CF-262', message: 'N/A', severity: 'HIGH' };
  const triggers = ctx.contractFields?.['crossTaskEventTriggers'] as
    | Array<Record<string, unknown>>
    | undefined;
  const disputeTrigger = triggers?.find((t) => t['onEvent'] === 'dispute.buyer.initiated');
  const passed = disputeTrigger?.['synchronous'] === true;
  return {
    passed,
    cfRule: 'CF-262',
    message: passed
      ? 'CF-262: dispute.buyer.initiated trigger is synchronous'
      : 'VIOLATION: dispute.buyer.initiated trigger must be synchronous (payout freeze must happen in same handler)',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-263: DisputeInitiation must not auto-resolve (requires human review)
// ---------------------------------------------------------------------------
export function checkCF263_DisputeNoAutoResolve(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T223')
    return { passed: true, cfRule: 'CF-263', message: 'N/A', severity: 'HIGH' };
  const hasAutoResolve = ctx.contractFields?.['autoResolveDispute'] === true;
  return {
    passed: !hasAutoResolve,
    cfRule: 'CF-263',
    message: !hasAutoResolve
      ? 'CF-263: No auto-resolve flag on T223'
      : 'VIOLATION: T223 autoResolveDispute:true — disputes require human review',
    severity: 'HIGH',
  };
}

// ---------------------------------------------------------------------------
// CF-264: PaymentCapture must follow payment authorization (no orphan capture)
// ---------------------------------------------------------------------------
export function checkCF264_PaymentCaptureRequiresAuth(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T224')
    return { passed: true, cfRule: 'CF-264', message: 'N/A', severity: 'HIGH' };
  const hasAuthDependency = ctx.contractFields?.['requiresCompletedTask'] === 'T221';
  return {
    passed: hasAuthDependency,
    cfRule: 'CF-264',
    message: hasAuthDependency
      ? 'CF-264: T224 declares requiresCompletedTask:T221'
      : 'VIOLATION: T224 PaymentCapture missing dependency on T221 (no orphan capture permitted)',
    severity: 'CRITICAL',
  };
}

// ---------------------------------------------------------------------------
// CF-265: PayoutHoldNotified must be synchronous in same handler as PayoutHeld
// ---------------------------------------------------------------------------
export function checkCF265_PayoutHoldNotificationSynchronous(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T225')
    return { passed: true, cfRule: 'CF-265', message: 'N/A', severity: 'HIGH' };
  const triggers = ctx.contractFields?.['crossTaskEventTriggers'] as
    | Array<Record<string, unknown>>
    | undefined;
  const holdTrigger = triggers?.find((t) => t['onEvent'] === 'payout.seller.held');
  const passed = holdTrigger?.['synchronous'] === true;
  return {
    passed,
    cfRule: 'CF-265',
    message: passed
      ? 'CF-265: payout.seller.held trigger is synchronous'
      : 'VIOLATION: CF-265 — PayoutHoldNotified must be synchronous in same handler as PayoutHeld',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-266: Payout release requires seller KYC completion (T220 must precede T225)
// ---------------------------------------------------------------------------
export function checkCF266_PayoutRequiresSellerKyc(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T225')
    return { passed: true, cfRule: 'CF-266', message: 'N/A', severity: 'HIGH' };
  const hasKycDependency = ctx.contractFields?.['requiresCompletedTask'] === 'T220';
  return {
    passed: hasKycDependency,
    cfRule: 'CF-266',
    message: hasKycDependency
      ? 'CF-266: T225 declares requiresCompletedTask:T220 (seller KYC)'
      : 'VIOLATION: T225 PayoutRelease missing dependency on T220 seller KYC',
    severity: 'CRITICAL',
  };
}

// ---------------------------------------------------------------------------
// CF-267: PUBLISHED filter banned on ALL T226 queries — build failure
// ---------------------------------------------------------------------------
export function checkCF267_T226NoPublishedFilter(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T226')
    return { passed: true, cfRule: 'CF-267', message: 'N/A', severity: 'HIGH' };
  const hasPublishedFilter = ctx.queryFilters?.some(
    (f) => f.includes('PUBLISHED') || f.includes('status:PUBLISHED'),
  );
  const constraints = ctx.contractFields?.['readOnlyConstraints'] as
    | Array<Record<string, unknown>>
    | undefined;
  const constraintViolation = constraints?.find((c) => c['cfRule'] === 'CF-267')?.[
    'prohibitedOperations'
  ] as string[] | undefined;
  const hasConstraintViolation = constraintViolation?.some((op: string) =>
    ctx.queryFilters?.includes(op),
  );

  const passed = !hasPublishedFilter && !hasConstraintViolation;
  return {
    passed,
    cfRule: 'CF-267',
    message: passed
      ? 'CF-267: No PUBLISHED filter on T226'
      : 'VIOLATION CF-267: PUBLISHED filter on T226 query = BUILD FAILURE',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-268: Zero F234 imports in T226 — build failure
// ---------------------------------------------------------------------------
export function checkCF268_T226NoF234Import(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T226')
    return { passed: true, cfRule: 'CF-268', message: 'N/A', severity: 'HIGH' };
  const hasF234 = ctx.importsList?.some((i) => i.includes('F234') || i.includes('/f234'));
  return {
    passed: !hasF234,
    cfRule: 'CF-268',
    message: !hasF234
      ? 'CF-268: No F234 imports in T226'
      : 'VIOLATION CF-268: F234 import in T226 = BUILD FAILURE',
    severity: 'BLOCKER',
  };
}

// ---------------------------------------------------------------------------
// CF-269: T226 must have no write edges in topology
// ---------------------------------------------------------------------------
export function checkCF269_T226ReadOnlyTopology(ctx: CheckContext): CheckResult {
  if (ctx.taskTypeId !== 'T226')
    return { passed: true, cfRule: 'CF-269', message: 'N/A', severity: 'HIGH' };
  const constraints = ctx.contractFields?.['readOnlyConstraints'] as
    | Array<Record<string, unknown>>
    | undefined;
  const hasWriteConstraint = constraints?.some((c) => {
    const ops = c['prohibitedOperations'] as string[] | undefined;
    return ops?.includes('write');
  });
  return {
    passed: !!hasWriteConstraint,
    cfRule: 'CF-269',
    message: hasWriteConstraint
      ? 'CF-269: T226 readOnlyConstraints includes write prohibition'
      : 'VIOLATION CF-269: T226 missing write prohibition in readOnlyConstraints',
    severity: 'HIGH',
  };
}
