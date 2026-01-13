/**
 * Command Types
 *
 * Type definitions for CLI commands, menu actions, and navigation.
 */

/**
 * Base options available to all commands
 */
export interface BaseCommandOptions {
  /** Override the default environment */
  env?: string;
  /** Override the token (highest priority) */
  token?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Disable colored output */
  noColor?: boolean;
}

/**
 * Result returned from command execution
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Optional message to display */
  message?: string;
  /** Optional data returned by the command */
  data?: unknown;
  /** Error details if command failed */
  error?: Error;
}

// ============================================
// Main Menu Actions
// ============================================

/**
 * Top-level main menu actions
 */
export type MainMenuAction =
  | 'url-groups'
  | 'schedules'
  | 'queues'
  | 'messages'
  | 'dlq'
  | 'logs'
  | 'security'
  | 'config'
  | 'exit';

// ============================================
// URL Groups Menu Actions
// ============================================

/**
 * Actions available in the URL groups menu
 */
export type UrlGroupsMenuAction =
  | 'explore'
  | 'quick-update'
  | 'view-all-endpoints'
  | 'create-new'
  | 'delete-group'
  | 'back'
  | 'main-menu';

/**
 * Actions when viewing a specific URL group
 */
export type UrlGroupDetailAction =
  | 'add-endpoint'
  | 'remove-endpoint'
  | 'send-test-message'
  | 'view-logs'
  | 'back'
  | 'main-menu';

// ============================================
// Schedules Menu Actions
// ============================================

/**
 * Actions available in the schedules menu
 */
export type SchedulesMenuAction =
  | 'list'
  | 'create'
  | 'manage'
  | 'delete'
  | 'back'
  | 'main-menu';

/**
 * Actions when managing a specific schedule
 */
export type ScheduleDetailAction =
  | 'pause'
  | 'resume'
  | 'edit'
  | 'delete'
  | 'back'
  | 'main-menu';

// ============================================
// Queues Menu Actions
// ============================================

/**
 * Actions available in the queues menu
 */
export type QueuesMenuAction =
  | 'list'
  | 'create'
  | 'manage'
  | 'delete'
  | 'back'
  | 'main-menu';

/**
 * Actions when managing a specific queue
 */
export type QueueDetailAction =
  | 'pause'
  | 'resume'
  | 'enqueue-message'
  | 'edit-parallelism'
  | 'delete'
  | 'back'
  | 'main-menu';

// ============================================
// Messages Menu Actions
// ============================================

/**
 * Actions available in the messages menu
 */
export type MessagesMenuAction =
  | 'send'
  | 'batch-send'
  | 'track'
  | 'cancel'
  | 'back'
  | 'main-menu';

/**
 * Destination type for sending messages
 */
export type MessageDestinationType = 'url' | 'url-group' | 'queue';

// ============================================
// DLQ Menu Actions
// ============================================

/**
 * Actions available in the Dead Letter Queue menu
 */
export type DlqMenuAction =
  | 'list'
  | 'view-details'
  | 'retry-single'
  | 'retry-bulk'
  | 'delete-single'
  | 'delete-bulk'
  | 'back'
  | 'main-menu';

// ============================================
// Logs Menu Actions
// ============================================

/**
 * Actions available in the logs menu
 */
export type LogsMenuAction =
  | 'view-recent'
  | 'view-failed'
  | 'filter'
  | 'export'
  | 'back'
  | 'main-menu';

/**
 * Time range filter options for logs
 */
export type LogTimeRange = '1h' | '4h' | '24h' | 'custom';

// ============================================
// Security Menu Actions
// ============================================

/**
 * Actions available in the security menu
 */
export type SecurityMenuAction =
  | 'view-keys'
  | 'rotate-keys'
  | 'back'
  | 'main-menu';

// ============================================
// Config Menu Actions
// ============================================

/**
 * Actions available in the configuration menu
 */
export type ConfigMenuAction =
  | 'list-envs'
  | 'add-env'
  | 'switch-env'
  | 'remove-env'
  | 'set-default'
  | 'preferences'
  | 'back'
  | 'main-menu';

// ============================================
// Menu Option Types
// ============================================

/**
 * A menu option with label, hint, and value
 */
export interface MenuOption<T> {
  /** The value returned when this option is selected */
  value: T;
  /** Display label for the option */
  label: string;
  /** Optional hint text displayed with the option */
  hint?: string;
}

/**
 * Navigation breadcrumb item
 */
export interface Breadcrumb {
  /** Label for this breadcrumb */
  label: string;
  /** Action to navigate here (optional) */
  action?: string;
}

// ============================================
// Validation Types
// ============================================

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Result of URL validation
 */
export interface UrlValidationResult extends ValidationResult {
  /** Parsed URL if valid */
  url?: URL;
}

/**
 * Result of group name validation
 */
export interface GroupNameValidationResult extends ValidationResult {
  /** Sanitized name if valid */
  name?: string;
}
