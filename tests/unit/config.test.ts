/**
 * Config Manager Unit Tests
 *
 * Tests for the ConfigManager class including:
 * - Config file operations (load, save, delete)
 * - Environment management (add, update, remove, list)
 * - Token resolution with priority handling
 * - Preferences management
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CONFIG, DEFAULT_PREFERENCES } from '../../src/types/config.js';
import { ConfigManager, getConfigManager, resetConfigManager } from '../../src/lib/config/manager.js';

describe('ConfigManager', () => {
  let testDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `qstash-manager-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    configManager = new ConfigManager({
      configDir: testDir,
      configPath: join(testDir, 'config.json'),
    });

    // Reset the singleton for each test
    resetConfigManager();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore environment variables
    delete process.env.QSTASH_TOKEN;
  });

  describe('configExists', () => {
    it('should return false when config file does not exist', () => {
      expect(configManager.configExists()).toBe(false);
    });

    it('should return true when config file exists', () => {
      configManager.createConfig('production', 'test-token', 'Production');
      expect(configManager.configExists()).toBe(true);
    });
  });

  describe('load', () => {
    it('should return default config when file does not exist', () => {
      const config = configManager.load();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load config from file when it exists', () => {
      configManager.createConfig('prod', 'my-token', 'Production');
      configManager.clearCache();

      const config = configManager.load();
      expect(config.defaultEnvironment).toBe('prod');
      expect(config.environments.prod).toBeDefined();
      expect(config.environments.prod.token).toBe('my-token');
    });

    it('should use cached config on subsequent loads', () => {
      configManager.createConfig('prod', 'my-token', 'Production');

      const config1 = configManager.load();
      const config2 = configManager.load();

      expect(config1).toBe(config2); // Same object reference (cached)
    });

    it('should return default config when file is corrupted', () => {
      writeFileSync(join(testDir, 'config.json'), 'not valid json', 'utf-8');

      const config = configManager.load();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should normalize config with missing fields', () => {
      writeFileSync(
        join(testDir, 'config.json'),
        JSON.stringify({ environments: {} }),
        'utf-8'
      );

      const config = configManager.load();
      expect(config.version).toBe(DEFAULT_CONFIG.version);
      expect(config.defaultEnvironment).toBe('');
      expect(config.preferences).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('save', () => {
    it('should save config to disk', () => {
      const config = {
        ...DEFAULT_CONFIG,
        defaultEnvironment: 'test',
        environments: {
          test: {
            token: 'test-token',
            name: 'Test',
            createdAt: new Date().toISOString(),
          },
        },
      };

      configManager.save(config);

      expect(configManager.configExists()).toBe(true);
      configManager.clearCache();
      const loaded = configManager.load();
      expect(loaded.defaultEnvironment).toBe('test');
    });

    it('should create config directory if it does not exist', () => {
      const nestedDir = join(testDir, 'nested', 'path');
      const nestedManager = new ConfigManager({
        configDir: nestedDir,
        configPath: join(nestedDir, 'config.json'),
      });

      nestedManager.save(DEFAULT_CONFIG);

      expect(existsSync(nestedDir)).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear cached config', () => {
      configManager.createConfig('prod', 'my-token', 'Production');

      const config1 = configManager.load();
      configManager.clearCache();
      const config2 = configManager.load();

      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // But same values
    });
  });

  describe('addEnvironment', () => {
    it('should add a new environment', () => {
      const result = configManager.addEnvironment('production', 'prod-token', 'Production');

      expect(result.success).toBe(true);
      expect(result.environment).toBeDefined();
      expect(result.environment?.token).toBe('prod-token');
      expect(result.environment?.name).toBe('Production');
    });

    it('should normalize environment ID (lowercase, no spaces)', () => {
      configManager.addEnvironment('My Env', 'token', 'My Environment');

      const env = configManager.getEnvironment('my-env');
      expect(env).toBeDefined();
      expect(env?.name).toBe('My Environment');
    });

    it('should set first environment as default', () => {
      configManager.addEnvironment('first', 'token1');

      expect(configManager.getDefaultEnvironment()).toBe('first');
    });

    it('should not change default when adding subsequent environments', () => {
      configManager.addEnvironment('first', 'token1');
      configManager.addEnvironment('second', 'token2');

      expect(configManager.getDefaultEnvironment()).toBe('first');
    });

    it('should fail if environment already exists', () => {
      configManager.addEnvironment('prod', 'token1');
      const result = configManager.addEnvironment('prod', 'token2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should fail if environment ID is empty', () => {
      const result = configManager.addEnvironment('', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail if token is empty', () => {
      const result = configManager.addEnvironment('prod', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should use environment ID as name if display name not provided', () => {
      const result = configManager.addEnvironment('my-env', 'token');

      expect(result.success).toBe(true);
      expect(result.environment?.name).toBe('my-env');
    });
  });

  describe('updateEnvironment', () => {
    it('should update environment token', () => {
      configManager.addEnvironment('prod', 'old-token');

      const result = configManager.updateEnvironment('prod', { token: 'new-token' });

      expect(result.success).toBe(true);
      expect(result.environment?.token).toBe('new-token');
    });

    it('should update environment name', () => {
      configManager.addEnvironment('prod', 'token', 'Old Name');

      const result = configManager.updateEnvironment('prod', { name: 'New Name' });

      expect(result.success).toBe(true);
      expect(result.environment?.name).toBe('New Name');
    });

    it('should preserve unmodified fields', () => {
      configManager.addEnvironment('prod', 'token', 'Name');
      const original = configManager.getEnvironment('prod');

      configManager.updateEnvironment('prod', { name: 'New Name' });

      const updated = configManager.getEnvironment('prod');
      expect(updated?.token).toBe(original?.token);
      expect(updated?.createdAt).toBe(original?.createdAt);
    });

    it('should fail if environment does not exist', () => {
      const result = configManager.updateEnvironment('nonexistent', { token: 'token' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('removeEnvironment', () => {
    it('should remove an environment', () => {
      configManager.addEnvironment('prod', 'token');

      const result = configManager.removeEnvironment('prod');

      expect(result.success).toBe(true);
      expect(configManager.getEnvironment('prod')).toBeUndefined();
    });

    it('should update default when removing default environment', () => {
      configManager.addEnvironment('first', 'token1');
      configManager.addEnvironment('second', 'token2');

      const result = configManager.removeEnvironment('first');

      expect(result.success).toBe(true);
      expect(result.defaultAffected).toBe(true);
      expect(configManager.getDefaultEnvironment()).toBe('second');
    });

    it('should clear default when removing only environment', () => {
      configManager.addEnvironment('only', 'token');

      configManager.removeEnvironment('only');

      expect(configManager.getDefaultEnvironment()).toBe('');
    });

    it('should fail if environment does not exist', () => {
      const result = configManager.removeEnvironment('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('setDefaultEnvironment', () => {
    it('should set the default environment', () => {
      configManager.addEnvironment('first', 'token1');
      configManager.addEnvironment('second', 'token2');

      const result = configManager.setDefaultEnvironment('second');

      expect(result.success).toBe(true);
      expect(result.previousDefault).toBe('first');
      expect(configManager.getDefaultEnvironment()).toBe('second');
    });

    it('should fail if environment does not exist', () => {
      const result = configManager.setDefaultEnvironment('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('getEnvironment', () => {
    it('should return environment by ID', () => {
      configManager.addEnvironment('prod', 'token', 'Production');

      const env = configManager.getEnvironment('prod');

      expect(env).toBeDefined();
      expect(env?.name).toBe('Production');
    });

    it('should return undefined for non-existent environment', () => {
      const env = configManager.getEnvironment('nonexistent');

      expect(env).toBeUndefined();
    });
  });

  describe('listEnvironments', () => {
    it('should list all environments', () => {
      configManager.addEnvironment('prod', 'token1', 'Production');
      configManager.addEnvironment('staging', 'token2', 'Staging');

      const list = configManager.listEnvironments();

      expect(list).toHaveLength(2);
      expect(list.map((e) => e.id)).toContain('prod');
      expect(list.map((e) => e.id)).toContain('staging');
    });

    it('should indicate default environment', () => {
      configManager.addEnvironment('prod', 'token1');
      configManager.addEnvironment('staging', 'token2');

      const list = configManager.listEnvironments();

      const prodEntry = list.find((e) => e.id === 'prod');
      expect(prodEntry?.isDefault).toBe(true);
    });

    it('should include masked token when requested', () => {
      configManager.addEnvironment('prod', 'my-very-long-token-here');

      const list = configManager.listEnvironments({ includeToken: true });

      expect(list[0].maskedToken).toBeDefined();
      expect(list[0].maskedToken).toContain('*');
      expect(list[0].maskedToken).not.toBe('my-very-long-token-here');
    });

    it('should sort by creation date', () => {
      // Add environments with small delays to ensure different timestamps
      configManager.addEnvironment('first', 'token1');
      configManager.addEnvironment('second', 'token2');

      const list = configManager.listEnvironments();

      expect(list[0].id).toBe('first');
      expect(list[1].id).toBe('second');
    });
  });

  describe('hasEnvironments', () => {
    it('should return false when no environments exist', () => {
      expect(configManager.hasEnvironments()).toBe(false);
    });

    it('should return true when environments exist', () => {
      configManager.addEnvironment('prod', 'token');
      expect(configManager.hasEnvironments()).toBe(true);
    });
  });

  describe('getEnvironmentCount', () => {
    it('should return 0 when no environments exist', () => {
      expect(configManager.getEnvironmentCount()).toBe(0);
    });

    it('should return correct count of environments', () => {
      configManager.addEnvironment('first', 'token1');
      configManager.addEnvironment('second', 'token2');

      expect(configManager.getEnvironmentCount()).toBe(2);
    });
  });

  describe('resolveToken', () => {
    it('should prioritize CLI token', () => {
      configManager.addEnvironment('prod', 'config-token');
      process.env.QSTASH_TOKEN = 'env-token';

      const result = configManager.resolveToken({ cliToken: 'cli-token' });

      expect(result?.token).toBe('cli-token');
      expect(result?.source).toBe('cli');
    });

    it('should use environment variable when no CLI token', () => {
      configManager.addEnvironment('prod', 'config-token');
      process.env.QSTASH_TOKEN = 'env-token';

      const result = configManager.resolveToken();

      expect(result?.token).toBe('env-token');
      expect(result?.source).toBe('env');
    });

    it('should use config when no env var or CLI token', () => {
      configManager.addEnvironment('prod', 'config-token', 'Production');

      const result = configManager.resolveToken();

      expect(result?.token).toBe('config-token');
      expect(result?.source).toBe('config');
      expect(result?.environmentName).toBe('prod');
    });

    it('should use specified environment from config', () => {
      configManager.addEnvironment('prod', 'prod-token');
      configManager.addEnvironment('staging', 'staging-token');

      const result = configManager.resolveToken({ environmentName: 'staging' });

      expect(result?.token).toBe('staging-token');
      expect(result?.environmentName).toBe('staging');
    });

    it('should return null when no token found', () => {
      const result = configManager.resolveToken();

      expect(result).toBeNull();
    });

    it('should ignore empty CLI token', () => {
      configManager.addEnvironment('prod', 'config-token');

      const result = configManager.resolveToken({ cliToken: '  ' });

      expect(result?.token).toBe('config-token');
      expect(result?.source).toBe('config');
    });

    it('should ignore empty env token', () => {
      process.env.QSTASH_TOKEN = '   ';
      configManager.addEnvironment('prod', 'config-token');

      const result = configManager.resolveToken();

      expect(result?.token).toBe('config-token');
      expect(result?.source).toBe('config');
    });
  });

  describe('preferences', () => {
    it('should return default preferences when none set', () => {
      const prefs = configManager.getPreferences();

      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });

    it('should update preferences', () => {
      configManager.updatePreferences({ colorOutput: false });

      const prefs = configManager.getPreferences();

      expect(prefs.colorOutput).toBe(false);
      expect(prefs.confirmDestructiveActions).toBe(true); // Unchanged
    });

    it('should persist preferences to disk', () => {
      configManager.updatePreferences({ confirmDestructiveActions: false });
      configManager.clearCache();

      const prefs = configManager.getPreferences();

      expect(prefs.confirmDestructiveActions).toBe(false);
    });
  });

  describe('createConfig', () => {
    it('should create a new config with initial environment', () => {
      const config = configManager.createConfig('prod', 'my-token', 'Production');

      expect(config.version).toBe('1');
      expect(config.defaultEnvironment).toBe('prod');
      expect(config.environments.prod).toBeDefined();
      expect(config.environments.prod.token).toBe('my-token');
      expect(config.environments.prod.name).toBe('Production');
    });

    it('should persist config to disk', () => {
      configManager.createConfig('prod', 'my-token', 'Production');
      configManager.clearCache();

      const loaded = configManager.load();

      expect(loaded.defaultEnvironment).toBe('prod');
    });
  });

  describe('deleteConfig', () => {
    it('should delete config file', () => {
      configManager.createConfig('prod', 'token');

      const result = configManager.deleteConfig();

      expect(result).toBe(true);
      expect(configManager.configExists()).toBe(false);
    });

    it('should return false when no config exists', () => {
      const result = configManager.deleteConfig();

      expect(result).toBe(false);
    });
  });

  describe('getConfigManager singleton', () => {
    it('should return the same instance on subsequent calls', () => {
      const manager1 = getConfigManager({ configDir: testDir });
      const manager2 = getConfigManager();

      expect(manager1).toBe(manager2);
    });

    it('should create new instance when options provided', () => {
      const manager1 = getConfigManager({ configDir: testDir });
      const manager2 = getConfigManager({ configDir: join(testDir, 'new') });

      expect(manager1).not.toBe(manager2);
    });

    it('should reset singleton with resetConfigManager', () => {
      const manager1 = getConfigManager({ configDir: testDir });
      resetConfigManager();
      const manager2 = getConfigManager({ configDir: testDir });

      expect(manager1).not.toBe(manager2);
    });
  });
});
