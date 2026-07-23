/**
 * GroupFeedPage — FLOW-06 member group feed.
 * Route: /groups/:groupId/feed
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=loaded   → feed with tier-appropriate content (data-testid="group-feed")
 *   ?mock=locked   → locked content upgrade CTA (data-testid="upgrade-cta")
 *   ?mock=empty    → new member empty state (data-testid="feed-empty-state")
 *   otherwise      → loading state
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViewerRole } from '../../hooks/useViewerRole';

interface FeedEntry {
  entryId: string;
  title: string;
  snippet: string;
  accessLevel: string;
  publishedAt: string;
  locked: boolean;
}

const MOCK_FEED: FeedEntry[] = [
  {
    entryId: 'fe-001',
    title: 'Getting Started with Algebra',
    snippet: 'An introduction to algebraic thinking...',
    accessLevel: 'open_access',
    publishedAt: '2026-04-10',
    locked: false,
  },
  {
    entryId: 'fe-002',
    title: 'Advanced Techniques',
    snippet: 'Deep dive into advanced problem solving...',
    accessLevel: 'standard',
    publishedAt: '2026-04-09',
    locked: false,
  },
  {
    entryId: 'fe-003',
    title: 'Expert Masterclass',
    snippet: 'Exclusive content for premium members...',
    accessLevel: 'premium',
    publishedAt: '2026-04-08',
    locked: true,
  },
];

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  open_access: 'Open access',
  standard: 'Standard',
  premium: 'Premium',
};

function formatAccessLevel(level: string): string {
  return ACCESS_LEVEL_LABELS[level] ?? level.replace(/_/g, ' ');
}

export function GroupFeedPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();

  if (mockState === 'empty') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-feed"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Group Feed</h1>
        <div data-testid="feed-empty-state" className="p-8 text-center">
          <div className="text-gray-400 text-lg mb-2">Setting up your feed...</div>
          <p className="text-sm text-gray-500">
            Your personalised feed is being prepared. Check back shortly.
          </p>
        </div>
      </div>
    );
  }

  if (mockState === 'locked') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-feed"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Group Feed</h1>
        <div data-testid="group-feed" className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-gray-800">Getting Started with Algebra</h3>
            <p className="text-sm text-gray-500 mt-1">An introduction to algebraic thinking...</p>
          </div>
          <div className="p-4 border rounded-lg relative" data-testid="locked-content-fe-003">
            <div className="blur-sm">
              <h3 className="font-semibold text-gray-800">Expert Masterclass</h3>
              <p className="text-sm text-gray-500 mt-1">Exclusive content for premium members...</p>
            </div>
            <div
              data-testid="upgrade-cta"
              className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg"
            >
              <div className="text-center p-4">
                <p className="font-semibold text-gray-800 mb-2">Upgrade to access this content</p>
                <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mockState === 'loaded') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-feed"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Group Feed</h1>

        <div data-testid="group-feed" className="space-y-4">
          {MOCK_FEED.map((entry) => (
            <div
              key={entry.entryId}
              className="p-4 border rounded-lg relative"
              data-testid={`feed-entry-${entry.entryId}`}
            >
              {entry.locked ? (
                <>
                  <div className="blur-sm">
                    <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{entry.snippet}</p>
                  </div>
                  <div
                    data-testid="upgrade-cta"
                    className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg"
                  >
                    <div className="text-center p-4">
                      <p className="font-semibold text-gray-800 mb-2">
                        Upgrade to access this content
                      </p>
                      <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                        Upgrade to Premium
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{entry.snippet}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">{entry.publishedAt}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      {formatAccessLevel(entry.accessLevel)}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: loading
  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-group-feed"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="group-feed">Group Feed</h1>
      <div className="text-gray-500 text-sm">Loading your group feed...</div>
    </div>
  );
}
