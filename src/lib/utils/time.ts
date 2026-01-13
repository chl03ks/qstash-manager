/**
 * Time utilities for QStash Manager CLI
 *
 * Provides cron expression parsing, time formatting, and relative time
 * calculations for schedules and message tracking.
 */

/**
 * Common cron expression presets
 */
export const CRON_PRESETS = {
  everyMinute: { expression: '* * * * *', label: 'Every minute' },
  every5Minutes: { expression: '*/5 * * * *', label: 'Every 5 minutes' },
  every15Minutes: { expression: '*/15 * * * *', label: 'Every 15 minutes' },
  every30Minutes: { expression: '*/30 * * * *', label: 'Every 30 minutes' },
  hourly: { expression: '0 * * * *', label: 'Every hour' },
  daily: { expression: '0 0 * * *', label: 'Daily at midnight' },
  dailyAt9AM: { expression: '0 9 * * *', label: 'Daily at 9:00 AM' },
  weekly: { expression: '0 0 * * 0', label: 'Every Sunday at midnight' },
  monthly: { expression: '0 0 1 * *', label: 'First day of each month' },
} as const;

export type CronPresetKey = keyof typeof CRON_PRESETS;

/**
 * Get a human-readable description of a cron expression
 *
 * @param cron - The cron expression
 * @returns Human-readable description or the original expression if unknown
 */
