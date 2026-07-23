/**
 * LessonCompletionPage — FLOW-05 questionnaire completion form.
 * Route: /lessons/complete
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=submitted  → gamification feedback state (data-testid="gamification-feedback")
 *   ?mock=achieved   → achievement unlocked state  (data-testid="achievement-unlocked")
 *   ?mock=updating   → curriculum updating state   (data-testid="curriculum-updating")
 *   ?mock=social     → social section visible      (data-testid="social-section")
 *   ?mock=private    → private mode — social hidden
 *   otherwise        → form state                  (data-testid="completion-form")
 */

import React, { useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

export function LessonCompletionPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const pointsTotal = searchParams.get('pointsTotal') ?? '25';
  const basePoints = searchParams.get('basePoints') ?? '10';
  const bonusPoints = searchParams.get('bonusPoints') ?? '15';
  const streakGraceHours = searchParams.get('graceHours');
  const mlCooldownDays = searchParams.get('cooldownDays');

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [socialConsent, setSocialConsent] = useState(false);

  const questionIds = ['q1', 'q2', 'q3'];

  // ── Mock: gamification feedback ───────────────────────────────────────────

  if (mockState === 'submitted' || submitted) {
    return (
      <div
        className="max-w-3xl mx-auto min-h-[70vh] flex flex-col items-stretch justify-center p-4"
        data-testid="page-lesson-completion"
        data-viewer-role={role}
      >
        <div
          data-testid="gamification-feedback"
          className="w-full bg-white border border-green-200 rounded-lg shadow-sm p-8"
        >
          <div className="text-center mb-6">
            <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
              Lesson complete
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Keep the streak alive</h1>
            <p className="text-sm text-gray-600 mt-2">
              Your answers were recorded, points were awarded, and your learning path is updating.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center rounded border border-green-200 bg-green-50 p-4" data-testid="points-earned">
              <div className="text-4xl font-bold text-green-700">+{pointsTotal}</div>
              <div className="text-xs text-gray-500">Points Earned</div>
            </div>
            <div className="text-center rounded border border-orange-200 bg-orange-50 p-4" data-testid="streak-count">
              <div className="text-4xl font-bold text-orange-700">7</div>
              <div className="text-xs text-gray-500">Day Streak</div>
            </div>
            <div className="text-center rounded border border-blue-200 bg-blue-50 p-4" data-testid="current-level">
              <div className="text-4xl font-bold text-blue-700">Lv 4</div>
              <div className="text-xs text-gray-500">Current Level</div>
            </div>
          </div>

          <div
            data-testid="points-breakdown"
            className="text-sm text-gray-600 border border-gray-200 rounded p-4 mb-4"
          >
            <p className="font-medium mb-1">Points Breakdown:</p>
            <ul className="space-y-1">
              <li>Base points: {basePoints}</li>
              <li>Bonus (score &gt;= 80%): +{bonusPoints}</li>
              <li className="font-semibold text-green-700">Total: {pointsTotal}</li>
            </ul>
          </div>

          {streakGraceHours && (
            <div
              data-testid="streak-grace-window"
              className="text-sm text-orange-800 border border-orange-200 bg-orange-50 rounded p-4"
            >
              Streak grace window: {streakGraceHours} hours after midnight.
            </div>
          )}

          {mlCooldownDays && (
            <div
              data-testid="ml-cooldown-window"
              className="mt-3 text-sm text-blue-800 border border-blue-200 bg-blue-50 rounded p-4"
            >
              Learning path review cooldown: {mlCooldownDays} days.
            </div>
          )}
        </div>

        <div
          data-testid="curriculum-updating"
          className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700"
        >
          Curriculum updating... Your learning path is being personalised.
        </div>

        {role === 'freelancer' && (
          <div
            data-testid="lesson-freelancer-portfolio"
            className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded text-sm"
          >
            <p className="text-purple-700 font-medium">Portfolio shortcut</p>
            <p className="text-purple-600 mt-1">
              Add this completed lesson to your freelancer portfolio when you are ready.
            </p>
            <NavLink
              to="/freelancer/portfolio"
              data-testid="lesson-freelancer-portfolio-link"
              className="text-purple-600 hover:underline text-sm"
            >
              Add to portfolio
            </NavLink>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <NavLink
            to="/lessons"
            data-testid="next-lesson-cta"
            className="inline-flex justify-center rounded bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Start next lesson
          </NavLink>
          <NavLink
            to="/dashboard"
            className="inline-flex justify-center rounded border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to dashboard
          </NavLink>
        </div>
      </div>
    );
  }

  if (mockState === 'achieved') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-lesson-completion"
        data-viewer-role={role}
      >
        <div data-testid="gamification-feedback" className="p-4 bg-green-50 rounded-lg mb-4">
          <p className="text-green-700 font-medium">Great work! +50 points earned.</p>
        </div>
        <div
          data-testid="achievement-unlocked"
          className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg"
        >
          <h2 className="text-lg font-bold text-yellow-800">Achievement Unlocked!</h2>
          <p className="text-yellow-700 text-sm mt-1">Perfect Score — Score 100% on any lesson</p>
        </div>
      </div>
    );
  }

  if (mockState === 'social') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-lesson-completion"
        data-viewer-role={role}
      >
        <div data-testid="gamification-feedback" className="p-4 bg-green-50 rounded-lg mb-4">
          <p className="text-green-700 font-medium">Lesson complete! +20 points earned.</p>
        </div>
        <div data-testid="social-section" className="mt-4 p-4 border rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Social Learning</h3>
          <div data-testid="social-share-toggle" className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="social-consent"
              checked={socialConsent}
              onChange={(e) => setSocialConsent(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="social-consent" className="text-sm text-gray-600">
              Share my progress with the community
            </label>
          </div>
          {socialConsent && (
            <div data-testid="post-builder" className="p-3 bg-gray-50 rounded border">
              <textarea
                className="w-full text-sm border rounded p-2"
                placeholder="Share what you learned..."
                rows={3}
              />
              <button className="mt-2 px-4 py-1 bg-blue-600 text-white text-sm rounded">
                Post
              </button>
            </div>
          )}
          <div data-testid="incoming-grades" className="mt-3">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Incoming Answer Grades</h4>
            <div className="text-sm text-gray-500 italic">No grades received yet.</div>
          </div>
        </div>
      </div>
    );
  }

  if (mockState === 'private') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-lesson-completion"
        data-viewer-role={role}
      >
        <div data-testid="gamification-feedback" className="p-4 bg-green-50 rounded-lg mb-4">
          <p className="text-green-700 font-medium">Lesson complete! +20 points earned.</p>
        </div>
        {/* social-section intentionally absent in private mode */}
      </div>
    );
  }

  if (mockState === 'updating') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-lesson-completion"
        data-viewer-role={role}
      >
        <div data-testid="gamification-feedback" className="p-4 bg-green-50 rounded-lg mb-4">
          <p className="text-green-700 font-medium">Lesson complete!</p>
        </div>
        <div
          data-testid="curriculum-updating"
          className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700"
        >
          Curriculum updating... Your learning path is being personalised.
        </div>
        <div
          data-testid="adaptation-pending"
          className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700"
        >
          Adaptation pending — Branch B is processing your results.
        </div>
      </div>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  const pageTitle = role === 'tenant-admin' ? 'Learner Progress Monitoring' : 'Complete Lesson';

  function ExistingForm({ withFreelancerPortfolio = false }: { withFreelancerPortfolio?: boolean }) {
    return (
      <>
        <form data-testid="completion-form" onSubmit={handleSubmit} noValidate>
          {questionIds.map((qid, idx) => (
            <div key={qid} className="mb-6" data-testid={`question-${idx + 1}`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question {idx + 1}
              </label>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={qid}
                      value={opt}
                      checked={answers[qid] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [qid]: opt }))}
                      data-testid={`answer-${qid}-${opt}`}
                      className="text-blue-600"
                    />
                    Option {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            data-testid="submit-completion"
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700"
            style={{ minHeight: '44px' }}
          >
            Submit Answers
          </button>
        </form>
        {withFreelancerPortfolio && (
          <div
            data-testid="lesson-freelancer-portfolio"
            className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded text-sm"
          >
            <p className="text-purple-700 font-medium">Freelancer tip:</p>
            <p className="text-purple-600 mt-1">
              After completing this lesson, you can add your score to your gig portfolio.
            </p>
            <a
              href="/freelancer/portfolio"
              data-testid="lesson-freelancer-portfolio-link"
              className="text-purple-600 hover:underline text-sm"
            >
              Add to portfolio after submission →
            </a>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-lesson-completion"
      data-viewer-role={role}
    >
      <h1
        className="text-2xl font-bold text-gray-900 mb-6"
        data-testid="gamification-feedback"
      >
        {pageTitle}
      </h1>

      <RoleScopedView role={role} testIdPrefix="lesson-role">
        {/* Branch 1 — tenant-admin (progress monitoring) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="lesson-role-admin-view">
            <div
              data-testid="lesson-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Admin view — learner progress and completion analytics.
            </div>
            {/* RUN-109: tenant-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="lesson-admin-completed">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Lessons completed (week)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">284</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="lesson-admin-avg-score">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Average score (week)
                </span>
                <span className="tabular-nums font-semibold text-emerald-700">78%</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="lesson-admin-streaks">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  7+ day streaks
                </span>
                <span className="tabular-nums font-semibold text-slate-900">42</span>
              </span>
            </div>
            {streakGraceHours && (
              <div
                data-testid="lesson-admin-adaptation-summary"
                className="mb-4 flex flex-wrap gap-2 text-xs text-slate-700"
              >
                <span
                  data-testid="lesson-admin-points-earned"
                  className="rounded border border-green-200 bg-green-50 px-2 py-1"
                >
                  Reward total +{pointsTotal}
                </span>
                <span
                  data-testid="lesson-admin-streak-grace-window"
                  className="rounded border border-orange-200 bg-orange-50 px-2 py-1"
                >
                  {streakGraceHours}-hour streak grace window
                </span>
                {mlCooldownDays && (
                  <span
                    data-testid="lesson-admin-ml-cooldown-window"
                    className="rounded border border-blue-200 bg-blue-50 px-2 py-1"
                  >
                    {mlCooldownDays}-day learning path review
                  </span>
                )}
              </div>
            )}
            <div className="overflow-x-auto mb-3">
              <table
                data-testid="lesson-admin-table"
                className="w-full text-sm min-w-[640px]"
              >
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">User</th>
                    <th className="p-2 font-medium">Lesson</th>
                    <th className="p-2 font-medium">Score</th>
                    <th className="p-2 font-medium">Streak</th>
                    <th className="p-2 font-medium">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { u: 'user-alice', l: 'Advanced Algebra', s: '92%', st: '3-day streak', t: '2h ago' },
                    { u: 'user-bob', l: 'Data Concepts', s: '65%', st: 'day 1', t: '4h ago' },
                    { u: 'user-carol', l: 'API Basics', s: '88%', st: '5-day streak', t: '1d ago' },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      data-testid={`lesson-admin-row-${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2 font-mono text-xs">{row.u}</td>
                      <td className="p-2">{row.l}</td>
                      <td className="p-2 font-medium">{row.s}</td>
                      <td className="p-2 text-gray-700">{row.st}</td>
                      <td className="p-2 text-gray-500">{row.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href="/gamification"
              data-testid="lesson-admin-dashboard"
              className="text-sm text-blue-600 hover:underline"
            >
              Open full learning dashboard →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — freelancer (form + portfolio shortcut) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="lesson-role-freelancer-view">
            <ExistingForm withFreelancerPortfolio />
          </div>
        </RoleScopedView.Case>

        {/* Fallback — all other roles see the existing form unchanged */}
        <RoleScopedView.Fallback>
          <ExistingForm />
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
