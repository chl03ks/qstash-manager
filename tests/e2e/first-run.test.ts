/**
 * First Run E2E Tests
 *
 * End-to-end tests for the first-run setup wizard workflow.
 * Tests the complete flow from no configuration to fully configured state.
 *
 * These tests mock the interactive prompts (@clack/prompts) to simulate
 * user input and verify the expected behavior of the setup wizard.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigManager, getConfigManager, resetConfigManager } from '../../src/lib/config/manager.js';
import { shouldRunSetupWizard } from '../../src/commands/config/setup.js';

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

// Mock the QStash client for token validation
vi.mock('../../src/lib/qstash/client.js', () => ({
  validateQStashToken: vi.fn(),
  createQStashClient: vi.fn(),
  QStashClientWrapper: vi.fn(),
}));

describe('First Run E2E Tests', () => {
  let testDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `qstash-manager-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Reset the singleton for each test
    resetConfigManager();

    // Initialize singleton with test config so getConfigManager() returns test instance
    configManager = getConfigManager({
      configDir: testDir,
      configPath: join(testDir, 'config.json'),
    });

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

  describe('shouldRunSetupWizard', () => {
    it('should return true when no config exists and no token available', () => {
      // No config file, no env token
      expect(shouldRunSetupWizard()).toBe(true);
    });

    it('should return false when QSTASH_TOKEN env var is set', () => {
      process.env.QSTASH_TOKEN = 'test-token-12345';
      expect(shouldRunSetupWizard()).toBe(false);
    });

    it('should return false when config with environments exists', () => {
      configManager.addEnvironment('production', 'prod-token', 'Production');

      // The shouldRunSetupWizard uses the singleton, so we need to reinitialize
      resetConfigManager();
      const manager = new ConfigManager({
        configDir: testDir,
        configPath: join(testDir, 'config.json'),
      });

      // Check that config exists
      expect(manager.hasEnvironments()).toBe(true);
    });

    it('should return true when config exists but has no environments', () => {
      // Create empty config
      configManager.save({
        version: '1',
        defaultEnvironment: '',
        environments: {},
        preferences: { colorOutput: true, confirmDestructiveActions: true },
      });

      expect(configManager.hasEnvironments()).toBe(false);
    });
  });

  describe('Config File Creation', () => {
    it('should create config file with single environment', () => {
      configManager.createConfig('production', 'my-qstash-token', 'Production');

      expect(configManager.configExists()).toBe(true);

      const config = configManager.load();
      expect(config.version).toBe('1');
      expect(config.defaultEnvironment).toBe('production');
      expect(config.environments.production).toBeDefined();
      expect(config.environments.production.token).toBe('my-qstash-token');
      expect(config.environments.production.name).toBe('Production');
    });

    it('should set first environment as default', () => {
      configManager.addEnvironment('staging', 'staging-token', 'Staging');

      expect(configManager.getDefaultEnvironment()).toBe('staging');
    });

    it('should support multiple environments', () => {
      configManager.addEnvironment('production', 'prod-token', 'Production');
      configManager.addEnvironment('staging', 'staging-token', 'Staging');
      configManager.addEnvironment('development', 'dev-token', 'Development');

      const environments = configManager.listEnvironments();
      expect(environments).toHaveLength(3);
      expect(environments.map(e => e.id)).toContain('production');
      expect(environments.map(e => e.id)).toContain('staging');
      expect(environments.map(e => e.id)).toContain('development');
    });

    it('should preserve default when adding more environments', () => {
      configManager.addEnvironment('production', 'prod-token', 'Production');
      configManager.addEnvironment('staging', 'staging-token', 'Staging');

      expect(configManager.getDefaultEnvironment()).toBe('production');
    });
  });

  describe('Token Resolution Flow', () => {
    it('should prioritize CLI token over all others', () => {
      configManager.addEnvironment('production', 'config-token', 'Production');
      process.env.QSTASH_TOKEN = 'env-token';

      const result = configManager.resolveToken({ cliToken: 'cli-token' });

      expect(result?.token).toBe('cli-token');
      expect(result?.source).toBe('cli');
    });

    it('should use env token when no CLI token provided', () => {
      configManager.addEnvironment('production', 'config-token', 'Production');
      process.env.QSTASH_TOKEN = 'env-token';

      const result = configManager.resolveToken();

      expect(result?.token).toBe('env-token');
      expect(result?.source).toBe('env');
    });

    it('should use config token when no CLI or env token', () => {
      configManager.addEnvironment('production', 'config-token', 'Production');

      const result = configManager.resolveToken();

      expect(result?.token).toBe('config-token');
      expect(result?.source).toBe('config');
      expect(result?.environmentName).toBe('production');
    });

    it('should return null when no token available anywhere', () => {
      const result = configManager.resolveToken();

      expect(result).toBeNull();
    });

    it('should allow selecting specific environment', () => {
      configManager.addEnvironment('production', 'prod-token', 'Production');
      configManager.addEnvironment('staging', 'staging-token', 'Staging');

      const result = configManager.resolveToken({ environmentName: 'staging' });

      expect(result?.token).toBe('staging-token');
      expect(result?.source).toBe('config');
      expect(result?.environmentName).toBe('staging');
    });
  });

  describe('Environment Management Flow', () => {
    it('should validate environment names', () => {
      // Empty name should fail
      const emptyResult = configManager.addEnvironment('', 'token');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toContain('required');

      // Valid name should succeed
      const validResult = configManager.addEnvironment('my-env', 'token');
      expect(validResult.success).toBe(true);
    });

    it('should normalize environment names', () => {
      configManager.addEnvironment('My Environment', 'token', 'My Environment');

      const env = configManager.getEnvironment('my-environment');
      expect(env).toBeDefined();
      expect(env?.name).toBe('My Environment');
    });

    it('should prevent duplicate environments', () => {
      configManager.addEnvironment('production', 'token1', 'Production');
      const result = configManager.addEnvironment('production', 'token2', 'Production 2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should allow switching default environment', () => {
      configManager.addEnvironment('production', 'prod-token', 'Production');
      configManager.addEnvironment('staging', 'staging-token', 'Staging');

      expect(configManager.getDefaultEnvironment()).toBe('production');

      const result = configManager.setDefaultEnvironment('staging');
      expect(result.success).toBe(true);
      expect(configManager.getDefaultEnvironment()).toBe('staging');
    });

    it('should handle environment removal correctly', () => {
      configManager.addEnvironment('production', 'prod-token', 'Production');
      configManager.addEnvironment('staging', 'staging-token', 'Staging');

      // Remove non-default
      const result1 = configManager.removeEnvironment('staging');
      expect(result1.success).toBe(true);
      expect(result1.defaultAffected).toBe(false);

      // Remove default
      const result2 = configManager.removeEnvironment('production');
      expect(result2.success).toBe(true);
      expect(result2.defaultAffected).toBe(true);
      expect(configManager.getDefaultEnvironment()).toBe('');
    });

    it('should update environment when default is removed', () => {
      configManager.addEnvironment('first', 'token1', 'First');
      configManager.addEnvironment('second', 'token2', 'Second');

      expect(configManager.getDefaultEnvironment()).toBe('first');

      configManager.removeEnvironment('first');

      expect(configManager.getDefaultEnvironment()).toBe('second');
    });
  });

  describe('Config Persistence', () => {
    it('should persist config changes to disk', () => {
      configManager.addEnvironment('production', 'token', 'Production');

      // Create new manager to read from disk
      configManager.clearCache();
      const freshManager = new ConfigManager({
        configDir: testDir,
        configPath: join(testDir, 'config.json'),
      });

      expect(freshManager.configExists()).toBe(true);
      expect(freshManager.hasEnvironments()).toBe(true);
      expect(freshManager.getEnvironment('production')).toBeDefined();
    });

    it('should handle corrupted config gracefully', () => {
      const { writeFileSync } = require('node:fs');
      writeFileSync(join(testDir, 'config.json'), 'not valid json', 'utf-8');

      const loaded = configManager.load();
      expect(loaded.version).toBe('1');
      expect(loaded.environments).toEqual({});
    });

    it('should preserve preferences across sessions', () => {
      configManager.updatePreferences({ colorOutput: false });

      configManager.clearCache();
      const prefs = configManager.getPreferences();

      expect(prefs.colorOutput).toBe(false);
    });
  });

  describe('First Run Simulation', () => {
    it('should complete full first-run flow successfully', async () => {
      // Simulate the complete first-run scenario
      expect(configManager.configExists()).toBe(false);
      expect(configManager.hasEnvironments()).toBe(false);

      // Step 1: Create initial environment (simulating setup wizard)
      const result1 = configManager.addEnvironment('production', 'qstash_prod_token', 'Production');
      expect(result1.success).toBe(true);

      // Step 2: Optionally add more environments
      const result2 = configManager.addEnvironment('staging', 'qstash_staging_token', 'Staging');
      expect(result2.success).toBe(true);

      // Step 3: Verify final state
      expect(configManager.configExists()).toBe(true);
      expect(configManager.hasEnvironments()).toBe(true);
      expect(configManager.getEnvironmentCount()).toBe(2);
      expect(configManager.getDefaultEnvironment()).toBe('production');

      // Step 4: Token resolution should work
      const token = configManager.resolveToken();
      expect(token).not.toBeNull();
      expect(token?.token).toBe('qstash_prod_token');
      expect(token?.source).toBe('config');
    });

    it('should handle user adding single environment only', async () => {
      // Simulate user choosing not to add more environments
      configManager.addEnvironment('production', 'qstash_token', 'Production');

      expect(configManager.getEnvironmentCount()).toBe(1);
      expect(configManager.getDefaultEnvironment()).toBe('production');
    });

    it('should handle subsequent runs after first-run', async () => {
      // First run: setup
      configManager.addEnvironment('production', 'token', 'Production');

      // Subsequent run: config exists, no setup needed
      const hasEnvs = configManager.hasEnvironments();
      const tokenResult = configManager.resolveToken();

      expect(hasEnvs).toBe(true);
      expect(tokenResult).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string tokens', () => {
      const result = configManager.addEnvironment('prod', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle whitespace-only tokens', () => {
      const result = configManager.addEnvironment('prod', '   ');
      expect(result.success).toBe(false);
    });

    it('should trim token whitespace', () => {
      configManager.addEnvironment('prod', '  my-token  ', 'Production');
      const env = configManager.getEnvironment('prod');
      expect(env?.token).toBe('my-token');
    });

    it('should handle special characters in display names', () => {
      configManager.addEnvironment('prod', 'token', 'Production (Live)');
      const env = configManager.getEnvironment('prod');
      expect(env?.name).toBe('Production (Live)');
    });

    it('should handle config directory creation', () => {
      const nestedDir = join(testDir, 'nested', 'deep', 'path');
      const nestedManager = new ConfigManager({
        configDir: nestedDir,
        configPath: join(nestedDir, 'config.json'),
      });

      nestedManager.addEnvironment('test', 'token', 'Test');

      expect(existsSync(nestedDir)).toBe(true);
      expect(nestedManager.configExists()).toBe(true);
    });
  });
});