export function describeCron(cron: string): string {
  // Check against common presets
  for (const preset of Object.values(CRON_PRESETS)) {
    if (preset.expression === cron) {
      return preset.label;
    }
  }

  // Parse and describe basic patterns
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    return cron; // Invalid or non-standard cron
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Try to describe common patterns
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const interval = minute.slice(2);
    return `Every ${interval} minutes`;
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every hour';
  }

  if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${formatHour(parseInt(hour, 10))}`;
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    return `Weekly on ${formatDayOfWeek(parseInt(dayOfWeek, 10))}`;
  }

  if (minute === '0' && hour === '0' && dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    return `Monthly on day ${dayOfMonth}`;
  }

  return cron;
}

/**
 * Format an hour (0-23) as a readable time
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM (midnight)';
  if (hour === 12) return '12:00 PM (noon)';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

/**
 * Format day of week (0-6, Sunday = 0) as readable day name
 */
function formatDayOfWeek(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}

/**
 * Validate a cron expression format
 *
 * Basic validation to check if expression has correct number of fields.
 * Does not validate the actual values comprehensively.
 *
 * @param cron - The cron expression to validate
 * @returns True if the format appears valid
 */
export function isValidCronFormat(cron: string): boolean {
  if (!cron || typeof cron !== 'string') {
    return false;
  }

  const parts = cron.trim().split(/\s+/);

  // Standard cron has 5 fields (minute hour day month day-of-week)
  if (parts.length !== 5) {
    return false;
  }

  // Basic pattern validation for each field
  const fieldPattern = /^(\*|\d+|\*\/\d+|\d+-\d+|\d+(,\d+)*)$/;
  return parts.every((part) => fieldPattern.test(part));
}

/**
 * Calculate the next N occurrences of a cron schedule
 *
 * This is a simplified implementation that handles common cases.
 * For production use, consider using a dedicated cron parsing library.
 *
 * @param cron - The cron expression
 * @param count - Number of occurrences to calculate (default: 5)
 * @param from - Starting date (default: now)
 * @returns Array of next occurrence dates
 */
export function getNextCronOccurrences(cron: string, count = 5, from = new Date()): Date[] {
  const occurrences: Date[] = [];
  const parts = cron.split(' ');

  if (parts.length !== 5) {
    return occurrences;
  }

  const [minutePart, hourPart, dayOfMonthPart, , dayOfWeekPart] = parts;

  // Start from the next minute
  let current = new Date(from);
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1);

  const maxIterations = count * 60 * 24 * 7; // Limit iterations to prevent infinite loop
  let iterations = 0;

  while (occurrences.length < count && iterations < maxIterations) {
    iterations++;

    const minute = current.getMinutes();
    const hour = current.getHours();
    const dayOfMonth = current.getDate();
    const dayOfWeek = current.getDay();

    const minuteMatch = matchCronField(minutePart, minute);
    const hourMatch = matchCronField(hourPart, hour);
    const dayOfMonthMatch = matchCronField(dayOfMonthPart, dayOfMonth);
    const dayOfWeekMatch = matchCronField(dayOfWeekPart, dayOfWeek);

    if (minuteMatch && hourMatch && dayOfMonthMatch && dayOfWeekMatch) {
      occurrences.push(new Date(current));
    }

    // Increment by one minute
    current.setMinutes(current.getMinutes() + 1);
  }

  return occurrences;
}

/**
 * Match a cron field against a value
 */
function matchCronField(field: string, value: number): boolean {
  if (field === '*') {
    return true;
  }

  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }

  if (field.includes('-')) {
    const [start, end] = field.split('-').map((n) => parseInt(n, 10));
    return value >= start && value <= end;
  }

  if (field.includes(',')) {
    const values = field.split(',').map((n) => parseInt(n, 10));
    return values.includes(value);
  }

  return parseInt(field, 10) === value;
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago", "in 5 minutes")
 *
 * @param date - The date to format
 * @param now - Reference time (default: current time)
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | number | string, now = new Date()): string {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const nowTimestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const diff = timestamp - nowTimestamp;

  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  let timeStr: string;

  if (months > 0) {
    timeStr = `${months} month${months > 1 ? 's' : ''}`;
  } else if (weeks > 0) {
    timeStr = `${weeks} week${weeks > 1 ? 's' : ''}`;
  } else if (days > 0) {
    timeStr = `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    timeStr = `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    timeStr = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (seconds > 10) {
    timeStr = `${seconds} seconds`;
  } else {
    return isFuture ? 'in a moment' : 'just now';
  }

  return isFuture ? `in ${timeStr}` : `${timeStr} ago`;
}

/**
 * Format a duration in milliseconds to human-readable format
 *
 * @param ms - Duration in milliseconds
 * @returns Human-readable duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 0) {
    return 'Invalid duration';
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Format a duration in seconds to human-readable format
 *
 * @param seconds - Duration in seconds
 * @returns Human-readable duration string
 */
export function formatDurationSeconds(seconds: number): string {
  return formatDuration(seconds * 1000);
}

/**
 * Parse a human-readable duration string to seconds
 *
 * Supports formats like "1h", "30m", "2d", "1h30m", etc.
 *
 * @param input - Human-readable duration string
 * @returns Duration in seconds, or null if invalid
 */
export function parseDuration(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalized = input.toLowerCase().trim();

  // Try to parse as a number (seconds)
  if (/^\d+$/.test(normalized)) {
    return parseInt(normalized, 10);
  }

  let totalSeconds = 0;

  // Match patterns like "1d", "2h", "30m", "45s"
  const patterns = [
    { pattern: /(\d+)d/g, multiplier: 24 * 60 * 60 },
    { pattern: /(\d+)h/g, multiplier: 60 * 60 },
    { pattern: /(\d+)m/g, multiplier: 60 },
    { pattern: /(\d+)s/g, multiplier: 1 },
  ];

  let hasMatch = false;
  for (const { pattern, multiplier } of patterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      totalSeconds += parseInt(match[1], 10) * multiplier;
      hasMatch = true;
    }
  }

  return hasMatch ? totalSeconds : null;
}

/**
 * Get a timestamp from now plus a delay
 *
 * @param delaySeconds - Delay in seconds
 * @returns Unix timestamp in milliseconds
 */
export function getScheduledTime(delaySeconds: number): number {
  return Date.now() + delaySeconds * 1000;
}

/**
 * Format a Unix timestamp as a readable date/time string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date/time string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return 'Invalid timestamp';
  }

  return date.toLocaleString();
}

/**
 * Format a Unix timestamp as ISO 8601 string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns ISO 8601 formatted string
 */
export function formatTimestampISO(timestamp: number): string {
  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return 'Invalid timestamp';
  }

  return date.toISOString();
}

/**
 * Get time range boundaries for log filtering
 *
 * @param range - Time range identifier
 * @returns Object with start and end timestamps
 */
export function getTimeRange(range: '1h' | '4h' | '24h' | '7d' | '30d'): { start: number; end: number } {
  const now = Date.now();
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const duration = ranges[range] || ranges['24h'];

  return {
    start: now - duration,
    end: now,
  };
}

/**
 * Get presets for cron expressions
 *
 * @returns Array of cron preset options for menu display
 */
export function getCronPresetOptions(): Array<{ value: string; label: string; hint: string }> {
  return [
    {
      value: CRON_PRESETS.everyMinute.expression,
      label: 'Every minute',
      hint: '* * * * *',
    },
    {
      value: CRON_PRESETS.every5Minutes.expression,
      label: 'Every 5 minutes',
      hint: '*/5 * * * *',
    },
    {
      value: CRON_PRESETS.every15Minutes.expression,
      label: 'Every 15 minutes',
      hint: '*/15 * * * *',
    },
    {
      value: CRON_PRESETS.every30Minutes.expression,
      label: 'Every 30 minutes',
      hint: '*/30 * * * *',
    },
    {
      value: CRON_PRESETS.hourly.expression,
      label: 'Every hour',
      hint: '0 * * * *',
    },
    {
      value: CRON_PRESETS.dailyAt9AM.expression,
      label: 'Daily at 9 AM',
      hint: '0 9 * * *',
    },
    {
      value: CRON_PRESETS.daily.expression,
      label: 'Daily at midnight',
      hint: '0 0 * * *',
    },
    {
      value: CRON_PRESETS.weekly.expression,
      label: 'Weekly (Sunday)',
      hint: '0 0 * * 0',
    },
    {
      value: CRON_PRESETS.monthly.expression,
      label: 'Monthly (1st)',
      hint: '0 0 1 * *',
    },
    {
      value: '__custom__',
      label: 'Custom expression',
      hint: 'Enter your own cron expression',
    },
  ];
}

/**
 * Get time range options for log filtering menus
 *
 * @returns Array of time range options for menu display
 */
export function getTimeRangeOptions(): Array<{ value: string; label: string; hint: string }> {
  return [
    { value: '1h', label: 'Last hour', hint: '60 minutes' },
    { value: '4h', label: 'Last 4 hours', hint: '240 minutes' },
    { value: '24h', label: 'Last 24 hours', hint: '1 day' },
    { value: '7d', label: 'Last 7 days', hint: '1 week' },
    { value: '30d', label: 'Last 30 days', hint: '1 month' },
  ];
}
