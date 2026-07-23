/**
 * useAgentSession — T656 client-side hook for FLOW-46 Platform Agent.
 *
 * Wraps the /api/agent/run + /api/agent/sessions/:id endpoints.
 * Returns an optimistic chat-style state machine:
 *   IDLE → SUBMITTING → STREAMING → COMPLETE | FAILED
 *
 * P10 client/server symmetry: the hook owns the local UI state map; the
 * server is the source of truth for sessionId completion.
 */

import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';

export type AgentSessionStatus =
  | 'IDLE'
  | 'SUBMITTING'
  | 'STREAMING'
  | 'COMPLETE'
  | 'FAILED';

export interface AgentActionRecord {
  actionId: string;
  sessionId: string;
  actionType: 'ADVISE' | 'PROPOSE_EDIT' | 'CREATE_FLOW' | 'APPLY_GLOBAL';
  adminTenantId: string;
  targetTenantId: string;
  tenantId: string;
  knowledgeScope: 'PRIVATE' | 'GLOBAL';
  status: 'STORED' | 'EMITTED';
  draftFlowId?: string;
}

export interface AgentSessionResult {
  sessionId: string;
  userIntent: string;
  af9Verdict: 'PASS' | 'BLOCK';
  superJudgeVerdict: 'DEFER_TO_AF9' | 'OVERRIDE_PASS' | 'OVERRIDE_BLOCK';
  actions: AgentActionRecord[];
  contributions: Record<string, unknown>[];
  completedAt: string;
}

export interface UseAgentSessionReturn {
  status: AgentSessionStatus;
  session: AgentSessionResult | null;
  error: string | null;
  submit: (input: { sessionId: string; userIntent: string }) => Promise<void>;
  reset: () => void;
}

export function useAgentSession(): UseAgentSessionReturn {
  const [status, setStatus] = useState<AgentSessionStatus>('IDLE');
  const [session, setSession] = useState<AgentSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: { sessionId: string; userIntent: string }): Promise<void> => {
      if (!input.userIntent || input.userIntent.trim() === '') {
        setError('userIntent is required');
        setStatus('FAILED');
        return;
      }
      setError(null);
      setStatus('SUBMITTING');
      const result = await apiClient.post<AgentSessionResult>('agentRun', {
        body: { sessionId: input.sessionId, userIntent: input.userIntent },
      });
      if (!result.isSuccess || !result.data) {
        setError(result.error?.message ?? 'agent run failed');
        setStatus('FAILED');
        return;
      }
      setStatus('STREAMING');
      setSession(result.data);
      setStatus('COMPLETE');
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus('IDLE');
    setSession(null);
    setError(null);
  }, []);

  return { status, session, error, submit, reset };
}
