/**
 * FLOW-32 Named Checks (CF-715, CF-717, CF-718, CF-726, CF-729, CF-734, CF-736)
 *
 * 7 invariant functions for Sharable Flows & RAG Template Marketplace:
 *  1. supply_chain_tripartite_signing   — CF-715 BUILD_FAILURE
 *  2. logic_data_plane_separation       — CF-718 DD-323 score-0
 *  3. logic_data_plane_install_only     — CF-718 DD-323 T522 install check
 *  4. secret_ref_indirection            — CF-726 DD-327 BUILD_FAILURE
 *  5. integer_arithmetic_settlement     — CF-734 ST-451 score-0
 *  6. fraud_human_review_required       — CF-736 ST-454 score-0
 *  7. bfa_revalidation_all_consumers    — CF-729 score-0
 *
 * All functions throw on violation (invariant-style, not DataProcessResult).
 */

// ── CHECK 1 — supply_chain_tripartite_signing (CF-715) ────────────────────────

/**
 * T518 must reference all three supply chain factories:
 *   F1416 (IArtifactSigningService)
 *   F1417 (ISBOMGeneratorService)
 *   F1418 (ISLSAAttestationService)
 *
 * Missing any one causes BUILD_FAILURE — artifact.signed will never emit.
 */
export function supply_chain_tripartite_signing(generatedCode: string, taskTypeId: string): void {
  if (taskTypeId !== 'T518') return; // Only enforced on T518

  const required = [
    'F1416',
    'IArtifactSigningService',
    'ARTIFACT_SIGNING_SERVICE',
    'F1417',
    'ISBOMGeneratorService',
    'SBOM_GENERATOR_SERVICE',
    'F1418',
    'ISLSAAttestationService',
    'SLSA_ATTESTATION_SERVICE',
  ];

  const missing = required.filter((term) => !generatedCode.includes(term));

  if (missing.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-715): supply_chain_tripartite_signing — ` +
        `Missing required supply chain references: [${missing.join(', ')}]. ` +
        `T518 must reference all three: F1416 (signing), F1417 (SBOM), F1418 (SLSA).`,
    );
  }
}

// ── CHECK 2 — logic_data_plane_separation for T528/T529/T530 (CF-718) ─────────

/**
 * RAG blueprints shared by T528/T529/T530 must contain ONLY structural logic.
 * Data-bearing terms indicate a DD-323 violation — tenant data leakage risk.
 */
export function logic_data_plane_separation(generatedCode: string, taskTypeId: string): void {
  const shareTaskTypes = ['T528', 'T529', 'T530'];
  if (!shareTaskTypes.includes(taskTypeId)) return;

  const banned = [
    'embedding',
    'embeddings',
    'indexedContent',
    'rawData',
    'vectorStore.get',
    'vectors',
    'vectorPayload',
    'tenantDocument',
    'knowledgeBase.export',
    'indexSnapshot',
    'bulkExportIndex',
  ];

  const lowerCode = generatedCode.toLowerCase();
  const violations = banned.filter((term) => lowerCode.includes(term.toLowerCase()));

  if (violations.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-718 / DD-323): logic_data_plane_separation — ` +
        `Data-plane term(s) detected in ${taskTypeId}: [${violations.join(', ')}]. ` +
        `RAG blueprints must contain structural logic only (DAGs, prompts, schemas). ` +
        `No embeddings, documents, or tenant data.`,
    );
  }
}

// ── CHECK 3 — logic_data_plane_install_only for T522 (CF-718) ─────────────────

/**
 * T522 marketplace install must transfer logic artifacts only.
 * Data copy operations violate DD-323 and risk tenant data leakage.
 */
export function logic_data_plane_install_only(generatedCode: string, taskTypeId: string): void {
  if (taskTypeId !== 'T522') return;

  const banned = [
    'copyDocuments',
    'migrateData',
    'copyEmbeddings',
    'transferDocuments',
    'bulkCopyIndex',
    'indexMigration',
    'copyIndex',
    'replicateData',
    'cloneIndex',
    'syncDocuments',
  ];

  const lowerCode = generatedCode.toLowerCase();
  const violations = banned.filter((term) => lowerCode.includes(term.toLowerCase()));

  if (violations.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-718 / DD-323): logic_data_plane_install_only — ` +
        `Data copy operation detected in T522: [${violations.join(', ')}]. ` +
        `T522 install must transfer logic artifacts only (DAG, prompts, config, factory bindings).`,
    );
  }
}

// ── CHECK 4 — secret_ref_indirection (CF-726 / DD-327) ───────────────────────

/**
 * T523 binding documents must store only secret reference IDs.
 * Literal secret values in generated code are a security violation.
 */
export function secret_ref_indirection(generatedCode: string, taskTypeId: string): void {
  if (taskTypeId !== 'T523') return;

  const banned = [
    'password =',
    'apiKey =',
    'token =',
    'secret =',
    'privateKey =',
    'PASSWORD=',
    'API_KEY=',
    'TOKEN=',
    'SECRET=',
  ];

  const violations = banned.filter((term) => generatedCode.includes(term));

  if (violations.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-726 / DD-327): secret_ref_indirection — ` +
        `Literal secret value detected in T523: [${violations.join(', ')}]. ` +
        `T523 binding documents must store only secretRef/vaultRef IDs via ISecretsService.`,
    );
  }

  // Also require secretRef or vaultRef presence
  if (
    !generatedCode.includes('secretRef') &&
    !generatedCode.includes('vaultRef') &&
    !generatedCode.includes('ISecretsService') &&
    !generatedCode.includes('SECRETS_SERVICE')
  ) {
    throw new Error(
      `INVARIANT VIOLATION (CF-726 / DD-327): secret_ref_indirection — ` +
        `T523 must use secretRef or vaultRef via ISecretsService. ` +
        `No secret reference indirection found.`,
    );
  }
}

