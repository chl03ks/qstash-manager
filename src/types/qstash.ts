/**
 * QStash Entity Types
 *
 * Type definitions for QStash resources including URL groups,
 * schedules, queues, messages, and DLQ.
 */

// ============================================
// URL Groups
// ============================================

/**
 * An endpoint within a URL group
 */
export interface UrlGroupEndpoint {
  /** The URL of this endpoint */
  url: string;
  /** Optional name for this endpoint */
  name?: string;
}

/**
 * A URL group (topic) containing multiple endpoints
 */
export interface UrlGroup {
  /** The unique name of this URL group */
  name: string;
  /** List of endpoints in this group */
  endpoints: UrlGroupEndpoint[];
  /** Unix timestamp when the group was created */
  createdAt?: number;
  /** Unix timestamp when the group was last updated */
  updatedAt?: number;
}

/**
 * Options for upserting endpoints to a URL group
 */
export interface UpsertEndpointsOptions {
  /** Name of the URL group */
  groupName: string;
  /** Endpoints to add or update */
  endpoints: UrlGroupEndpoint[];
}

/**
 * Options for removing endpoints from a URL group
 */
export interface RemoveEndpointsOptions {
  /** Name of the URL group */
  groupName: string;
  /** Endpoints to remove */
  endpoints: UrlGroupEndpoint[];
}

// ============================================
// Schedules
// ============================================

/**
 * A schedule configuration
 */
export interface Schedule {
  /** Unique schedule ID */
  scheduleId: string;
  /** Cron expression for the schedule */
  cron: string;
  /** Destination URL or URL group */
  destination: string;
  /** HTTP method to use */
  method?: string;
  /** Request body */
  body?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Whether the schedule is paused */
  isPaused: boolean;
  /** Number of retries */
  retries?: number;
  /** Callback URL */
  callback?: string;
  /** Failure callback URL */
  failureCallback?: string;
  /** Delay in seconds */
  delay?: number;
  /** Unix timestamp when created */
  createdAt: number;
}

/**
 * Options for creating a new schedule
 */
export interface CreateScheduleOptions {
  /** Destination URL or URL group */
  destination: string;
  /** Cron expression */
  cron: string;
  /** HTTP method (default: POST) */
  method?: string;
  /** Request body */
  body?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Number of retries */
  retries?: number;
  /** Callback URL for success */
  callback?: string;
  /** Callback URL for failure */
  failureCallback?: string;
  /** Initial delay in seconds */
  delay?: number;
}

/**
 * Common cron presets for easy schedule creation
 */
export interface CronPreset {
  /** Display name */
  name: string;
  /** Cron expression */
  cron: string;
  /** Description */
  description: string;
}

/**
 * Standard cron presets
 */
