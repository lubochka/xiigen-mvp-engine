/**
 * usePromptEditor — load, edit, version-bump, and save prompts.
 *
 * Wired to the Stage 3 prompt endpoints:
 *   GET  /api/prompts/:taskTypeId  — load current active prompt
 *   PUT  /api/prompts/:taskTypeId  — upsert a new version
 *
 * Stage 3.
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface PromptRecord {
  promptId?: string;
  taskTypeId: string;
  promptType: string;
  version: string;
  content: string;
  systemPrompt?: string;
  active?: boolean;
  tenantId?: string;
}

export interface UsePromptEditorReturn {
  prompt: PromptRecord | null;
  loading: boolean;
  error: string | null;
  dirty: boolean;
  loadPrompt: (taskTypeId: string, promptType: string, tenantId?: string) => Promise<void>;
  savePrompt: () => Promise<boolean>;
  updateContent: (content: string) => void;
  updateSystemPrompt: (systemPrompt: string) => void;
  bumpVersion: () => void;
  resetDirty: () => void;
}

/** Increment a semver patch version: '1.2.3' → '1.2.4'. */
function bumpPatch(version: string): string {
  const parts = version.split('.').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return version;
  parts[2]++;
  return parts.join('.');
}

export function usePromptEditor(tenantId = 'system'): UsePromptEditorReturn {
  const [prompt, setPrompt] = useState<PromptRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadPrompt = useCallback(
    async (taskTypeId: string, promptType: string, overrideTenantId?: string) => {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<Record<string, unknown>>('promptGet', {
        tenantId: overrideTenantId ?? tenantId,
        pathParams: { taskTypeId },
        params: { promptType },
      });
      if (result.isSuccess && result.data) {
        const d = result.data;
        setPrompt({
          promptId: d['promptId'] as string | undefined,
          taskTypeId,
          promptType,
          version: (d['version'] as string) ?? '1.0.0',
          content: (d['content'] as string) ?? '',
          systemPrompt: d['systemPrompt'] as string | undefined,
          active: (d['active'] as boolean) ?? true,
          tenantId: overrideTenantId,
        });
        setDirty(false);
      } else {
        // No existing prompt — start with a blank template
        setPrompt({
          taskTypeId,
          promptType,
          version: '1.0.0',
          content: '',
          systemPrompt: '',
          active: true,
          tenantId: overrideTenantId,
        });
        setDirty(false);
      }
      setLoading(false);
    },
    [tenantId],
  );

  const savePrompt = useCallback(async (): Promise<boolean> => {
    if (!prompt) return false;
    setLoading(true);
    setError(null);
    const result = await apiClient.put<Record<string, unknown>>('promptUpsert', {
      tenantId: prompt.tenantId ?? tenantId,
      pathParams: { taskTypeId: prompt.taskTypeId },
      body: {
        promptType: prompt.promptType,
        content: prompt.content,
        version: prompt.version,
        systemPrompt: prompt.systemPrompt,
        tenantId: prompt.tenantId,
      },
    });
    setLoading(false);
    if (result.isSuccess) {
      setDirty(false);
      return true;
    }
    setError(result.error?.message ?? 'Save failed');
    return false;
  }, [prompt, tenantId]);

  const updateContent = useCallback((content: string) => {
    setPrompt((prev) => (prev ? { ...prev, content } : prev));
    setDirty(true);
  }, []);

  const updateSystemPrompt = useCallback((systemPrompt: string) => {
    setPrompt((prev) => (prev ? { ...prev, systemPrompt } : prev));
    setDirty(true);
  }, []);

  const bumpVersion = useCallback(() => {
    setPrompt((prev) => {
      if (!prev) return prev;
      return { ...prev, version: bumpPatch(prev.version) };
    });
    setDirty(true);
  }, []);

  const resetDirty = useCallback(() => setDirty(false), []);

  return {
    prompt,
    loading,
    error,
    dirty,
    loadPrompt,
    savePrompt,
    updateContent,
    updateSystemPrompt,
    bumpVersion,
    resetDirty,
  };
}
