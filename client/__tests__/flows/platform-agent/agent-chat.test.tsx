/**
 * T656 AgentChat client — unit tests (8 per FLOW-46 R1 client matrix).
 *
 * Covers: useAgentSession state machine + ChatPage rendering + ActionCard branches.
 * Uses jest.mock on the apiClient (consistent with the existing client test idiom).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { successResult, failureResult } from '../../../src/api/types';

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('../../../src/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    put: jest.fn(),
    del: jest.fn(),
    configure: jest.fn(),
    getConfig: jest.fn(() => ({ defaultTenantId: 'system' })),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

import { useAgentSession } from '../../../src/hooks/useAgentSession';
import { useAgentSessions } from '../../../src/hooks/useAgentSessions';
import { ChatPage } from '../../../src/pages/ChatPage';
import { ActionCard } from '../../../src/components/platform-agent/ActionCard';

const okSession = {
  sessionId: 'chat-1',
  userIntent: 'do thing',
  af9Verdict: 'PASS' as const,
  superJudgeVerdict: 'DEFER_TO_AF9' as const,
  actions: [
    {
      actionId: 'a-1',
      sessionId: 'chat-1',
      actionType: 'ADVISE' as const,
      adminTenantId: 'master',
      targetTenantId: 'master',
      tenantId: 'master',
      knowledgeScope: 'PRIVATE' as const,
      status: 'EMITTED' as const,
    },
  ],
  contributions: [],
  completedAt: '2026-04-17T00:00:00Z',
};

describe('useAgentSession (T656)', () => {
  it('1. initial state is IDLE / null session / null error', () => {
    const { result } = renderHook(() => useAgentSession());
    expect(result.current.status).toBe('IDLE');
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('2. submit with empty intent → FAILED with userIntent error (no API call)', async () => {
    const { result } = renderHook(() => useAgentSession());
    await act(async () => {
      await result.current.submit({ sessionId: 's', userIntent: '   ' });
    });
    expect(result.current.status).toBe('FAILED');
    expect(result.current.error).toMatch(/userIntent/i);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('3. submit success → status COMPLETE + session populated', async () => {
    mockPost.mockResolvedValueOnce(successResult(okSession));
    const { result } = renderHook(() => useAgentSession());
    await act(async () => {
      await result.current.submit({ sessionId: 'chat-1', userIntent: 'do thing' });
    });
    expect(result.current.status).toBe('COMPLETE');
    expect(result.current.session?.sessionId).toBe('chat-1');
  });

  it('4. submit API failure → status FAILED + error captured', async () => {
    mockPost.mockResolvedValueOnce(failureResult('NOT_ADMIN', 'master required'));
    const { result } = renderHook(() => useAgentSession());
    await act(async () => {
      await result.current.submit({ sessionId: 'chat-2', userIntent: 'do thing' });
    });
    expect(result.current.status).toBe('FAILED');
    expect(result.current.error).toBe('master required');
  });
});

describe('ChatPage (T656)', () => {
  it('5. renders heading + textarea + submit button', () => {
    render(<ChatPage />);
    expect(screen.getByTestId('page-chat')).toBeTruthy();
    expect(screen.getByTestId('chat-input')).toBeTruthy();
    expect(screen.getByTestId('chat-submit')).toBeTruthy();
  });

  it('6. submit button disabled when intent is empty', () => {
    render(<ChatPage />);
    const button = screen.getByTestId('chat-submit') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('7. on successful submit shows super-judge verdict pill + action list', async () => {
    mockPost.mockResolvedValueOnce(successResult(okSession));
    render(<ChatPage />);
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'do a thing' } });
    fireEvent.click(screen.getByTestId('chat-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('super-judge-verdict').textContent).toBe('DEFER_TO_AF9');
      expect(screen.getByTestId('action-list')).toBeTruthy();
      expect(screen.getByTestId('action-card-a-1')).toBeTruthy();
    });
  });
});

describe('useAgentSessions (FLOW-46 Phase D)', () => {
  it('lists sessions on mount + refresh re-fetches', async () => {
    const mockSessions = [
      {
        sessionId: 'sess-1',
        userIntent: 'do thing',
        af9Verdict: 'PASS',
        superJudgeVerdict: 'DEFER_TO_AF9',
        grade: 'PASSED',
        actionsProposed: 1,
        contributionsRecorded: 0,
        completedAt: '2026-04-17T00:00:00Z',
      },
    ];
    mockGet.mockResolvedValueOnce(successResult({ sessions: mockSessions }));
    const { result } = renderHook(() => useAgentSessions(20));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].sessionId).toBe('sess-1');

    mockGet.mockResolvedValueOnce(successResult({ sessions: [] }));
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.sessions).toHaveLength(0));
  });

  it('captures error from list endpoint failure', async () => {
    mockGet.mockResolvedValueOnce(failureResult('NOT_ADMIN', 'master required'));
    const { result } = renderHook(() => useAgentSessions(20));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('master required');
    expect(result.current.sessions).toEqual([]);
  });
});

describe('ActionCard (T656)', () => {
  it('8. tags data-action-type for each branch and renders target tenant', () => {
    const branches: Array<'ADVISE' | 'PROPOSE_EDIT' | 'CREATE_FLOW' | 'APPLY_GLOBAL'> = [
      'ADVISE',
      'PROPOSE_EDIT',
      'CREATE_FLOW',
      'APPLY_GLOBAL',
    ];
    for (const t of branches) {
      const { container, unmount } = render(
        <ActionCard
          action={{
            actionId: `aid-${t}`,
            sessionId: 's',
            actionType: t,
            adminTenantId: 'master',
            targetTenantId: 'tenant-x',
            tenantId: 'master',
            knowledgeScope: 'PRIVATE',
            status: 'EMITTED',
          }}
        />,
      );
      const card = container.querySelector(`[data-action-type="${t}"]`);
      expect(card).toBeTruthy();
      expect(container.textContent).toMatch(/tenant-x/);
      unmount();
    }
  });
});
