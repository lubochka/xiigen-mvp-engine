/**
 * FLOW-32 Named Checks tests (CF-715, CF-718, CF-726, CF-729, CF-734, CF-736)
 * Tests all 7 invariant functions in flow-32-checks.ts
 */

import {
  supply_chain_tripartite_signing,
  logic_data_plane_separation,
  logic_data_plane_install_only,
  secret_ref_indirection,
  integer_arithmetic_settlement,
  fraud_human_review_required,
  bfa_revalidation_all_consumers,
} from '../sharable-flows-marketplace-checks';

describe('flow-32-checks — FLOW-32 named invariants', () => {
  // ── CHECK 1: supply_chain_tripartite_signing (CF-715) ──────────────────────

  describe('supply_chain_tripartite_signing (CF-715)', () => {
    it('passes when T518 references all three supply chain factories', () => {
      const code = `
        @Inject(ARTIFACT_SIGNING_SERVICE) private readonly signingService: IArtifactSigningService,
        @Inject(SBOM_GENERATOR_SERVICE) private readonly sbomService: ISBOMGeneratorService,
        @Inject(SLSA_ATTESTATION_SERVICE) private readonly slsaService: ISLSAAttestationService,
        // F1416 F1417 F1418
      `;
      expect(() => supply_chain_tripartite_signing(code, 'T518')).not.toThrow();
    });

    it('throws when T518 is missing F1416', () => {
      const code = `
        @Inject(SBOM_GENERATOR_SERVICE) private readonly sbomService: ISBOMGeneratorService,
        @Inject(SLSA_ATTESTATION_SERVICE) private readonly slsaService: ISLSAAttestationService,
      `;
      expect(() => supply_chain_tripartite_signing(code, 'T518')).toThrow('CF-715');
    });

    it('throws when T518 is missing all three factories', () => {
      const code = 'export class ArtifactPublisher extends MicroserviceBase {}';
      expect(() => supply_chain_tripartite_signing(code, 'T518')).toThrow('CF-715');
    });

    it('is a no-op for non-T518 task types', () => {
      const code = 'export class SomeService extends MicroserviceBase {}';
      expect(() => supply_chain_tripartite_signing(code, 'T516')).not.toThrow();
      expect(() => supply_chain_tripartite_signing(code, 'T519')).not.toThrow();
    });
  });

  // ── CHECK 2: logic_data_plane_separation (CF-718 / DD-323) ────────────────

  describe('logic_data_plane_separation (CF-718 / DD-323)', () => {
    it('passes when T528 contains only logic plane content', () => {
      const code = `
        async exportBlueprint(flowId: string) {
          const dag = await this.flowRegistry.getDag(flowId);
          const prompts = await this.promptRegistry.getPrompts(flowId);
          const schema = await this.configRegistry.getSchema(flowId);
          return DataProcessResult.success({ dag: dag.data, prompts: prompts.data });
        }
      `;
      expect(() => logic_data_plane_separation(code, 'T528')).not.toThrow();
    });

    it('throws when T529 contains embedding references', () => {
      const code = `
        const embeddings = await this.vectorStore.get(flowId);
      `;
      expect(() => logic_data_plane_separation(code, 'T529')).toThrow('CF-718');
    });

    it('throws when T530 contains rawData', () => {
      const code = `const rawData = await this.index.getAll();`;
      expect(() => logic_data_plane_separation(code, 'T530')).toThrow('DD-323');
    });

    it('is a no-op for task types outside T528/T529/T530', () => {
      const code = 'const embeddings = [1, 2, 3];';
      expect(() => logic_data_plane_separation(code, 'T522')).not.toThrow();
      expect(() => logic_data_plane_separation(code, 'T516')).not.toThrow();
    });
  });

  // ── CHECK 3: logic_data_plane_install_only (CF-718 / DD-323 T522) ─────────

  describe('logic_data_plane_install_only (CF-718 / DD-323)', () => {
    it('passes when T522 installs logic artifacts only', () => {
      const code = `
        async installTemplate(templateId: string) {
          const dag = await this.templateRegistry.getDag(templateId);
          const config = await this.templateRegistry.getConfig(templateId);
          return DataProcessResult.success({ installed: true });
        }
      `;
      expect(() => logic_data_plane_install_only(code, 'T522')).not.toThrow();
    });

    it('throws when T522 contains copyDocuments', () => {
      const code = `await this.indexService.copyDocuments(sourceIndex, targetIndex);`;
      expect(() => logic_data_plane_install_only(code, 'T522')).toThrow('CF-718');
    });

    it('throws when T522 contains migrateData', () => {
      const code = `await this.migration.migrateData(source, target);`;
      expect(() => logic_data_plane_install_only(code, 'T522')).toThrow('DD-323');
    });

    it('is a no-op for non-T522 task types', () => {
      const code = 'await this.service.copyDocuments(a, b);';
      expect(() => logic_data_plane_install_only(code, 'T528')).not.toThrow();
    });
  });

  // ── CHECK 4: secret_ref_indirection (CF-726 / DD-327) ─────────────────────

  describe('secret_ref_indirection (CF-726 / DD-327)', () => {
    it('passes when T523 uses secretRef and ISecretsService', () => {
      const code = `
        const secretRef = await this.secretsService.store(bindingId, value);
        const binding: Record<string, unknown> = {
          connectorType,
          secretRef: secretResult.data.secretRef,
        };
      `;
      expect(() => secret_ref_indirection(code, 'T523')).not.toThrow();
    });

    it('throws when T523 contains literal password assignment', () => {
      const code = `const password = 'mypassword123';`;
      expect(() => secret_ref_indirection(code, 'T523')).toThrow('CF-726');
    });

    it('throws when T523 contains literal apiKey assignment', () => {
      const code = `const apiKey = process.env.API_KEY;`;
      expect(() => secret_ref_indirection(code, 'T523')).toThrow('CF-726');
    });

    it('throws when T523 has no secret reference indirection', () => {
      const code = `
        const binding = { connectorType: 'GOOGLE', configured: true };
      `;
      expect(() => secret_ref_indirection(code, 'T523')).toThrow('CF-726');
    });

    it('is a no-op for non-T523 task types', () => {
      const code = `const password = 'test';`;
      expect(() => secret_ref_indirection(code, 'T524')).not.toThrow();
    });
  });

  // ── CHECK 5: integer_arithmetic_settlement (CF-734 / ST-451) ──────────────

  describe('integer_arithmetic_settlement (CF-734 / ST-451)', () => {
    it('passes when T532 uses BigInt cents arithmetic', () => {
      const code = `
        const totalCents = BigInt(Math.round(amount * 100));
        const platformCents = (totalCents * 3000n) / 10000n;
        const publisherCents = totalCents - platformCents;
        await db.storeDocument('settlements', { totalCents: totalCents.toString() });
      `;
      expect(() => integer_arithmetic_settlement(code, 'T532')).not.toThrow();
    });

    it('throws when T532 uses parseFloat', () => {
      const code = `
        const amount = parseFloat(rawAmount);
        const BigInt = 100n;
      `;
      expect(() => integer_arithmetic_settlement(code, 'T532')).toThrow('CF-734');
    });

    it('throws when T532 uses toFixed', () => {
      const code = `
        const display = amount.toFixed(2);
        const BigInt = 100n;
      `;
      expect(() => integer_arithmetic_settlement(code, 'T532')).toThrow('ST-451');
    });

    it('throws when T532 has no BigInt', () => {
      const code = `
        const platformFee = totalAmount * 0.30;
        const publisherShare = totalAmount - platformFee;
      `;
      expect(() => integer_arithmetic_settlement(code, 'T532')).toThrow('BigInt');
    });

    it('is a no-op for non-T532 task types', () => {
      const code = `const fee = parseFloat(value);`;
      expect(() => integer_arithmetic_settlement(code, 'T531')).not.toThrow();
    });
  });

  // ── CHECK 6: fraud_human_review_required (CF-736 / ST-454) ────────────────

  describe('fraud_human_review_required (CF-736 / ST-454)', () => {
    it('passes when T534 uses human review via IHumanReviewService', () => {
      const code = `
        @Inject(HUMAN_REVIEW_SERVICE) private readonly humanReviewService: IHumanReviewService,

        async handleFraud(signals: Record<string, unknown>[]) {
          const caseResult = await this.humanReviewService.createReviewCase({
            caseType: 'FRAUD_DETECTION',
            subjectTenantId,
            signals,
            severity: 'HIGH',
            evidence: {},
            cfRef: 'CF-736',
          });
          return DataProcessResult.success({ caseId: caseResult.data.caseId });
        }
      `;
      expect(() => fraud_human_review_required(code, 'T534')).not.toThrow();
    });

    it('throws when T534 calls autoSuspend', () => {
      const code = `
        await this.accountService.autoSuspend(tenantId);
        const IHumanReviewService = 'stub';
      `;
      expect(() => fraud_human_review_required(code, 'T534')).toThrow('CF-736');
    });

    it('throws when T534 calls suspendAccount', () => {
      const code = `
        await this.accountService.suspendAccount(tenantId, reason);
        const F1403 = 'stub';
      `;
      expect(() => fraud_human_review_required(code, 'T534')).toThrow('CF-736');
    });

    it('throws when T534 has no human review reference', () => {
      const code = `
        async detectFraud(event: Record<string, unknown>) {
          return DataProcessResult.success({ fraudDetected: false });
        }
      `;
      expect(() => fraud_human_review_required(code, 'T534')).toThrow('CF-736');
    });

    it('is a no-op for non-T534 task types', () => {
      const code = `await this.accountService.autoSuspend(tenantId);`;
      expect(() => fraud_human_review_required(code, 'T533')).not.toThrow();
    });
  });

  // ── CHECK 7: bfa_revalidation_all_consumers (CF-729) ──────────────────────

  describe('bfa_revalidation_all_consumers (CF-729)', () => {
    it('passes when T526 uses all-consumer iteration with DEGRADED_LOCAL_FALLBACK', () => {
      const code = `
        const allConsumers = await this.governanceService.getAllConsumers();
        if (!governanceResult.isSuccess) {
          await this.emitDegradedModeEvent(publishedFlowId);
          const DEGRADED_LOCAL_FALLBACK = true;
          const localResult = await this.localBfaRegistry.getAllFlows();
        }
        for (const consumer of allConsumers) {
          // validate each consumer
        }
      `;
      expect(() => bfa_revalidation_all_consumers(code, 'T526')).not.toThrow();
    });

    it('throws when T526 uses .limit() on consumer query', () => {
      const code = `
        const consumers = await this.registry.getConsumers().limit(100);
        const allConsumers = consumers;
        const DEGRADED_LOCAL_FALLBACK = true;
      `;
      expect(() => bfa_revalidation_all_consumers(code, 'T526')).toThrow('CF-729');
    });

    it('throws when T526 uses perPage sampling', () => {
      const code = `
        const consumers = await this.registry.getConsumers({ perPage: 50 });
        const allConsumers = consumers;
        const DEGRADED_LOCAL_FALLBACK = true;
      `;
      expect(() => bfa_revalidation_all_consumers(code, 'T526')).toThrow('CF-729');
    });

    it('throws when T526 has no all-consumer pattern', () => {
      const code = `
        const consumers = await this.registry.getConsumers();
        for (const consumer of consumers) { /* validate */ }
      `;
      expect(() => bfa_revalidation_all_consumers(code, 'T526')).toThrow('CF-729');
    });

    it('is a no-op for non-T526 task types', () => {
      const code = `const items = await this.registry.getConsumers().limit(10);`;
      expect(() => bfa_revalidation_all_consumers(code, 'T525')).not.toThrow();
    });
  });
});
