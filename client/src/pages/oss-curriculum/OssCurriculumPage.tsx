/**
 * OssCurriculumPage — FLOW-39 admin console for OSS Curriculum.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-oss-curriculum
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - Plan states: CURRICULUM_QUEUED → LESSON_GENERATING → LESSON_READY → PUBLISHED
 *   - Server enums:
 *       curriculum-progress-tracker.service.ts → 'ACTIVE' | 'DEFERRED' | 'PLATEAU_DETECTED' | 'IMPROVING'
 *       shadow-run-orchestrator.service.ts      → 'PENDING'
 *       learning-signal-collector.service.ts    → 'IMPROVING' | 'DECLINING' | 'STATIC' (gradeTrend)
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import {
  OssCurriculumScreen,
  type TierAssignmentItem,
  type ShadowRunItem,
} from '../../components/oss-curriculum/OssCurriculumScreen';
import { useViewerRole } from '../../hooks/useViewerRole';

// Platform-admin seed: curriculum tier assignments covering all 5 tiers.
// Reference: LangSmith curriculum view + W&B experiments (NOT Khan Academy).
const PLATFORM_TIER_ASSIGNMENTS: TierAssignmentItem[] = [
  { dpoTripleId: 'DPO-2026-0420-011', curriculumTier: 1 }, // ROUTING
  { dpoTripleId: 'DPO-2026-0420-012', curriculumTier: 1 },
  { dpoTripleId: 'DPO-2026-0420-013', curriculumTier: 2 }, // DATA_PIPELINE
  { dpoTripleId: 'DPO-2026-0420-014', curriculumTier: 3 }, // PROCESSING
  { dpoTripleId: 'DPO-2026-0420-015', curriculumTier: 3 },
  { dpoTripleId: 'DPO-2026-0420-016', curriculumTier: 4 }, // ORCHESTRATION
  { dpoTripleId: 'DPO-2026-0420-017', curriculumTier: 5 }, // SCHEDULED
];

// Platform-admin seed: recent shadow runs across llama3/codellama/deepseek models.
const PLATFORM_SHADOW_RUNS: ShadowRunItem[] = [
  {
    shadowRunId: 'SHD-2026-0420-001',
    ossModel: 'llama3:8b',
    cycleId: 'CYC-2026-0420-002',
    status: 'COMPLETE',
    grade: 0.82,
  },
  {
    shadowRunId: 'SHD-2026-0420-002',
    ossModel: 'codellama:13b',
    cycleId: 'CYC-2026-0420-004',
    status: 'COMPLETE',
    grade: 0.76,
  },
  {
    shadowRunId: 'SHD-2026-0420-003',
    ossModel: 'deepseek-coder:6.7b',
    cycleId: 'CYC-2026-0420-006',
    status: 'PENDING',
    grade: null,
  },
  {
    shadowRunId: 'SHD-2026-0420-004',
    ossModel: 'llama3:8b',
    cycleId: 'CYC-2026-0420-003',
    status: 'COMPLETE',
    grade: 0.61,
  },
];

const SAMPLE_COURSES = [
  {
    id: 'CRS-flow-design-101',
    title: 'Flow Design Fundamentals',
    description: 'Learn to design automation flows from scratch using XIIGen patterns.',
    duration: '4 hours',
    lessons: 12,
    level: 'Beginner',
    enrollees: 1247,
    rating: 4.8,
  },
  {
    id: 'CRS-prompt-engineering',
    title: 'Prompt Engineering for Workflows',
    description: 'Master prompt patterns that improve AI node performance.',
    duration: '3 hours',
    lessons: 9,
    level: 'Intermediate',
    enrollees: 823,
    rating: 4.9,
  },
  {
    id: 'CRS-multi-tenant-arch',
    title: 'Multi-Tenant Architecture',
    description: 'Understand tenant isolation, schema contracts, and deployment patterns.',
    duration: '6 hours',
    lessons: 18,
    level: 'Advanced',
    enrollees: 412,
    rating: 4.7,
  },
];

const MOCK_STATES: Record<string, BusinessState> = {
  'curriculum-queued': {
    idx: 1,
    label: 'Curriculum item queued — tier assignment pending',
    status: 'QUEUED',
    fields: {
      dpoTripleId: 'DPO-2026-0419-004',
      archetype: 'planner-reflection',
      ossModel: 'llama-3-8b-instruct',
      queuedAt: '2026-04-19 12:00',
    },
  },
  'lesson-generating': {
    idx: 2,
    label: 'Shadow run in progress — OSS model producing candidate lesson',
    status: 'GENERATING',
    fields: {
      shadowRunId: 'SHD-2026-0419-001',
      dpoTripleId: 'DPO-2026-0419-004',
      ossModel: 'llama-3-8b-instruct',
      startedAt: '2026-04-19 12:02',
    },
  },
  'lesson-ready': {
    idx: 3,
    label: 'Lesson ready — signals collected, grade trend IMPROVING',
    status: 'READY',
    fields: {
      shadowRunId: 'SHD-2026-0419-001',
      gradeTrend: 'IMPROVING',
      signalCount: '8',
      readyAt: '2026-04-19 12:08',
    },
  },
  published: {
    idx: 4,
    label: 'Curriculum tier published — progression recorded as ACTIVE',
    status: 'PUBLISHED',
    fields: {
      dpoTripleId: 'DPO-2026-0419-004',
      tierAssigned: 'TIER-2',
      progressStatus: 'ACTIVE',
      publishedAt: '2026-04-19 12:10',
    },
  },
  'plateau-detected': {
    idx: 5,
    label: 'Learner plateau detected — pre-seeding recommended',
    status: 'ESCALATED',
    fields: {
      dpoTripleId: 'DPO-2026-0419-005',
      progressStatus: 'PLATEAU_DETECTED',
      recommendation: 'PRE_SEEDING_RECOMMENDED',
      detectedAt: '2026-04-19 12:12',
    },
  },
  'lesson-deferred': {
    idx: 6,
    label: 'Lesson deferred — insufficient learning signals for grading',
    status: 'DEGRADED',
    fields: {
      dpoTripleId: 'DPO-2026-0419-006',
      progressStatus: 'DEFERRED',
      reason: 'Grade trend STATIC across 3 runs',
      deferredAt: '2026-04-19 12:15',
    },
  },
  'shadow-pending': {
    idx: 7,
    label: 'Shadow run queued — awaiting scheduler pickup',
    status: 'PENDING',
    fields: {
      shadowRunId: 'SHD-2026-0419-002',
      winningNodeId: 'NODE-912',
      cycleId: 'CYC-2026-0419-007',
      queuedAt: '2026-04-19 12:16',
    },
  },
};

export function OssCurriculumPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const ldManager = searchParams.get('ld-manager') === 'true';

  // Path A: mock states — UNCHANGED
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="oss-curriculum"
        flowId="FLOW-39"
        title="OSS Curriculum"
        state={MOCK_STATES[mockState]}
        description="Admin view of OSS-model curriculum: queue, shadow-run generation, grading, tier publication, and plateau handling."
      />
    );
  }

  // Path B: role-aware — public-content cluster
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="oss-role">
        {/* Branch 1 — anonymous + public-mkt (public course catalogue, zero platform chrome) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <main data-testid="oss-role-public-view" className="max-w-3xl mx-auto py-8 px-4">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">OSS Learning Curriculum</h1>
              <p className="text-gray-600">
                Free, community-built courses for building with XIIGen.
              </p>
            </header>
            <section data-testid="oss-public-catalogue" aria-label="Course catalogue">
              {SAMPLE_COURSES.map((course, idx) => (
                <article
                  key={course.id}
                  data-testid={`oss-public-course-${idx}`}
                  className="mb-4 p-5 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>{course.duration}</span>
                        <span>·</span>
                        <span>{course.lessons} lessons</span>
                        <span>·</span>
                        <span data-testid={`oss-public-level-${idx}`}>{course.level}</span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-xs text-gray-400">
                        <span aria-label={`${course.rating} out of 5 stars`}>
                          ★ {course.rating}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {course.enrollees.toLocaleString()} enrolled
                      </p>
                    </div>
                  </div>
                  <a
                    href="/register"
                    data-testid={`oss-public-enrol-${idx}`}
                    className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    style={{ minHeight: '44px' }}
                  >
                    Enrol free →
                  </a>
                </article>
              ))}
            </section>
            <div
              data-testid="oss-public-signin-note"
              className="mt-6 text-center text-sm text-gray-500"
            >
              <a
                href="/login"
                data-testid="oss-public-signin"
                className="text-blue-600 hover:underline"
              >
                Sign in
              </a>{' '}
              to track your progress and earn certificates.
            </div>
          </main>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-user (authenticated learner) */}
        <RoleScopedView.Case when="tenant-user">
          <div data-testid="oss-role-learner-view" className="max-w-3xl mx-auto py-6 px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Learning</h1>

            <section
              data-testid="oss-learner-enrolled"
              aria-label="My enrolled courses"
              className="mb-8"
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-4">In Progress</h2>

              <div
                data-testid="oss-learner-course-0"
                className="mb-3 p-4 rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    Flow Design Fundamentals
                  </span>
                  <span data-testid="oss-learner-progress-0" className="text-xs text-gray-500">
                    75%
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-2"
                  role="progressbar"
                  aria-valuenow={75}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Flow Design Fundamentals progress"
                >
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">9 of 12 lessons complete</p>
                <a
                  href={`/curriculum/${SAMPLE_COURSES[0].id}`}
                  data-testid="oss-learner-continue-0"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Continue →
                </a>
              </div>

              <div
                data-testid="oss-learner-course-1"
                className="mb-3 p-4 rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    Prompt Engineering for Workflows
                  </span>
                  <span data-testid="oss-learner-progress-1" className="text-xs text-gray-500">
                    33%
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-2"
                  role="progressbar"
                  aria-valuenow={33}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Prompt Engineering for Workflows progress"
                >
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '33%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">3 of 9 lessons complete</p>
                <a
                  href={`/curriculum/${SAMPLE_COURSES[1].id}`}
                  data-testid="oss-learner-continue-1"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Continue →
                </a>
              </div>
            </section>

            <section
              data-testid="oss-learner-certificates"
              aria-label="My certificates"
              className="mb-6"
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Completed</h2>
              <div
                data-testid="oss-learner-cert-0"
                className="p-4 rounded-lg bg-green-50 border border-green-200"
              >
                <p className="text-sm font-medium text-green-800">
                  ✓ Multi-Tenant Architecture — Certificate earned
                </p>
                <a
                  href="/curriculum/certificate/download"
                  data-testid="oss-learner-cert-download"
                  className="mt-1 inline-block text-xs text-green-700 hover:underline"
                >
                  Download certificate →
                </a>
              </div>
            </section>

            <section data-testid="oss-learner-discover">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Discover More</h2>
              {SAMPLE_COURSES.map((course, idx) => (
                <div
                  key={course.id}
                  data-testid={`oss-learner-discover-${idx}`}
                  className="mb-2 flex items-center justify-between p-3 rounded border border-gray-200"
                >
                  <span className="text-sm text-gray-700">{course.title}</span>
                  <a
                    href={`/curriculum/${course.id}`}
                    data-testid={`oss-learner-enrol-${idx}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Enrol →
                  </a>
                </div>
              ))}
            </section>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-admin (L&D admin) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="oss-role-admin-view" className="max-w-4xl mx-auto p-4">
            <div
              data-testid="oss-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              L&amp;D admin — manage curriculum settings and learner progress.
            </div>
            {/* RUN-110: tenant-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="oss-admin-active-learners">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active learners
                </span>
                <span className="tabular-nums font-semibold text-slate-900">284</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="oss-admin-completions">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Completions (this month)
                </span>
                <span className="tabular-nums font-semibold text-emerald-700">67</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="oss-admin-avg-progress">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Average progress
                </span>
                <span className="tabular-nums font-semibold text-slate-900">58%</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table data-testid="oss-admin-table" className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">User</th>
                    <th className="p-2 font-medium">Course</th>
                    <th className="p-2 font-medium">Progress</th>
                    <th className="p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      u: 'user-alice',
                      c: 'Flow Design',
                      p: '75%',
                      st: 'On track',
                      color: 'text-green-700',
                    },
                    {
                      u: 'user-bob',
                      c: 'Prompt Engineering',
                      p: '33%',
                      st: 'Behind',
                      color: 'text-amber-700',
                    },
                    {
                      u: 'user-carol',
                      c: 'Multi-Tenant Arch',
                      p: '100%',
                      st: 'Complete',
                      color: 'text-blue-700',
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      data-testid={`oss-admin-learner-${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2 font-mono text-xs">{row.u}</td>
                      <td className="p-2">{row.c}</td>
                      <td className="p-2 font-medium">{row.p}</td>
                      <td className={`p-2 font-medium ${row.color}`}>
                        <span aria-hidden="true">●</span> {row.st}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <a
              href="/admin/curriculum/settings"
              data-testid="oss-admin-settings"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Curriculum settings →
            </a>

            {ldManager && (
              <div
                data-testid="oss-admin-org-analytics"
                className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded"
              >
                <p className="text-sm font-medium text-orange-900 mb-2">Org-level analytics</p>
                <p data-testid="oss-admin-org-completion-rate" className="text-xs text-orange-700">
                  Org completion rate: 42% · Industry avg: 38%
                </p>
              </div>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — platform-admin (curriculum publishing + community curation) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="oss-role-platform-view">
            <div
              data-testid="oss-platform-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform admin — OSS curriculum publishing and quality curation.
            </div>
            {/* RUN-110: platform-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="oss-platform-published">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Curriculum modules published
                </span>
                <span className="tabular-nums font-semibold text-slate-900">142</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="oss-platform-pending">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Community submissions pending
                </span>
                <span className="tabular-nums font-semibold text-amber-700">8</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="oss-platform-grade-trend">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Shadow run grade trend
                </span>
                <span className="tabular-nums font-semibold text-emerald-700">87%</span>
                <span className="ml-1 text-emerald-700 text-[11px]">improving</span>
              </span>
            </div>
            {/*
              CFI-05 close: render the purpose-built OssCurriculumScreen
              instead of AdminCrudPanel. This shows curriculum tier
              assignments (T1 ROUTING .. T5 SCHEDULED) + recent shadow runs
              (llama3/codellama/deepseek-coder grading). Reference: LangSmith
              curriculum view + W&B experiments (NOT Khan Academy).
            */}
            <div className="p-4" data-testid="oss-platform-curriculum-screen">
              <OssCurriculumScreen
                tierAssignments={PLATFORM_TIER_ASSIGNMENTS}
                shadowRuns={PLATFORM_SHADOW_RUNS}
              />
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-support (V-R12-A2: read-only curriculum inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="oss-role-platform-support-view">
            <div
              data-testid="oss-support-readonly-banner"
              role="note"
              className="mx-4 mt-4 mb-3 p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <span aria-hidden="true" className="mt-0.5 flex-shrink-0">🔒</span>
              <span>
                <span className="font-semibold">OSS Curriculum</span> — read-only for support
                access. Controls are disabled. Escalate to a platform-admin for any change.
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="oss-support-published">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Curriculum modules published
                </span>
                <span className="tabular-nums font-semibold text-slate-900">142</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="oss-support-pending">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Community submissions pending
                </span>
                <span className="tabular-nums font-semibold text-amber-700">8</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="oss-support-grade-trend">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Shadow run grade trend
                </span>
                <span className="tabular-nums font-semibold text-emerald-700">87%</span>
                <span className="ml-1 text-emerald-700 text-[11px]">improving</span>
              </span>
            </div>
            {/* Disabled fieldset wraps the same OssCurriculumScreen the admin sees. */}
            <fieldset
              data-testid="oss-support-readonly-screen"
              disabled
              aria-disabled="true"
              aria-label="OSS curriculum (read-only)"
              className="m-0 p-0 border-0 opacity-75"
              style={{ pointerEvents: 'none' }}
            >
              <div className="p-4">
                <OssCurriculumScreen
                  tierAssignments={PLATFORM_TIER_ASSIGNMENTS}
                  shadowRuns={PLATFORM_SHADOW_RUNS}
                />
              </div>
            </fieldset>
            <div className="mx-4 mb-4">
              <a
                href="/support/escalate?topic=oss-curriculum"
                data-testid="oss-support-escalate"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                style={{ minHeight: '44px' }}
              >
                Escalate to platform-admin →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — contributor (freelancer/business-partner) + others */}
        <RoleScopedView.Fallback>
          {role === 'freelancer' || role === 'business-partner' ? (
            <div data-testid="oss-contributor-view" className="max-w-3xl mx-auto py-6 px-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">OSS Curriculum</h1>
              <div
                data-testid="oss-contributor-banner"
                className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
              >
                You can contribute curriculum modules.{' '}
                <a
                  href="/curriculum/contribute"
                  data-testid="oss-contributor-submit"
                  className="text-purple-700 hover:underline font-medium"
                >
                  Submit a module →
                </a>
              </div>
              <div data-testid="oss-contributor-courses">
                {SAMPLE_COURSES.map((course, idx) => (
                  <div
                    key={course.id}
                    data-testid={`oss-contributor-course-${idx}`}
                    className="mb-3 p-4 rounded border border-gray-200"
                  >
                    <p className="text-sm font-medium text-gray-800">{course.title}</p>
                    <a
                      href={`/curriculum/${course.id}`}
                      data-testid={`oss-contributor-enrol-${idx}`}
                      className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                      Take this course →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div data-testid="oss-fallback-view" className="p-4 text-sm text-gray-400">
              OSS curriculum is not available for your current role.
            </div>
          )}
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
