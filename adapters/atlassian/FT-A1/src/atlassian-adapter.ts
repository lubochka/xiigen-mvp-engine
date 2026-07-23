// FT-A1 — Atlassian Jira AI Issue Enhancer — Layer 3: STACK_COUPLED

import type {
  JiraIssue, SharedIssueElement, SharedIssueStyle,
  IssueReadResult, IssueEnhancedOutput, IssueWriteResult,
} from './types';

const ISSUE_TYPE_MAP: Record<JiraIssue['issueType'], SharedIssueElement['type']> = {
  Bug: 'BUG', Story: 'STORY', Task: 'TASK', Epic: 'EPIC', 'Sub-task': 'SUBTASK',
};

const PRIORITY_MAP: Record<JiraIssue['priority'], SharedIssueStyle['priority']> = {
  Highest: 'CRITICAL', High: 'HIGH', Medium: 'MEDIUM', Low: 'LOW', Lowest: 'LOW',
};

const STATUS_MAP: Record<JiraIssue['status'], SharedIssueStyle['status']> = {
  'To Do': 'TODO', 'In Progress': 'IN_PROGRESS', 'In Review': 'IN_REVIEW', Done: 'DONE',
};

export function mapJiraToIssueElement(issue: JiraIssue): SharedIssueElement {
  return {
    type: ISSUE_TYPE_MAP[issue.issueType],
    key: issue.key,
    summary: issue.summary,
    description: issue.description,
    assignee: issue.assignee?.displayName,
  };
}

export function mapJiraToIssueStyle(issue: JiraIssue): SharedIssueStyle {
  return {
    priority: PRIORITY_MAP[issue.priority],
    status: STATUS_MAP[issue.status],
    issueType: ISSUE_TYPE_MAP[issue.issueType],
  };
}

export function mapIssueStyleToJira(style: SharedIssueStyle): Partial<JiraIssue> {
  const PRIORITY_BACK: Record<SharedIssueStyle['priority'], JiraIssue['priority']> = {
    CRITICAL: 'Highest', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
  };
  const STATUS_BACK: Record<SharedIssueStyle['status'], JiraIssue['status']> = {
    TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done',
  };
  return { priority: PRIORITY_BACK[style.priority], status: STATUS_BACK[style.status] };
}

export function readJiraIssues(issues: JiraIssue[]): IssueReadResult {
  return {
    elements: issues.map(mapJiraToIssueElement),
    styles: issues.map(mapJiraToIssueStyle),
    sourceIssues: issues,
  };
}

export async function writeEnhancedIssues(
  outputs: IssueEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<IssueWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapIssueStyleToJira(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'ISSUE_UPDATE',
        key: output.element.key,
        summary: output.element.summary,
        description: output.generatedDescription,
        issueType: output.style.issueType,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
