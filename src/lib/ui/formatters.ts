/**
 * Formatting utilities for displaying data in the CLI
 *
 * Provides consistent formatting for dates, numbers, durations,
 * and QStash-specific values across the CLI interface.
 */

import { colors } from './colors.js';

/**
 * Format a date for display
 * Format: MM/DD/YYYY
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return colors.muted('N/A');

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return colors.muted('Invalid date');

  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Format a date with time for display
 * Format: MM/DD/YYYY HH:MM:SS
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return colors.muted('N/A');

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return colors.muted('Invalid date');

  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return colors.muted('N/A');

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return colors.muted('Invalid date');

  const now = Date.now();
  const timestamp = dateObj.getTime();
  const diff = now - timestamp;

  // Future dates
  if (diff < 0) {
    return formatFutureTime(-diff);
  }

  // Past dates
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;

  return 'just now';
}

/**
 * Format a future time (e.g., "in 2 hours")
 */
function formatFutureTime(diff: number): string {
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `in ${months} month${months > 1 ? 's' : ''}`;
  if (weeks > 0) return `in ${weeks} week${weeks > 1 ? 's' : ''}`;
  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  if (seconds > 0) return `in ${seconds} second${seconds > 1 ? 's' : ''}`;

  return 'now';
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return colors.muted('N/A');
  return num.toLocaleString();
}

/**
 * Format a boolean as Yes/No with color
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return colors.muted('N/A');
  return value ? colors.success('Yes') : colors.error('No');
}

/**
 * Format a boolean as checkmark/X
 */
export function formatCheck(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return colors.muted('-');
  return value ? colors.success('✓') : colors.error('✗');
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return colors.muted('N/A');
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return colors.muted('N/A');
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format a duration in milliseconds to human-readable format
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return colors.muted('N/A');

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else if (seconds > 0) {
    return `${seconds}s`;
  } else {
    return `${ms}ms`;
  }
}

/**
 * Format a status with appropriate color
 */
export function formatStatus(
  status: string | null | undefined,
  colorMap?: Record<string, (text: string) => string>
): string {
  if (!status) return colors.muted('N/A');

  // Default color map for common statuses
  const defaultColorMap: Record<string, (text: string) => string> = {
    // Success states
    success: colors.success,
    completed: colors.success,
    delivered: colors.success,
    active: colors.success,
    running: colors.success,
    // Warning states
    pending: colors.warning,
    scheduled: colors.warning,
    processing: colors.info,
    paused: colors.warning,
    // Error states
    failed: colors.error,
    error: colors.error,
    dead: colors.error,
    // Neutral states
    cancelled: colors.muted,
    unknown: colors.muted,
  };

  const map = colorMap || defaultColorMap;
  const colorFn = map[status.toLowerCase()];

  return colorFn ? colorFn(status) : status;
}

/**
 * Format a QStash message state with color
 */
export function formatMessageState(state: string | null | undefined): string {
  const stateColors: Record<string, (text: string) => string> = {
    created: colors.muted,
    active: colors.info,
    delivered: colors.success,
    error: colors.error,
    retry: colors.warning,
    failed: colors.error,
    cancelled: colors.muted,
  };

  if (!state) return colors.muted('N/A');

  const colorFn = stateColors[state.toLowerCase()];
  return colorFn ? colorFn(state) : state;
}

/**
 * Format a URL for display (truncate if too long)
 */
export function formatUrl(url: string | null | undefined, maxLength = 50): string {
  if (!url) return colors.muted('N/A');

  if (url.length <= maxLength) return url;

  // Try to show the important parts (protocol + domain + truncated path)
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname;

    // If domain alone is too long, truncate
    if (domain.length > maxLength - 10) {
      return truncate(url, maxLength);
    }

    // Truncate path but keep some visible
    const availableForPath = maxLength - domain.length - 10; // Reserve space for ...
    const truncatedPath = path.length > availableForPath ? path.slice(0, availableForPath) + '...' : path;

    return `${parsed.protocol}//${domain}${truncatedPath}`;
  } catch {
    return truncate(url, maxLength);
  }
}

/**
 * Format an endpoint name or show URL as fallback
 */
export function formatEndpoint(
  endpoint: { name?: string; url: string } | null | undefined,
  maxUrlLength = 40
): string {
  if (!endpoint) return colors.muted('N/A');

  if (endpoint.name) {
    return endpoint.name;
  }

  return colors.dim(formatUrl(endpoint.url, maxUrlLength));
}

/**
 * Format a cron expression for display
 */
export function formatCron(cron: string | null | undefined): string {
  if (!cron) return colors.muted('N/A');

  // Map common cron expressions to human-readable descriptions
  const cronDescriptions: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 0 * * *': 'Daily at midnight',
    '0 0 * * 0': 'Weekly on Sunday',
    '0 0 1 * *': 'Monthly on the 1st',
  };

  const description = cronDescriptions[cron];
  if (description) {
    return `${cron} ${colors.dim(`(${description})`)}`;
  }

  return cron;
}

/**
 * Format bytes per second as a rate
 */
export function formatRate(bytesPerSecond: number | null | undefined): string {
  if (bytesPerSecond === null || bytesPerSecond === undefined) return colors.muted('N/A');

  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format a JSON object for display (pretty print)
 */
export function formatJson(obj: unknown, indent = 2): string {
  if (obj === null || obj === undefined) return colors.muted('null');

  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return colors.error('Invalid JSON');
  }
}
