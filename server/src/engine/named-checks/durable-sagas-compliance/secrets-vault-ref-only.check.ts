/**
 * secrets-vault-ref-only.check — Named check for T274 ConfigLayerResolutionGate.
 *
 * GAP K3 / BFA DR-116: config bundles contain vault://path/to/secret references,
 * never actual secret values. A password: "actualvalue" in a config write is a
 * DR-116 violation. Missing = score-0.
 *
 * Named check: secrets_vault_ref_only
 * Quality gate weight on T274: 0.25 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const secretsVaultRefOnlyEvaluator: EvaluatorFn = (code: string) => {
  // Check if there's any config write operation
  const configWrite = /configBundle|config\.set|resolvedConfig|storeDocument.*config/i.test(code);
  const queueWrite = /queue\.enqueue.*config|enqueue.*configBundle/i.test(code);

  if (!configWrite && !queueWrite) {
    return { pass: true }; // No config write — check not applicable
  }

  // Scan for secret literal patterns
  // The regex excludes strings starting with 'v' or 'V' to allow vault:// references to pass
  const secretLiteralPattern =
    /(?:password|apiKey|apiSecret|secretKey|secret|token)\s*[:=]\s*['"][^'"vV][^'"]*['"]/i;
  const hasSecretLiteral = secretLiteralPattern.test(code);

  if (hasSecretLiteral) {
    return {
      pass: false,
      reason:
        'DR-116: Secret literal in config bundle or event — use vault://path reference instead of storing actual values',
    };
  }

  return { pass: true };
};
