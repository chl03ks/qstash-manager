/**
 * Configuration Types
 *
 * Type definitions for the configuration system including
 * multi-environment support and user preferences.
 */

/**
 * A single environment configuration with token and metadata
 */
export interface Environment {
  /** QStash API token for this environment */
  token: string;
  /** Human-readable name for this environment */
  name: string;
  /** ISO timestamp when this environment was added */
  createdAt: string;
}

/**
 * Collection of environments keyed by their identifier
 */
export interface Environments {
  [key: string]: Environment;
}

/**
 * User preferences for CLI behavior
 */
export interface Preferences {
  /** Whether to use colored output (default: true) */
  colorOutput: boolean;
  /** Whether to require confirmation for destructive actions (default: true) */
  confirmDestructiveActions: boolean;
}

/**
 * Root configuration file structure stored at ~/.qstash-manager/config.json
 */
export interface Config {
  /** Configuration file version for migration support */
  version: string;
  /** The environment to use by default when none is specified */
  defaultEnvironment: string;
  /** Map of environment identifiers to their configurations */
  environments: Environments;
  /** User preferences for CLI behavior */
  preferences: Preferences;
}

/**
 * Options for token resolution
 */
export interface TokenResolutionOptions {
  /** Token provided via CLI flag (highest priority) */
  cliToken?: string;
  /** Environment name to use from config */
  environmentName?: string;
}

/**
 * Result of token resolution including source information
 */
export interface TokenResolutionResult {
  /** The resolved token */
  token: string;
  /** Where the token came from */
  source: 'cli' | 'env' | 'config' | 'prompt';
  /** Environment name if from config */
  environmentName?: string;
}

/**
 * Options for creating a new config
 */
export interface CreateConfigOptions {
  /** Initial environment name (e.g., 'production', 'staging') */
  environmentName: string;
  /** Display name for the environment */
  displayName: string;
  /** QStash token for the environment */
  token: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  version: '1',
  defaultEnvironment: '',
  environments: {},
  preferences: {
    colorOutput: true,
    confirmDestructiveActions: true,
  },
};

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: Preferences = {
  colorOutput: true,
  confirmDestructiveActions: true,
};
