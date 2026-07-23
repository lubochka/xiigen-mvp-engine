/**
 * FLOW-22 Named Checks Test Suite — all 15 checks (E8 correction)
 * Gap: NAMED-CHECKS-ALL
 */

import { DataProcessResult } from '../../kernel/data-process-result';
import {
  check_pg_first_before_es_write,
  check_etag_conflict_dataprocessresult_not_throw,
  check_schema_additive_only_no_removal,
  check_css_build_time_not_request_time,
  check_component_registry_append_only,
  check_ai_advisory_fire_and_suggest_only,
  check_media_transform_from_original_only,
  check_bfa_registration_before_activation,
  check_publish_saga_compensation_dual_entry,
  check_durable_timer_cancellable,
  check_ssg_immutable_build_artifacts,
  check_design_token_deferral_queue,
  check_workspace_id_equals_tenant_id,
  check_sitemap_rss_build_artifact_only,
  check_media_cdn_snapshot_required_before_rollback,
} from '../cms-publishing-named-checks';

describe('FLOW-22 Named Checks — all 15 (E8 correction)', () => {
  describe('check-1: pg_first_before_es_write', () => {
    it('passes when ES null', () =>
      expect(check_pg_first_before_es_write(100, null).isSuccess).toBe(true));
    it('passes when PG before ES', () =>
      expect(check_pg_first_before_es_write(100, 200).isSuccess).toBe(true));
    it('fails when ES before PG', () =>
      expect(check_pg_first_before_es_write(200, 100).isSuccess).toBe(false));
    it('fails when PG equals ES timestamp', () =>
      expect(check_pg_first_before_es_write(100, 100).isSuccess).toBe(false));
  });

  describe('check-2: etag_conflict_dataprocessresult_not_throw', () => {
    it('fails on thrown Error', () => {
      expect(check_etag_conflict_dataprocessresult_not_throw(new Error('conflict')).isSuccess).toBe(
        false,
      );
    });
    it('passes on DataProcessResult.failure', () => {
      expect(
        check_etag_conflict_dataprocessresult_not_throw(
          DataProcessResult.failure('ETAG_CONFLICT', 'x'),
        ).isSuccess,
      ).toBe(true);
    });
    it('passes on DataProcessResult.success', () => {
      expect(
        check_etag_conflict_dataprocessresult_not_throw(DataProcessResult.success({ valid: true }))
          .isSuccess,
      ).toBe(true);
    });
  });

  describe('check-3: schema_additive_only_no_removal', () => {
    it('fails when validator not called', () => {
      expect(check_schema_additive_only_no_removal(false, []).isSuccess).toBe(false);
    });
    it('fails when removed fields present', () => {
      expect(check_schema_additive_only_no_removal(true, ['age']).isSuccess).toBe(false);
    });
    it('passes when validator called and no removals', () => {
      expect(check_schema_additive_only_no_removal(true, []).isSuccess).toBe(true);
    });
  });

  describe('check-4: css_build_time_not_request_time', () => {
    it('passes for publish-pipeline context', () => {
      expect(check_css_build_time_not_request_time('publish-pipeline').isSuccess).toBe(true);
    });
    it('passes for test context', () => {
      expect(check_css_build_time_not_request_time('test').isSuccess).toBe(true);
    });
    it('fails for http-request context', () => {
      expect(check_css_build_time_not_request_time('http-request').isSuccess).toBe(false);
    });
    it('fails for unknown context', () => {
      expect(check_css_build_time_not_request_time('unknown').isSuccess).toBe(false);
    });
  });

  describe('check-5: component_registry_append_only', () => {
    it('passes for registerVersion', () => {
      expect(check_component_registry_append_only('registerVersion').isSuccess).toBe(true);
    });
    it('fails for update', () => {
      expect(check_component_registry_append_only('update').isSuccess).toBe(false);
    });
    it('fails for delete', () => {
      expect(check_component_registry_append_only('delete').isSuccess).toBe(false);
    });
    it('fails for patch', () => {
      expect(check_component_registry_append_only('patch').isSuccess).toBe(false);
    });
  });

  describe('check-6: ai_advisory_fire_and_suggest_only', () => {
    it('passes when AI not awaited', () => {
      expect(check_ai_advisory_fire_and_suggest_only(false, false).isSuccess).toBe(true);
    });
    it('passes when AI awaited but response returned before completion', () => {
      expect(check_ai_advisory_fire_and_suggest_only(true, true).isSuccess).toBe(true);
    });
    it('fails when AI awaited and blocks response', () => {
      expect(check_ai_advisory_fire_and_suggest_only(true, false).isSuccess).toBe(false);
    });
  });

  describe('check-7: media_transform_from_original_only', () => {
    it('passes for original asset', () => {
      expect(
        check_media_transform_from_original_only({ isOriginal: true, variantOf: null }).isSuccess,
      ).toBe(true);
    });
    it('fails for variant asset', () => {
      expect(
        check_media_transform_from_original_only({ isOriginal: false, variantOf: 'asset-123' })
          .isSuccess,
      ).toBe(false);
    });
    it('fails when isOriginal but variantOf set', () => {
      expect(
        check_media_transform_from_original_only({ isOriginal: true, variantOf: 'asset-123' })
          .isSuccess,
      ).toBe(false);
    });
  });

  describe('check-8: bfa_registration_before_activation', () => {
    it('fails when no registration', () => {
      expect(check_bfa_registration_before_activation(null, 200).isSuccess).toBe(false);
    });
    it('fails when registration after activation', () => {
      expect(check_bfa_registration_before_activation(300, 200).isSuccess).toBe(false);
    });
    it('fails when registration same time as activation', () => {
      expect(check_bfa_registration_before_activation(200, 200).isSuccess).toBe(false);
    });
    it('passes when registration before activation', () => {
      expect(check_bfa_registration_before_activation(100, 200).isSuccess).toBe(true);
    });
  });

  describe('check-9: publish_saga_compensation_dual_entry', () => {
    it('passes when both paths exist', () => {
      expect(check_publish_saga_compensation_dual_entry(true, true).isSuccess).toBe(true);
    });
    it('fails when compensation path missing', () => {
      expect(check_publish_saga_compensation_dual_entry(false, true).isSuccess).toBe(false);
    });
    it('fails when user-initiated path missing', () => {
      expect(check_publish_saga_compensation_dual_entry(true, false).isSuccess).toBe(false);
    });
    it('fails when both paths missing', () => {
      expect(check_publish_saga_compensation_dual_entry(false, false).isSuccess).toBe(false);
    });
  });

  describe('check-10: durable_timer_cancellable', () => {
    it('fails when cancel throws Error', () => {
      expect(check_durable_timer_cancellable(new Error('unexpected')).isSuccess).toBe(false);
    });
    it('passes on successful cancel result', () => {
      const result = DataProcessResult.success({ cancelled: true, alreadyFired: false });
      expect(check_durable_timer_cancellable(result).isSuccess).toBe(true);
    });
    it('passes on already-fired result (alreadyFired:true)', () => {
      const result = DataProcessResult.success({ cancelled: false, alreadyFired: true });
      expect(check_durable_timer_cancellable(result).isSuccess).toBe(true);
    });
    it('passes on TIMER_NOT_FOUND failure (acceptable)', () => {
      const result = DataProcessResult.failure<{ cancelled: boolean; alreadyFired: boolean }>(
        'TIMER_NOT_FOUND',
        'Timer not found',
      );
      expect(check_durable_timer_cancellable(result).isSuccess).toBe(true);
    });
    it('fails on unexpected failure result', () => {
      const result = DataProcessResult.failure<{ cancelled: boolean; alreadyFired: boolean }>(
        'INTERNAL_ERROR',
        'Something went wrong',
      );
      expect(check_durable_timer_cancellable(result).isSuccess).toBe(false);
    });
  });

  describe('check-11: ssg_immutable_build_artifacts', () => {
    it('fails when overwrite succeeds (artifact is mutable)', () => {
      expect(
        check_ssg_immutable_build_artifacts(DataProcessResult.success({ id: 'artifact-1' }))
          .isSuccess,
      ).toBe(false);
    });
    it('passes when overwrite is rejected (artifact is immutable)', () => {
      expect(
        check_ssg_immutable_build_artifacts(
          DataProcessResult.failure('ARTIFACT_EXISTS', 'Already exists'),
        ).isSuccess,
      ).toBe(true);
    });
  });

  describe('check-12: design_token_deferral_queue', () => {
    it('fails when queue not written', () => {
      expect(check_design_token_deferral_queue(false, false).isSuccess).toBe(false);
    });
    it('fails when direct propagation called', () => {
      expect(check_design_token_deferral_queue(true, true).isSuccess).toBe(false);
    });
    it('passes when queue written and no direct propagation', () => {
      expect(check_design_token_deferral_queue(true, false).isSuccess).toBe(true);
    });
  });

  describe('check-13: workspace_id_equals_tenant_id', () => {
    it('passes when IDs match', () => {
      expect(check_workspace_id_equals_tenant_id('ws-123', 'ws-123').isSuccess).toBe(true);
    });
    it('fails when IDs differ', () => {
      expect(check_workspace_id_equals_tenant_id('ws-123', 'ws-456').isSuccess).toBe(false);
    });
  });

  describe('check-14: sitemap_rss_build_artifact_only', () => {
    it('passes for publish-pipeline context', () => {
      expect(check_sitemap_rss_build_artifact_only('publish-pipeline').isSuccess).toBe(true);
    });
    it('passes for test context', () => {
      expect(check_sitemap_rss_build_artifact_only('test').isSuccess).toBe(true);
    });
    it('fails for http-request context', () => {
      expect(check_sitemap_rss_build_artifact_only('http-request').isSuccess).toBe(false);
    });
  });

  describe('check-15: media_cdn_snapshot_required_before_rollback', () => {
    it('fails when no snapshot', () => {
      expect(check_media_cdn_snapshot_required_before_rollback(null, false).isSuccess).toBe(false);
    });
    it('fails when snapshot not verified', () => {
      expect(check_media_cdn_snapshot_required_before_rollback('snap-123', false).isSuccess).toBe(
        false,
      );
    });
    it('passes when snapshot exists and verified', () => {
      expect(check_media_cdn_snapshot_required_before_rollback('snap-123', true).isSuccess).toBe(
        true,
      );
    });
  });

  it('ALL 15 checks have at least one test — meta-test verifying all functions are exported and callable', () => {
    const checks = [
      check_pg_first_before_es_write,
      check_etag_conflict_dataprocessresult_not_throw,
      check_schema_additive_only_no_removal,
      check_css_build_time_not_request_time,
      check_component_registry_append_only,
      check_ai_advisory_fire_and_suggest_only,
      check_media_transform_from_original_only,
      check_bfa_registration_before_activation,
      check_publish_saga_compensation_dual_entry,
      check_durable_timer_cancellable,
      check_ssg_immutable_build_artifacts,
      check_design_token_deferral_queue,
      check_workspace_id_equals_tenant_id,
      check_sitemap_rss_build_artifact_only,
      check_media_cdn_snapshot_required_before_rollback,
    ];
    expect(checks).toHaveLength(15);
    checks.forEach((fn) => expect(typeof fn).toBe('function'));
  });
});