// ── CHECK 5 — integer_arithmetic_settlement (CF-734 / ST-451) ─────────────────

/**
 * T532 revenue settlement must use integer arithmetic (BigInt cents).
 * parseFloat and toFixed cause rounding errors in multi-currency settlement.
 */
export function integer_arithmetic_settlement(generatedCode: string, taskTypeId: string): void {
  if (taskTypeId !== 'T532') return;

  const banned = [
    'parseFloat(',
    'toFixed(',
    'Number.parseFloat',
    '.toFixed(',
    '* 1.0',
    '/ 100.0',
    '0.01 *',
    '0.001 *',
  ];

  const lowerCode = generatedCode.toLowerCase();
  const violations = banned.filter((term) => lowerCode.includes(term.toLowerCase()));

  if (violations.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-734 / ST-451): integer_arithmetic_settlement — ` +
        `Float arithmetic detected in T532: [${violations.join(', ')}]. ` +
        `Use BigInt integer arithmetic (cents/basis points) for all monetary calculations.`,
    );
  }

  // Require BigInt presence
  if (!generatedCode.includes('BigInt') && !generatedCode.includes('bigint')) {
    throw new Error(
      `INVARIANT VIOLATION (CF-734 / ST-451): integer_arithmetic_settlement — ` +
        `T532 settlement must use BigInt integer arithmetic. No BigInt found.`,
    );
  }
}

// ── CHECK 6 — fraud_human_review_required (CF-736 / ST-454) ──────────────────

/**
 * T534 fraud detection must NOT auto-suspend or auto-ban.
 * All fraud signals must be routed to human review via F1403 (IHumanReviewService).
 */
export function fraud_human_review_required(generatedCode: string, taskTypeId: string): void {
  if (taskTypeId !== 'T534') return;

  const banned = [
    'autoSuspend',
    'auto_suspend',
    'auto_ban',
    'autoBan',
    'immediate_action',
    'immediateAction',
    'suspendAccount(',
    'banTenant(',
    'disableAccount(',
    'revokeAccess(',
    'terminateAccount(',
  ];

  const lowerCode = generatedCode.toLowerCase();
  const violations = banned.filter((term) => lowerCode.includes(term.toLowerCase()));

  if (violations.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-736 / ST-454): fraud_human_review_required — ` +
        `Automated account action detected in T534: [${violations.join(', ')}]. ` +
        `All fraud signals must route to human review via F1403 (IHumanReviewService).`,
    );
  }

  // Require human review service reference
  const required = [
    'F1403',
    'IHumanReviewService',
    'HUMAN_REVIEW_SERVICE',
    'humanReview',
    'createReviewCase',
  ];
  const hasRequired = required.some((term) => generatedCode.includes(term));

  if (!hasRequired) {
    throw new Error(
      `INVARIANT VIOLATION (CF-736 / ST-454): fraud_human_review_required — ` +
        `T534 must route fraud signals to human review via F1403 (IHumanReviewService). ` +
        `None of [${required.join(', ')}] found.`,
    );
  }
}

// ── CHECK 7 — bfa_revalidation_all_consumers (CF-729) ────────────────────────

/**
 * T526 must iterate ALL consumer flows for BFA revalidation.
 * Sampling or limiting consumer iteration means some flows are not validated.
 */
export function bfa_revalidation_all_consumers(generatedCode: string, taskTypeId: string): void {
  if (taskTypeId !== 'T526') return;

  const banned = [
    'sample(',
    '.sample(',
    'subset(',
    '.subset(',
    '.limit(',
    '.take(',
    'take(',
    'perPage:',
    'getConsumers({ limit',
    'getConsumers({limit',
    'paginate(',
    'page(',
  ];

  const lowerCode = generatedCode.toLowerCase();
  const violations = banned.filter((term) => lowerCode.includes(term.toLowerCase()));

  if (violations.length > 0) {
    throw new Error(
      `INVARIANT VIOLATION (CF-729): bfa_revalidation_all_consumers — ` +
        `Consumer iteration sampling detected in T526: [${violations.join(', ')}]. ` +
        `T526 must iterate ALL consumers (CF-729). ` +
        `If FLOW-25 absent, use DEGRADED_LOCAL_FALLBACK — never skip.`,
    );
  }

  // Require all-consumer pattern
  const required = [
    'allConsumers',
    'ALL_CONSUMERS',
    'DEGRADED_LOCAL_FALLBACK',
    'getAllFlows(',
    'getAllConsumers(',
  ];
  const hasRequired = required.some((term) => generatedCode.includes(term));

  if (!hasRequired) {
    throw new Error(
      `INVARIANT VIOLATION (CF-729): bfa_revalidation_all_consumers — ` +
        `T526 must use all-consumer iteration (getAllConsumers/getAllFlows) ` +
        `with DEGRADED_LOCAL_FALLBACK when FLOW-25 is absent. ` +
        `None of [${required.join(', ')}] found.`,
    );
  }
}
