/**
 * FormRespondentKiosk — FLOW-21 Typeform-style single-question-at-a-time
 * respondent experience (V-R13).
 *
 * Route: /dynamic-forms-workflows?mock=respond
 *
 * UX goals (interface-design skill):
 *   - One decision per screen — reduces abandonment on multi-field forms.
 *   - Progress indicator top-right ("2 of 4") so respondents feel orientation.
 *   - Large tap target for primary advance, keyboard Enter also advances.
 *   - Back button behind an "ask before lose answer" discipline (not here:
 *     capture-only UI shell — the full interaction pattern is in-session).
 */

import React, { useState } from 'react';

interface KioskQuestion {
  id: string;
  type: 'text' | 'email' | 'single-select' | 'long-text' | 'rating';
  prompt: string;
  helper?: string;
  required: boolean;
  options?: string[];
}

const DEMO_QUESTIONS: KioskQuestion[] = [
  {
    id: 'q1',
    type: 'text',
    prompt: 'What should we call you?',
    helper: 'First name or nickname works fine.',
    required: true,
  },
  {
    id: 'q2',
    type: 'email',
    prompt: 'Where can we reach you?',
    helper: 'We use email for confirmation only. No marketing.',
    required: true,
  },
  {
    id: 'q3',
    type: 'single-select',
    prompt: 'What brings you here today?',
    helper: 'Choose the closest match.',
    required: true,
    options: [
      'Book a demo',
      'Request a quote',
      'Partnership inquiry',
      'Something else',
    ],
  },
  {
    id: 'q4',
    type: 'long-text',
    prompt: 'Anything else we should know?',
    helper: 'Optional — share context that will help us respond well.',
    required: false,
  },
];

export function FormRespondentKiosk() {
  // Start on Q3 (single-select) so the capture shows the richer lettered-option
  // pattern; Q1 + Q2 are pre-answered so the progress bar is mid-flow and the
  // Back affordance is active (spec also asked for visible up/down nav).
  const [idx, setIdx] = useState(2);
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: 'Ariel',
    q2: 'ariel@example.com',
    q3: 'Partnership inquiry',
  });

  const total = DEMO_QUESTIONS.length;
  const q = DEMO_QUESTIONS[idx];
  if (!q) return null;
  const pct = Math.round(((idx + 1) / total) * 100);
  const current = answers[q.id] ?? '';
  const canAdvance = !q.required || current.trim().length > 0;

  function advance() {
    if (!canAdvance) return;
    if (idx < total - 1) setIdx(idx + 1);
  }

  function back() {
    if (idx > 0) setIdx(idx - 1);
  }

  function update(v: string) {
    setAnswers({ ...answers, [q.id]: v });
  }

  return (
    <div
      className="min-h-[600px] bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col"
      data-testid="respondent-kiosk"
    >
      {/* Top bar: progress */}
      <div className="px-8 pt-6 flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Partnership intake
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span data-testid="kiosk-progress-text">
            Question {idx + 1} of {total}
          </span>
          <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-blue-600 rounded-full transition-all"
              style={{ width: `${pct}%` }}
              data-testid="kiosk-progress-bar"
            />
          </div>
        </div>
      </div>

      {/* Centered question area */}
      <div className="flex-1 flex items-start justify-center px-8 pt-16">
        <div className="max-w-xl w-full" data-testid="kiosk-question">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl text-blue-600 font-semibold">{idx + 1} →</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {q.prompt}
            {q.required && <span className="text-blue-600 ml-1">*</span>}
          </h1>
          {q.helper && <p className="text-sm text-gray-500 mb-6">{q.helper}</p>}

          {/* Input */}
          {(q.type === 'text' || q.type === 'email') && (
            <input
              type={q.type}
              value={current}
              onChange={(e) => update(e.target.value)}
              placeholder="Type your answer…"
              data-testid={`kiosk-input-${q.id}`}
              className="w-full text-2xl border-b-2 border-gray-300 bg-transparent py-2 focus:outline-none focus:border-blue-600 placeholder:text-gray-300"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') advance();
              }}
            />
          )}

          {q.type === 'long-text' && (
            <textarea
              value={current}
              onChange={(e) => update(e.target.value)}
              placeholder="Type your answer…"
              rows={4}
              data-testid={`kiosk-input-${q.id}`}
              className="w-full text-lg border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-blue-600 placeholder:text-gray-300"
            />
          )}

          {q.type === 'single-select' && q.options && (
            <ul className="space-y-2" data-testid={`kiosk-options-${q.id}`}>
              {q.options.map((opt, i) => {
                const isActive = current === opt;
                return (
                  <li key={opt}>
                    <button
                      type="button"
                      onClick={() => {
                        update(opt);
                      }}
                      data-testid={`kiosk-option-${i}`}
                      className={`w-full text-left border rounded px-4 py-3 flex items-center gap-3 transition ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded border text-xs font-semibold flex items-center justify-center ${
                          isActive
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-400 text-gray-500'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {q.type === 'rating' && (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update(String(n))}
                  className={`w-12 h-12 rounded border text-lg font-medium ${
                    current === String(n)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* Primary CTA */}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={advance}
              disabled={!canAdvance}
              data-testid="kiosk-advance"
              className={`px-6 py-3 text-base font-medium rounded shadow-sm ${
                canAdvance
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {idx === total - 1 ? 'Submit' : 'OK'}
              <span className="ml-2 text-xs opacity-80">↵ Enter</span>
            </button>
            <p className="text-xs text-gray-500">Press Enter or click OK to continue.</p>
          </div>
        </div>
      </div>

      {/* Bottom bar: up/down nav + branding */}
      <div className="px-8 py-4 flex items-center justify-between border-t border-gray-200 bg-white/50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            disabled={idx === 0}
            data-testid="kiosk-back"
            aria-label="Previous question"
            className={`w-8 h-8 rounded border text-lg ${
              idx === 0
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={!canAdvance}
            aria-label="Next question"
            className={`w-8 h-8 rounded border text-lg ${
              !canAdvance
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ↓
          </button>
        </div>
        <div className="text-xs text-gray-400">Powered by XIIGen forms</div>
      </div>
    </div>
  );
}
