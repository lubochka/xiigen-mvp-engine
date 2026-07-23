/**
 * useGenerationHistory — triggers generation and fetches AF pipeline results.
 * Uses P9 engine endpoints: POST /engine/generate + GET /engine/history.
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { EngineDocument } from '../api/types';

export interface GenerationRun {
  contractId: string;
  flowId: string;
  success: boolean;
  pipelinePassed: boolean;
  promotionLevel: string;
  bfaStatus: string;
  generatedCodeLength: number;
  factoryEntries: Array<Record<string, unknown>>;
  freedomConfigs: Array<Record<string, unknown>>;
  stages: Array<{
    stage: string;
    success: boolean;
    elapsedMs: number;
    details?: Record<string, unknown>;
  }>;
  errors: string[];
  warnings: string[];
  elapsedMs: number;
  pipelineMetadata: Record<string, unknown>;
}

export interface UseGenerationHistoryReturn {
  currentRun: GenerationRun | null;
  history: Array<Record<string, unknown>>;
  generating: boolean;
  loading: boolean;
  error: string | null;
  generate: (tenantId: string, contractSpec: Record<string, unknown>) => Promise<boolean>;
  fetchHistory: () => Promise<void>;
  clearCurrentRun: () => void;
}

export function useGenerationHistory(): UseGenerationHistoryReturn {
  const [currentRun, setCurrentRun] = useState<GenerationRun | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (tenantId: string, contractSpec: Record<string, unknown>): Promise<boolean> => {
      setGenerating(true);
      setError(null);
      setCurrentRun(null);

      const result = await apiClient.post<EngineDocument>('engineGenerate', {
        tenantId,
        body: contractSpec,
      });

      setGenerating(false);

      if (result.isSuccess && result.data) {
        const d = result.data;
        const run: GenerationRun = {
          contractId: (d.contract_id as string) ?? '',
          flowId: (d.flow_id as string) ?? '',
          success: (d.success as boolean) ?? false,
          pipelinePassed: (d.pipeline_passed as boolean) ?? false,
          promotionLevel: (d.promotion_level as string) ?? 'GENERATED',
          bfaStatus: (d.bfa_status as string) ?? '',
          generatedCodeLength: (d.generated_code_length as number) ?? 0,
          factoryEntries: (d.factory_entries as Array<Record<string, unknown>>) ?? [],
          freedomConfigs: (d.freedom_configs as Array<Record<string, unknown>>) ?? [],
          stages:
            ((d.pipeline_metadata as Record<string, unknown>)?.[
              'stages'
            ] as GenerationRun['stages']) ?? [],
          errors: (d.errors as string[]) ?? [],
          warnings: (d.warnings as string[]) ?? [],
          elapsedMs: (d.elapsed_ms as number) ?? 0,
          pipelineMetadata: (d.pipeline_metadata as Record<string, unknown>) ?? {},
        };
        setCurrentRun(run);
        return run.success;
      }

      setError(result.error?.message ?? 'Generation failed');
      return false;
    },
    [],
  );

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const result = await apiClient.get<EngineDocument[]>('engineHistory');
    if (result.isSuccess && result.data) {
      setHistory(result.data as Array<Record<string, unknown>>);
    }
    setLoading(false);
  }, []);

  const clearCurrentRun = useCallback(() => {
    setCurrentRun(null);
    setError(null);
  }, []);

  return {
    currentRun,
    history,
    generating,
    loading,
    error,
    generate,
    fetchHistory,
    clearCurrentRun,
  };
}
