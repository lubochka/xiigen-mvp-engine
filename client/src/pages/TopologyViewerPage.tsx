/**
 * TopologyViewerPage — renders TopologyViewer for a given flowId.
 *
 * Route: /flow-viewer/:flowId
 * Optional query params:
 *   runId   — passed to TopologyViewer for run state overlays.
 *   version — Turn 3 (MVP Plan v3, Goal 2): select a specific stored version.
 *             Absent → TopologyController returns the latest (PUBLISHED > DRAFT).
 */
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { TopologyViewer } from '../components/topology/TopologyViewer';

export function TopologyViewerPage() {
  const { flowId = '' } = useParams<{ flowId: string }>();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId') ?? undefined;
  const version = searchParams.get('version') ?? undefined;

  return (
    <div style={{ height: '100vh', fontFamily: 'sans-serif' }}>
      <TopologyViewer flowId={flowId} runId={runId} version={version} />
    </div>
  );
}
