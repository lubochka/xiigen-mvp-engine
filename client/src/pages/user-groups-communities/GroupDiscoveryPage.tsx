/**
 * GroupDiscoveryPage — FLOW-06 group search and join entry.
 * Route: /groups
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=results    → search results with groups (data-testid="group-list")
 *   ?mock=joined     → public group join confirmation (data-testid="group-joined")
 *   ?mock=requested  → private group request sent (data-testid="request-sent-badge")
 *   otherwise        → search form (data-testid="group-search-form")
 */

import React, { useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

interface Group {
  groupId: string;
  name: string;
  category: string;
  groupType: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  tierRequirement: string;
  memberCount: number;
  description?: string;
  postsPerWeek?: number;
}

const MOCK_GROUPS: Group[] = [
  {
    groupId: 'grp-001',
    name: 'Advanced Algebra Study',
    category: 'Mathematics',
    groupType: 'PUBLIC',
    tierRequirement: 'FREE',
    memberCount: 142,
    description:
      'Weekly problem sets from Olympiad archives. Collaborative hints, no solutions until Sunday.',
    postsPerWeek: 34,
  },
  {
    groupId: 'grp-002',
    name: 'Elite Calculus Club',
    category: 'Mathematics',
    groupType: 'PRIVATE',
    tierRequirement: 'PREMIUM',
    memberCount: 28,
    description:
      'Invitation-first circle for practicing IMO-level calculus. Approval by existing members.',
    postsPerWeek: 8,
  },
  {
    groupId: 'grp-003',
    name: 'Geometry Masters',
    category: 'Mathematics',
    groupType: 'PUBLIC',
    tierRequirement: 'STANDARD',
    memberCount: 75,
    description:
      'Construction puzzles, projective geometry, and the occasional Euler line debate.',
    postsPerWeek: 12,
  },
  {
    groupId: 'grp-004',
    name: 'Indie Game Dev Collective',
    category: 'Development',
    groupType: 'PUBLIC',
    tierRequirement: 'FREE',
    memberCount: 318,
    description:
      'Devlogs, playtests, shader tricks. Friday demo sessions with live feedback from peers.',
    postsPerWeek: 47,
  },
  {
    groupId: 'grp-005',
    name: 'Founders Lounge — SaaS track',
    category: 'Business',
    groupType: 'INVITE_ONLY',
    tierRequirement: 'PREMIUM',
    memberCount: 54,
    description:
      'Closed community for SaaS founders with ≥$10k MRR. Monthly peer reviews and warm intros.',
    postsPerWeek: 3,
  },
  {
    groupId: 'grp-006',
    name: 'Language Exchange — EN ↔ DE',
    category: 'Languages',
    groupType: 'PUBLIC',
    tierRequirement: 'FREE',
    memberCount: 89,
    description:
      'Daily tandem pairings, weekly voice-chat rooms, a dedicated corrections channel.',
    postsPerWeek: 21,
  },
];

const TIER_BADGE_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STANDARD: 'bg-blue-100 text-blue-700',
  PREMIUM: 'bg-purple-100 text-purple-700',
};

/**
 * RUN-92: activity indicator — the capacity-strip signature pattern
 * transposed to groups. A membership signal lives on the card itself,
 * not in a separate metrics panel. Per /.impeccable.md principle 3.
 */
function groupActivityState(postsPerWeek?: number) {
  const p = postsPerWeek ?? 0;
  if (p >= 25) {
    return {
      dot: 'bg-emerald-500',
      pulse: 'animate-pulse',
      label: `Very active · ${p} posts this week`,
      text: 'text-emerald-700',
    };
  }
  if (p >= 10) {
    return {
      dot: 'bg-emerald-500',
      pulse: '',
      label: `Active · ${p} posts this week`,
      text: 'text-slate-600',
    };
  }
  if (p >= 3) {
    return {
      dot: 'bg-amber-400',
      pulse: '',
      label: `Low activity · ${p} posts this week`,
      text: 'text-slate-500',
    };
  }
  return {
    dot: 'bg-slate-300',
    pulse: '',
    label: 'Quiet — no recent posts',
    text: 'text-slate-400',
  };
}

