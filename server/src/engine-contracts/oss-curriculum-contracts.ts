/**
 * BFA rules for FLOW-39 — OSS Curriculum Teaching Pipeline.
 *
 * CF-803: CurriculumTierAssigner runs before DPO triple is marked VALIDATED.
 * CF-804: Shadow run records must include ossModel and cycleId.
 */

export const OSS_CURRICULUM_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-803',
    flowId: 'FLOW-39',
    type: 'ORDERING',
    description:
      'CurriculumTierAssigner MUST run before any DPO triple is marked VALIDATED. Tier assignment is a required field, not optional metadata.',
    violation: 'Any DPO triple with status=VALIDATED where curriculumTier is null.',
    severity: 'CRITICAL',
  },
  {
    ruleId: 'CF-804',
    flowId: 'FLOW-39',
    type: 'TRACEABILITY',
    description:
      'Shadow run results MUST be stored with the ossModel name and cycleId. Anonymous shadow results have no curriculum value.',
    violation: 'Any shadow run record missing ossModel or cycleId fields.',
    severity: 'CRITICAL',
  },
];
