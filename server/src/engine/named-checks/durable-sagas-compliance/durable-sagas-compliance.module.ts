/**
 * Flow19NamedChecksModule — registers all FLOW-19 named check evaluators.
 *
 * GAP-NEW-24: Resolves the blocker for K1–K9 named checks. Each evaluator is
 * registered into NamedCheckRegistry on module init, without modifying
 * validate.handler source.
 *
 * Pattern: @Injectable() service registered in EngineModule providers[].
 * NamedCheckRegistry is provided by EngineModule (singleton).
 *
 * Named checks registered:
 *   - compensation_before_apply       (K1 / DD-152 / T272)
 *   - sole_gate_no_bypass             (K5 / DR-112 / T280-T281)
 *   - audit_before_deactivation       (K6 / DR-115 / T286)
 *   - abort_on_preservation_failure   (K6 / DR-115 / T286)
 *   - zero_egress_sensitive           (K8 / CF-343 / T275)
 *   - wall_clock_rto_measurement      (K2 / CF-350 / T283)
 *   - secrets_vault_ref_only          (K3 / DR-116 / T274)
 *   - devops_sandbox_from_backup_only (K2 / CF-340 / T283)
 *   - devops_evidence_append_only     (K9 / DR-119 / T284)
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NamedCheckRegistry } from '../../node-handlers/named-check.registry';
import { compensationBeforeApplyEvaluator } from './compensation-before-apply.check';
import { soleGateNoBypassEvaluator } from './sole-gate-no-bypass.check';
import { auditBeforeDeactivationEvaluator } from './audit-before-deactivation.check';
import { abortOnPreservationFailureEvaluator } from './abort-on-preservation-failure.check';
import { zeroEgressSensitiveEvaluator } from './zero-egress-sensitive.check';
import { wallClockRtoMeasurementEvaluator } from './wall-clock-rto-measurement.check';
import { secretsVaultRefOnlyEvaluator } from './secrets-vault-ref-only.check';
import { sandboxFromBackupOnlyEvaluator } from './sandbox-from-backup-only.check';
import { evidenceAppendOnlyEvaluator } from './evidence-append-only.check';

@Injectable()
export class Flow19NamedChecksService implements OnModuleInit {
  constructor(private readonly registry: NamedCheckRegistry) {}

  onModuleInit() {
    this.registry.register('compensation_before_apply', compensationBeforeApplyEvaluator);
    this.registry.register('sole_gate_no_bypass', soleGateNoBypassEvaluator);
    this.registry.register('audit_before_deactivation', auditBeforeDeactivationEvaluator);
    this.registry.register('abort_on_preservation_failure', abortOnPreservationFailureEvaluator);
    this.registry.register('zero_egress_sensitive', zeroEgressSensitiveEvaluator);
    this.registry.register('wall_clock_rto_measurement', wallClockRtoMeasurementEvaluator);
    this.registry.register('secrets_vault_ref_only', secretsVaultRefOnlyEvaluator);
    this.registry.register('devops_sandbox_from_backup_only', sandboxFromBackupOnlyEvaluator);
    this.registry.register('devops_evidence_append_only', evidenceAppendOnlyEvaluator);
  }
}
