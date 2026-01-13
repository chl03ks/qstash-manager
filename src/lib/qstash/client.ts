/**
 * QStash Client Wrapper
 *
 * A wrapper around the @upstash/qstash Client that provides:
 * - User-friendly error handling with actionable messages
 * - Consistent operation result types
 * - Token validation
 * - Optional retry logic
 */

import { Client } from '@upstash/qstash';

import {
  parseApiError,
  QStashAuthError,
  type QStashError,
} from './errors.js';
import {
  DEFAULT_RETRY_OPTIONS,
  type OperationResult,
  type QStashClientOptions,
  type RetryOptions,
  type TokenInfo,
  type TokenSource,
  type UpstashQStashClient,
} from './types.js';

/**
 * QStash Client Wrapper
 *
 * Provides a convenient interface to the QStash API with
 * automatic error handling and retry logic.
 */
export class QStashClientWrapper {
  private client: Client;
  private readonly token: string;
  private readonly tokenSource: TokenSource;
  private readonly environmentName?: string;
  private readonly retryOptions: RetryOptions | null;

  constructor(
    options: QStashClientOptions,
    tokenInfo?: { source: TokenSource; environmentName?: string }
  ) {
    this.token = options.token;
    this.tokenSource = tokenInfo?.source ?? 'cli';
    this.environmentName = tokenInfo?.environmentName;

    // Configure retry options
    if (options.retry === false) {
      this.retryOptions = null;
    } else if (typeof options.retry === 'object') {
      this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options.retry };
    } else {
      this.retryOptions = { ...DEFAULT_RETRY_OPTIONS };
    }

