/**
 * URL Groups Integration Tests
 *
 * Integration tests for QStash URL Groups API operations.
 * These tests run against the real QStash API.
 *
 * Requirements:
 * - QSTASH_TEST_TOKEN or QSTASH_TOKEN environment variable must be set
 * - Tests create real resources that are cleaned up in afterAll
 * - Uses unique names with timestamps to avoid conflicts
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { QStashClientWrapper } from '../../src/lib/qstash/client.js';
import type { UrlGroup, UrlGroupEndpoint } from '../../src/types/qstash.js';

// Get token from environment
const TEST_TOKEN = process.env.QSTASH_TEST_TOKEN || process.env.QSTASH_TOKEN;

// Skip all tests if no token is available
const describeWithToken = TEST_TOKEN ? describe : describe.skip;

// Unique prefix for test resources to avoid conflicts
const TEST_PREFIX = `test-${Date.now()}`;

// Track resources created during tests for cleanup
const createdGroups: string[] = [];

describeWithToken('URL Groups API Integration', () => {
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
    // Clean up all created groups
    for (const groupName of createdGroups) {
      try {
        await client.deleteUrlGroup(groupName);
      } catch {
        // Ignore cleanup errors (group may already be deleted)
      }
    }
  });

  describe('listUrlGroups', () => {
    it('should list URL groups successfully', async () => {
      const result = await client.listUrlGroups();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return groups with expected structure', async () => {
      const result = await client.listUrlGroups();

      expect(result.success).toBe(true);
      if (result.data && result.data.length > 0) {
        const group = result.data[0];
        expect(group).toHaveProperty('name');
        expect(group).toHaveProperty('endpoints');
        expect(Array.isArray(group.endpoints)).toBe(true);
      }
    });
  });

  describe('URL Group CRUD operations', () => {
    const testGroupName = `${TEST_PREFIX}-crud-group`;
    const testEndpoint: UrlGroupEndpoint = {
      url: 'https://example.com/webhook',
      name: 'test-endpoint',
    };

    it('should create a new URL group by adding endpoints', async () => {
      createdGroups.push(testGroupName);

      const result = await client.upsertUrlGroupEndpoints(testGroupName, [testEndpoint]);

      expect(result.success).toBe(true);
    });

    it('should get the created URL group', async () => {
      const result = await client.getUrlGroup(testGroupName);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(testGroupName);
      expect(result.data?.endpoints).toBeDefined();
      expect(result.data?.endpoints.length).toBeGreaterThanOrEqual(1);
    });

    it('should find the new group in list', async () => {
      const result = await client.listUrlGroups();

      expect(result.success).toBe(true);
      const foundGroup = result.data?.find((g: UrlGroup) => g.name === testGroupName);
      expect(foundGroup).toBeDefined();
    });

    it('should add additional endpoints to existing group', async () => {
      const additionalEndpoint: UrlGroupEndpoint = {
        url: 'https://example.com/webhook2',
        name: 'second-endpoint',
      };

      const result = await client.upsertUrlGroupEndpoints(testGroupName, [additionalEndpoint]);

      expect(result.success).toBe(true);

      // Verify the endpoint was added
      const groupResult = await client.getUrlGroup(testGroupName);
      expect(groupResult.success).toBe(true);
      expect(groupResult.data?.endpoints.length).toBeGreaterThanOrEqual(2);
    });

    it('should remove an endpoint from the group', async () => {
      const endpointToRemove: UrlGroupEndpoint = {
        url: 'https://example.com/webhook2',
      };

      const result = await client.removeUrlGroupEndpoints(testGroupName, [endpointToRemove]);

      expect(result.success).toBe(true);

      // Verify the endpoint was removed
      const groupResult = await client.getUrlGroup(testGroupName);
      expect(groupResult.success).toBe(true);
      const remainingEndpoints = groupResult.data?.endpoints || [];
      const removed = !remainingEndpoints.some(
        (e: UrlGroupEndpoint) => e.url === 'https://example.com/webhook2'
      );
      expect(removed).toBe(true);
    });

    it('should delete the URL group', async () => {
      const result = await client.deleteUrlGroup(testGroupName);

      expect(result.success).toBe(true);

      // Remove from cleanup list since we already deleted it
      const index = createdGroups.indexOf(testGroupName);
      if (index > -1) {
        createdGroups.splice(index, 1);
      }
    });

    it('should return error when getting deleted group', async () => {
      const result = await client.getUrlGroup(testGroupName);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.toLowerCase()).toContain('not found');
    });
  });

  describe('URL Group with multiple endpoints', () => {
    const multiEndpointGroup = `${TEST_PREFIX}-multi-endpoint`;

    it('should create a group with multiple endpoints at once', async () => {
      createdGroups.push(multiEndpointGroup);

      const endpoints: UrlGroupEndpoint[] = [
        { url: 'https://example.com/endpoint1', name: 'endpoint-1' },
        { url: 'https://example.com/endpoint2', name: 'endpoint-2' },
        { url: 'https://example.com/endpoint3', name: 'endpoint-3' },
      ];

      const result = await client.upsertUrlGroupEndpoints(multiEndpointGroup, endpoints);

      expect(result.success).toBe(true);

      // Verify all endpoints were added
      const groupResult = await client.getUrlGroup(multiEndpointGroup);
      expect(groupResult.success).toBe(true);
      expect(groupResult.data?.endpoints.length).toBe(3);
    });

    it('should remove multiple endpoints at once', async () => {
      const endpointsToRemove: UrlGroupEndpoint[] = [
        { url: 'https://example.com/endpoint1' },
        { url: 'https://example.com/endpoint2' },
      ];

      const result = await client.removeUrlGroupEndpoints(multiEndpointGroup, endpointsToRemove);

      expect(result.success).toBe(true);

      // Verify endpoints were removed
      const groupResult = await client.getUrlGroup(multiEndpointGroup);
      expect(groupResult.success).toBe(true);
      expect(groupResult.data?.endpoints.length).toBe(1);
      expect(groupResult.data?.endpoints[0].url).toBe('https://example.com/endpoint3');
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent group gracefully', async () => {
      const result = await client.getUrlGroup('definitely-does-not-exist-12345');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle deleting non-existent group gracefully', async () => {
      const result = await client.deleteUrlGroup('definitely-does-not-exist-12345');

      // QStash may return success for deleting non-existent groups
      // or return an error - both are acceptable
      expect(result).toHaveProperty('success');
    });
  });

  describe('URL Group naming', () => {
    it('should accept group names with hyphens', async () => {
      const groupName = `${TEST_PREFIX}-with-hyphens`;
      createdGroups.push(groupName);

      const result = await client.upsertUrlGroupEndpoints(groupName, [
        { url: 'https://example.com/test' },
      ]);

      expect(result.success).toBe(true);
    });

    it('should accept group names with underscores', async () => {
      const groupName = `${TEST_PREFIX}_with_underscores`;
      createdGroups.push(groupName);

      const result = await client.upsertUrlGroupEndpoints(groupName, [
        { url: 'https://example.com/test' },
      ]);

      expect(result.success).toBe(true);
    });

    it('should accept group names with numbers', async () => {
      const groupName = `${TEST_PREFIX}-group123`;
      createdGroups.push(groupName);

      const result = await client.upsertUrlGroupEndpoints(groupName, [
        { url: 'https://example.com/test' },
      ]);

      expect(result.success).toBe(true);
    });
  });

  describe('Endpoint URL handling', () => {
    const urlTestGroup = `${TEST_PREFIX}-url-test`;

    beforeAll(async () => {
      createdGroups.push(urlTestGroup);
    });

    it('should accept HTTPS URLs with paths', async () => {
      const result = await client.upsertUrlGroupEndpoints(urlTestGroup, [
        { url: 'https://example.com/api/v1/webhook' },
      ]);

      expect(result.success).toBe(true);
    });

    it('should accept HTTPS URLs with query parameters', async () => {
      const result = await client.upsertUrlGroupEndpoints(urlTestGroup, [
        { url: 'https://example.com/webhook?key=value&foo=bar' },
      ]);

      expect(result.success).toBe(true);
    });

    it('should accept HTTPS URLs with ports', async () => {
      const result = await client.upsertUrlGroupEndpoints(urlTestGroup, [
        { url: 'https://example.com:8443/webhook' },
      ]);

      expect(result.success).toBe(true);
    });
  });
});
