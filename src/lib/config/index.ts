/**
 * Config Module
 *
 * Exports the ConfigManager class and related types for managing
 * qstash-manager configuration with multi-environment support.
 *
 * @module lib/config
 */

// Main ConfigManager class and utilities
export { ConfigManager, getConfigManager, resetConfigManager } from './manager.js';

// Types specific to the config manager
export type {
  AddEnvironmentResult,
  ConfigManagerOptions,
  EnvironmentListEntry,
  ListEnvironmentsOptions,
  RemoveEnvironmentResult,
  SetDefaultResult,
  TokenValidationResult,
} from './types.js';

// Re-export main config types for convenience
export type {
  Config,
  Environment,
  Preferences,
  TokenResolutionOptions,
  TokenResolutionResult,
} from './types.js';