    // Initialize the underlying client
    this.client = new Client({
      token: options.token,
      ...(options.baseUrl && { baseUrl: options.baseUrl }),
    });
  }

  /**
   * Get token information
   */
  getTokenInfo(): TokenInfo {
    return {
      source: this.tokenSource,
      environmentName: this.environmentName,
    };
  }

  /**
   * Get the underlying @upstash/qstash client
   * Use this for direct access to the SDK when needed
   */
  getClient(): UpstashQStashClient {
    return this.client;
  }

  /**
   * Validate the token by making a test API call
   */
  async validateToken(): Promise<OperationResult<boolean>> {
    try {
      // Try to list URL groups as a validation check
      await this.client.urlGroups.list();
      return { success: true, data: true };
    } catch (error) {
      const qstashError = parseApiError(error, 'Token validation');
      return {
        success: false,
        data: false,
        error: qstashError.getUserMessage(),
      };
    }
  }

  // ============================================
  // URL Groups
  // ============================================

  /**
   * List all URL groups
   */
  async listUrlGroups(): Promise<OperationResult<import('./types.js').UrlGroup[]>> {
    return this.executeWithErrorHandling(
      'Listing URL groups',
      async () => {
        const groups = await this.client.urlGroups.list();
        return groups.map((g) => ({
          name: g.name,
          endpoints: g.endpoints ?? [],
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        }));
      }
    );
  }

  /**
   * Get a single URL group by name
   */
  async getUrlGroup(name: string): Promise<OperationResult<import('./types.js').UrlGroup>> {
    return this.executeWithErrorHandling(
      `Getting URL group '${name}'`,
      async () => {
        const group = await this.client.urlGroups.get(name);
        return {
          name: group.name,
          endpoints: group.endpoints ?? [],
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        };
      },
      { resourceType: 'URL group', resourceId: name }
    );
  }

  /**
   * Upsert endpoints to a URL group
   * Creates the group if it doesn't exist
   */
  async upsertUrlGroupEndpoints(
    groupName: string,
    endpoints: import('./types.js').UrlGroupEndpoint[]
  ): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Updating URL group '${groupName}'`,
      async () => {
        await this.client.urlGroups.addEndpoints({
          name: groupName,
          endpoints: endpoints.map((e) => ({
            url: e.url,
            ...(e.name && { name: e.name }),
          })),
        });
      }
    );
  }

  /**
   * Remove endpoints from a URL group
   */
  async removeUrlGroupEndpoints(
    groupName: string,
    endpoints: import('./types.js').UrlGroupEndpoint[]
  ): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Removing endpoints from URL group '${groupName}'`,
      async () => {
        await this.client.urlGroups.removeEndpoints({
          name: groupName,
          endpoints: endpoints.map((e) => ({
            url: e.url,
            ...(e.name && { name: e.name }),
          })),
        });
      }
    );
  }

  /**
   * Delete a URL group
   */
  async deleteUrlGroup(name: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Deleting URL group '${name}'`,
      async () => {
        await this.client.urlGroups.delete(name);
      },
      { resourceType: 'URL group', resourceId: name }
    );
  }

  // ============================================
  // Schedules
  // ============================================

  /**
   * List all schedules
   */
  async listSchedules(): Promise<OperationResult<import('./types.js').Schedule[]>> {
    return this.executeWithErrorHandling(
      'Listing schedules',
      async () => {
        const schedules = await this.client.schedules.list();
        return schedules.map((s) => ({
          scheduleId: s.scheduleId,
          cron: s.cron,
          destination: s.destination,
          method: s.method,
          body: s.body,
          headers: s.header as Record<string, string> | undefined,
          isPaused: s.isPaused,
          retries: s.retries,
          callback: s.callback,
          failureCallback: s.failureCallback,
          delay: s.delay,
          createdAt: s.createdAt,
        }));
      }
    );
  }

  /**
   * Get a schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<OperationResult<import('./types.js').Schedule>> {
    return this.executeWithErrorHandling(
      `Getting schedule '${scheduleId}'`,
      async () => {
        const s = await this.client.schedules.get(scheduleId);
        return {
          scheduleId: s.scheduleId,
          cron: s.cron,
          destination: s.destination,
          method: s.method,
          body: s.body,
          headers: s.header as Record<string, string> | undefined,
          isPaused: s.isPaused,
          retries: s.retries,
          callback: s.callback,
          failureCallback: s.failureCallback,
          delay: s.delay,
          createdAt: s.createdAt,
        };
      },
      { resourceType: 'schedule', resourceId: scheduleId }
    );
  }

  /**
   * Create a new schedule
   */
  async createSchedule(
    options: import('./types.js').CreateScheduleOptions
  ): Promise<OperationResult<string>> {
    return this.executeWithErrorHandling(
      'Creating schedule',
      async () => {
        const result = await this.client.schedules.create({
          destination: options.destination,
          cron: options.cron,
          method: options.method,
          body: options.body,
          headers: options.headers,
          retries: options.retries,
          callback: options.callback,
          failureCallback: options.failureCallback,
          delay: options.delay,
        });
        return result.scheduleId;
      }
    );
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(scheduleId: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Pausing schedule '${scheduleId}'`,
      async () => {
        await this.client.schedules.pause({ schedule: scheduleId });
      },
      { resourceType: 'schedule', resourceId: scheduleId }
    );
  }

  /**
   * Resume a schedule
   */
  async resumeSchedule(scheduleId: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Resuming schedule '${scheduleId}'`,
      async () => {
        await this.client.schedules.resume({ schedule: scheduleId });
      },
      { resourceType: 'schedule', resourceId: scheduleId }
    );
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Deleting schedule '${scheduleId}'`,
      async () => {
        await this.client.schedules.delete(scheduleId);
      },
      { resourceType: 'schedule', resourceId: scheduleId }
    );
  }

  // ============================================
  // Queues
  // ============================================

  /**
   * List all queues
   */
  async listQueues(): Promise<OperationResult<import('./types.js').Queue[]>> {
    return this.executeWithErrorHandling(
      'Listing queues',
      async () => {
        const queues = await this.client.queue.list();
        return queues.map((q) => ({
          name: q.name,
          parallelism: q.parallelism,
          isPaused: q.paused,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          lag: q.lag,
        }));
      }
    );
  }

  /**
   * Get a queue by name
   */
  async getQueue(name: string): Promise<OperationResult<import('./types.js').Queue>> {
    return this.executeWithErrorHandling(
      `Getting queue '${name}'`,
      async () => {
        const q = await this.client.queue.get(name);
        return {
          name: q.name,
          parallelism: q.parallelism,
          isPaused: q.paused,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          lag: q.lag,
        };
      },
      { resourceType: 'queue', resourceId: name }
    );
  }

  /**
   * Create or update a queue
   */
  async upsertQueue(
    options: import('./types.js').UpsertQueueOptions
  ): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Upserting queue '${options.name}'`,
      async () => {
        await this.client.queue.upsert({
          queueName: options.name,
          parallelism: options.parallelism ?? 1,
        });
      }
    );
  }

  /**
   * Pause a queue
   */
  async pauseQueue(name: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Pausing queue '${name}'`,
      async () => {
        await this.client.queue.pause({ queueName: name });
      },
      { resourceType: 'queue', resourceId: name }
    );
  }

  /**
   * Resume a queue
   */
  async resumeQueue(name: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Resuming queue '${name}'`,
      async () => {
        await this.client.queue.resume({ queueName: name });
      },
      { resourceType: 'queue', resourceId: name }
    );
  }

  /**
   * Delete a queue
   */
  async deleteQueue(name: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Deleting queue '${name}'`,
      async () => {
        await this.client.queue.delete(name);
      },
      { resourceType: 'queue', resourceId: name }
    );
  }

  // ============================================
  // Messages
  // ============================================

  /**
   * Publish a message
   */
  async publishMessage(
    options: import('./types.js').PublishMessageOptions
  ): Promise<OperationResult<import('./types.js').PublishResult>> {
    return this.executeWithErrorHandling(
      `Publishing message to '${options.destination}'`,
      async () => {
        const result = await this.client.publishJSON({
          url: options.destination,
          method: options.method,
          body: options.body ? JSON.parse(options.body) : undefined,
          headers: options.headers,
          delay: options.delay,
          retries: options.retries,
          callback: options.callback,
          failureCallback: options.failureCallback,
          contentType: options.contentType,
          deduplicationId: options.deduplicationId,
          contentBasedDeduplication: options.contentBasedDeduplication,
        });

        // Handle both single and batch results
        if (Array.isArray(result)) {
          return {
            messageId: result[0]?.messageId ?? '',
            url: result[0]?.url,
            deduplicated: result[0]?.deduplicated,
          };
        }

        return {
          messageId: result.messageId,
          url: result.url,
          deduplicated: result.deduplicated,
        };
      }
    );
  }

  /**
   * Enqueue a message to a queue
   */
  async enqueueMessage(
    options: import('./types.js').EnqueueMessageOptions
  ): Promise<OperationResult<import('./types.js').PublishResult>> {
    return this.executeWithErrorHandling(
      `Enqueuing message to queue '${options.queueName}'`,
      async () => {
        const queue = this.client.queue({ queueName: options.queueName });
        const result = await queue.enqueueJSON({
          url: options.destination,
          method: options.method,
          body: options.body ? JSON.parse(options.body) : undefined,
          headers: options.headers,
          delay: options.delay,
          retries: options.retries,
          callback: options.callback,
          failureCallback: options.failureCallback,
          contentType: options.contentType,
          deduplicationId: options.deduplicationId,
          contentBasedDeduplication: options.contentBasedDeduplication,
        });

        // Handle both single and batch results
        if (Array.isArray(result)) {
          return {
            messageId: result[0]?.messageId ?? '',
            url: result[0]?.url,
            deduplicated: result[0]?.deduplicated,
          };
        }

        return {
          messageId: result.messageId,
          url: result.url,
          deduplicated: result.deduplicated,
        };
      }
    );
  }

  /**
   * Get message status
   */
  async getMessage(messageId: string): Promise<OperationResult<import('./types.js').Message>> {
    return this.executeWithErrorHandling(
      `Getting message '${messageId}'`,
      async () => {
        const events = await this.client.events({
          filter: { messageId },
        });

        if (!events.events || events.events.length === 0) {
          throw new Error('Message not found');
        }

        const event = events.events[0];
        return {
          messageId: event.messageId,
          url: event.url ?? '',
          state: event.state as import('./types.js').MessageState,
          method: event.header?.['Upstash-Method'] ?? 'POST',
          body: event.body,
          headers: event.header as Record<string, string> | undefined,
          createdAt: event.time,
          queueName: event.queueName,
          scheduleId: event.scheduleId,
        };
      },
      { resourceType: 'message', resourceId: messageId }
    );
  }

  /**
   * Cancel a message
   */
  async cancelMessage(messageId: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Cancelling message '${messageId}'`,
      async () => {
        await this.client.messages.delete(messageId);
      },
      { resourceType: 'message', resourceId: messageId }
    );
  }

  // ============================================
  // Dead Letter Queue
  // ============================================

  /**
   * List DLQ messages
   */
  async listDlqMessages(
    filter?: import('./types.js').DlqFilter
  ): Promise<OperationResult<import('./types.js').DlqResponse>> {
    return this.executeWithErrorHandling(
      'Listing DLQ messages',
      async () => {
        const result = await this.client.dlq.listMessages({
          count: filter?.count,
          cursor: filter?.cursor,
        });

        return {
          messages: result.messages.map((m) => ({
            dlqId: m.dlqId,
            messageId: m.messageId,
            url: m.url ?? '',
            method: m.method,
            body: m.body,
            headers: m.header as Record<string, string> | undefined,
            responseStatus: m.responseStatus,
            responseBody: m.responseBody,
            responseHeaders: m.responseHeader as Record<string, string> | undefined,
            createdAt: m.createdAt,
            retryCount: m.maxRetries ?? 0,
            queueName: m.queueName,
            urlGroup: m.urlGroup,
            scheduleId: m.scheduleId,
          })),
          cursor: result.cursor,
        };
      }
    );
  }

  /**
   * Get a single DLQ message
   */
  async getDlqMessage(dlqId: string): Promise<OperationResult<import('./types.js').DlqMessage>> {
    return this.executeWithErrorHandling(
      `Getting DLQ message '${dlqId}'`,
      async () => {
        const m = await this.client.dlq.get(dlqId);
        return {
          dlqId: m.dlqId,
          messageId: m.messageId,
          url: m.url ?? '',
          method: m.method,
          body: m.body,
          headers: m.header as Record<string, string> | undefined,
          responseStatus: m.responseStatus,
          responseBody: m.responseBody,
          responseHeaders: m.responseHeader as Record<string, string> | undefined,
          createdAt: m.createdAt,
          retryCount: m.maxRetries ?? 0,
          queueName: m.queueName,
          urlGroup: m.urlGroup,
          scheduleId: m.scheduleId,
        };
      },
      { resourceType: 'DLQ message', resourceId: dlqId }
    );
  }

  /**
   * Delete a DLQ message
   */
  async deleteDlqMessage(dlqId: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(
      `Deleting DLQ message '${dlqId}'`,
      async () => {
        await this.client.dlq.delete(dlqId);
      },
      { resourceType: 'DLQ message', resourceId: dlqId }
    );
  }

  /**
   * Delete multiple DLQ messages
   */
  async deleteDlqMessages(dlqIds: string[]): Promise<OperationResult<number>> {
    return this.executeWithErrorHandling(
      `Deleting ${dlqIds.length} DLQ messages`,
      async () => {
        const result = await this.client.dlq.deleteMany({ dlqIds });
        return result.deleted;
      }
    );
  }

  // ============================================
  // Logs / Events
  // ============================================

  /**
   * Get event logs
   */
  async getLogs(
    filter?: import('./types.js').LogFilter
  ): Promise<OperationResult<import('./types.js').LogResponse>> {
    return this.executeWithErrorHandling(
      'Getting logs',
      async () => {
        const result = await this.client.events({
          filter: {
            state: filter?.state,
            urlGroup: filter?.urlGroup,
            queueName: filter?.queueName,
            scheduleId: filter?.scheduleId,
            fromDate: filter?.startTime,
            toDate: filter?.endTime,
          },
        });

        return {
          logs: (result.events ?? []).map((e) => ({
            messageId: e.messageId,
            url: e.url ?? '',
            time: e.time,
            state: e.state as import('./types.js').MessageState,
            responseStatus: e.responseStatus,
            responseBody: e.responseBody,
            queueName: e.queueName,
            urlGroup: e.urlGroup,
            scheduleId: e.scheduleId,
          })),
          cursor: result.cursor,
        };
      }
    );
  }

  // ============================================
  // Signing Keys
  // ============================================

  /**
   * Get signing keys
   */
  async getSigningKeys(): Promise<OperationResult<import('./types.js').SigningKeys>> {
    return this.executeWithErrorHandling(
      'Getting signing keys',
      async () => {
        const keys = await this.client.keys();
        return {
          current: keys.current,
          next: keys.next,
        };
      }
    );
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Execute an operation with error handling and optional retry
   */
  private async executeWithErrorHandling<T>(
    context: string,
    operation: () => Promise<T>,
    resourceInfo?: { resourceType?: string; resourceId?: string }
  ): Promise<OperationResult<T>> {
    try {
      const data = await this.executeWithRetry(operation);
      return { success: true, data };
    } catch (error) {
      const qstashError = this.handleError(error, context, resourceInfo);
      return {
        success: false,
        error: qstashError.getUserMessage(),
      };
    }
  }

  /**
   * Execute an operation with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.retryOptions) {
      return operation();
    }

    let lastError: unknown;
    let delay = this.retryOptions.initialDelay ?? DEFAULT_RETRY_OPTIONS.initialDelay;

    for (let attempt = 0; attempt <= (this.retryOptions.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries); attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const qstashError = parseApiError(error, 'retry-check');
        if (!qstashError.isRetryable || attempt >= (this.retryOptions.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries)) {
          throw error;
        }

        // Wait before retry
        await this.sleep(delay);

        // Increase delay for next retry
        delay = Math.min(
          delay * (this.retryOptions.multiplier ?? DEFAULT_RETRY_OPTIONS.multiplier),
          this.retryOptions.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay
        );
      }
    }

    throw lastError;
  }

  /**
   * Handle and transform errors
   */
  private handleError(
    error: unknown,
    context: string,
    resourceInfo?: { resourceType?: string; resourceId?: string }
  ): QStashError {
    // Add resource context if available
    let fullContext = context;
    if (resourceInfo?.resourceType && resourceInfo?.resourceId) {
      fullContext = `${context} (${resourceInfo.resourceType}: ${resourceInfo.resourceId})`;
    }

    return parseApiError(error, fullContext);
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a QStash client wrapper with token from config or environment
 */
export function createQStashClient(
  token: string,
  tokenInfo?: { source: TokenSource; environmentName?: string },
  options?: Omit<QStashClientOptions, 'token'>
): QStashClientWrapper {
  return new QStashClientWrapper(
    { token, ...options },
    tokenInfo
  );
}

/**
 * Validate a QStash token
 */
export async function validateQStashToken(token: string): Promise<OperationResult<boolean>> {
  const client = createQStashClient(token);
  return client.validateToken();
}
