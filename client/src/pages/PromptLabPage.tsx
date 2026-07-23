/**
 * PromptLabPage — prompt versioning, A/B test status, and editable prompt content.
 *
 * Stage 3 additions:
 *   - PromptEditor: editable content + system prompt + version bumping + save
 *   - usePromptEditor: wired to PUT /api/prompts/:taskTypeId
 *   - PromptVersionDiff: side-by-side comparison of two selected versions
 */

import React, { useState, useCallback } from 'react';
import { usePromptVersions } from '../hooks/useLearningData';
import { usePromptEditor } from '../hooks/usePromptEditor';
import { PromptVersionList, ABTestStatus } from '../components/learning';
import { PromptEditor, PromptVersionDiff } from '../components/prompt-editor';

type PanelMode = 'view' | 'edit' | 'diff';

export function PromptLabPage() {
  const { versions, abTests, selectedVersion, selectVersion } = usePromptVersions();
  const editor = usePromptEditor();

  const [panelMode, setPanelMode] = useState<PanelMode>('view');
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);

  const handleSelectVersion = useCallback(
    (version: typeof selectedVersion) => {
      selectVersion(version);
      if (panelMode === 'edit' && version) {
        editor.loadPrompt(version.taskType ?? '', version.role ?? 'generate');
      }
    },
    [selectVersion, panelMode, editor],
  );

  const handleEnterEditMode = useCallback(() => {
    if (!selectedVersion) return;
    setPanelMode('edit');
    editor.loadPrompt(selectedVersion.taskType ?? '', selectedVersion.role ?? 'generate');
  }, [selectedVersion, editor]);

  const diffVersion = versions.find((v) => v.id === diffVersionId) ?? null;

  return (
    <div data-testid="page-promptlab">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Prompt Lab</h1>
      <p className="text-sm text-gray-500 mb-6">
        Prompt versions, A/B test status, and prompt editor
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: version list + A/B tests */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Prompt Versions ({versions.length})
              </h2>
            </div>
            <PromptVersionList
              versions={versions}
              selectedVersion={selectedVersion}
              onSelect={handleSelectVersion}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <ABTestStatus tests={abTests} />
          </div>
        </div>

        {/* Right: viewer / editor / diff */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          {selectedVersion ? (
            <>
              {/* Mode toggle bar */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                {(['view', 'edit', 'diff'] as PanelMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (mode === 'edit') {
                        handleEnterEditMode();
                      } else {
                        setPanelMode(mode);
                      }
                    }}
                    className={`flex-1 py-1 text-xs rounded capitalize ${
                      panelMode === mode
                        ? 'bg-white text-gray-800 shadow-sm font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    data-testid={`mode-${mode}`}
                  >
                    {mode === 'view' ? 'View' : mode === 'edit' ? 'Edit' : 'Diff'}
                  </button>
                ))}
              </div>

              {/* View mode */}
              {panelMode === 'view' && (
                <div data-testid="prompt-view-mode">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedVersion.taskType} / {selectedVersion.role}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      v{selectedVersion.version}
                    </span>
                    {selectedVersion.passRate !== undefined && (
                      <span className="text-xs text-gray-400">
                        {(selectedVersion.passRate * 100).toFixed(0)}% pass
                      </span>
                    )}
                  </div>
                  <pre className="w-full p-3 text-xs bg-gray-900 text-green-400 rounded font-mono overflow-auto max-h-96 whitespace-pre-wrap break-words">
                    {selectedVersion.content || '(no content)'}
                  </pre>
                </div>
              )}

              {/* Edit mode */}
              {panelMode === 'edit' && editor.prompt && (
                <PromptEditor
                  prompt={editor.prompt}
                  dirty={editor.dirty}
                  saving={editor.loading}
                  error={editor.error}
                  onContentChange={editor.updateContent}
                  onSystemPromptChange={editor.updateSystemPrompt}
                  onBumpVersion={editor.bumpVersion}
                  onSave={editor.savePrompt}
                />
              )}
              {panelMode === 'edit' && !editor.prompt && (
                <div className="text-sm text-gray-400 py-8 text-center">Loading prompt…</div>
              )}

              {/* Diff mode */}
              {panelMode === 'diff' && (
                <div data-testid="prompt-diff-mode">
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">Compare with:</label>
                    <select
                      value={diffVersionId ?? ''}
                      onChange={(e) => setDiffVersionId(e.target.value || null)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
                      data-testid="diff-version-select"
                    >
                      <option value="">Select a version…</option>
                      {versions
                        .filter((v) => v.id !== selectedVersion.id)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.version} — {v.taskType}/{v.role}
                          </option>
                        ))}
                    </select>
                  </div>
                  {diffVersion ? (
                    <PromptVersionDiff
                      versionA={{
                        taskTypeId: selectedVersion.taskType ?? '',
                        promptType: selectedVersion.role ?? '',
                        version: selectedVersion.version,
                        content: selectedVersion.content ?? '',
                        active: selectedVersion.isChampion,
                      }}
                      versionB={{
                        taskTypeId: diffVersion.taskType ?? '',
                        promptType: diffVersion.role ?? '',
                        version: diffVersion.version,
                        content: diffVersion.content ?? '',
                        active: diffVersion.isChampion,
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Select a second version above to compare.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400" data-testid="prompt-no-selection">
              Select a prompt version to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
