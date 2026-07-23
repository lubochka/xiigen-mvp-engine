/**
 * useAgentSessions — admin-side hook listing recent platform-agent sessions.
 *
 * Fetches GET /api/agent/sessions and returns the most recent N. Optional
 * targetTenantId narrows by inspecting each session's actionsProposed slice
 * (today the join is loose; FLOW-46 Phase D defers strict join to a follow-up).
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface AgentSessionSummary {
  sessionId: string;
  userIntent: string;
  af9Verdict: 'PASS' | 'BLOCK';
  superJudgeVerdict: string;
  grade: string;
  actionsProposed: number;
  contributionsRecorded: number;
  completedAt: string;
}

export interface UseAgentSessionsReturn {
  sessions: AgentSessionSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAgentSessions(limit: number = 20): UseAgentSessionsReturn {
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<{ sessions: AgentSessionSummary[] }>('agentSessionList', {
      params: { limit: String(limit) },
    });
    if (result.isSuccess && result.data) {
      setSessions(result.data.sessions ?? []);
    } else {
      setError(result.error?.message ?? 'Failed to fetch agent sessions');
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refresh: fetchSessions };
}
