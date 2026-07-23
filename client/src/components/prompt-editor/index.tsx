/**
 * Prompt Editor Components — editable prompt content with versioning.
 *
 * PromptEditor      — textarea for content + system prompt + version badge + save
 * PromptVersionDiff — side-by-side comparison of two prompt versions
 *
 * Stage 3.
 */

import React from 'react';
import type { PromptRecord } from '../../hooks/usePromptEditor';

// ── PromptEditor ─────────────────────────────────────────────────────────────

export interface PromptEditorProps {
  prompt: PromptRecord;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onContentChange: (content: string) => void;
  onSystemPromptChange: (systemPrompt: string) => void;
  onBumpVersion: () => void;
  onSave: () => void;
}

export function PromptEditor({
  prompt,
  dirty,
  saving,
  error,
  onContentChange,
  onSystemPromptChange,
  onBumpVersion,
  onSave,
}: PromptEditorProps) {
  return (
    <div className="space-y-4" data-testid="prompt-editor">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {prompt.taskTypeId} / {prompt.promptType}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
            data-testid="version-badge"
          >
            v{prompt.version}
          </span>
          {dirty && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
              Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBumpVersion}
            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
            data-testid="bump-version-btn"
            title="Increment patch version"
          >
            + Version
          </button>
          <button
            onClick={onSave}
            disabled={!dirty || saving}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            data-testid="save-prompt-btn"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* System prompt field */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">System Prompt</label>
        <textarea
          value={prompt.systemPrompt ?? ''}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          rows={3}
          placeholder="Optional system prompt…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded font-mono resize-y"
          data-testid="system-prompt-input"
        />
      </div>

      {/* Main content field */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Prompt Content</label>
        <textarea
          value={prompt.content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={14}
          placeholder="Enter prompt content…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded font-mono resize-y"
          data-testid="prompt-content-input"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600"
          data-testid="prompt-error"
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ── PromptVersionDiff ────────────────────────────────────────────────────────

export interface PromptVersionDiffProps {
  versionA: PromptRecord;
  versionB: PromptRecord;
}

export function PromptVersionDiff({ versionA, versionB }: PromptVersionDiffProps) {
  return (
    <div className="grid grid-cols-2 gap-4" data-testid="prompt-version-diff">
      {/* Version A */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-600">Version {versionA.version}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {versionA.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <pre
          className="w-full p-3 text-xs bg-gray-900 text-green-400 rounded font-mono overflow-auto max-h-96 whitespace-pre-wrap break-words"
          data-testid="diff-version-a"
        >
          {versionA.content || '(empty)'}
        </pre>
      </div>

      {/* Version B */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-600">Version {versionB.version}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
            {versionB.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <pre
          className="w-full p-3 text-xs bg-gray-900 text-blue-300 rounded font-mono overflow-auto max-h-96 whitespace-pre-wrap break-words"
          data-testid="diff-version-b"
        >
          {versionB.content || '(empty)'}
        </pre>
      </div>
    </div>
  );
}
