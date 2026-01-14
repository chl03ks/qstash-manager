/**
 * QStash Client Wrapper Unit Tests
 *
 * Tests for the QStashClientWrapper class including:
 * - Client initialization and configuration
 * - Token information retrieval
 * - Error handling and retry logic
 * - Operation result formatting
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QStashClientWrapper, createQStashClient, validateQStashToken } from '../../src/lib/qstash/client.js';
import {
  parseApiError,
  QStashAuthError,
  QStashBadRequestError,
  QStashNetworkError,
  QStashNotFoundError,
  QStashRateLimitError,
  QStashServerError,
} from '../../src/lib/qstash/errors.js';
import { DEFAULT_RETRY_OPTIONS } from '../../src/lib/qstash/types.js';

// Mock the @upstash/qstash Client
vi.mock('@upstash/qstash', () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      urlGroups: {
        list: vi.fn(),
        get: vi.fn(),
        addEndpoints: vi.fn(),
        removeEndpoints: vi.fn(),
        delete: vi.fn(),
      },
      schedules: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        delete: vi.fn(),
      },
      queue: vi.fn().mockReturnValue({
        enqueueJSON: vi.fn(),
      }),
      messages: {
        delete: vi.fn(),
      },
      dlq: {
        listMessages: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      events: vi.fn(),
      keys: vi.fn(),
      publishJSON: vi.fn(),
      http: {
        request: vi.fn(),
      },
    })),
  };
});

describe('QStashClientWrapper', () => {
  let wrapper: QStashClientWrapper;
  const testToken = 'test-qstash-token';

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = new QStashClientWrapper({ token: testToken });
  });

  describe('constructor', () => {
    it('should create client with default retry options', () => {
      const client = new QStashClientWrapper({ token: testToken });
      expect(client).toBeDefined();
    });

    it('should create client with custom retry options', () => {
      const client = new QStashClientWrapper({
        token: testToken,
        retry: { maxRetries: 5, initialDelay: 500 },
      });
      expect(client).toBeDefined();
    });

    it('should create client with retry disabled', () => {
      const client = new QStashClientWrapper({
        token: testToken,
        retry: false,
      });
      expect(client).toBeDefined();
    });
  });

  describe('getTokenInfo', () => {
    it('should return token info with default source', () => {
      const info = wrapper.getTokenInfo();
      expect(info.source).toBe('cli');
      expect(info.environmentName).toBeUndefined();
    });

    it('should return token info with provided source', () => {
      const client = new QStashClientWrapper(
        { token: testToken },
        { source: 'config', environmentName: 'production' }
      );

      const info = client.getTokenInfo();
      expect(info.source).toBe('config');
      expect(info.environmentName).toBe('production');
    });
  });

  describe('getClient', () => {
    it('should return the underlying client', () => {
      const client = wrapper.getClient();
      expect(client).toBeDefined();
      expect(client.urlGroups).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('should return success when token is valid', async () => {
      const mockClient = wrapper.getClient();
      vi.mocked(mockClient.urlGroups.list).mockResolvedValue([]);

      const result = await wrapper.validateToken();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return failure when token is invalid', async () => {
      const mockClient = wrapper.getClient();
      vi.mocked(mockClient.urlGroups.list).mockRejectedValue(
        new Error('401 Unauthorized')
      );

      const result = await wrapper.validateToken();

      expect(result.success).toBe(false);
      expect(result.data).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('URL Groups Operations', () => {
    describe('listUrlGroups', () => {
      it('should list URL groups successfully', async () => {
        const mockGroups = [
          { name: 'group1', endpoints: [{ url: 'https://example.com' }] },
          { name: 'group2', endpoints: [] },
        ];
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.list).mockResolvedValue(mockGroups);

        const result = await wrapper.listUrlGroups();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data?.[0].name).toBe('group1');
      });

      it('should handle errors when listing URL groups', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.list).mockRejectedValue(
          new Error('Network error')
        );

        const result = await wrapper.listUrlGroups();

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('getUrlGroup', () => {
      it('should get a URL group by name', async () => {
        const mockGroup = { name: 'test-group', endpoints: [] };
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.get).mockResolvedValue(mockGroup);

        const result = await wrapper.getUrlGroup('test-group');

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('test-group');
      });

      it('should handle not found error', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.get).mockRejectedValue(
          new Error('404 Not Found')
        );

        const result = await wrapper.getUrlGroup('nonexistent');

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('upsertUrlGroupEndpoints', () => {
      it('should add endpoints to a URL group', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.addEndpoints).mockResolvedValue(undefined);

        const result = await wrapper.upsertUrlGroupEndpoints('group1', [
          { url: 'https://example.com' },
        ]);

        expect(result.success).toBe(true);
        expect(mockClient.urlGroups.addEndpoints).toHaveBeenCalledWith({
          name: 'group1',
          endpoints: [{ url: 'https://example.com' }],
        });
      });
    });

    describe('removeUrlGroupEndpoints', () => {
      it('should remove endpoints from a URL group', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.removeEndpoints).mockResolvedValue(undefined);

        const result = await wrapper.removeUrlGroupEndpoints('group1', [
          { url: 'https://example.com' },
        ]);

        expect(result.success).toBe(true);
      });
    });

    describe('deleteUrlGroup', () => {
      it('should delete a URL group', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.urlGroups.delete).mockResolvedValue(undefined);

        const result = await wrapper.deleteUrlGroup('group1');

        expect(result.success).toBe(true);
        expect(mockClient.urlGroups.delete).toHaveBeenCalledWith('group1');
      });
    });
  });

  describe('Schedule Operations', () => {
    describe('listSchedules', () => {
      it('should list schedules successfully', async () => {
        const mockSchedules = [
          {
            scheduleId: 'sched1',
            cron: '0 * * * *',
            destination: 'https://example.com',
          },
        ];
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.schedules.list).mockResolvedValue(mockSchedules);

        const result = await wrapper.listSchedules();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });

    describe('getSchedule', () => {
      it('should get a schedule by ID', async () => {
        const mockSchedule = {
          scheduleId: 'sched1',
          cron: '0 * * * *',
          destination: 'https://example.com',
        };
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.schedules.get).mockResolvedValue(mockSchedule);

        const result = await wrapper.getSchedule('sched1');

        expect(result.success).toBe(true);
        expect(result.data?.scheduleId).toBe('sched1');
      });
    });

    describe('createSchedule', () => {
      it('should create a new schedule', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.schedules.create).mockResolvedValue({
          scheduleId: 'new-sched',
        });

        const result = await wrapper.createSchedule({
          destination: 'https://example.com',
          cron: '0 * * * *',
        });

        expect(result.success).toBe(true);
        expect(result.data).toBe('new-sched');
      });
    });

    describe('pauseSchedule', () => {
      it('should pause a schedule', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.schedules.pause).mockResolvedValue(undefined);

        const result = await wrapper.pauseSchedule('sched1');

        expect(result.success).toBe(true);
      });
    });

    describe('resumeSchedule', () => {
      it('should resume a schedule', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.schedules.resume).mockResolvedValue(undefined);

        const result = await wrapper.resumeSchedule('sched1');

        expect(result.success).toBe(true);
      });
    });

    describe('deleteSchedule', () => {
      it('should delete a schedule', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.schedules.delete).mockResolvedValue(undefined);

        const result = await wrapper.deleteSchedule('sched1');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Queue Operations', () => {
    it('should list queues successfully', async () => {
      const mockClient = wrapper.getClient();
      // Mock queue() to return an object with list method
      (mockClient.queue as any).mockReturnValue({
        list: vi.fn().mockResolvedValue([
          { name: 'queue1', parallelism: 1, paused: false }
        ]),
        get: vi.fn(),
        upsert: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        delete: vi.fn(),
      });

      const result = await wrapper.listQueues();

      expect(result.success).toBe(true);
    });
  });

  describe('DLQ Operations', () => {
    describe('listDlqMessages', () => {
      it('should list DLQ messages', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.dlq.listMessages).mockResolvedValue({
          messages: [
            { dlqId: 'dlq1', messageId: 'msg1', url: 'https://example.com' },
          ],
        });

        const result = await wrapper.listDlqMessages();

        expect(result.success).toBe(true);
        expect(result.data?.messages).toHaveLength(1);
      });
    });

    describe('deleteDlqMessages', () => {
      it('should delete multiple DLQ messages', async () => {
        const mockClient = wrapper.getClient();
        vi.mocked(mockClient.dlq.deleteMany).mockResolvedValue({ deleted: 2 });

        const result = await wrapper.deleteDlqMessages(['dlq1', 'dlq2']);

        expect(result.success).toBe(true);
        expect(result.data).toBe(2);
      });
    });
  });

  describe('Signing Keys', () => {
    it('should get signing keys', async () => {
      const mockClient = wrapper.getClient();
      vi.mocked(mockClient.http.request).mockResolvedValue({
        current: 'current-key',
        next: 'next-key',
      });

      const result = await wrapper.getSigningKeys();

      expect(result.success).toBe(true);
      expect(result.data?.current).toBe('current-key');
      expect(result.data?.next).toBe('next-key');
    });
  });
});

describe('createQStashClient', () => {
  it('should create a client wrapper', () => {
    const wrapper = createQStashClient('test-token');
    expect(wrapper).toBeInstanceOf(QStashClientWrapper);
  });

  it('should create client with token info', () => {
    const wrapper = createQStashClient(
      'test-token',
      { source: 'env', environmentName: 'staging' }
    );

    const info = wrapper.getTokenInfo();
    expect(info.source).toBe('env');
    expect(info.environmentName).toBe('staging');
  });
});

describe('validateQStashToken', () => {
  it('should validate a token', async () => {
    const result = await validateQStashToken('test-token');
    // Will fail with mock, but verifies the function exists and returns proper shape
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
  });
});

describe('QStash Error Classes', () => {
  describe('parseApiError', () => {
    it('should return same error if already QStashError', () => {
      const original = new QStashAuthError('test', undefined);
      const parsed = parseApiError(original, 'context');

      expect(parsed).toBe(original);
    });

    it('should parse 401 errors as auth errors', () => {
      const error = new Error('401 Unauthorized');
      const parsed = parseApiError(error, 'test');

      expect(parsed).toBeInstanceOf(QStashAuthError);
    });

    it('should parse 404 errors as not found errors', () => {
      const error = new Error('404 Not Found');
      const parsed = parseApiError(error, 'test');

      expect(parsed).toBeInstanceOf(QStashNotFoundError);
    });

    it('should parse 429 errors as rate limit errors', () => {
      const error = new Error('429 Too Many Requests');
      const parsed = parseApiError(error, 'test');

      expect(parsed).toBeInstanceOf(QStashRateLimitError);
    });

    it('should parse 400 errors as bad request errors', () => {
      const error = new Error('400 Bad Request');
      const parsed = parseApiError(error, 'test');

      expect(parsed).toBeInstanceOf(QStashBadRequestError);
    });

    it('should parse 500 errors as server errors', () => {
      const error = new Error('500 Internal Server Error');
      const parsed = parseApiError(error, 'test');

      expect(parsed).toBeInstanceOf(QStashServerError);
      expect(parsed.isRetryable).toBe(true);
    });

    it('should parse network errors', () => {
      const error = new Error('ECONNREFUSED');
      const parsed = parseApiError(error, 'test');

      expect(parsed).toBeInstanceOf(QStashNetworkError);
      expect(parsed.isRetryable).toBe(true);
    });

    it('should handle non-Error objects', () => {
      const parsed = parseApiError('string error', 'test');

      expect(parsed.message).toContain('string error');
    });

    it('should extract retry-after from rate limit message', () => {
      const error = new Error('429 rate limit exceeded, retry after 30 seconds');
      const parsed = parseApiError(error, 'test') as QStashRateLimitError;

      expect(parsed.retryAfter).toBe(30);
    });
  });

  describe('QStashAuthError', () => {
    it('should have correct properties', () => {
      const error = new QStashAuthError('test context');

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.isRetryable).toBe(false);
      expect(error.getUserMessage()).toContain('Authentication failed');
    });
  });

  describe('QStashNotFoundError', () => {
    it('should include resource info in message', () => {
      const error = new QStashNotFoundError('test', {
        resourceType: 'URL group',
        resourceId: 'my-group',
      });

      expect(error.getUserMessage()).toContain('URL group');
      expect(error.getUserMessage()).toContain('my-group');
    });
  });

  describe('QStashRateLimitError', () => {
    it('should include retry-after in message', () => {
      const error = new QStashRateLimitError('test', { retryAfter: 60 });

      expect(error.getUserMessage()).toContain('60 seconds');
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('QStashServerError', () => {
    it('should include status code in message', () => {
      const error = new QStashServerError('test', 503);

      expect(error.getUserMessage()).toContain('503');
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('QStashNetworkError', () => {
    it('should have correct properties', () => {
      const error = new QStashNetworkError('test');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.isRetryable).toBe(true);
      expect(error.getUserMessage()).toContain('Network error');
    });
  });
});

describe('DEFAULT_RETRY_OPTIONS', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_OPTIONS.initialDelay).toBe(1000);
    expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(10000);
    expect(DEFAULT_RETRY_OPTIONS.multiplier).toBe(2);
  });
});
