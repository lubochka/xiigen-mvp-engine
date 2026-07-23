/**
 * SkillIndexer — indexes the engine's skill library and engine contracts.
 *
 * Sources:
 * - 9 core skills from AF-4 RagContextStation (SK-01 through SK-09)
 * - Engine contracts from TaskTypeRegistry (archetypes, factory deps, quality gates)
 *
 * DNA-3: returns DataProcessResult.
 * Phase 11.2.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { type CodePattern, PatternCategory, createPattern } from './pattern-types';

@Injectable()
export class SkillIndexer {
  /**
   * Extract patterns from AF-4's in-memory skill patterns.
   * Reads the patterns that RagContextStation.loadCorePatterns() created.
   */
  indexSkills(
    ragContextPatterns: Array<Record<string, unknown>>,
  ): DataProcessResult<CodePattern[]> {
    const patterns: CodePattern[] = [];

    for (const raw of ragContextPatterns) {
      const id = (raw.id as string) ?? '';
      const name = (raw.name as string) ?? '';
      const tags = (raw.tags as string[]) ?? [];
      const desc = (raw.description as string) ?? '';
      const snippet = (raw.code_snippet as string) ?? '';

      patterns.push(
        createPattern({
          name: `Skill: ${name}`,
          source: `af-4/core-patterns/${id}`,
          category: PatternCategory.SKILL,
          tags: ['skill', ...tags],
          description: desc,
          codeSnippet: snippet,
          // A-0: semanticContent drives IRagService embedding quality.
          // Use description (natural language) as primary semantic text.
          // Falls back to skill id if both are absent.
          semanticContent: desc || (raw.content as string)?.split('\n')[0] || id,
          metadata: { skill_id: id, origin: 'af4_core' },
        }),
      );
    }

    return DataProcessResult.success(patterns);
  }

  /**
   * Index engine contracts as patterns.
   * Each contract becomes a searchable pattern with archetype, factory deps, quality gates.
   */
  indexContracts(contractDicts: Array<Record<string, unknown>>): DataProcessResult<CodePattern[]> {
    const patterns: CodePattern[] = [];

    for (const contract of contractDicts) {
      const taskTypeId = (contract.task_type_id as string) ?? '';
      const name = (contract.name as string) ?? taskTypeId;
      const archetype = (contract.archetype as string) ?? '';
      const familyId = (contract.family_id as string) ?? '';

      const factoryDeps = (contract.factory_dependencies as Array<Record<string, unknown>>) ?? [];
      const fabricTypes = factoryDeps.map((d) => (d.fabric_type as string) ?? '').filter(Boolean);

      const qualityGates = (contract.quality_gates as Array<Record<string, unknown>>) ?? [];

      const tags = [
        'contract',
        'engine_contract',
        archetype.toLowerCase(),
        taskTypeId.toLowerCase(),
      ].filter(Boolean);

      // Add fabric types as tags
      for (const ft of fabricTypes) {
        tags.push(ft.toLowerCase());
      }

      // Build a readable snippet summarizing the contract
      const snippetLines = [
        `// Engine Contract: ${taskTypeId} — ${name}`,
        `// Archetype: ${archetype}`,
        `// Family: ${familyId}`,
        `// Factory Dependencies:`,
        ...factoryDeps.map(
          (d) =>
            `//   ${d.factory_id ?? '?'} → ${d.interface_name ?? '?'} (${d.fabric_type ?? '?'})`,
        ),
      ];
      if (qualityGates.length > 0) {
        snippetLines.push(`// Quality Gates: ${qualityGates.length}`);
      }

      patterns.push(
        createPattern({
          name: `Contract: ${taskTypeId} ${name}`,
          source: `engine-contracts/${taskTypeId}`,
          category: PatternCategory.FACTORY_INTERFACE,
          tags: [...new Set(tags)],
          description: `Engine contract ${taskTypeId}: ${name} (${archetype})`,
          codeSnippet: snippetLines.join('\n'),
          metadata: {
            task_type_id: taskTypeId,
            archetype,
            family_id: familyId,
            factory_count: factoryDeps.length,
            quality_gate_count: qualityGates.length,
          },
        }),
      );
    }

    return DataProcessResult.success(patterns);
  }
}
