/**
 * CiValidator — parses GitHub Actions workflow YAML and validates structure.
 *
 * Uses line-based parsing (no YAML library dependency).
 * Validates triggers, jobs, steps, caching, node setup.
 *
 * Phase 13.5.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class CiValidator {
  /**
   * Check if a trigger event is configured (push, pull_request, etc.).
   */
  hasTrigger(content: string, event: string): boolean {
    // Match "on:" section with the event
    const regex = new RegExp(`^\\s{2}${event}:`, 'm');
    // Also match inline form: "on: [push, pull_request]"
    const inlineRegex = new RegExp(`on:\\s*\\[.*${event}.*\\]`, 'm');
    return regex.test(content) || inlineRegex.test(content);
  }

  /**
   * Check if a job is defined.
   */
  hasJob(content: string, jobName: string): boolean {
    const regex = new RegExp(`^\\s{2}${jobName}:`, 'm');
    return regex.test(content);
  }

  /**
   * Check if a job contains a step with a specific name.
   */
  hasStep(content: string, jobName: string, stepName: string): boolean {
    const jobBlock = this.extractJobBlock(content, jobName);
    if (!jobBlock) return false;
    // Steps have "- name: <stepName>"
    const regex = new RegExp(`-\\s+name:\\s*${this.escapeRegex(stepName)}`, 'i');
    return regex.test(jobBlock);
  }

  /**
   * Check if a job uses actions/cache.
   */
  usesCache(content: string, jobName: string): boolean {
    const jobBlock = this.extractJobBlock(content, jobName);
    if (!jobBlock) return false;
    return /actions\/cache@/.test(jobBlock);
  }

  /**
   * Check if a job sets up Node.js with a specific version.
   */
  hasNodeSetup(content: string, jobName: string, version: string): boolean {
    const jobBlock = this.extractJobBlock(content, jobName);
    if (!jobBlock) return false;
    return /actions\/setup-node@/.test(jobBlock) && jobBlock.includes(version);
  }

  /**
   * Check if a job runs a specific npm command.
   */
  hasNpmCommand(content: string, jobName: string, command: string): boolean {
    const jobBlock = this.extractJobBlock(content, jobName);
    if (!jobBlock) return false;
    return jobBlock.includes(`npm ${command}`) || jobBlock.includes(`npm run ${command}`);
  }

  /**
   * Check if a job has a needs dependency on other jobs.
   */
  hasNeeds(content: string, jobName: string, dependency: string): boolean {
    const jobBlock = this.extractJobBlock(content, jobName);
    if (!jobBlock) return false;
    return jobBlock.includes('needs') && jobBlock.includes(dependency);
  }

  /**
   * Check if the workflow has a name.
   */
  hasWorkflowName(content: string): boolean {
    return /^name:/m.test(content);
  }

  /**
   * Check the runs-on value for a job.
   */
  hasRunsOn(content: string, jobName: string, runner: string): boolean {
    const jobBlock = this.extractJobBlock(content, jobName);
    if (!jobBlock) return false;
    return jobBlock.includes(`runs-on: ${runner}`);
  }

  // ── Internal ──────────────────────────────────────

  private extractJobBlock(content: string, jobName: string): string | null {
    const lines = content.split('\n');
    const jobRegex = new RegExp(`^\\s{2}${jobName}:`);
    let startIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (jobRegex.test(lines[i])) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) return null;

    const blockLines = [lines[startIdx]];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      // Stop at next job (2-space indent + word + colon, not deeper indented)
      if (/^\s{2}\w[\w-]*:/.test(line) && !/^\s{4}/.test(line)) break;
      blockLines.push(line);
    }

    return blockLines.join('\n');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
