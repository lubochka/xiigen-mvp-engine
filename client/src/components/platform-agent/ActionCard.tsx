/**
 * ActionCard — renders a single proposed AgentAction.
 * Each branch (ADVISE / PROPOSE_EDIT / CREATE_FLOW / APPLY_GLOBAL) gets
 * a distinct visual treatment. A dataset attribute lets tests assert
 * on the action type without scraping text.
 */

import React from 'react';
import type { AgentActionRecord } from '../../hooks/useAgentSession';

interface ActionCardProps {
  action: AgentActionRecord;
}

const TYPE_LABELS: Record<AgentActionRecord['actionType'], string> = {
  ADVISE: 'Advise',
  PROPOSE_EDIT: 'Propose Edit',
  CREATE_FLOW: 'Create Flow',
  APPLY_GLOBAL: 'Apply Global',
};

const TYPE_COLORS: Record<AgentActionRecord['actionType'], string> = {
  ADVISE: 'bg-blue-100 text-blue-800',
  PROPOSE_EDIT: 'bg-amber-100 text-amber-800',
  CREATE_FLOW: 'bg-emerald-100 text-emerald-800',
  APPLY_GLOBAL: 'bg-purple-100 text-purple-800',
};

export function ActionCard({ action }: ActionCardProps): React.ReactElement {
  return (
    <div
      data-testid={`action-card-${action.actionId}`}
      data-action-type={action.actionType}
      className="border rounded-lg p-3 mb-2 bg-white"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${TYPE_COLORS[action.actionType]}`}
        >
          {TYPE_LABELS[action.actionType]}
        </span>
        <span className="text-xs text-gray-500">
          {action.knowledgeScope} · {action.status}
        </span>
      </div>
      <div className="text-sm text-gray-700">
        target: <code>{action.targetTenantId}</code>
      </div>
      {action.draftFlowId && (
        <div className="text-xs text-gray-500 mt-1">draft: {action.draftFlowId}</div>
      )}
    </div>
  );
}
