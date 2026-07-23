/**
 * ComposeValidator — parses docker-compose YAML content and validates structure.
 *
 * Uses line-based parsing (no YAML library dependency).
 * Validates services, health checks, ports, depends_on, networks, environment.
 *
 * Also validates .env.example files.
 *
 * Phase 13.4.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class ComposeValidator {
  /**
   * Check if a service is defined in docker-compose.
   */
  hasService(content: string, serviceName: string): boolean {
    // Look for service name under 'services:' section
    const regex = new RegExp(`^\\s{2}${serviceName}:`, 'm');
    return regex.test(content);
  }

  /**
   * Check if a service has a healthcheck defined.
   */
  hasHealthCheck(content: string, serviceName: string): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    return /healthcheck:/.test(serviceBlock);
  }

  /**
   * Check if a service has depends_on for a specific dependency.
   */
  hasDependsOn(content: string, serviceName: string, dependency: string): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    return serviceBlock.includes('depends_on') && serviceBlock.includes(dependency);
  }

  /**
   * Check if a service has a port mapping containing a specific port.
   */
  hasPort(content: string, serviceName: string, port: number): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    const portStr = String(port);
    const defaultedEnvPort = new RegExp(`\\$\\{[A-Z0-9_]+:-${portStr}\\}:${portStr}`);
    // Match direct mappings like "3000:3000" and defaulted mappings like "${SERVER_PORT:-3000}:3000".
    return (
      serviceBlock.includes(`"${portStr}:${portStr}"`) ||
      serviceBlock.includes(`'${portStr}:${portStr}'`) ||
      serviceBlock.includes(`${portStr}:${portStr}`) ||
      defaultedEnvPort.test(serviceBlock)
    );
  }

  /**
   * Check if a network is defined.
   */
  hasNetwork(content: string, networkName?: string): boolean {
    if (networkName) {
      const regex = new RegExp(`^\\s{2}${networkName}:`, 'm');
      return content.includes('networks:') && regex.test(content);
    }
    return /^networks:/m.test(content);
  }

  /**
   * Check if a service has environment or env_file configuration.
   */
  hasEnvironment(content: string, serviceName: string): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    return serviceBlock.includes('environment') || serviceBlock.includes('env_file');
  }

  /**
   * Check if a service uses a specific Docker image.
   */
  hasImage(content: string, serviceName: string, imagePart: string): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    return serviceBlock.includes(`image:`) && serviceBlock.includes(imagePart);
  }

  /**
   * Check if a service has a specific profile.
   */
  hasProfile(content: string, serviceName: string, profile: string): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    return serviceBlock.includes('profiles') && serviceBlock.includes(profile);
  }

  /**
   * Check if volumes section is defined.
   */
  hasVolumes(content: string): boolean {
    return /^volumes:/m.test(content);
  }

  /**
   * Check if a service has restart policy.
   */
  hasRestartPolicy(content: string, serviceName: string): boolean {
    const serviceBlock = this.extractServiceBlock(content, serviceName);
    if (!serviceBlock) return false;
    return /restart:/.test(serviceBlock);
  }

  // ── .env Validation ───────────────────────────────

  /**
   * Check if .env file contains a specific variable.
   */
  envHasVariable(content: string, varName: string): boolean {
    const regex = new RegExp(`^${varName}=`, 'm');
    return regex.test(content);
  }

  /**
   * Get the default value of a variable in .env file.
   */
  envGetDefault(content: string, varName: string): string | null {
    const regex = new RegExp(`^${varName}=(.*)$`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  // ── Internal ──────────────────────────────────────

  /**
   * Extract the YAML block for a specific service.
   * Simple heuristic: from "  serviceName:" to the next service or top-level key.
   */
  private extractServiceBlock(content: string, serviceName: string): string | null {
    const lines = content.split('\n');
    const serviceRegex = new RegExp(`^\\s{2}${serviceName}:`);
    let startIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (serviceRegex.test(lines[i])) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) return null;

    // Collect lines until we hit another top-level service (2-space indent) or top-level key (0-indent)
    const blockLines = [lines[startIdx]];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      // Stop at another service definition (exactly 2 spaces + word + colon)
      if (/^\s{2}\w+:/.test(line) && !/^\s{4}/.test(line)) break;
      // Stop at top-level keys (no indent)
      if (/^\w/.test(line)) break;
      blockLines.push(line);
    }

    return blockLines.join('\n');
  }
}
