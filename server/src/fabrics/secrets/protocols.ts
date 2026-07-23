/**
 * Secrets Fabric — Protocol Interfaces.
 *
 * IAsyncSecretsManagerClient matches the AWS Secrets Manager SDK surface.
 * Tests inject mock objects; real @aws-sdk/client-secrets-manager installed in P13.
 *
 * Same pattern as database/base.ts → IAsyncElasticsearchClient.
 *
 * Phase 5.1: Protocol only. AWSSecretsManagerProvider uses this in P5.2.
 */

// ── AWS Secrets Manager Response Types ───────────────

export interface SmGetSecretValueResult {
  /** ARN of the secret. */
  ARN?: string;
  /** Name of the secret. */
  Name?: string;
  /** Secret version ID. */
  VersionId?: string;
  /** Secret string value. */
  SecretString?: string;
  /** Secret binary value (base64). */
  SecretBinary?: Uint8Array;
  /** Version stages (e.g., AWSCURRENT, AWSPREVIOUS). */
  VersionStages?: string[];
  /** Creation date. */
  CreatedDate?: Date;
}

export interface SmPutSecretValueResult {
  ARN?: string;
  Name?: string;
  VersionId?: string;
  VersionStages?: string[];
}

export interface SmCreateSecretResult {
  ARN?: string;
  Name?: string;
  VersionId?: string;
  ReplicationStatus?: Array<Record<string, unknown>>;
}

export interface SmDeleteSecretResult {
  ARN?: string;
  Name?: string;
  DeletionDate?: Date;
}

export interface SmSecretListEntry {
  ARN?: string;
  Name?: string;
  Description?: string;
  LastChangedDate?: Date;
  LastAccessedDate?: Date;
  Tags?: Array<{ Key?: string; Value?: string }>;
}

export interface SmListSecretsResult {
  SecretList?: SmSecretListEntry[];
  NextToken?: string;
}

// ── Protocol Interface ───────────────────────────────

/**
 * Protocol interface matching AWS Secrets Manager SDK's async API surface.
 * Tests inject mock objects. Real SDK imported only in P13 Docker integration tests.
 *
 * All methods accept params matching the AWS SDK command shapes.
 * Returns matching AWS SDK response shapes (above).
 */
export interface IAsyncSecretsManagerClient {
  /**
   * Retrieve a secret value by name.
   * Maps to GetSecretValueCommand.
   */
  getSecretValue(params: {
    SecretId: string;
    VersionId?: string;
    VersionStage?: string;
  }): Promise<SmGetSecretValueResult>;

  /**
   * Store/update a secret value.
   * Maps to PutSecretValueCommand.
   */
  putSecretValue(params: {
    SecretId: string;
    SecretString?: string;
    SecretBinary?: Uint8Array;
    ClientRequestToken?: string;
  }): Promise<SmPutSecretValueResult>;

  /**
   * Create a new secret.
   * Maps to CreateSecretCommand.
   */
  createSecret(params: {
    Name: string;
    SecretString?: string;
    SecretBinary?: Uint8Array;
    Description?: string;
    Tags?: Array<{ Key: string; Value: string }>;
  }): Promise<SmCreateSecretResult>;

  /**
   * Delete a secret.
   * Maps to DeleteSecretCommand.
   */
  deleteSecret(params: {
    SecretId: string;
    ForceDeleteWithoutRecovery?: boolean;
    RecoveryWindowInDays?: number;
  }): Promise<SmDeleteSecretResult>;

  /**
   * List secrets with optional filters.
   * Maps to ListSecretsCommand.
   */
  listSecrets(params?: {
    MaxResults?: number;
    NextToken?: string;
    Filters?: Array<{ Key: string; Values: string[] }>;
  }): Promise<SmListSecretsResult>;
}

/**
 * All required method names on IAsyncSecretsManagerClient.
 * Used for runtime protocol validation in tests.
 */
export const SECRETS_MANAGER_REQUIRED_METHODS: readonly string[] = [
  'getSecretValue',
  'putSecretValue',
  'createSecret',
  'deleteSecret',
  'listSecrets',
];
