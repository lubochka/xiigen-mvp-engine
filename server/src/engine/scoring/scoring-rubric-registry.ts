// server/src/engine/scoring/scoring-rubric-registry.ts
// NEW FILE — output-category-keyed scoring rubrics (CN-04).
// Ensures each stack type is scored with appropriate criteria.

import { OutputCategory } from './output-type-classifier';

export interface ScoringCriterion {
  name: string;
  weight: number;
}

export interface ScoringRubric {
  criteria: ScoringCriterion[];
}

export const SCORING_RUBRICS: Record<OutputCategory, ScoringRubric> = {
  'typescript-code': {
    criteria: [
      { name: 'type_safety', weight: 0.25 },
      { name: 'nestjs_patterns', weight: 0.25 },
      { name: 'dna_compliance', weight: 0.25 },
      { name: 'iron_rule_adherence', weight: 0.25 },
    ],
  },
  'python-code': {
    criteria: [
      { name: 'pydantic_models', weight: 0.25 },
      { name: 'async_def_io_calls', weight: 0.25 },
      { name: 'fastapi_patterns', weight: 0.25 },
      { name: 'python_type_hints', weight: 0.25 },
    ],
  },
  'vue-component': {
    criteria: [
      { name: 'sfc_structure', weight: 0.3 },
      { name: 'composable_patterns', weight: 0.35 },
      { name: 'typescript_props', weight: 0.35 },
    ],
  },
  document: {
    criteria: [
      { name: 'completeness', weight: 0.35 },
      { name: 'clarity', weight: 0.35 },
      { name: 'structure', weight: 0.3 },
    ],
  },
  'json-config': {
    criteria: [
      { name: 'schema_validity', weight: 0.5 },
      { name: 'required_fields', weight: 0.3 },
      { name: 'value_consistency', weight: 0.2 },
    ],
  },
};