export const CRON_PRESETS: CronPreset[] = [
  { name: 'Every minute', cron: '* * * * *', description: 'Runs every minute' },
  { name: 'Every 5 minutes', cron: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { name: 'Every 15 minutes', cron: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { name: 'Hourly', cron: '0 * * * *', description: 'Runs at the start of every hour' },
  { name: 'Daily', cron: '0 0 * * *', description: 'Runs at midnight every day' },
  { name: 'Weekly', cron: '0 0 * * 0', description: 'Runs at midnight every Sunday' },
  { name: 'Monthly', cron: '0 0 1 * *', description: 'Runs at midnight on the 1st of each month' },
];

// ============================================
// Queues
// ============================================

/**
 * A queue configuration
 */
export interface Queue {
  /** The unique name of this queue */
  name: string;
  /** Number of parallel consumers (1-100) */
  parallelism: number;
  /** Whether the queue is paused */
  isPaused: boolean;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when last updated */
  updatedAt?: number;
  /** Current number of messages in the queue (lag) */
  lag?: number;
}

/**
 * Options for creating or updating a queue
 */
export interface UpsertQueueOptions {
  /** Queue name */
  name: string;
  /** Number of parallel consumers (1-100, default: 1) */
  parallelism?: number;
}

// ============================================
// Messages
// ============================================

/**
 * Message delivery state
 */
export type MessageState =
  | 'CREATED'
  | 'ACTIVE'
  | 'DELIVERED'
  | 'ERROR'
  | 'FAILED'
  | 'RETRY'
  | 'CANCELLED';

/**
 * A published message
 */
export interface Message {
  /** Unique message ID */
  messageId: string;
  /** Destination URL */
  url: string;
  /** Current state */
  state: MessageState;
  /** HTTP method */
  method?: string;
  /** Request body */
  body?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when delivered */
  deliveredAt?: number;
  /** Number of retries attempted */
  retries?: number;
  /** Callback URL */
  callback?: string;
  /** Failure callback URL */
  failureCallback?: string;
  /** Queue name if enqueued */
  queueName?: string;
  /** Schedule ID if from schedule */
  scheduleId?: string;
}

/**
 * Options for publishing a message
 */
export interface PublishMessageOptions {
  /** Destination URL or URL group (prefixed with 'urlgroup://') */
  destination: string;
  /** HTTP method (default: POST) */
  method?: string;
  /** Request body */
  body?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Delay in seconds before delivery */
  delay?: number;
  /** Number of retries (default: 3) */
  retries?: number;
  /** Callback URL for delivery result */
  callback?: string;
  /** Callback URL for failures */
  failureCallback?: string;
  /** Content type header */
  contentType?: string;
  /** Deduplication ID */
  deduplicationId?: string;
  /** Content-based deduplication */
  contentBasedDeduplication?: boolean;
}

/**
 * Result of publishing a message
 */
export interface PublishResult {
  /** The message ID */
  messageId: string;
  /** URL where the message was sent */
  url?: string;
  /** Whether message was deduplicated */
  deduplicated?: boolean;
}

/**
 * Options for enqueuing a message to a queue
 */
export interface EnqueueMessageOptions extends PublishMessageOptions {
  /** Queue name */
  queueName: string;
}

/**
 * Result of a batch publish operation
 */
export interface BatchResult {
  /** Successfully published messages */
  success: PublishResult[];
  /** Failed messages */
  failed: Array<{
    /** Index of the failed message */
    index: number;
    /** Error message */
    error: string;
  }>;
}

/**
 * Result of a bulk operation (cancel, delete, etc.)
 */
export interface BulkResult {
  /** Number of items successfully processed */
  successful: number;
  /** Number of items that failed */
  failed: number;
  /** Details of failures */
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================
// Dead Letter Queue
// ============================================

/**
 * A message in the Dead Letter Queue
 */
export interface DlqMessage {
  /** Unique DLQ message ID */
  dlqId: string;
  /** Original message ID */
  messageId: string;
  /** Destination URL */
  url: string;
  /** HTTP method */
  method?: string;
  /** Request body */
  body?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Response status code from last attempt */
  responseStatus?: number;
  /** Response body from last attempt */
  responseBody?: string;
  /** Response headers from last attempt */
  responseHeaders?: Record<string, string>;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when last retried */
  retriedAt?: number;
  /** Number of retry attempts */
  retryCount: number;
  /** Queue name if from queue */
  queueName?: string;
  /** URL group name if from URL group */
  urlGroup?: string;
  /** Schedule ID if from schedule */
  scheduleId?: string;
}

/**
 * Filter options for DLQ messages
 */
export interface DlqFilter {
  /** Filter by URL group */
  urlGroup?: string;
  /** Filter by queue */
  queueName?: string;
  /** Filter by schedule */
  scheduleId?: string;
  /** Filter by response status */
  responseStatus?: number;
  /** Maximum number of results */
  count?: number;
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Paginated DLQ response
 */
export interface DlqResponse {
  /** Messages in this page */
  messages: DlqMessage[];
  /** Cursor for next page (if more results) */
  cursor?: string;
}

// ============================================
// Logs & Events
// ============================================

/**
 * A log entry for message delivery
 */
export interface LogEntry {
  /** Message ID */
  messageId: string;
  /** Destination URL */
  url: string;
  /** Log entry time */
  time: number;
  /** Event state */
  state: MessageState;
  /** Response status code */
  responseStatus?: number;
  /** Response body (truncated) */
  responseBody?: string;
  /** Response time in ms */
  responseTime?: number;
  /** Queue name if applicable */
  queueName?: string;
  /** URL group if applicable */
  urlGroup?: string;
  /** Schedule ID if applicable */
  scheduleId?: string;
}

/**
 * Filter options for log entries
 */
export interface LogFilter {
  /** Filter by message state */
  state?: MessageState;
  /** Filter by URL group */
  urlGroup?: string;
  /** Filter by queue */
  queueName?: string;
  /** Filter by schedule */
  scheduleId?: string;
  /** Start time (Unix timestamp) */
  startTime?: number;
  /** End time (Unix timestamp) */
  endTime?: number;
  /** Maximum number of results */
  count?: number;
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Paginated log response
 */
export interface LogResponse {
  /** Log entries in this page */
  logs: LogEntry[];
  /** Cursor for next page (if more results) */
  cursor?: string;
}

/**
 * Log statistics
 */
export interface LogStats {
  /** Total messages in the period */
  total: number;
  /** Successfully delivered messages */
  delivered: number;
  /** Failed messages (in DLQ) */
  failed: number;
  /** Messages pending/in progress */
  pending: number;
}

// ============================================
// Signing Keys
// ============================================

/**
 * QStash signing keys for webhook verification
 */
export interface SigningKeys {
  /** Current signing key */
  current: string;
  /** Next signing key (for rotation) */
  next: string;
}

// ============================================
// API Error Types
// ============================================

/**
 * QStash API error response
 */
export interface QStashApiError {
  /** Error message */
  error: string;
  /** HTTP status code */
  status?: number;
}
