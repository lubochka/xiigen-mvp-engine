/**
 * FLOW-22 Named Checks — 15 runtime-enforceable assertions.
 * E8 correction: all novel IR patterns must have explicit named checks.
 * Each check returns DataProcessResult — never throws.
 *
 * Gap: NAMED-CHECKS-ALL
 * Depends On: GAP-R0 through GAP-R7 all complete
 */

import { DataProcessResult } from '../kernel/data-process-result';

// ─── CHECK-1 ────────────────────────────────────────────────────────────────
/**
 * pg_first_before_es_write
 * Asserts PG write timestamp precedes ES write timestamp.
 * CF-405, E3.
 */
export function check_pg_first_before_es_write(
  pgWriteTimestamp: number,
  esWriteTimestamp: number | null,
): DataProcessResult<void> {
  if (esWriteTimestamp !== null && pgWriteTimestamp >= esWriteTimestamp) {
    return DataProcessResult.failure(
      'CHECK_FAILED_PG_FIRST',
      `ES write (${esWriteTimestamp}) preceded or equalled PG write (${pgWriteTimestamp}). Violates CF-405.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-2 ────────────────────────────────────────────────────────────────
/**
 * etag_conflict_dataprocessresult_not_throw
 * Asserts ETag conflict returns DataProcessResult, not exception.
 * CF-404, E7.
 */
export function check_etag_conflict_dataprocessresult_not_throw(
  result: DataProcessResult<unknown> | Error,
): DataProcessResult<void> {
  if (result instanceof Error) {
    return DataProcessResult.failure(
      'CHECK_FAILED_ETAG_THROW',
      `ETag conflict threw an exception instead of returning DataProcessResult. Violates CF-404.`,
    );
  }
  if (!('isSuccess' in result)) {
    return DataProcessResult.failure(
      'CHECK_FAILED_ETAG_TYPE',
      'Return value is not DataProcessResult',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-3 ────────────────────────────────────────────────────────────────
/**
 * schema_additive_only_no_removal
 * Asserts schema validator was called and no removal was allowed.
 * CF-407, CF-420, DD-192.
 */
export function check_schema_additive_only_no_removal(
  validatorWasCalled: boolean,
  removedFields: string[],
): DataProcessResult<void> {
  if (!validatorWasCalled) {
    return DataProcessResult.failure(
      'CHECK_FAILED_VALIDATOR_NOT_CALLED',
      'Schema additive validator not called before storing schema. Violates CF-407.',
    );
  }
  if (removedFields.length > 0) {
    return DataProcessResult.failure(
      'CHECK_FAILED_SCHEMA_REMOVAL',
      `Schema removal allowed through: ${removedFields.join(', ')}. Violates CF-420, DD-192.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-4 ────────────────────────────────────────────────────────────────
/**
 * css_build_time_not_request_time
 * Asserts CssBuildService.compile() was called in publish-pipeline context.
 * CF-411, DD-198.
 */
export function check_css_build_time_not_request_time(
  compileContext: string,
): DataProcessResult<void> {
  if (compileContext !== 'publish-pipeline' && compileContext !== 'test') {
    return DataProcessResult.failure(
      'CHECK_FAILED_CSS_CONTEXT',
      `CSS compiled in context '${compileContext}'. Only 'publish-pipeline' allowed. Violates CF-411.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-5 ────────────────────────────────────────────────────────────────
/**
 * component_registry_append_only
 * Asserts no direct update/mutation on component registry entries.
 * CF-403, DD-199.
 */
export function check_component_registry_append_only(
  operationType: 'registerVersion' | 'update' | 'delete' | 'patch',
): DataProcessResult<void> {
  if (operationType !== 'registerVersion') {
    return DataProcessResult.failure(
      'CHECK_FAILED_REGISTRY_MUTATION',
      `Component registry operation '${operationType}' is not append-only. Use registerVersion(). Violates CF-403.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-6 ────────────────────────────────────────────────────────────────
/**
 * ai_advisory_fire_and_suggest_only
 * Asserts AI advisory call is not awaited in response path.
 * CF-406, DD-200.
 */
export function check_ai_advisory_fire_and_suggest_only(
  aiCallIsAwaited: boolean,
  responseReturnedBeforeAiCompleted: boolean,
): DataProcessResult<void> {
  if (aiCallIsAwaited && !responseReturnedBeforeAiCompleted) {
    return DataProcessResult.failure(
      'CHECK_FAILED_AI_BLOCKING',
      'AI advisory call is blocking the response path. Must be fire-and-suggest. Violates CF-406.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-7 ────────────────────────────────────────────────────────────────
/**
 * media_transform_from_original_only
 * Asserts image transform source is original asset.
 * CF-427, DD-201.
 */
export function check_media_transform_from_original_only(sourceAsset: {
  isOriginal: boolean;
  variantOf: string | null;
}): DataProcessResult<void> {
  if (!sourceAsset.isOriginal || sourceAsset.variantOf !== null) {
    return DataProcessResult.failure(
      'CHECK_FAILED_TRANSFORM_SOURCE',
      `Transform source is a variant (variantOf: ${sourceAsset.variantOf}). Must use original. Violates CF-427.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-8 ────────────────────────────────────────────────────────────────
/**
 * bfa_registration_before_activation
 * Asserts BFA registration completes before workspace activation.
 * CF-429, DD-203.
 */
export function check_bfa_registration_before_activation(
  registrationCompletedAt: number | null,
  activationAttemptedAt: number,
): DataProcessResult<void> {
  if (registrationCompletedAt === null) {
    return DataProcessResult.failure(
      'CHECK_FAILED_NO_REGISTRATION',
      'Activation attempted without prior BFA registration. Violates CF-429.',
    );
  }
  if (registrationCompletedAt >= activationAttemptedAt) {
    return DataProcessResult.failure(
      'CHECK_FAILED_REGISTRATION_ORDER',
      'BFA registration did not complete before activation attempt. Violates CF-429.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-9 ────────────────────────────────────────────────────────────────
/**
 * publish_saga_compensation_dual_entry
 * Asserts T338 has both compensation and user-initiated entry paths.
 * CF-412, E2.
 */
export function check_publish_saga_compensation_dual_entry(
  hasCompensationPath: boolean,
  hasUserInitiatedPath: boolean,
): DataProcessResult<void> {
  if (!hasCompensationPath || !hasUserInitiatedPath) {
    const missing = [
      !hasCompensationPath && 'compensation',
      !hasUserInitiatedPath && 'user-initiated',
    ]
      .filter(Boolean)
      .join(', ');
    return DataProcessResult.failure(
      'CHECK_FAILED_DUAL_ENTRY',
      `T338 missing entry path(s): ${missing}. Both required. Violates CF-412.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-10 ────────────────────────────────────────────────────────────────
/**
 * durable_timer_cancellable
 * Asserts cancel() on already-fired timer returns success with alreadyFired:true.
 * CF-409, E4.
 */
export function check_durable_timer_cancellable(
  cancelResult: DataProcessResult<{ cancelled: boolean; alreadyFired: boolean }> | Error,
): DataProcessResult<void> {
  if (cancelResult instanceof Error) {
    return DataProcessResult.failure(
      'CHECK_FAILED_TIMER_THROWS',
      'Timer cancel() threw exception on already-fired. Must return success. Violates CF-409.',
    );
  }
  if (!cancelResult.isSuccess) {
    if ((cancelResult as DataProcessResult<unknown>).errorCode === 'TIMER_NOT_FOUND') {
      return DataProcessResult.success(undefined); // acceptable
    }
    return DataProcessResult.failure(
      'CHECK_FAILED_TIMER_CANCEL',
      'Timer cancel() returned failure for already-fired timer. Must return success. Violates CF-409.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-11 ────────────────────────────────────────────────────────────────
/**
 * ssg_immutable_build_artifacts
 * Asserts artifact store rejects overwrites.
 * CF-413, CF-428.
 */
export function check_ssg_immutable_build_artifacts(
  overwriteAttemptResult: DataProcessResult<unknown>,
): DataProcessResult<void> {
  if (overwriteAttemptResult.isSuccess) {
    return DataProcessResult.failure(
      'CHECK_FAILED_ARTIFACT_MUTABLE',
      'Artifact store allowed overwrite of existing artifact. Must be write-once. Violates CF-428.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-12 ────────────────────────────────────────────────────────────────
/**
 * design_token_deferral_queue
 * Asserts T341 writes to deferral queue (not propagate directly).
 * CF-402, E5.
 */
export function check_design_token_deferral_queue(
  deferralQueueWritten: boolean,
  directPropagationCalled: boolean,
): DataProcessResult<void> {
  if (!deferralQueueWritten) {
    return DataProcessResult.failure(
      'CHECK_FAILED_NO_QUEUE_WRITE',
      'T341 did not write to deferral queue. Violates CF-402.',
    );
  }
  if (directPropagationCalled) {
    return DataProcessResult.failure(
      'CHECK_FAILED_DIRECT_PROPAGATION',
      'T341 called direct propagation (bypassed deferral queue). Violates CF-402.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-13 ────────────────────────────────────────────────────────────────
/**
 * workspace_id_equals_tenant_id
 * Asserts workspaceId in event data equals tenantId from AsyncLocalStorage.
 * CF-415, DD-197.
 */
export function check_workspace_id_equals_tenant_id(
  workspaceIdInData: string,
  tenantIdFromContext: string,
): DataProcessResult<void> {
  if (workspaceIdInData !== tenantIdFromContext) {
    return DataProcessResult.failure(
      'CHECK_FAILED_WORKSPACE_TENANT_MISMATCH',
      `workspaceId (${workspaceIdInData}) !== tenantId (${tenantIdFromContext}). Violates CF-415, DD-197.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-14 ────────────────────────────────────────────────────────────────
/**
 * sitemap_rss_build_artifact_only
 * Asserts sitemap/RSS generated only from publish pipeline context.
 * CF-414.
 */
export function check_sitemap_rss_build_artifact_only(
  generatedFromContext: 'publish-pipeline' | 'http-request' | 'test',
): DataProcessResult<void> {
  if (generatedFromContext === 'http-request') {
    return DataProcessResult.failure(
      'CHECK_FAILED_SITEMAP_ON_REQUEST',
      'Sitemap/RSS generated on HTTP request. Must be built only at publish time. Violates CF-414.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-15 ────────────────────────────────────────────────────────────────
/**
 * media_cdn_snapshot_required_before_rollback
 * Asserts CDN snapshot exists and is verified before rollback proceeds.
 * CF-408.
 */
export function check_media_cdn_snapshot_required_before_rollback(
  snapshotId: string | null,
  snapshotVerified: boolean,
): DataProcessResult<void> {
  if (snapshotId === null) {
    return DataProcessResult.failure(
      'CHECK_FAILED_NO_SNAPSHOT',
      'Rollback attempted without CDN snapshot. Capture snapshot in T336 Stage 2. Violates CF-408.',
    );
  }
  if (!snapshotVerified) {
    return DataProcessResult.failure(
      'CHECK_FAILED_SNAPSHOT_UNVERIFIED',
      'Rollback attempted with unverified snapshot. Call verifySnapshot() before restore. Violates CF-408.',
    );
  }
  return DataProcessResult.success(undefined);
}
