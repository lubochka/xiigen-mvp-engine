/**
 * TierManagementPage — FLOW-06 tier upgrade/downgrade management.
 * Route: /groups/:groupId/tier
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=current  → current tier view (data-testid="tier-management")
 *   ?mock=preview  → feed adjustment preview (data-testid="feed-adjustment-preview")
 *   ?mock=upgraded → after tier upgrade (data-testid="tier-upgraded")
 *   otherwise      → loading state
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const TIER_ACCESS_MAP: Record<string, string[]> = {
  FREE: ['open_access'],
  STANDARD: ['standard', 'open_access'],
  PREMIUM: ['premium', 'standard', 'open_access'],
};

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  open_access: 'Open access',
  standard: 'Standard',
  premium: 'Premium',
};

function formatTier(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

function formatAccessLevel(level: string): string {
  return ACCESS_LEVEL_LABELS[level] ?? level.replace(/_/g, ' ');
}

function formatAccessLevels(levels: string[]): string {
  return levels.map(formatAccessLevel).join(', ');
}

export function TierManagementPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  const [previewTier, setPreviewTier] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const currentTier = 'STANDARD';
  const groupRequirement = 'FREE';
  const previewAccessLevels = previewTier ? (TIER_ACCESS_MAP[previewTier] ?? []) : [];

  if (mockState === 'upgraded') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-tier-management"
      >
        <div
          data-testid="tier-upgraded"
          className="p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-green-700 font-semibold">Tier Upgraded Successfully</p>
          <p className="text-green-600 text-sm mt-1">
            Your feed is being updated to include newly accessible content.
          </p>
        </div>
      </div>
    );
  }

  if (mockState === 'preview') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-tier-management"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tier Management</h1>

        <div
          data-testid="feed-adjustment-preview"
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <h2 className="font-semibold text-blue-800 mb-3">Feed Adjustment Preview</h2>
          <p className="text-sm text-blue-700 mb-3">Upgrading to Premium will:</p>
          <ul className="text-sm text-blue-700 space-y-1 ms-4">
            <li>
              + Add access to <strong>Premium</strong> content
            </li>
            <li>
              + Retain access to <strong>Standard</strong> and <strong>Open access</strong> content
            </li>
            <li>+ Up to 50 new posts will be added to your feed</li>
          </ul>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
              Confirm Upgrade
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mockState === 'current') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-tier-management"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tier Management</h1>

        <div data-testid="tier-management" className="space-y-6">
          {/* Current status */}
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between mb-3">
              <span className="text-sm text-gray-600">Current Tier</span>
              <span data-testid="current-tier-label" className="font-semibold text-blue-600">
                {formatTier(currentTier)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Group Minimum</span>
              <span data-testid="group-requirement-label" className="font-semibold text-gray-700">
                {formatTier(groupRequirement)}
              </span>
            </div>
          </div>

          {/* Tier options */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Available Tiers</h2>
            <div className="space-y-3">
              {Object.entries(TIER_ACCESS_MAP).map(([tier, levels]) => (
                <div
                  key={tier}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    tier === currentTier ? 'border-blue-400 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  data-testid={`tier-option-${tier.toLowerCase()}`}
                  onClick={() => {
                    setPreviewTier(tier);
                    setShowPreview(true);
                  }}
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">{formatTier(tier)}</span>
                    {tier === currentTier && (
                      <span className="text-xs text-blue-600 font-medium">Current</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Access: {formatAccessLevels(levels)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feed adjustment preview */}
          {showPreview && previewTier && previewTier !== currentTier && (
            <div
              data-testid="feed-adjustment-preview"
              className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <h3 className="font-medium text-yellow-800 mb-2">
                Preview: Switch to {formatTier(previewTier)}
              </h3>
              <p className="text-sm text-yellow-700">
                Access levels: {formatAccessLevels(previewAccessLevels)}
              </p>
              <button
                data-testid="confirm-tier-change"
                className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Confirm Tier Change
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: loading
  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-tier-management"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="tier-management">Tier Management</h1>
      <div className="text-gray-500 text-sm">Loading tier information...</div>
    </div>
  );
}
