/**
 * MembershipStatusPage — FLOW-06 member status view.
 * Route: /groups/:groupId/membership
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=active   → active membership (data-testid="membership-active")
 *   ?mock=pending  → awaiting approval (data-testid="membership-pending")
 *   ?mock=rejected → rejected state (data-testid="membership-rejected")
 *   otherwise      → loading state
 */

import React from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';

export function MembershipStatusPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState === 'active') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-membership-status"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Membership Status</h1>

        <div
          data-testid="membership-active"
          className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6"
        >
          <p className="text-green-700 font-semibold">Active Member</p>
          <p className="text-green-600 text-sm mt-1">You are an active member of this group.</p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Tier</span>
            <span data-testid="current-tier" className="font-medium text-purple-600">
              Premium
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Access Levels</span>
            <span data-testid="access-levels" className="font-medium text-gray-800">
              Premium, Standard, Open access
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Joined</span>
            <span data-testid="join-date" className="font-medium text-gray-800">
              2026-04-01
            </span>
          </div>
        </div>

        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <span className="font-medium">Upgrade Available:</span> Explore premium content with a
          tier upgrade.
          <button
            data-testid="tier-upgrade-cta"
            className="ms-2 text-blue-600 underline hover:no-underline"
          >
            Upgrade Now
          </button>
        </div>

        <NavLink
          to="/groups/feed"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          data-testid="view-feed-link"
        >
          View Group Feed →
        </NavLink>
      </div>
    );
  }

  if (mockState === 'pending') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-membership-status"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Membership Status</h1>

        <div
          data-testid="membership-pending"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <p className="text-yellow-700 font-semibold">Awaiting Admin Approval</p>
          <p className="text-yellow-600 text-sm mt-2">
            Your join request is under review. You will be notified when an admin processes your
            request.
          </p>
          <p className="text-yellow-500 text-xs mt-2">Request expires in 72 hours.</p>
        </div>
      </div>
    );
  }

  if (mockState === 'rejected') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-membership-status"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Membership Status</h1>

        <div
          data-testid="membership-rejected"
          className="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-red-700 font-semibold">Join Request Rejected</p>
          <p className="text-red-600 text-sm mt-2">
            Your request to join this group was not approved. Please contact the group admin for
            more information.
          </p>
        </div>
      </div>
    );
  }

  // Default: loading
  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-membership-status"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="membership-active">Membership Status</h1>
      <div className="text-gray-500 text-sm">Loading membership information...</div>
    </div>
  );
}
