/**
 * DNA-3: DataProcessResult<T>
 * Every fabric method returns this. Never throw exceptions for business logic.
 * Success/Failure/Error static constructors. Chainable.
 */

import { randomUUID } from 'crypto';

export class DataProcessResult<T = unknown> {
  /** Whether the operation succeeded */
  readonly isSuccess: boolean;
  /** The result data (only present on success) */
  readonly data: T | undefined;
  /** Error code (only present on failure/error) */
  readonly errorCode: string | undefined;
  /** Error message (only present on failure/error) */
  readonly errorMessage: string | undefined;
  /** Unique correlation ID for tracing */
  readonly correlationId: string;
  /** ISO timestamp of result creation */
  readonly timestamp: string;
  /** Additional metadata */
  readonly metadata: Record<string, unknown>;

  private constructor(params: {
    isSuccess: boolean;
    data?: T;
    errorCode?: string;
    errorMessage?: string;
    correlationId?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.isSuccess = params.isSuccess;
    this.data = params.data;
    this.errorCode = params.errorCode;
    this.errorMessage = params.errorMessage;
    this.correlationId = params.correlationId ?? randomUUID();
    this.timestamp = params.timestamp ?? new Date().toISOString();
    this.metadata = params.metadata ?? {};
  }

  // ── Static Constructors ──────────────────────────────────

  /** Create a success result with data. */
  static success<T>(data: T, metadata?: Record<string, unknown>): DataProcessResult<T> {
    return new DataProcessResult<T>({
      isSuccess: true,
      data,
      metadata: metadata ?? {},
    });
  }

  /** Create a failure result — business logic failure, NOT an exception. */
  static failure<T = unknown>(
    errorCode: string,
    errorMessage: string,
    metadata?: Record<string, unknown>,
  ): DataProcessResult<T> {
    return new DataProcessResult<T>({
      isSuccess: false,
      errorCode,
      errorMessage,
      metadata: metadata ?? {},
    });
  }

  /** Create an error result — infrastructure/system error. */
  static error<T = unknown>(
    errorCode: string,
    errorMessage: string,
    exception?: Error,
  ): DataProcessResult<T> {
    const meta: Record<string, unknown> = {};
    if (exception) {
      meta['exception_type'] = exception.constructor.name;
      meta['exception_detail'] = exception.message;
    }
    return new DataProcessResult<T>({
      isSuccess: false,
      errorCode,
      errorMessage,
      metadata: meta,
    });
  }

  // ── Chainable Operations ─────────────────────────────────

  /** Transform data if success, pass-through if failure. */
  map<U>(func: (data: T) => U): DataProcessResult<U> {
    if (!this.isSuccess || this.data === undefined) {
      return this as unknown as DataProcessResult<U>;
    }
    try {
      const newData = func(this.data);
      return DataProcessResult.success(newData);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('MAP_FAILED', err.message, err);
    }
  }

  /** Chain results — if success, call func that returns another result. */
  flatMap<U>(func: (data: T) => DataProcessResult<U>): DataProcessResult<U> {
    if (!this.isSuccess || this.data === undefined) {
      return this as unknown as DataProcessResult<U>;
    }
    try {
      return func(this.data);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('FLAT_MAP_FAILED', err.message, err);
    }
  }

  /** Side-effect on failure (e.g., logging). Returns self for chaining. */
  onFailure(handler: (errorCode: string, errorMessage: string) => void): DataProcessResult<T> {
    if (!this.isSuccess && this.errorCode && this.errorMessage) {
      handler(this.errorCode, this.errorMessage);
    }
    return this;
  }

  /** Get data or return default on failure. */
  unwrapOr(defaultValue: T): T {
    if (this.isSuccess && this.data !== undefined) {
      return this.data;
    }
    return defaultValue;
  }

  /** Serialize to dictionary (for API responses / queue messages). */
  toDict(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      is_success: this.isSuccess,
      correlation_id: this.correlationId,
      timestamp: this.timestamp,
    };
    if (this.isSuccess) {
      result['data'] = this.data;
    } else {
      result['error_code'] = this.errorCode;
      result['error_message'] = this.errorMessage;
    }
    if (Object.keys(this.metadata).length > 0) {
      result['metadata'] = this.metadata;
    }
    return result;
  }
}
