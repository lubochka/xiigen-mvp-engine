/**
 * SchemaRegistryPage — FLOW-11 schema browser.
 * Apollo/Confluent Schema Registry-inspired surface: searchable list of
 * registered schemas with version, status, change type and compatibility
 * indicators. Seeded with representative schemas so the page renders
 * something useful on first load rather than an empty search form.
 */
import React, { useMemo, useState } from 'react';
import { useViewerRole } from '../../hooks/useViewerRole';

interface Schema {
  schemaType: string;
  subject: string;
  version: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'DRAFT';
  changeType: 'ADDITIVE' | 'BREAKING' | 'INITIAL';
  compatibility: 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';
  consumers: number;
  updatedAt: string;
}

const SEED_SCHEMAS: Schema[] = [
  {
    schemaType: 'order.created',
    subject: 'marketplace',
    version: '4.2.0',
    status: 'ACTIVE',
    changeType: 'ADDITIVE',
    compatibility: 'BACKWARD',
    consumers: 12,
    updatedAt: '2026-04-18',
  },
  {
    schemaType: 'user.registered',
    subject: 'identity',
    version: '2.0.1',
    status: 'ACTIVE',
    changeType: 'ADDITIVE',
    compatibility: 'FULL',
    consumers: 18,
    updatedAt: '2026-04-15',
  },
  {
    schemaType: 'payment.initiated',
    subject: 'billing',
    version: '1.3.2',
    status: 'ACTIVE',
    changeType: 'ADDITIVE',
    compatibility: 'BACKWARD',
    consumers: 8,
    updatedAt: '2026-04-12',
  },
  {
    schemaType: 'review.submitted',
    subject: 'reputation',
    version: '0.9.0',
    status: 'DRAFT',
    changeType: 'INITIAL',
    compatibility: 'NONE',
    consumers: 0,
    updatedAt: '2026-04-20',
  },
  {
    schemaType: 'legacy.ticket_v1',
    subject: 'support',
    version: '1.0.0',
    status: 'DEPRECATED',
    changeType: 'BREAKING',
    compatibility: 'NONE',
    consumers: 2,
    updatedAt: '2025-11-02',
  },
];

function StatusBadge({ status }: { status: Schema['status'] }) {
  const tone =
    status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'DRAFT'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
  const label =
    status === 'ACTIVE' ? 'Active' : status === 'DRAFT' ? 'Draft' : 'Deprecated';
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${tone}`}
      data-schema-status={status}
    >
      {label}
    </span>
  );
}

function CompatBadge({ compat }: { compat: Schema['compatibility'] }) {
  const tone =
    compat === 'FULL' || compat === 'BACKWARD'
      ? 'text-emerald-700'
      : compat === 'FORWARD'
        ? 'text-amber-700'
        : 'text-red-700';
  const label =
    compat === 'BACKWARD'
      ? 'Backward-compatible'
      : compat === 'FORWARD'
        ? 'Forward-compatible'
        : compat === 'FULL'
          ? 'Fully compatible'
          : 'Breaking';
  return <span className={`text-xs font-medium ${tone}`}>{label}</span>;
}

export function SchemaRegistryPage() {
  const { role } = useViewerRole();
  const [searchType, setSearchType] = useState('');

  const filtered = useMemo(() => {
    const q = searchType.trim().toLowerCase();
    // V-R15 Wave 2 Fix #1: tenant-admin gets a tenant-scoped filter.
    // Until tenant_id is threaded through to the registry, tenant-admin
    // sees ACTIVE schemas only (drafts+deprecated are platform-internal)
    // and the subtitle explicitly notes this is the global schema catalog.
    const base =
      role === 'tenant-admin'
        ? SEED_SCHEMAS.filter((s) => s.status === 'ACTIVE')
        : SEED_SCHEMAS;
    if (!q) return base;
    return base.filter(
      (s) =>
        s.schemaType.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q),
    );
  }, [searchType, role]);

  const tally = useMemo(() => {
    const active = SEED_SCHEMAS.filter((s) => s.status === 'ACTIVE').length;
    const draft = SEED_SCHEMAS.filter((s) => s.status === 'DRAFT').length;
    const deprecated = SEED_SCHEMAS.filter((s) => s.status === 'DEPRECATED').length;
    return { active, draft, deprecated };
  }, []);

  // V-R15 Wave 2 Fix #1: role-branched chrome + controls.
  // Previously all 3 roles rendered identical content. Now:
  //   platform-admin    → full registry with Register button
  //   platform-support  → same registry + lock banner + Escalate (no register)
  //   tenant-admin      → filtered-to-ACTIVE registry + tenant-scope subtitle
  const isSupport = role === 'platform-support';
  const isTenantAdmin = role === 'tenant-admin';

  return (
    <div
      className="p-6 max-w-5xl"
      data-testid="page-schema-registry"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Schema Registry</h1>
      <p className="text-gray-600 mb-4">
        {isTenantAdmin
          ? 'Browse the shared event-schema catalog. New registrations and deprecations are managed by platform administrators.'
          : 'Browse, search, and open details of every data schema registered on the platform.'}
      </p>

      {isSupport && (
        <div
          data-testid="schema-support-lock"
          className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
        >
          <span className="mr-1" aria-hidden="true">🔒</span>
          Schema Registry — read-only for support access. Controls are disabled.
          <a href="/platform/admin/escalate" className="ml-2 text-blue-600 hover:underline">
            Escalate to platform-admin →
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
        <span>
          <span className="uppercase tracking-wider text-slate-400 mr-1.5">Active</span>
          <span className="tabular-nums font-semibold text-emerald-700">{tally.active}</span>
        </span>
        <span>
          <span className="uppercase tracking-wider text-slate-400 mr-1.5">Draft</span>
          <span className="tabular-nums font-semibold text-blue-700">{tally.draft}</span>
        </span>
        <span>
          <span className="uppercase tracking-wider text-slate-400 mr-1.5">Deprecated</span>
          <span className="tabular-nums font-semibold text-slate-700">{tally.deprecated}</span>
        </span>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex gap-3 mb-5 flex-wrap"
        data-testid="schema-search-form"
      >
        <input
          type="text"
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          placeholder="Search by schema type, subject, or status..."
          className="border border-gray-300 rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="schema-type-input"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 min-h-[44px]"
          data-testid="search-button"
        >
          Search
        </button>
        {!isSupport && !isTenantAdmin && (
          <a
            href="/schema-registry/submit"
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 min-h-[44px] inline-flex items-center"
            data-testid="schema-register-btn"
          >
            + Register schema
          </a>
        )}
      </form>

      <ul className="space-y-3" data-testid="schema-list">
        {filtered.length === 0 ? (
          <li className="p-6 border border-dashed border-gray-300 rounded bg-white text-center text-sm text-gray-500">
            No schemas match &ldquo;{searchType}&rdquo;. Try a different keyword.
          </li>
        ) : (
          filtered.map((s) => (
            <li
              key={`${s.subject}-${s.schemaType}`}
              className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow"
              data-testid="schema-item"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                      {s.subject}
                    </span>
                    <span className="text-gray-300">&middot;</span>
                    <span className="text-xs font-mono text-gray-600">v{s.version}</span>
                  </div>
                  <div className="font-semibold text-gray-900">{s.schemaType}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <CompatBadge compat={s.compatibility} />
                    <span>{s.consumers} consumers</span>
                    <span>Updated {s.updatedAt}</span>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
