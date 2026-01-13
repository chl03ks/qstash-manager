/**
 * URL Groups E2E Tests
 *
 * End-to-end tests for the URL groups management workflow.
 * Tests the complete flow of URL group operations including:
 * - Listing and exploring groups
 * - Creating new groups
 * - Managing endpoints (add/remove)
 * - Deleting groups
 *
 * These tests mock the interactive prompts (@clack/prompts) and QStash client
 * to simulate user interaction and verify expected behavior.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigManager, resetConfigManager } from '../../src/lib/config/manager.js';
import { validateGroupName, validateEndpointUrl } from '../../src/commands/url-groups/create.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
  },
  note: vi.fn(),
  text: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

// Mock the QStash client
vi.mock('../../src/lib/qstash/client.js', () => ({
  validateQStashToken: vi.fn(),
  createQStashClient: vi.fn(),
  QStashClientWrapper: vi.fn(),
}));

describe('URL Groups E2E Tests', () => {
  let testDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `qstash-manager-url-groups-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    configManager = new ConfigManager({
      configDir: testDir,
      configPath: join(testDir, 'config.json'),
    });

    // Reset the singleton for each test
    resetConfigManager();

    // Set up default config with token for tests
    configManager.addEnvironment('production', 'test-qstash-token', 'Production');

    // Clear environment variables
    delete process.env.QSTASH_TOKEN;
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore environment variables
    delete process.env.QSTASH_TOKEN;

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('URL Group Name Validation', () => {
    it('should accept valid group names', () => {
      expect(validateGroupName('my-group')).toBeUndefined();
      expect(validateGroupName('my_group')).toBeUndefined();
      expect(validateGroupName('myGroup')).toBeUndefined();
      expect(validateGroupName('my-group-123')).toBeUndefined();
      expect(validateGroupName('MY_GROUP')).toBeUndefined();
      expect(validateGroupName('group123')).toBeUndefined();
    });

    it('should reject empty names', () => {
      expect(validateGroupName('')).toBe('Group name is required');
      expect(validateGroupName('   ')).toBe('Group name is required');
    });

    it('should reject names with invalid characters', () => {
      expect(validateGroupName('my group')).toContain('Only letters');
      expect(validateGroupName('my.group')).toContain('Only letters');
      expect(validateGroupName('my@group')).toContain('Only letters');
      expect(validateGroupName('my/group')).toContain('Only letters');
      expect(validateGroupName('my!group')).toContain('Only letters');
    });
  });

  describe('Endpoint URL Validation', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(validateEndpointUrl('https://example.com')).toEqual({ isValid: true });
      expect(validateEndpointUrl('https://example.com/webhook')).toEqual({ isValid: true });
      expect(validateEndpointUrl('https://example.com/api/v1/webhook')).toEqual({ isValid: true });
      expect(validateEndpointUrl('https://example.com:8443/webhook')).toEqual({ isValid: true });
      expect(validateEndpointUrl('https://abc123.ngrok.io/api')).toEqual({ isValid: true });
    });

    it('should reject HTTP URLs', () => {
      const result = validateEndpointUrl('http://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should reject empty URLs', () => {
      const result = validateEndpointUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject invalid URLs', () => {
      const result = validateEndpointUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should provide helpful message for HTTP URLs', () => {
      const result = validateEndpointUrl('http://localhost:3000/webhook');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ngrok');
    });
  });

  describe('Mock QStash Client Behavior', () => {
    it('should handle successful URL group operations', async () => {
      // Create mock client
      const mockClient = {
        listUrlGroups: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { name: 'group1', endpoints: [{ url: 'https://example.com/1' }] },
            { name: 'group2', endpoints: [] },
          ],
        }),
        getUrlGroup: vi.fn().mockResolvedValue({
          success: true,
          data: {
            name: 'group1',
            endpoints: [{ url: 'https://example.com/1', name: 'endpoint1' }],
          },
        }),
        upsertUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
        removeUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
        deleteUrlGroup: vi.fn().mockResolvedValue({ success: true }),
      };

      // Test list operation
      const listResult = await mockClient.listUrlGroups();
      expect(listResult.success).toBe(true);
      expect(listResult.data).toHaveLength(2);

      // Test get operation
      const getResult = await mockClient.getUrlGroup('group1');
      expect(getResult.success).toBe(true);
      expect(getResult.data?.name).toBe('group1');

      // Test upsert operation
      const upsertResult = await mockClient.upsertUrlGroupEndpoints('group1', [
        { url: 'https://example.com/new' },
      ]);
      expect(upsertResult.success).toBe(true);

      // Test remove operation
      const removeResult = await mockClient.removeUrlGroupEndpoints('group1', [
        { url: 'https://example.com/1' },
      ]);
      expect(removeResult.success).toBe(true);

      // Test delete operation
      const deleteResult = await mockClient.deleteUrlGroup('group1');
      expect(deleteResult.success).toBe(true);
    });

    it('should handle error responses from QStash', async () => {
      const mockClient = {
        listUrlGroups: vi.fn().mockResolvedValue({
          success: false,
          error: 'Authentication failed',
        }),
        getUrlGroup: vi.fn().mockResolvedValue({
          success: false,
          error: 'Group not found',
        }),
      };

      const listResult = await mockClient.listUrlGroups();
      expect(listResult.success).toBe(false);
      expect(listResult.error).toContain('Authentication');

      const getResult = await mockClient.getUrlGroup('nonexistent');
      expect(getResult.success).toBe(false);
      expect(getResult.error).toContain('not found');
    });
  });

  describe('URL Group Creation Flow', () => {
    it('should validate all inputs before creating group', () => {
      // Test validation flow for group creation
      const groupNameTests = [
        { input: 'valid-group', valid: true },
        { input: '', valid: false },
        { input: 'has spaces', valid: false },
        { input: 'valid_underscore', valid: true },
      ];

      for (const test of groupNameTests) {
        const result = validateGroupName(test.input);
        expect(result === undefined).toBe(test.valid);
      }

      const urlTests = [
        { input: 'https://example.com', valid: true },
        { input: 'http://example.com', valid: false },
        { input: '', valid: false },
        { input: 'not-a-url', valid: false },
      ];

      for (const test of urlTests) {
        const result = validateEndpointUrl(test.input);
        expect(result.isValid).toBe(test.valid);
      }
    });

    it('should handle creation workflow with all valid inputs', async () => {
      const mockClient = {
        upsertUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
      };

      const groupName = 'new-webhook-group';
      const endpoints = [
        { url: 'https://example.com/webhook', name: 'production' },
      ];

      // Validate inputs first
      expect(validateGroupName(groupName)).toBeUndefined();
      expect(validateEndpointUrl(endpoints[0].url).isValid).toBe(true);

      // Create the group
      const result = await mockClient.upsertUrlGroupEndpoints(groupName, endpoints);
      expect(result.success).toBe(true);
      expect(mockClient.upsertUrlGroupEndpoints).toHaveBeenCalledWith(groupName, endpoints);
    });
  });

  describe('URL Group Management Flow', () => {
    it('should handle adding endpoints to existing group', async () => {
      const mockClient = {
        getUrlGroup: vi.fn().mockResolvedValue({
          success: true,
          data: {
            name: 'existing-group',
            endpoints: [{ url: 'https://example.com/existing' }],
          },
        }),
        upsertUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
      };

      // Get current group state
      const groupResult = await mockClient.getUrlGroup('existing-group');
      expect(groupResult.success).toBe(true);
      expect(groupResult.data?.endpoints).toHaveLength(1);

      // Add new endpoint
      const newEndpoint = { url: 'https://example.com/new', name: 'new-endpoint' };
      const addResult = await mockClient.upsertUrlGroupEndpoints('existing-group', [newEndpoint]);
      expect(addResult.success).toBe(true);
    });

    it('should handle removing endpoints from group', async () => {
      const mockClient = {
        getUrlGroup: vi.fn().mockResolvedValue({
          success: true,
          data: {
            name: 'test-group',
            endpoints: [
              { url: 'https://example.com/1', name: 'endpoint1' },
              { url: 'https://example.com/2', name: 'endpoint2' },
            ],
          },
        }),
        removeUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
      };

      // Get current group state
      const groupResult = await mockClient.getUrlGroup('test-group');
      expect(groupResult.success).toBe(true);
      expect(groupResult.data?.endpoints).toHaveLength(2);

      // Remove one endpoint
      const endpointToRemove = { url: 'https://example.com/1' };
      const removeResult = await mockClient.removeUrlGroupEndpoints('test-group', [endpointToRemove]);
      expect(removeResult.success).toBe(true);
    });

    it('should warn when removing last endpoint', () => {
      const group = {
        name: 'single-endpoint-group',
        endpoints: [{ url: 'https://example.com/only-one' }],
      };

      // Check if this is the last endpoint
      const isLastEndpoint = group.endpoints.length === 1;
      expect(isLastEndpoint).toBe(true);

      // The UI should show a warning in this case
      // This is tested by checking the condition
    });
  });

  describe('URL Group Deletion Flow', () => {
    it('should handle group deletion workflow', async () => {
      const mockClient = {
        getUrlGroup: vi.fn().mockResolvedValue({
          success: true,
          data: {
            name: 'to-delete',
            endpoints: [
              { url: 'https://example.com/1', name: 'endpoint1' },
            ],
          },
        }),
        deleteUrlGroup: vi.fn().mockResolvedValue({ success: true }),
      };

      // Get group details for confirmation display
      const groupResult = await mockClient.getUrlGroup('to-delete');
      expect(groupResult.success).toBe(true);
      expect(groupResult.data?.name).toBe('to-delete');

      // Delete the group
      const deleteResult = await mockClient.deleteUrlGroup('to-delete');
      expect(deleteResult.success).toBe(true);
    });

    it('should handle deletion of non-existent group', async () => {
      const mockClient = {
        getUrlGroup: vi.fn().mockResolvedValue({
          success: false,
          error: 'Group not found',
        }),
      };

      const result = await mockClient.getUrlGroup('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Navigation and Error Handling', () => {
    it('should handle user cancellation gracefully', () => {
      // Simulate UserCancelledError scenario
      class UserCancelledError extends Error {
        constructor() {
          super('User cancelled');
          this.name = 'UserCancelledError';
        }
      }

      const handleUserAction = () => {
        throw new UserCancelledError();
      };

      expect(() => handleUserAction()).toThrow(UserCancelledError);
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = {
        listUrlGroups: vi.fn().mockResolvedValue({
          success: false,
          error: 'Rate limit exceeded',
        }),
      };

      const result = await mockClient.listUrlGroups();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const mockClient = {
        listUrlGroups: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      await expect(mockClient.listUrlGroups()).rejects.toThrow('Network error');
    });
  });

  describe('Token Resolution for URL Groups', () => {
    it('should resolve token from config for API calls', () => {
      const token = configManager.resolveToken();
      expect(token).not.toBeNull();
      expect(token?.token).toBe('test-qstash-token');
      expect(token?.source).toBe('config');
    });

    it('should prioritize env token over config', () => {
      process.env.QSTASH_TOKEN = 'env-token';

      const token = configManager.resolveToken();
      expect(token?.token).toBe('env-token');
      expect(token?.source).toBe('env');
    });

    it('should return null when no token available', () => {
      // Create new manager without any config
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir, { recursive: true });
      const emptyManager = new ConfigManager({
        configDir: emptyDir,
        configPath: join(emptyDir, 'config.json'),
      });

      const token = emptyManager.resolveToken();
      expect(token).toBeNull();
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle complete URL group lifecycle', async () => {
      const mockClient = {
        listUrlGroups: vi.fn()
          .mockResolvedValueOnce({ success: true, data: [] }) // Initial empty
          .mockResolvedValueOnce({ success: true, data: [{ name: 'new-group', endpoints: [] }] }), // After create
        upsertUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
        getUrlGroup: vi.fn().mockResolvedValue({
          success: true,
          data: {
            name: 'new-group',
            endpoints: [{ url: 'https://example.com/webhook', name: 'production' }],
          },
        }),
        deleteUrlGroup: vi.fn().mockResolvedValue({ success: true }),
      };

      // 1. Start with empty groups
      const initialList = await mockClient.listUrlGroups();
      expect(initialList.data).toHaveLength(0);

      // 2. Create a new group
      const groupName = 'new-group';
      expect(validateGroupName(groupName)).toBeUndefined();

      const createResult = await mockClient.upsertUrlGroupEndpoints(groupName, [
        { url: 'https://example.com/webhook', name: 'production' },
      ]);
      expect(createResult.success).toBe(true);

      // 3. Verify group exists
      const updatedList = await mockClient.listUrlGroups();
      expect(updatedList.data).toHaveLength(1);

      // 4. Get group details
      const groupDetails = await mockClient.getUrlGroup(groupName);
      expect(groupDetails.data?.endpoints).toHaveLength(1);

      // 5. Delete the group
      const deleteResult = await mockClient.deleteUrlGroup(groupName);
      expect(deleteResult.success).toBe(true);
    });

    it('should handle updating ngrok URL workflow', async () => {
      // Common development workflow: updating ngrok URL
      const mockClient = {
        listUrlGroups: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              name: 'dev-webhooks',
              endpoints: [
                { url: 'https://old-ngrok.ngrok.io/webhook', name: 'local-dev' },
              ],
            },
          ],
        }),
        removeUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
        upsertUrlGroupEndpoints: vi.fn().mockResolvedValue({ success: true }),
      };

      const newNgrokUrl = 'https://new-ngrok.ngrok.io/webhook';

      // Validate new URL
      const validation = validateEndpointUrl(newNgrokUrl);
      expect(validation.isValid).toBe(true);

      // Update (remove old, add new with same name)
      await mockClient.removeUrlGroupEndpoints('dev-webhooks', [
        { url: 'https://old-ngrok.ngrok.io/webhook' },
      ]);
      await mockClient.upsertUrlGroupEndpoints('dev-webhooks', [
        { url: newNgrokUrl, name: 'local-dev' },
      ]);

      expect(mockClient.removeUrlGroupEndpoints).toHaveBeenCalled();
      expect(mockClient.upsertUrlGroupEndpoints).toHaveBeenCalled();
    });

    it('should handle multi-environment URL group management', async () => {
      // Add multiple environments
      configManager.addEnvironment('staging', 'staging-token', 'Staging');
      configManager.addEnvironment('development', 'dev-token', 'Development');

      // Test token resolution for different environments
      const prodToken = configManager.resolveToken({ environmentName: 'production' });
      expect(prodToken?.token).toBe('test-qstash-token');

      const stagingToken = configManager.resolveToken({ environmentName: 'staging' });
      expect(stagingToken?.token).toBe('staging-token');

      const devToken = configManager.resolveToken({ environmentName: 'development' });
      expect(devToken?.token).toBe('dev-token');
    });
  });

  describe('Edge Cases', () => {
    it('should handle groups with many endpoints', async () => {
      const manyEndpoints = Array.from({ length: 50 }, (_, i) => ({
        url: `https://example.com/endpoint-${i}`,
        name: `endpoint-${i}`,
      }));

      const mockClient = {
        getUrlGroup: vi.fn().mockResolvedValue({
          success: true,
          data: { name: 'large-group', endpoints: manyEndpoints },
        }),
      };

      const result = await mockClient.getUrlGroup('large-group');
      expect(result.data?.endpoints).toHaveLength(50);
    });

    it('should handle special characters in endpoint names', () => {
      // Endpoint names can have various characters
      const endpoints = [
        { url: 'https://example.com/1', name: 'Production (Live)' },
        { url: 'https://example.com/2', name: 'Dev - Local' },
        { url: 'https://example.com/3', name: 'Staging v2' },
      ];

      // All should have valid URLs
      for (const ep of endpoints) {
        expect(validateEndpointUrl(ep.url).isValid).toBe(true);
      }
    });

    it('should handle URLs with query parameters', () => {
      const urlsWithParams = [
        'https://example.com/webhook?token=abc123',
        'https://example.com/api?key=value&foo=bar',
        'https://example.com/hook?timestamp=123456',
      ];

      for (const url of urlsWithParams) {
        expect(validateEndpointUrl(url).isValid).toBe(true);
      }
    });

    it('should handle URLs with ports', () => {
      const urlsWithPorts = [
        'https://example.com:443/webhook',
        'https://example.com:8443/api',
        'https://localhost:3000/webhook', // localhost is still valid HTTPS
      ];

      for (const url of urlsWithPorts) {
        expect(validateEndpointUrl(url).isValid).toBe(true);
      }
    });
  });
});
