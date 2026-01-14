/**
 * Config Manager
 *
 * Manages the qstash-manager configuration file including
 * multi-environment support and token resolution.
 *
 * Config file location: ~/.qstash-manager/config.json
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  DEFAULT_CONFIG,
  DEFAULT_PREFERENCES,
  type Config,
  type Environment,
  type Preferences,
  type TokenResolutionOptions,
  type TokenResolutionResult,
} from '../../types/config.js';

import type {
  AddEnvironmentResult,
  ConfigManagerOptions,
  EnvironmentListEntry,
  ListEnvironmentsOptions,
  RemoveEnvironmentResult,
  SetDefaultResult,
} from './types.js';

/**
 * Default config directory name
 */
const CONFIG_DIR_NAME = '.qstash-manager';

/**
 * Config file name
 */
const CONFIG_FILE_NAME = 'config.json';

/**
 * ConfigManager handles all configuration file operations
 * including multi-environment support and token resolution.
 */
export class ConfigManager {
  private configPath: string;
  private configDir: string;
  private cachedConfig: Config | null = null;

  constructor(options: ConfigManagerOptions = {}) {
    this.configDir = options.configDir ?? join(homedir(), CONFIG_DIR_NAME);
    this.configPath = options.configPath ?? join(this.configDir, CONFIG_FILE_NAME);
  }

  /**
   * Get the config directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get the config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if a config file exists
   */
  configExists(): boolean {
    return existsSync(this.configPath);
  }

