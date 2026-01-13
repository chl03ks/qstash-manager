/**
 * QStash Client Library
 *
 * This module provides a wrapper around the @upstash/qstash SDK
 * with user-friendly error handling and retry logic.
 *
 * @example
 * ```typescript
 * import { createQStashClient, validateQStashToken } from './lib/qstash';
 *
 * // Validate a token
 * const result = await validateQStashToken('my-token');
 * if (!result.success) {
 *   console.error(result.error);
 * }
 *
 * // Create a client and use it
 * const client = createQStashClient('my-token', { source: 'config', environmentName: 'production' });
 * const groups = await client.listUrlGroups();
 * if (groups.success) {
 *   console.log(groups.data);
 * }
 * ```
 *
 * @module lib/qstash
 */

// Client exports
export {
  createQStashClient,
  QStashClientWrapper,
  validateQStashToken,
} from './client.js';

// Error exports
export {
  formatErrorForDisplay,
  parseApiError,
  QStashAuthError,
  QStashBadRequestError,
  QStashError,
  QStashErrorCode,
  QStashNetworkError,
  QStashNotFoundError,
  QStashRateLimitError,
  QStashServerError,
} from './errors.js';

// Type exports
export type {
  BatchResult,
  BulkResult,
  CreateScheduleOptions,
  DlqFilter,
  DlqMessage,
  DlqResponse,
  EnqueueMessageOptions,
  LogEntry,
  LogFilter,
  LogResponse,
  LogStats,
  Message,
  MessageState,
  OperationContext,
  OperationResult,
  PaginatedResult,
  PaginationOptions,
  PublishMessageOptions,
  PublishResult,
  QStashClientOptions,
  Queue,
  RemoveEndpointsOptions,
  RetryOptions,
  Schedule,
  SigningKeys,
  TokenInfo,
  TokenSource,
  UpstashQStashClient,
  UpsertEndpointsOptions,
  UpsertQueueOptions,
  UrlGroup,
  UrlGroupEndpoint,
} from './types.js';

export { DEFAULT_RETRY_OPTIONS } from './types.js';
