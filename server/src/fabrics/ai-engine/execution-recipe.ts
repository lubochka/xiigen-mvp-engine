/**
 * AI Engine Fabric — ExecutionRecipe: ties prompt + RAG profile + model + rubric.
 * Immutable once created. Serializable to dict (DNA-1).
 * Used by AF stations to configure how code generation runs.
 */

import { ModelProfile, modelProfileToDict } from './base';

export interface ExecutionRecipe {
  readonly recipeId: string;
  readonly promptVersion: string;
  readonly ragProfile: string;
  readonly modelProfile?: ModelProfile;
  readonly judgeRubric: Record<string, number>;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly systemPrompt?: string;
  readonly metadata: Record<string, unknown>;
}

/** Create an ExecutionRecipe with defaults. */
export function createExecutionRecipe(
  recipeId: string,
  overrides?: Partial<Omit<ExecutionRecipe, 'recipeId'>>,
): ExecutionRecipe {
  return {
    recipeId,
    promptVersion: overrides?.promptVersion ?? '1.0',
    ragProfile: overrides?.ragProfile ?? 'default',
    modelProfile: overrides?.modelProfile,
    judgeRubric: overrides?.judgeRubric ?? { correctness: 0.4, quality: 0.4, style: 0.2 },
    maxTokens: overrides?.maxTokens ?? 4096,
    temperature: overrides?.temperature ?? 0.7,
    systemPrompt: overrides?.systemPrompt,
    metadata: overrides?.metadata ?? {},
  };
}

/** Serialize ExecutionRecipe to dict (DNA-1). */
export function executionRecipeToDict(recipe: ExecutionRecipe): Record<string, unknown> {
  return {
    recipe_id: recipe.recipeId,
    prompt_version: recipe.promptVersion,
    rag_profile: recipe.ragProfile,
    model_profile: recipe.modelProfile ? modelProfileToDict(recipe.modelProfile) : null,
    judge_rubric: { ...recipe.judgeRubric },
    max_tokens: recipe.maxTokens,
    temperature: recipe.temperature,
    system_prompt: recipe.systemPrompt ?? null,
    metadata: { ...recipe.metadata },
  };
}
