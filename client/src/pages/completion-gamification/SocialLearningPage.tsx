/**
 * SocialLearningPage — FLOW-05 social sharing and answer grading.
 * Route: /learning/social
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=social   → social sharing enabled (data-testid="social-section")
 *   ?mock=private  → privacy mode — social section hidden
 *   ?mock=grading  → incoming answer grades visible
 *   otherwise      → opt-in consent form
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const MOCK_POSTS = [
  {
    postId: 'post-001',
    topic: 'Algebra Basics',
    snippet: 'Shared my approach to linear equations...',
    submittedAt: '2026-04-10',
  },
  {
    postId: 'post-002',
    topic: 'Geometry',
    snippet: 'My favourite proof for Pythagoras...',
    submittedAt: '2026-04-09',
  },
];

const MOCK_GRADES = [
  {
    gradeId: 'g-001',
    topic: 'Algebra Basics',
    grade: 'A',
    feedback: 'Great explanation!',
    gradedAt: '2026-04-11',
  },
  {
    gradeId: 'g-002',
    topic: 'Geometry',
    grade: 'B',
    feedback: 'Good, but could be clearer.',
    gradedAt: '2026-04-11',
  },
];

export function SocialLearningPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  const [socialEnabled, setSocialEnabled] = useState(false);

  // ── Private mode — social section entirely hidden ──────────────────────────

  if (mockState === 'private') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-social-learning"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Social Learning</h1>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
          Social sharing is disabled. You are in private learning mode.
        </div>
        {/* data-testid="social-section" intentionally absent */}
      </div>
    );
  }

  // ── Mock: social sharing enabled with posts ───────────────────────────────

  if (mockState === 'social') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-social-learning"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Social Learning</h1>

        <div data-testid="social-section" className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            Social sharing is enabled. Your submissions are visible to the community.
          </div>

          {/* Submitted posts */}
          <section data-testid="submitted-posts">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Your Submitted Posts</h2>
            <div className="space-y-3">
              {MOCK_POSTS.map((post) => (
                <div
                  key={post.postId}
                  className="p-4 border rounded-lg"
                  data-testid={`post-${post.postId}`}
                >
                  <div className="font-medium text-gray-800">{post.topic}</div>
                  <div className="text-sm text-gray-500 mt-1">{post.snippet}</div>
                  <div className="text-xs text-gray-400 mt-2">{post.submittedAt}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Answer grading form */}
          <section data-testid="incoming-grades">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Incoming Answer Grades</h2>
            <div className="space-y-3">
              {MOCK_GRADES.map((grade) => (
                <div
                  key={grade.gradeId}
                  className="p-4 border rounded-lg flex items-start justify-between"
                  data-testid={`grade-${grade.gradeId}`}
                >
                  <div>
                    <div className="font-medium text-gray-800">{grade.topic}</div>
                    <div className="text-sm text-gray-500 mt-1">{grade.feedback}</div>
                    <div className="text-xs text-gray-400 mt-1">{grade.gradedAt}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded font-bold text-lg ${
                      grade.grade === 'A'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {grade.grade}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ── Mock: answer grading ──────────────────────────────────────────────────

  if (mockState === 'grading') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-social-learning"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Social Learning</h1>
        <div data-testid="social-section">
          <section data-testid="answer-grading-form">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Grade an Answer</h2>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-700 mb-3">
                Peer answer: &quot;The derivative of x² is 2x because...&quot;
              </p>
              <div className="flex gap-3">
                {['A', 'B', 'C', 'D'].map((grade) => (
                  <button
                    key={grade}
                    data-testid={`grade-button-${grade}`}
                    className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ── Default: consent opt-in ───────────────────────────────────────────────

  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-social-learning"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Social Learning</h1>

      <div className="p-4 bg-gray-50 border rounded-lg mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Social Sharing Opt-In</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enable social sharing to share your learning with peers and receive answer grades. Your
          data remains private until you consent.
        </p>

        <label
          className="flex items-center gap-3 cursor-pointer"
          data-testid="social-consent-toggle"
        >
          <input
            type="checkbox"
            checked={socialEnabled}
            onChange={(e) => setSocialEnabled(e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">
            I consent to share my learning activity with the community
          </span>
        </label>
      </div>

      {socialEnabled ? (
        <div
          data-testid="social-section"
          className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700"
        >
          Social sharing enabled. Your submissions will be visible to the community.
          <div data-testid="post-builder" className="mt-3">
            <textarea
              className="w-full border rounded p-2 text-sm text-gray-700"
              placeholder="Share something you learned..."
              rows={3}
            />
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded">
              Post to Community
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          Enable social sharing above to see community features.
        </div>
      )}
    </div>
  );
}
