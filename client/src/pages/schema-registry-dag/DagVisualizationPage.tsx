/**
 * DagVisualizationPage — FLOW-11 T197/T199/T208
 *
 * Role-aware screen (C6 / SK-539): FLOW-11 is engine-internal (3 cells).
 * platform-admin sees the full DAG (with P14-A minHeight fix preserved);
 * platform-support sees the same DAG with a read-only banner; tenant-admin
 * sees a flat list of contracts active in their tenant; all other roles
 * fall through to an access-denied message.
 */
import React from 'react';
import { TopologyViewer } from '../../components/topology/TopologyViewer';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const TENANT_CONTRACTS = [
  { contract: 'marketplace.listing.v2', flow: 'FLOW-08', version: 'v2.1.0', status: 'STABLE', note: '(current)' },
  { contract: 'billing.invoice.v1', flow: 'FLOW-12', version: 'v1.3.0', status: 'STABLE', note: '(current)' },
  { contract: 'events.booking.v1', flow: 'FLOW-09', version: 'v1.0.2', status: 'DEPRECATED', note: '(migrate by May 2026)' },
];

export function DagVisualizationPage() {
  const { role } = useViewerRole();

  const pageTitle =
    role === 'tenant-admin'
      ? 'My Schema Contracts'
      : role === 'platform-support'
        ? 'Schema Registry DAG (Read-Only)'
        : 'Schema Registry DAG';

  const pageSubtitle =
    role === 'tenant-admin'
      ? 'contracts active in your tenant'
      : role === 'platform-support'
        ? 'read-only · support view'
        : 'dependency graph visualization';

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      data-testid="page-dag-visualization"
      data-viewer-role={role}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          background: '#F9FAFB',
          fontSize: 13,
          color: '#374151',
        }}
      >
        <strong>{pageTitle}</strong>
        <span style={{ marginLeft: 8, color: '#9CA3AF' }}>{pageSubtitle}</span>
      </div>

      <RoleScopedView role={role} testIdPrefix="dag-role">
        {/* Branch 1 — platform-admin (full DAG with P14-A fix, unchanged) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="dag-role-platform-admin-view" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* P14-A fix: explicit min-height so ReactFlow measures a non-zero container
                even when the parent route lacks a flex height constraint. */}
            <div style={{ flex: 1, minHeight: 600 }}>
              <TopologyViewer flowId="FLOW-11" />
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — platform-support (same DAG + read-only banner) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="dag-role-support-view" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              data-testid="dag-support-readonly-banner"
              style={{
                padding: '8px 16px',
                background: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
                fontSize: 12,
                color: '#6B7280',
              }}
            >
              Read-only view. DAG editing is not available in support mode.
            </div>
            <div style={{ flex: 1, minHeight: 600 }}>
              <TopologyViewer flowId="FLOW-11" />
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-admin (flat list scoped to tenant) */}
        <RoleScopedView.Case when="tenant-admin">
          <div
            data-testid="dag-role-tenant-admin-view"
            style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
          >
            <p
              data-testid="dag-tenant-note"
              style={{
                padding: '10px 12px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 6,
                color: '#1E3A8A',
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Showing schema contracts active in your tenant. This is read-only.
            </p>
            <table
              data-testid="dag-tenant-contracts"
              style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ textAlign: 'left', background: '#F9FAFB', color: '#374151' }}>
                  <th style={{ padding: 8, fontWeight: 600 }}>Contract</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>Flow</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>Version</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {TENANT_CONTRACTS.map((c, i) => (
                  <tr
                    key={i}
                    data-testid={`dag-tenant-contract-${i}`}
                    style={{ borderTop: '1px solid #E5E7EB' }}
                  >
                    <td style={{ padding: 8, fontFamily: 'monospace', color: '#111827' }}>
                      {c.contract}
                    </td>
                    <td style={{ padding: 8, color: '#6B7280' }}>{c.flow}</td>
                    <td style={{ padding: 8 }}>{c.version}</td>
                    <td
                      data-testid={`dag-tenant-status-${i}`}
                      style={{
                        padding: 8,
                        color: c.status === 'STABLE' ? '#047857' : '#B45309',
                        fontWeight: 600,
                      }}
                    >
                      {c.status} <span style={{ fontWeight: 400, color: '#6B7280' }}>{c.note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a
              href="/schema-submission"
              data-testid="dag-tenant-request"
              style={{
                display: 'inline-block',
                marginTop: 16,
                fontSize: 13,
                color: '#2563EB',
                textDecoration: 'underline',
              }}
            >
              Request schema extension →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — all other roles */}
        <RoleScopedView.Fallback>
          <div
            data-testid="dag-fallback-view"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              fontSize: 14,
            }}
          >
            <p>Schema registry is not available for your current role.</p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