const GROUP_TYPE_LABEL: Record<Group['groupType'], { label: string; chip: string }> = {
  PUBLIC: { label: 'Public', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PRIVATE: { label: 'Private', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  INVITE_ONLY: { label: 'Invite-only', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function GroupDiscoveryPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    role === 'freelancer' ? 'Freelancer' : ''
  );
  const [joinedGroupId, setJoinedGroupId] = useState<string | null>(null);
  const [requestedGroupId, setRequestedGroupId] = useState<string | null>(null);

  // ── Mock: joined confirmation ─────────────────────────────────────────────

  if (mockState === 'joined' || joinedGroupId) {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-discovery"
      >
        <div
          data-testid="group-joined"
          className="p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-green-700 font-semibold">You have joined the group!</p>
          <p className="text-green-600 text-sm mt-1">
            Welcome to the community. Your feed is being set up.
          </p>
          <NavLink
            to="/groups/feed"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            View Group Feed →
          </NavLink>
        </div>
      </div>
    );
  }

  // ── Mock: request sent badge ──────────────────────────────────────────────

  if (mockState === 'requested' || requestedGroupId) {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-discovery"
      >
        <div
          data-testid="request-sent-badge"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <p className="text-yellow-700 font-semibold">Join Request Sent</p>
          <p className="text-yellow-600 text-sm mt-1">Your request is awaiting admin approval.</p>
          <NavLink
            to="/groups/membership"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            View Membership Status →
          </NavLink>
        </div>
      </div>
    );
  }

  // ── Mock: search results ──────────────────────────────────────────────────

  if (mockState === 'results') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
        data-testid="page-group-discovery"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover Groups</h1>

        <div className="mb-4 p-3 bg-gray-50 rounded flex gap-3">
          <input
            type="text"
            placeholder="Search groups..."
            className="flex-1 border rounded px-3 py-2 text-sm"
            data-testid="search-input"
          />
          <select className="border rounded px-3 py-2 text-sm" data-testid="category-filter">
            <option value="">All Categories</option>
            <option value="Mathematics">Mathematics</option>
          </select>
        </div>

        <div data-testid="group-list" className="space-y-4">
          {MOCK_GROUPS.map((group) => (
            <div
              key={group.groupId}
              className="p-4 border rounded-lg"
              data-testid={`group-card-${group.groupId}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{group.name}</h3>
                  <p className="text-sm text-gray-500">
                    {group.category} · {group.memberCount} members
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${TIER_BADGE_COLORS[group.tierRequirement]}`}
                    data-testid="tier-requirement-badge"
                  >
                    {group.tierRequirement.charAt(0) + group.tierRequirement.slice(1).toLowerCase()}
                  </span>
                  {group.groupType === 'PUBLIC' ? (
                    <button
                      data-testid={`join-button-${group.groupId}`}
                      onClick={() => setJoinedGroupId(group.groupId)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Join
                    </button>
                  ) : (
                    <button
                      data-testid={`request-button-${group.groupId}`}
                      onClick={() => setRequestedGroupId(group.groupId)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Request to Join
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Default: role-aware search form ──────────────────────────────────────

  function StandardSearchForm() {
    return (
      <form
        data-testid="group-search-form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {role === 'freelancer' && (
          <input
            type="hidden"
            data-testid="group-freelancer-category-preset"
            value="Freelancer"
            readOnly
          />
        )}
        <div className="mb-4">
          <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
            Search Groups
          </label>
          <input
            id="search-input"
            data-testid="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Algebra Study Group"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category-filter"
            data-testid="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="Languages">Languages</option>
            <option value="Freelancer">Freelancer</option>
          </select>
        </div>

        <button
          data-testid="search-button"
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700"
          style={{ minHeight: '44px' }}
        >
          Search Groups
        </button>
      </form>
    );
  }

  const publicGroups = MOCK_GROUPS.filter((g) => g.groupType === 'PUBLIC');

  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-group-discovery"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover Groups</h1>

      <RoleScopedView role={role} testIdPrefix="group-role">
        {/* Branch 1 — anonymous (read-only public groups) */}
        <RoleScopedView.Case when="anonymous">
          <div data-testid="group-role-anon-view">
            <div
              data-testid="group-anon-signin-banner"
              className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
            >
              Sign in to join groups and connect with your community.{' '}
              <a
                href="/login?return=/groups"
                data-testid="group-anon-signin-link"
                className="underline font-medium"
              >
                Sign in
              </a>
            </div>
            <div className="mb-4">
              <StandardSearchForm />
            </div>
            <div data-testid="group-anon-list" className="space-y-3">
              {publicGroups.map((g) => (
                <div
                  key={g.groupId}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{g.name}</h3>
                      <p className="text-sm text-gray-600">
                        {g.category} · {g.memberCount} members
                      </p>
                      <p data-testid="group-type-label" className="text-xs text-gray-500 mt-1">
                        Public group
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded font-medium ${TIER_BADGE_COLORS[g.tierRequirement]}`}
                    >
                      {g.tierRequirement.charAt(0) + g.tierRequirement.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <a
                    href="/login?return=/groups"
                    data-testid={`group-anon-join-${g.groupId}`}
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Sign in to join →
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Browse all public groups after signing in for personalised results.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — public-marketplace-visitor */}
        <RoleScopedView.Case when="public-marketplace-visitor">
          <div data-testid="group-role-public-mkt-view">
            <div
              data-testid="group-public-mkt-teaser"
              className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-900"
            >
              Some groups offer exclusive discounts for marketplace members.{' '}
              <a
                href="/login?return=/groups"
                data-testid="group-public-mkt-signin"
                className="underline font-medium"
              >
                Sign in to join
              </a>
            </div>
            <div className="space-y-3">
              {publicGroups.map((g) => (
                <div
                  key={g.groupId}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{g.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {g.category} · {g.memberCount} members
                  </p>
                  <a
                    href="/login?return=/groups"
                    className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Sign in to join →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-admin (group directory) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="group-role-admin-view">
            <div
              data-testid="group-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Admin view — all groups in your tenant.
            </div>
            <div className="overflow-x-auto mb-4">
              <table data-testid="group-admin-directory" className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Group</th>
                    <th className="p-2 font-medium">Type</th>
                    <th className="p-2 font-medium">Members</th>
                    <th className="p-2 font-medium">Tier</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_GROUPS.map((g) => (
                    <tr
                      key={g.groupId}
                      data-testid={`group-admin-row-${g.groupId}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2 font-medium">{g.name}</td>
                      <td className="p-2 text-gray-700">{GROUP_TYPE_LABEL[g.groupType].label}</td>
                      <td className="p-2">{g.memberCount}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${TIER_BADGE_COLORS[g.tierRequirement]}`}
                        >
                          {g.tierRequirement.charAt(0) + g.tierRequirement.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                          <span aria-hidden="true">●</span> Active
                        </span>
                      </td>
                      <td className="p-2">
                        <a
                          href={`/groups/${g.groupId}/feed`}
                          data-testid={`group-admin-view-${g.groupId}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href="/groups/new"
              data-testid="group-admin-create"
              className="text-sm text-blue-600 hover:underline"
            >
              Create new group →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — platform-admin (cross-tenant + search) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="group-role-platform-admin-view">
            <div
              data-testid="group-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform admin — cross-tenant group overview.
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                data-testid="group-platform-total"
                className="p-3 bg-blue-50 border border-blue-200 rounded"
              >
                <p className="text-xs text-blue-700 uppercase">Total Groups (all tenants)</p>
                <p className="text-xl font-bold text-blue-900 mt-1">1,284</p>
              </div>
              <div
                data-testid="group-platform-flagged"
                className="p-3 bg-amber-50 border border-amber-200 rounded"
              >
                <p className="text-xs text-amber-700 uppercase">Flagged for Policy Review</p>
                <p className="text-xl font-bold text-amber-900 mt-1 flex items-center gap-2">
                  <span>3</span>
                  <span className="text-xs font-normal">needs attention</span>
                </p>
              </div>
            </div>
            <a
              href="/platform/groups"
              data-testid="group-platform-console"
              className="inline-block mb-4 text-sm text-blue-600 hover:underline"
            >
              Open group policy console →
            </a>
            <StandardSearchForm />
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — freelancer (pre-filtered search) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="group-role-freelancer-view">
            <div
              data-testid="group-freelancer-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Find groups for freelancers — connect with clients and collaborators.
            </div>
            <StandardSearchForm />
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — tenant-user / referral-user / event-organiser (CARD_LIST grammar)
            RUN-92: previously these roles fell through to StandardSearchForm alone,
            which produced a PNG showing only a search box + dropdown + button — no
            groups visible. Now renders a proper card list with per-card state chip
            (public/private/invite-only), tier badge, activity indicator (signature),
            description, and a role-aware primary action per card (Join / Request /
            Invite-only). Facebook Groups / Discord server-list convention. */}
        <RoleScopedView.Case
          when={['tenant-user', 'referral-user', 'event-organiser']}
        >
          <div data-testid="group-role-tenant-view">
            <div className="mb-5">
              <StandardSearchForm />
            </div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Groups you might like
              <span className="ms-2 text-[11px] font-normal text-slate-400 normal-case tracking-normal">
                {MOCK_GROUPS.length} groups matching your activity
              </span>
            </h2>
            <ul data-testid="group-tenant-list" className="space-y-3">
              {MOCK_GROUPS.map((g) => {
                const activity = groupActivityState(g.postsPerWeek);
                const typeInfo = GROUP_TYPE_LABEL[g.groupType];
                const canJoinDirectly = g.groupType === 'PUBLIC';
                const canRequest = g.groupType === 'PRIVATE';
                const isInviteOnly = g.groupType === 'INVITE_ONLY';
                const isRequested = requestedGroupId === g.groupId;
                return (
                  <li
                    key={g.groupId}
                    data-testid={`group-tenant-card-${g.groupId}`}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          {g.category}
                        </p>
                        <h3 className="text-base font-semibold text-slate-900 leading-snug">
                          {g.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${typeInfo.chip}`}
                          data-testid={`group-type-${g.groupId}`}
                        >
                          {typeInfo.label}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TIER_BADGE_COLORS[g.tierRequirement]}`}
                          data-testid={`group-tier-${g.groupId}`}
                        >
                          {g.tierRequirement.charAt(0) + g.tierRequirement.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                    {g.description && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">
                        {g.description}
                      </p>
                    )}
                    <footer className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs min-w-0">
                        <span
                          className="inline-flex items-center gap-1.5 text-slate-500"
                          data-testid={`group-members-${g.groupId}`}
                        >
                          <svg
                            aria-hidden="true"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="tabular-nums">
                            {g.memberCount.toLocaleString()} members
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 truncate ${activity.text}`}
                          data-testid={`group-activity-${g.groupId}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-block h-1.5 w-1.5 rounded-full ${activity.dot} ${activity.pulse}`}
                          />
                          <span className="truncate">{activity.label}</span>
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        {isInviteOnly && (
                          <span
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 bg-slate-100"
                            data-testid={`group-invite-only-${g.groupId}`}
                          >
                            By invitation only
                          </span>
                        )}
                        {canJoinDirectly && (
                          <button
                            type="button"
                            onClick={() => setJoinedGroupId(g.groupId)}
                            data-testid={`group-join-${g.groupId}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                          >
                            Join group
                          </button>
                        )}
                        {canRequest && !isRequested && (
                          <button
                            type="button"
                            onClick={() => setRequestedGroupId(g.groupId)}
                            data-testid={`group-request-${g.groupId}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            Request to join
                          </button>
                        )}
                        {canRequest && isRequested && (
                          <span
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200"
                            data-testid={`group-request-sent-${g.groupId}`}
                          >
                            Request sent
                          </span>
                        )}
                      </div>
                    </footer>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Showing a seeded discovery set. Live results override this list when the groups
              index returns matches.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — business-partner / platform-support (search only) */}
        <RoleScopedView.Fallback>
          <StandardSearchForm />
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
