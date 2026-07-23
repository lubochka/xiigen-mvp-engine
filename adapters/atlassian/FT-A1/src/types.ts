// FT-A1 — Atlassian Jira AI Issue Enhancer (UTILITY family)
// Platform: Atlassian Marketplace (Jira Cloud). A prefix per master plan.

export interface JiraIssue {
  id: string;
  key: string;
  issueType: 'Bug' | 'Story' | 'Task' | 'Epic' | 'Sub-task';
  summary: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'In Review';
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  assignee?: { displayName: string };
  storyPoints?: number;
}

export interface SharedIssueElement {
  type: 'BUG' | 'STORY' | 'TASK' | 'EPIC' | 'SUBTASK';
  key: string;
  summary: string;
  description?: string;
  assignee?: string;
}

export interface SharedIssueStyle {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  issueType: 'BUG' | 'STORY' | 'TASK' | 'EPIC' | 'SUBTASK';
}

export interface IssueEnhancedOutput {
  element: SharedIssueElement;
  style: SharedIssueStyle;
  generatedDescription: string;
}

export interface IssueReadResult {
  elements: SharedIssueElement[];
  styles: SharedIssueStyle[];
  sourceIssues: JiraIssue[];
}

export interface IssueWriteResult {
  written: number;
  failed: number;
}
