/**
 * QStash Client Wrapper Types
 *
 * Type definitions for the QStash client wrapper including
 * initialization options and operation results.
 */

import type { Client } from '@upstash/qstash';

// Re-export commonly used types from the main types module
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
  PublishMessageOptions,
  PublishResult,
  Queue,
  RemoveEndpointsOptions,
  Schedule,
  SigningKeys,
  UpsertEndpointsOptions,
  UpsertQueueOptions,
  UrlGroup,
  UrlGroupEndpoint,
} from '../../types/qstash.js';

/**
 * Options for initializing the QStash client wrapper
 */
export interface QStashClientOptions {
  /** QStash API token */
  token: string;
  /** Custom base URL (for testing) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable retry logic */
  retry?: boolean | RetryOptions;
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retries */
  maxRetries?: number;
  /** Initial delay between retries in ms */
  initialDelay?: number;
  /** Maximum delay between retries in ms */
  maxDelay?: number;
  /** Backoff multiplier */
  multiplier?: number;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  multiplier: 2,
};

/**
 * Result of a client operation
 */
export interface OperationResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The operation result data */
  data?: T;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Token resolution source type
 */
export type TokenSource = 'cli' | 'env' | 'config';

/**
 * Information about the current token
 */
export interface TokenInfo {
  /** Source of the token */
  source: TokenSource;
  /** Environment name (if from config) */
  environmentName?: string;
  /** Whether the token is valid (tested against API) */
  isValid?: boolean;
}

/**
 * Get the underlying @upstash/qstash Client type
 */
export type UpstashQStashClient = Client;

/**
 * Context for API operations (used for error messages)
 */
export interface OperationContext {
  /** The operation being performed */
  operation: string;
  /** Resource type being operated on */
  resourceType?: string;
  /** Resource identifier */
  resourceId?: string;
}

/**
 * Pagination options for list operations
 */
export interface PaginationOptions {
  /** Maximum number of results */
  count?: number;
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  /** Items in this page */
  items: T[];
  /** Cursor for next page (if more results) */
  cursor?: string;
  /** Whether there are more results */
  hasMore: boolean;
}
