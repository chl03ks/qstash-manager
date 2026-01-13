/**
 * Config Manager Types
 *
 * Internal types for the config manager module.
 * Main config types are in src/types/config.ts
 */

import type {
  Config,
  Environment,
  Preferences,
  TokenResolutionOptions,
  TokenResolutionResult,
} from '../../types/config.js';

/**
 * Result of adding a new environment
 */
export interface AddEnvironmentResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The environment that was added */
  environment?: Environment;
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Result of removing an environment
 */
export interface RemoveEnvironmentResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if the operation failed */
  error?: string;
  /** Whether default environment was affected */
  defaultAffected: boolean;
}

/**
 * Result of setting the default environment
 */
export interface SetDefaultResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The previous default environment (if any) */
  previousDefault?: string;
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Options for listing environments
 */
export interface ListEnvironmentsOptions {
  /** Include token (masked) in the result */
  includeToken?: boolean;
}

/**
 * Environment listing entry
 */
export interface EnvironmentListEntry {
  /** Environment identifier (key) */
  id: string;
  /** Display name */
  name: string;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** When the environment was created */
  createdAt: string;
  /** Masked token (if requested) */
  maskedToken?: string;
}

/**
 * Config manager options
 */
export interface ConfigManagerOptions {
  /** Override the config file path (for testing) */
  configPath?: string;
  /** Override the config directory (for testing) */
  configDir?: string;
}

/**
 * Validation result for a QStash token
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Re-export common types from main types module for convenience
 */
export type {
  Config,
  Environment,
  Preferences,
  TokenResolutionOptions,
  TokenResolutionResult,
};
