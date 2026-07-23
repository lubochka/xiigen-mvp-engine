/**
 * Form Condition Evaluator — DSL expression evaluator for tenant-authored forms.
 *
 * This utility evaluates form field visibility conditions authored by tenant-admins
 * in the form builder DSL. The key capability: `viewerRole` is a first-class
 * variable in the expression grammar, so admins can make fields role-conditional
 * WITHOUT touching React code.
 *
 * Supported grammar (safe subset):
 *   - Equality:         viewerRole == 'freelancer'
 *   - Inequality:       viewerRole != 'anonymous'
 *   - Numeric equality: submissionCount == 0
 *
 * Unknown / malformed expressions safe-fail to `false` (hide the field) rather
 * than throwing — a broken DSL rule should not crash a user's form submission.
 *
 * Introduced: FLOW-21 RUN-28 (2026-04-20). Also consumed by FLOW-23 TemplateBuilder (RUN-29).
 */

import { type ViewerRole } from '../components/common/ViewerRole';

/** Context variables available inside form condition expressions. */
export interface FormConditionContext {
  viewerRole: ViewerRole;
  // Future: userType, tenantPlan, submissionCount, etc.
  [key: string]: string | number | boolean;
}

/**
 * Evaluates a simple form condition expression.
 *
 * Supported operators: `==` `!=`
 * Supported values: single-quoted string literals, bare integer literals
 *
 * Examples:
 *   evaluateCondition("viewerRole == 'freelancer'", { viewerRole: 'freelancer' }) → true
 *   evaluateCondition("viewerRole != 'anonymous'", { viewerRole: 'tenant-user' }) → true
 *   evaluateCondition(undefined, { viewerRole: 'anonymous' })                   → true  (show by default)
 *   evaluateCondition("", { viewerRole: 'anonymous' })                          → true  (show by default)
 *   evaluateCondition("BAD_OP 'x'", { viewerRole: 'anonymous' })                → false (safe-fail: hide)
 *
 * @param expression Condition expression string (or undefined/empty to show by default).
 * @param context    Context object exposing variables referenced in the expression.
 * @returns true if the field should be shown, false if hidden.
 */
export function evaluateCondition(
  expression: string | undefined,
  context: FormConditionContext
): boolean {
  if (!expression || expression.trim() === '') return true;

  const trimmed = expression.trim();

  // String equality: <variable> == '<literal>'
  const eqMatch = trimmed.match(/^(\w[\w-]*)\s*==\s*'([^']*)'$/);
  if (eqMatch) {
    const [, varName, expectedValue] = eqMatch;
    return String(context[varName] ?? '') === expectedValue;
  }

  // String inequality: <variable> != '<literal>'
  const neqMatch = trimmed.match(/^(\w[\w-]*)\s*!=\s*'([^']*)'$/);
  if (neqMatch) {
    const [, varName, expectedValue] = neqMatch;
    return String(context[varName] ?? '') !== expectedValue;
  }

  // Numeric equality: <variable> == <integer>
  const numEqMatch = trimmed.match(/^(\w[\w-]*)\s*==\s*(\d+)$/);
  if (numEqMatch) {
    const [, varName, expectedNum] = numEqMatch;
    return Number(context[varName] ?? NaN) === Number(expectedNum);
  }

  // Unknown operator or syntax — safe-fail: hide the field.
  // eslint-disable-next-line no-console
  console.warn(`[formConditionEvaluator] Unsupported expression: "${expression}"`);
  return false;
}
