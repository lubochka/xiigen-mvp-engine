import { DataProcessResult } from '../kernel/data-process-result';

export interface TemplateDefinition {
  template_id: number;
  step_order: Array<{ task_type: string; step_index: number }>;
}

export interface Cf590ValidationResult {
  template_id: number;
  passed: boolean;
  violation?: 'T440_NOT_STEP_ONE' | 'T440_MISSING';
  found_at?: number;
}

export class Cf590TemplateValidator {
  private readonly FLOW28_TEMPLATES = new Set([92, 93, 94, 95, 96, 97]);

  validate(templates: TemplateDefinition[]): DataProcessResult<Cf590ValidationResult[]> {
    const results: Cf590ValidationResult[] = [];
    for (const template of templates) {
      if (!this.FLOW28_TEMPLATES.has(template.template_id)) continue;
      const firstStep = template.step_order[0];
      if (!firstStep) {
        results.push({
          template_id: template.template_id,
          passed: false,
          violation: 'T440_MISSING',
        });
        continue;
      }
      if (firstStep.task_type !== 'T440') {
        const t440Index = template.step_order.findIndex((s) => s.task_type === 'T440');
        results.push({
          template_id: template.template_id,
          passed: false,
          violation: 'T440_NOT_STEP_ONE',
          found_at: t440Index >= 0 ? t440Index : undefined,
        });
      } else {
        results.push({ template_id: template.template_id, passed: true });
      }
    }
    const violations = results.filter((r) => !r.passed);
    if (violations.length > 0) {
      return DataProcessResult.failure(
        'CF590_VIOLATION',
        `${violations.length} template(s) violate CF-590: ${violations.map((v) => v.template_id).join(', ')}`,
      );
    }
    return DataProcessResult.success(results);
  }
}
