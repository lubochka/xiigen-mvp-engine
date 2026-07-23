/**
 * DockerRegistryService - concrete IDockerRegistryService.
 *
 * Phase C12 per tenant CI/CD guidance.
 *
 * Implements the Docker Registry HTTP API V2 ping (`GET /v2/`) for the
 * connection-health preflight. Native `fetch` only - no Docker SDK dependency.
 * Registries such as GHCR require exchanging a GitHub token for a registry
 * bearer token before `/v2/` accepts it; that negotiation stays in this fabric.
 *
 * Rule 1 boundary: Docker protocol details live only in this file.
 * Handlers inject `IDockerRegistryService` and receive `DataProcessResult`.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../kernel/microservice-base';
import {
  DockerCheckConnectionParams,
  DockerCheckConnectionResult,
  IDockerRegistryService,
} from '../interfaces/docker-registry.fabric.interface';

@Injectable()
export class DockerRegistryService
  extends MicroserviceBase
  implements IDockerRegistryService
{
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'fabric.docker.registry',
        serviceName: 'DockerRegistryService',
        flowId: 'FLOW-47',
      }),
    });
  }

  async checkConnection(
    params: DockerCheckConnectionParams,
  ): Promise<DataProcessResult<DockerCheckConnectionResult>> {
    const { registryUrl, token } = params;
    if (!registryUrl) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'registryUrl required',
      );
    }

    const baseUrl = this.normalizeRegistryUrl(registryUrl);
    const pingUrl = `${baseUrl}/v2/`;
    const start = Date.now();

    try {
      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: this.buildPingHeaders(token),
      });
      const latencyMs = Date.now() - start;

      if (response.status === 200) {
        return DataProcessResult.success({
          reachable: true,
          authenticated: true,
          authChallenge: '',
          latencyMs,
        });
      }

      if (token && (response.status === 401 || response.status === 403)) {
        const challenge = response.headers.get('www-authenticate') ?? '';
        const exchangeResult = await this.exchangeRegistryToken({
          baseUrl,
          challenge,
          token,
        });

        if (exchangeResult.isSuccess && exchangeResult.data) {
          const retry = await fetch(pingUrl, {
            method: 'GET',
            headers: this.buildPingHeaders(exchangeResult.data),
          });
          const retryLatencyMs = Date.now() - start;

          if (retry.status === 200) {
            return DataProcessResult.success({
              reachable: true,
              authenticated: true,
              authChallenge: challenge,
              latencyMs: retryLatencyMs,
            });
          }

          return DataProcessResult.failure(
            'DOCKER_AUTH_FAILED',
            `Docker registry ${baseUrl} rejected exchanged registry token: ` +
              `${retry.status} ${retry.statusText}`,
            {
              reachable: true,
              authenticated: false,
              authChallenge: challenge,
              latencyMs: retryLatencyMs,
            },
          );
        }

        return DataProcessResult.failure(
          'DOCKER_AUTH_FAILED',
          exchangeResult.errorMessage ??
            `Docker registry ${baseUrl} rejected the supplied token.`,
          {
            reachable: true,
            authenticated: false,
            authChallenge: challenge,
            latencyMs,
          },
        );
      }

      return DataProcessResult.failure(
        'DOCKER_UNREACHABLE',
        `Docker registry ${baseUrl} returned ${response.status} ${response.statusText}`,
        {
          reachable: false,
          authenticated: false,
          authChallenge: '',
          latencyMs,
        },
      );
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('DOCKER_UNREACHABLE', e.message, e);
    }
  }

  private buildPingHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async exchangeRegistryToken(params: {
    baseUrl: string;
    challenge: string;
    token: string;
  }): Promise<DataProcessResult<string>> {
    const { baseUrl, challenge, token } = params;
    const parsedBase = new URL(baseUrl);
    const parsedChallenge = this.parseBearerChallenge(challenge);
    const realm = parsedChallenge['realm'] ?? `${baseUrl}/token`;
    const service = parsedChallenge['service'] ?? parsedBase.hostname;
    const scope = parsedChallenge['scope'];
    const exchangeUrl = new URL(realm);

    if (service) exchangeUrl.searchParams.set('service', service);
    if (scope) exchangeUrl.searchParams.set('scope', scope);

    const basic = Buffer.from(`xiigen:${token}`, 'utf-8').toString('base64');
    const response = await fetch(exchangeUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${basic}`,
      },
    });

    if (!response.ok) {
      return DataProcessResult.failure(
        'DOCKER_AUTH_FAILED',
        `Docker registry token exchange failed: ${response.status} ${response.statusText}`,
      );
    }

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const exchangedToken = body['token'] ?? body['access_token'];
    if (typeof exchangedToken !== 'string' || exchangedToken.length === 0) {
      return DataProcessResult.failure(
        'DOCKER_AUTH_FAILED',
        'Docker registry token exchange returned no token',
      );
    }

    return DataProcessResult.success(exchangedToken);
  }

  private normalizeRegistryUrl(raw: string): string {
    let url = raw.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url;
  }

  private parseBearerChallenge(challenge: string): Record<string, string> {
    const result: Record<string, string> = {};
    const body = challenge.replace(/^Bearer\s+/i, '');
    const matcher = /([a-zA-Z]+)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(body)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  }
}
