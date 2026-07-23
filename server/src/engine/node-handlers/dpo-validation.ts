/**
 * dpo-validation.ts — DPO triple validity gate.
 *
 * Enforces three rules before any triple enters xiigen-training-data:
 *   Rule 1 (P17): chosen.model !== rejected.model (cross-model required)
 *   Rule 2 (P17): modelComparison.shuffleWasApplied === true
 *   Rule 3 (P18): curriculumTier is set (non-null) — enforced after SESSION-G1 adds the field
 *
 * Returns a DpoValidationResult describing the disposition:
 *   VALID           → write to xiigen-training-data
 *   SINGLE_PROVIDER → modelComparison is null (only one provider ran) → pending
 *   SAME_MODEL      → chosen.model === rejected.model → pending
 *   SHUFFLE_MISSING → shuffleWasApplied !== true → pending
 *   INVALID_TIER    → curriculumTier is null (after SESSION-G1) → hard error
 *
 * DNA-3: never throws — returns result object.
 */

export type DpoDisposition =
  | 'VALID'
  | 'SINGLE_PROVIDER'
  | 'SAME_MODEL'
  | 'SHUFFLE_MISSING'
  | 'INVALID_TIER';

export interface DpoValidationResult {
  disposition: DpoDisposition;
  reason: string;
}

interface DpoValidationInput {
  modelComparison: {
    chosen: { model: string };
    rejected: { model: string } | null;
    shuffleWasApplied: boolean;
  } | null;
  /** Present once SESSION-G1 adds the field. Gate passes gracefully if absent. */
  curriculumTier?: number | null;
}

/**
 * Validate a DPO triple before writing to training data.
 * Call BEFORE storeDocument() on any triple destined for xiigen-training-data.
 */
export function validateDpoTriple(triple: DpoValidationInput): DpoValidationResult {
  // Rule 0: single-provider run — no comparison possible
  if (!triple.modelComparison) {
    return {
      disposition: 'SINGLE_PROVIDER',
      reason: 'modelComparison is null — only one provider ran. Route to pending.',
    };
  }

  // Rule 1 (P17): cross-model provenance required
  if (
    triple.modelComparison.rejected !== null &&
    triple.modelComparison.chosen.model === triple.modelComparison.rejected.model
  ) {
    return {
      disposition: 'SAME_MODEL',
      reason:
        `DPO_VALIDITY_GATE: chosen.model === rejected.model === '${triple.modelComparison.chosen.model}'. ` +
        'Same-model DPO teaches intra-model style drift, not quality. Route to pending.',
    };
  }

  // Rule 2 (P17): shuffle must have been applied before judging
  if (!triple.modelComparison.shuffleWasApplied) {
    return {
      disposition: 'SHUFFLE_MISSING',
      reason:
        'DPO_VALIDITY_GATE: shuffleWasApplied is false — judge may have seen model attribution. ' +
        'Blind judging was compromised. Route to pending.',
    };
  }

  // Rule 3 (P18): curriculumTier must be set — enforced once SESSION-G1 adds it
  // If the field does not exist yet (pre-SESSION-G1): gate passes gracefully.
  if (
    'curriculumTier' in triple &&
    (triple.curriculumTier === null || triple.curriculumTier === undefined)
  ) {
    return {
      disposition: 'INVALID_TIER',
      reason:
        'DPO_VALIDITY_GATE: curriculumTier is null. ' +
        'Assign from archetype tier table: ROUTING=1, DATA_PIPELINE=2, VALIDATION=2, TRANSACTION=3, ORCHESTRATION=4, SCHEDULED=5.',
    };
  }

  return { disposition: 'VALID', reason: 'Triple passes all DPO validity checks.' };
}
