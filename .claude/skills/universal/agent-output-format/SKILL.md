---
title: Agent Output Format
purpose: Standardize agent-authored reports so they are clear, actionable, and easy to audit.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Agent Output Format

## Purpose
Use this for reviews, handoffs, phase reports, skill indexes, and multi-agent summaries.

## When to Use
Invoke whenever output will be consumed by another agent, reviewer, or future session.

## Actions
- Open with outcome status and the most important evidence.
- Use stable headings and tables when comparing many artifacts.
- Name files and commands exactly.
- Separate facts, decisions, risks, and recommendations.
- Keep language direct and avoid ceremonial framing.

## XIIGen Adaptation
- Use XIIGen-owned terms consistently and only where applicable.
- When reporting conventions, distinguish verified facts from recommendations, such as DataProcessResult<T>, buildSearchFilter/buildSearchFilterFlat, or NestJS provider coverage.

## Avoid
- Do not hide failures in a success summary.
- Do not mix implementation details with review conclusions unless they support a finding.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The report can be read independently and supports follow-up without re-parsing the whole conversation.
