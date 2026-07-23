export const BATCH_QUEUE_SERVICE = 'BATCH_QUEUE_SERVICE';

/**
 * A single batch item submitted to the warehouse ingestion queue.
 *
 * CRITICAL: batchId MUST be a hash that includes eventWindowStart and
 * eventWindowEnd. Missing time window in batchId = BUILD_FAILURE.
 * Example: batchId = sha256(`${tenantId}:${sourceFlowId}:${eventWindowStart}:${eventWindowEnd}`)
 */
export interface BatchItem {
  batchId: string;
  tenantId: string;
  sourceFlowId: string;
  /**
   * ISO 8601 timestamp — start of the event window covered by this batch.
   * Must be included in the batchId hash.
   */
  eventWindowStart: string;
  /**
   * ISO 8601 timestamp — end of the event window covered by this batch.
   * Must be included in the batchId hash.
   */
  eventWindowEnd: string;
  payload: Record<string, unknown>;
}

export interface IBatchQueueService {
  /**
   * Returns the current depth (pending item count) of the batch queue
   * for the given tenant.
   *
   * T169 MUST call this BEFORE calling enqueue(). If depth >= threshold,
   * call reject() and return a backpressure error. Never enqueue when
   * depth is at or above the threshold.
   */
  getDepth(tenantId: string): Promise<number>;

  /**
   * Enqueues a batch item. Only call this AFTER getDepth() confirms
   * depth is below threshold.
   */
  enqueue(item: BatchItem): Promise<void>;

  /**
   * Rejects a batch and records the rejection reason.
   * Emit the configured backpressure rejection event after calling this.
   */
  reject(batchId: string, reason: string): Promise<void>;

  /**
   * Returns true if queue depth exceeds the given threshold.
   * T190 must halt batch dispatch when backpressure is active.
   * FLOW-14: used by EtlSyncJob (T190) for backpressure detection.
   */
  isBackpressureThresholdExceeded(queueName: string, threshold: number): Promise<boolean>;
}
