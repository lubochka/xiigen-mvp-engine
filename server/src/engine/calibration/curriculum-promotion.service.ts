/**
 * CurriculumPromotionService — determines when an OSS model is ready to graduate.
 *
 * Reads graduation thresholds from FREEDOM config:
 *   graduation.gradeThreshold        (default 0.85 — same as global grade bar)
 *   graduation.minConsecutivePassing (default 3 — consecutive cycles all ≥ threshold)
 *
 * Logic: count consecutive records from most-recent for this model where
 *   grade ≥ gradeThreshold. If count ≥ minConsecutivePassing → true.
 *
 * Called from OssCurriculumRunner after all cycles complete for one model.
 * Graduation is triggered by MEASURED outcomes, never manually (Rule 16).
 *
 * DNA-3: never throws — returns false on any config/data error.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';
import { OssCurriculumRecord, OssModel } from './oss-curriculum-runner.service';

const GRADE_THRESHOLD_KEY = 'graduation.gradeThreshold';
const MIN_CONSECUTIVE_KEY = 'graduation.minConsecutivePassing';
const DEFAULT_GRADE_THRESHOLD = 0.85;
const DEFAULT_MIN_CONSECUTIVE = 3;

@Injectable()
export class CurriculumPromotionService {
  constructor(
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
  ) {}

  /**
   * Returns true when the model has at least minConsecutivePassing
   * consecutive grades ≥ gradeThreshold (most-recent records first).
   * Never throws.
   */
  async shouldGraduate(model: OssModel, records: OssCurriculumRecord[]): Promise<boolean> {
    try {
      const modelRecords = records
        .filter((r) => r.ossModel === model)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (modelRecords.length === 0) return false;

      const gradeThreshold = await this.readNumber(GRADE_THRESHOLD_KEY, DEFAULT_GRADE_THRESHOLD);
      const minConsecutive = await this.readNumber(MIN_CONSECUTIVE_KEY, DEFAULT_MIN_CONSECUTIVE);

      let consecutive = 0;
      for (const record of modelRecords) {
        if (record.grade >= gradeThreshold) {
          consecutive++;
          if (consecutive >= minConsecutive) return true;
        } else {
          break; // streak broken — no graduation
        }
      }
      return false;
    } catch {
      return false; // DNA-3: never throws
    }
  }

  private async readNumber(key: string, fallback: number): Promise<number> {
    try {
      const value = await this.freedomConfig?.get(key);
      return typeof value === 'number' ? value : fallback;
    } catch {
      return fallback;
    }
  }
}
