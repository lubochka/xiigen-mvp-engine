/**
 * PromptEditor + PromptVersionDiff — unit tests.
 * Stage 3.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromptEditor, PromptVersionDiff } from '../../src/components/prompt-editor';
import type { PromptRecord } from '../../src/hooks/usePromptEditor';

const makePrompt = (overrides?: Partial<PromptRecord>): PromptRecord => ({
  taskTypeId: 'T47',
  promptType: 'generate',
  version: '1.2.3',
  content: 'Generate a service for {{taskName}}',
  systemPrompt: 'You are an expert engineer.',
  active: true,
  ...overrides,
});

describe('PromptEditor', () => {
  const noop = () => {};

  it('renders task type + prompt type in header', () => {
    render(
      <PromptEditor
        prompt={makePrompt()}
        dirty={false} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByTestId('prompt-editor')).toBeInTheDocument();
    expect(screen.getByText(/T47 \/ generate/)).toBeInTheDocument();
  });

  it('shows version badge', () => {
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={false} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByTestId('version-badge')).toHaveTextContent('v1.2.3');
  });

  it('shows Unsaved indicator when dirty', () => {
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={true} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
  });

  it('save button disabled when not dirty', () => {
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={false} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByTestId('save-prompt-btn')).toBeDisabled();
  });

  it('save button enabled when dirty', () => {
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={true} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByTestId('save-prompt-btn')).not.toBeDisabled();
  });

  it('calls onSave when save button clicked', () => {
    const onSave = jest.fn();
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={true} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByTestId('save-prompt-btn'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onBumpVersion when + Version clicked', () => {
    const onBumpVersion = jest.fn();
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={false} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={onBumpVersion} onSave={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('bump-version-btn'));
    expect(onBumpVersion).toHaveBeenCalledTimes(1);
  });

  it('calls onContentChange when textarea edited', () => {
    const onContentChange = jest.fn();
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={false} saving={false} error={null}
        onContentChange={onContentChange} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    fireEvent.change(screen.getByTestId('prompt-content-input'), {
      target: { value: 'new content' },
    });
    expect(onContentChange).toHaveBeenCalledWith('new content');
  });

  it('calls onSystemPromptChange when system prompt edited', () => {
    const onSystemPromptChange = jest.fn();
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={false} saving={false} error={null}
        onContentChange={noop} onSystemPromptChange={onSystemPromptChange}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    fireEvent.change(screen.getByTestId('system-prompt-input'), {
      target: { value: 'new system prompt' },
    });
    expect(onSystemPromptChange).toHaveBeenCalledWith('new system prompt');
  });

  it('shows saving text when saving=true', () => {
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={true} saving={true} error={null}
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByTestId('save-prompt-btn')).toHaveTextContent('Saving…');
  });

  it('shows error when error is provided', () => {
    render(
      <PromptEditor
        prompt={makePrompt()} dirty={false} saving={false} error="Network error"
        onContentChange={noop} onSystemPromptChange={noop}
        onBumpVersion={noop} onSave={noop}
      />,
    );
    expect(screen.getByTestId('prompt-error')).toHaveTextContent('Network error');
  });
});

// ── PromptVersionDiff ─────────────────────────────────────────────────────────

describe('PromptVersionDiff', () => {
  const vA = makePrompt({ version: '1.0.0', content: 'Old content', active: false });
  const vB = makePrompt({ version: '1.1.0', content: 'New content', active: true });

  it('renders both versions side by side', () => {
    render(<PromptVersionDiff versionA={vA} versionB={vB} />);
    expect(screen.getByTestId('prompt-version-diff')).toBeInTheDocument();
    expect(screen.getByTestId('diff-version-a')).toHaveTextContent('Old content');
    expect(screen.getByTestId('diff-version-b')).toHaveTextContent('New content');
  });

  it('shows version labels', () => {
    render(<PromptVersionDiff versionA={vA} versionB={vB} />);
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Version 1.1.0')).toBeInTheDocument();
  });

  it('shows (empty) for empty content', () => {
    render(<PromptVersionDiff versionA={{ ...vA, content: '' }} versionB={vB} />);
    expect(screen.getByTestId('diff-version-a')).toHaveTextContent('(empty)');
  });
});
