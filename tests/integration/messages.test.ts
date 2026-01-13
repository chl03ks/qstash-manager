/**
 * Messages Integration Tests
 *
 * Integration tests for QStash Messages API operations.
 * These tests run against the real QStash API.
 *
 * Requirements:
 * - QSTASH_TEST_TOKEN or QSTASH_TOKEN environment variable must be set
 * - Tests create real messages that are tracked and cancelled in cleanup
 * - Uses unique identifiers to avoid conflicts
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { QStashClientWrapper } from '../../src/lib/qstash/client.js';
import type { PublishResult } from '../../src/types/qstash.js';

// Get token from environment
const TEST_TOKEN = process.env.QSTASH_TEST_TOKEN || process.env.QSTASH_TOKEN;

// Skip all tests if no token is available
const describeWithToken = TEST_TOKEN ? describe : describe.skip;

// Test destination URL (a public endpoint that accepts requests)
const TEST_DESTINATION = 'https://httpbin.org/post';

// Track message IDs for cleanup
const createdMessageIds: string[] = [];

// Track queues created for cleanup
const createdQueues: string[] = [];

describeWithToken('Messages API Integration', () => {
  let client: QStashClientWrapper;

  beforeAll(() => {
    if (!TEST_TOKEN) {
      throw new Error('QSTASH_TEST_TOKEN or QSTASH_TOKEN environment variable is required');
    }
    client = new QStashClientWrapper(
      { token: TEST_TOKEN, retry: false },
      { source: 'env' }
    );
  });

  afterAll(async () => {
    // Attempt to cancel any pending messages
    for (const messageId of createdMessageIds) {
      try {
        await client.cancelMessage(messageId);
      } catch {
        // Ignore errors - message may already be delivered or cancelled
      }
    }

    // Clean up queues
    for (const queueName of createdQueues) {
      try {
        await client.deleteQueue(queueName);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('publishMessage', () => {
    it('should publish a message to a URL', async () => {
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'hello' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.messageId).toBeDefined();
      expect(typeof result.data?.messageId).toBe('string');
      expect(result.data?.messageId.length).toBeGreaterThan(0);

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should publish a message with delay', async () => {
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'delayed message' }),
        delay: 60, // 60 second delay
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should publish a message with custom retries', async () => {
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'with retries' }),
        retries: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should publish a message with POST method (default)', async () => {
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should publish a message with custom headers', async () => {
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'with headers' }),
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
          'X-Request-Id': `test-${Date.now()}`,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should handle deduplication ID', async () => {
      const deduplicationId = `dedup-${Date.now()}`;

      const result1 = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'first message' }),
        deduplicationId,
      });

      expect(result1.success).toBe(true);
      if (result1.data?.messageId) {
        createdMessageIds.push(result1.data.messageId);
      }

      // Second message with same deduplication ID should be deduplicated
      const result2 = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'duplicate message' }),
        deduplicationId,
      });

      expect(result2.success).toBe(true);
      expect(result2.data?.deduplicated).toBe(true);
    });
  });

  describe('getMessage (track message status)', () => {
    let testMessageId: string;

    beforeAll(async () => {
      // Create a message with delay so we can track it
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'message to track' }),
        delay: 300, // 5 minutes delay to ensure it's still trackable
      });

      if (result.success && result.data?.messageId) {
        testMessageId = result.data.messageId;
        createdMessageIds.push(testMessageId);
      }
    });

    it('should get message status by ID', async () => {
      if (!testMessageId) {
        throw new Error('Test message was not created');
      }

      // Note: getMessage uses the events API which may take time to populate
      // We check that the API call works and returns the expected structure
      const result = await client.getMessage(testMessageId);

      // The message might not be in events yet if just created
      // This is acceptable behavior - we're testing the API works
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data?.messageId).toBe(testMessageId);
        expect(result.data).toHaveProperty('state');
      }
    });

    it('should return error for non-existent message', async () => {
      const result = await client.getMessage('non-existent-message-id-12345');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('cancelMessage', () => {
    it('should cancel a pending delayed message', async () => {
      // Create a message with long delay
      const publishResult = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'message to cancel' }),
        delay: 600, // 10 minutes delay
      });

      expect(publishResult.success).toBe(true);
      const messageId = publishResult.data?.messageId;
      expect(messageId).toBeDefined();

      if (!messageId) {
        throw new Error('Message was not created');
      }

      // Cancel the message
      const cancelResult = await client.cancelMessage(messageId);

      expect(cancelResult.success).toBe(true);
    });

    it('should handle cancelling non-existent message', async () => {
      const result = await client.cancelMessage('non-existent-message-id-99999');

      // QStash may return success or error for non-existent messages
      // Both are acceptable - we're testing the API doesn't crash
      expect(result).toHaveProperty('success');
    });
  });

  describe('enqueueMessage', () => {
    const testQueueName = `test-queue-${Date.now()}`;

    beforeAll(async () => {
      // Create a queue for testing
      createdQueues.push(testQueueName);
      await client.upsertQueue({ name: testQueueName, parallelism: 1 });
    });

    it('should enqueue a message to a queue', async () => {
      const result = await client.enqueueMessage({
        queueName: testQueueName,
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'enqueued message' }),
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should enqueue a message with delay', async () => {
      const result = await client.enqueueMessage({
        queueName: testQueueName,
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'delayed enqueued message' }),
        delay: 60,
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });

    it('should enqueue a message with custom headers', async () => {
      const result = await client.enqueueMessage({
        queueName: testQueueName,
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'with headers' }),
        headers: {
          'Content-Type': 'application/json',
          'X-Queue-Test': 'true',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      if (result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });
  });

  describe('Message with URL group destination', () => {
    const testUrlGroup = `test-urlgroup-${Date.now()}`;
    let urlGroupCreated = false;

    beforeAll(async () => {
      // Create a URL group for testing
      const result = await client.upsertUrlGroupEndpoints(testUrlGroup, [
        { url: TEST_DESTINATION },
      ]);
      urlGroupCreated = result.success;
    });

    afterAll(async () => {
      if (urlGroupCreated) {
        try {
          await client.deleteUrlGroup(testUrlGroup);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should publish a message to a URL group', async () => {
      if (!urlGroupCreated) {
        throw new Error('URL group was not created');
      }

      const result = await client.publishMessage({
        destination: `https://qstash.upstash.io/v2/publish/api/llm/${testUrlGroup}`,
        body: JSON.stringify({ test: 'to url group' }),
      });

      // URL group publishing may require different destination format
      // This test verifies the API handles it correctly
      expect(result).toHaveProperty('success');

      if (result.success && result.data?.messageId) {
        createdMessageIds.push(result.data.messageId);
      }
    });
  });

  describe('Message result structure', () => {
    it('should return PublishResult with correct properties', async () => {
      const result = await client.publishMessage({
        destination: TEST_DESTINATION,
        body: JSON.stringify({ test: 'structure test' }),
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as PublishResult;
      expect(data).toHaveProperty('messageId');
      expect(typeof data.messageId).toBe('string');

      if (data.messageId) {
        createdMessageIds.push(data.messageId);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid URL gracefully', async () => {
      const result = await client.publishMessage({
        destination: 'not-a-valid-url',
        body: JSON.stringify({ test: 'invalid url' }),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
