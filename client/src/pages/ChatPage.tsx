/**
 * ChatPage — T656 Super Engine Assistant chat surface.
 *
 * One textarea, one submit button, list of proposed actions, super-judge
 * verdict pill. Uses useAgentSession for state. Polls only on submit
 * (no auto-refresh) to keep MVP scope tight; subsequent live-update is
 * deferred to a follow-up.
 */

import React, { useState } from 'react';
import { useAgentSession } from '../hooks/useAgentSession';
import { ActionCard } from '../components/platform-agent/ActionCard';

const VERDICT_COLORS: Record<string, string> = {
  DEFER_TO_AF9: 'bg-gray-200 text-gray-800',
  OVERRIDE_PASS: 'bg-emerald-200 text-emerald-900',
  OVERRIDE_BLOCK: 'bg-red-200 text-red-900',
};

export function ChatPage(): React.ReactElement {
  const { status, session, error, submit, reset } = useAgentSession();
  const [intent, setIntent] = useState('');

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!intent.trim()) return;
    const sessionId = `chat-${Date.now()}`;
    await submit({ sessionId, userIntent: intent });
  };

  const onReset = (): void => {
    setIntent('');
    reset();
  };

  return (
    <div data-testid="page-chat" className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Super Engine Assistant</h1>
      <p className="text-sm text-gray-600 mb-4">
        Ask the platform agent to advise, propose edits, create flows, or apply global templates.
        All runs require MASTER tenant context.
      </p>

      <form onSubmit={onSubmit} className="mb-6">
        <textarea
          data-testid="chat-input"
          aria-label="user intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="e.g. add a marketplace flow for Tenant X"
          className="w-full border rounded p-3 mb-2"
          rows={4}
          disabled={status === 'SUBMITTING'}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            data-testid="chat-submit"
            disabled={status === 'SUBMITTING' || !intent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {status === 'SUBMITTING' ? 'Running…' : 'Run'}
          </button>
          <button
            type="button"
            data-testid="chat-reset"
            onClick={onReset}
            className="px-4 py-2 border rounded"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div data-testid="chat-error" className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      {session && (
        <div data-testid="chat-session">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Super-Judge:</span>
            <span
              data-testid="super-judge-verdict"
              className={`px-2 py-1 rounded text-xs font-semibold ${
                VERDICT_COLORS[session.superJudgeVerdict] ?? 'bg-gray-100'
              }`}
            >
              {session.superJudgeVerdict}
            </span>
            <span className="text-xs text-gray-500">
              · AF-9: {session.af9Verdict} · session: {session.sessionId}
            </span>
          </div>

          <h2 className="font-semibold text-lg mb-2">
            Proposed actions ({session.actions.length})
          </h2>
          {session.actions.length === 0 ? (
            <p data-testid="no-actions" className="text-gray-500">
              No actions proposed.
            </p>
          ) : (
            <div data-testid="action-list">
              {session.actions.map((a) => (
                <ActionCard key={a.actionId} action={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