  /**
   * Load the config from disk
   * Returns default config if file doesn't exist
   */
  load(): Config {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    if (!this.configExists()) {
      return {
        ...DEFAULT_CONFIG,
        environments: { ...DEFAULT_CONFIG.environments },
        preferences: { ...DEFAULT_PREFERENCES },
      };
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(content) as Config;

      // Ensure all required fields exist with defaults
      const normalizedConfig: Config = {
        version: config.version ?? DEFAULT_CONFIG.version,
        defaultEnvironment: config.defaultEnvironment ?? DEFAULT_CONFIG.defaultEnvironment,
        environments: config.environments ?? { ...DEFAULT_CONFIG.environments },
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...config.preferences,
        },
      };

      this.cachedConfig = normalizedConfig;
      return normalizedConfig;
    } catch {
      // If file is corrupted, return default config
      return {
        ...DEFAULT_CONFIG,
        environments: { ...DEFAULT_CONFIG.environments },
        preferences: { ...DEFAULT_PREFERENCES },
      };
    }
  }

  /**
   * Save the config to disk
   */
  save(config: Config): void {
    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }

    // Ensure parent directory exists (for custom paths)
    const parentDir = dirname(this.configPath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    this.cachedConfig = config;
  }

  /**
   * Clear the cached config (useful for testing or after external changes)
   */
  clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * Add a new environment to the config
   */
  addEnvironment(
    id: string,
    token: string,
    displayName?: string
  ): AddEnvironmentResult {
    // Validate environment ID
    if (!id || id.trim() === '') {
      return { success: false, error: 'Environment ID is required' };
    }

    // Normalize the ID (lowercase, no spaces)
    const normalizedId = id.toLowerCase().replace(/\s+/g, '-');

    // Validate token
    if (!token || token.trim() === '') {
      return { success: false, error: 'Token is required' };
    }

    const config = this.load();

    // Check if environment already exists
    if (config.environments[normalizedId]) {
      return { success: false, error: `Environment '${normalizedId}' already exists` };
    }

    const environment: Environment = {
      token: token.trim(),
      name: displayName?.trim() || normalizedId,
      createdAt: new Date().toISOString(),
    };

    config.environments[normalizedId] = environment;

    // If this is the first environment, set it as default
    if (Object.keys(config.environments).length === 1) {
      config.defaultEnvironment = normalizedId;
    }

    this.save(config);

    return { success: true, environment };
  }

  /**
   * Update an existing environment
   */
  updateEnvironment(
    id: string,
    updates: { token?: string; name?: string }
  ): AddEnvironmentResult {
    const config = this.load();

    if (!config.environments[id]) {
      return { success: false, error: `Environment '${id}' does not exist` };
    }

    const existing = config.environments[id];

    const updated: Environment = {
      ...existing,
      token: updates.token?.trim() ?? existing.token,
      name: updates.name?.trim() ?? existing.name,
    };

    config.environments[id] = updated;
    this.save(config);

    return { success: true, environment: updated };
  }

  /**
   * Remove an environment from the config
   */
  removeEnvironment(id: string): RemoveEnvironmentResult {
    const config = this.load();

    if (!config.environments[id]) {
      return { success: false, error: `Environment '${id}' does not exist`, defaultAffected: false };
    }

    delete config.environments[id];

    // Check if we removed the default environment
    const defaultAffected = config.defaultEnvironment === id;
    if (defaultAffected) {
      // Set new default to first available environment or empty string
      const envKeys = Object.keys(config.environments);
      config.defaultEnvironment = envKeys.length > 0 ? envKeys[0] : '';
    }

    this.save(config);

    return { success: true, defaultAffected };
  }

  /**
   * Set the default environment
   */
  setDefaultEnvironment(id: string): SetDefaultResult {
    const config = this.load();

    if (!config.environments[id]) {
      return { success: false, error: `Environment '${id}' does not exist` };
    }

    const previousDefault = config.defaultEnvironment;
    config.defaultEnvironment = id;
    this.save(config);

    return { success: true, previousDefault };
  }

  /**
   * Get the default environment
   */
  getDefaultEnvironment(): string {
    const config = this.load();
    return config.defaultEnvironment;
  }

  /**
   * Get a specific environment by ID
   */
  getEnvironment(id: string): Environment | undefined {
    const config = this.load();
    return config.environments[id];
  }

  /**
   * List all environments
   */
  listEnvironments(options: ListEnvironmentsOptions = {}): EnvironmentListEntry[] {
    const config = this.load();
    const entries: EnvironmentListEntry[] = [];

    for (const [id, env] of Object.entries(config.environments)) {
      const entry: EnvironmentListEntry = {
        id,
        name: env.name,
        isDefault: config.defaultEnvironment === id,
        createdAt: env.createdAt,
      };

      if (options.includeToken) {
        entry.maskedToken = this.maskToken(env.token);
      }

      entries.push(entry);
    }

    // Sort by creation date (oldest first)
    return entries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Check if any environments exist
   */
  hasEnvironments(): boolean {
    const config = this.load();
    return Object.keys(config.environments).length > 0;
  }

  /**
   * Get the count of environments
   */
  getEnvironmentCount(): number {
    const config = this.load();
    return Object.keys(config.environments).length;
  }

  /**
   * Resolve a token based on priority:
   * 1. CLI flag (highest priority)
   * 2. QSTASH_TOKEN environment variable
   * 3. Config file for selected/default environment
   */
  resolveToken(options: TokenResolutionOptions = {}): TokenResolutionResult | null {
    // 1. CLI token (highest priority)
    if (options.cliToken && options.cliToken.trim()) {
      return {
        token: options.cliToken.trim(),
        source: 'cli',
      };
    }

    // 2. Environment variable
    const envToken = process.env.QSTASH_TOKEN;
    if (envToken && envToken.trim()) {
      return {
        token: envToken.trim(),
        source: 'env',
      };
    }

    // 3. Config file
    const config = this.load();
    const envName = options.environmentName || config.defaultEnvironment;

    if (envName && config.environments[envName]) {
      const env = config.environments[envName];
      return {
        token: env.token,
        source: 'config',
        environmentName: envName,
      };
    }

    // No token found
    return null;
  }

  /**
   * Get preferences
   */
  getPreferences(): Preferences {
    const config = this.load();
    return { ...DEFAULT_PREFERENCES, ...config.preferences };
  }

  /**
   * Update preferences
   */
  updatePreferences(updates: Partial<Preferences>): Preferences {
    const config = this.load();

    config.preferences = {
      ...DEFAULT_PREFERENCES,
      ...config.preferences,
      ...updates,
    };

    this.save(config);
    return config.preferences;
  }

  /**
   * Create a fresh config with an initial environment
   */
  createConfig(
    environmentId: string,
    token: string,
    displayName?: string
  ): Config {
    const environment: Environment = {
      token: token.trim(),
      name: displayName?.trim() || environmentId,
      createdAt: new Date().toISOString(),
    };

    const config: Config = {
      version: '1',
      defaultEnvironment: environmentId,
      environments: {
        [environmentId]: environment,
      },
      preferences: { ...DEFAULT_PREFERENCES },
    };

    this.save(config);
    return config;
  }

  /**
   * Delete the entire config file (for testing or reset)
   */
  deleteConfig(): boolean {
    if (!this.configExists()) {
      return false;
    }

    try {
      unlinkSync(this.configPath);
      this.cachedConfig = null;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mask a token for display (show first 6 and last 4 characters)
   */
  private maskToken(token: string): string {
    if (token.length <= 10) {
      return '*'.repeat(token.length);
    }
    return `${token.slice(0, 6)}${'*'.repeat(token.length - 10)}${token.slice(-4)}`;
  }
}

/**
 * Singleton instance for global access
 */
let configManagerInstance: ConfigManager | null = null;

/**
 * Get the global ConfigManager instance
 */
export function getConfigManager(options?: ConfigManagerOptions): ConfigManager {
  if (!configManagerInstance || options) {
    configManagerInstance = new ConfigManager(options);
  }
  return configManagerInstance;
}

/**
 * Reset the global ConfigManager instance (for testing)
 */
export function resetConfigManager(): void {
  configManagerInstance = null;
}
