/**
 * UI Utilities for QStash Manager CLI
 *
 * Provides a consistent set of utilities for building interactive CLI interfaces:
 * - Colors: Terminal color theming with picocolors
 * - Tables: Data display with cli-table3
 * - Prompts: Interactive prompts with @clack/prompts
 * - Formatters: Value formatting utilities
 *
 * @module lib/ui
 */

// Color utilities
export { colors, messages, status } from './colors.js';

// Table utilities
export {
  createCustomTable,
  createKeyValueTable,
  createSummaryTable,
  createTable,
  printDivider,
  printSection,
  type TableColumn,
} from './tables.js';

// Prompt utilities
export {
  confirm,
  group,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  password,
  select,
  spinner,
  text,
  UserCancelledError,
} from './prompts.js';

// Formatter utilities
export {
  formatBoolean,
  formatCheck,
  formatCron,
  formatDate,
  formatDateTime,
  formatDuration,
  formatEndpoint,
  formatFileSize,
  formatJson,
  formatMessageState,
  formatNumber,
  formatRate,
  formatRelativeTime,
  formatStatus,
  formatUrl,
  truncate,
} from './formatters.js';
