/**
 * Utility functions for QStash Manager CLI
 *
 * Provides validation, time formatting, and other helper functions
 * used across the CLI interface.
 */

// Validation utilities
export {
  validateUrl,
  validateGroupName,
  validateQueueName,
  validateScheduleName,
  validateEndpointName,
  validateToken,
  validateEnvironmentName,
  validateParallelism,
  validateDelay,
  validateMessageBody,
  isNgrokUrl,
  isLocalhostUrl,
} from './validation.js';

// Time utilities
export {
  CRON_PRESETS,
  type CronPresetKey,
  describeCron,
  isValidCronFormat,
  getNextCronOccurrences,
  formatRelativeTime,
  formatDuration,
  formatDurationSeconds,
  parseDuration,
  getScheduledTime,
  formatTimestamp,
  formatTimestampISO,
  getTimeRange,
  getCronPresetOptions,
  getTimeRangeOptions,
} from './time.js';
