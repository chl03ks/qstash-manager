/**
 * Logs Viewing Commands
 *
 * Provides interactive viewing of QStash message delivery logs.
 * Supports:
 * - Time range filtering (1h, 4h, 24h)
 * - Status filtering (all, delivered, failed)
 * - Message detail viewing
 */

import * as p from '@clack/prompts';

import type { LogEntry, LogFilter } from '../../types/qstash.js';
import type { LogsMenuAction, LogTimeRange, MenuOption } from '../../types/commands.js';
import { getConfigManager } from '../../lib/config/manager.js';
import { createQStashClient, type QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  createTable,
  formatDateTime,
  formatMessageState,
  formatRelativeTime,
  formatUrl,
  note,
  select,
  truncate,
  UserCancelledError,
} from '../../lib/ui/index.js';

/**
 * Result of running the logs menu
 */
export interface LogsMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Time range option configuration
 */
interface TimeRangeOption {
  value: LogTimeRange;
  label: string;
  hint: string;
  hours: number;
}

/**
 * Status filter option
 */
type StatusFilter = 'all' | 'delivered' | 'failed';

/**
 * Available time range options
 */
const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1h', label: 'Last 1 hour', hint: 'Most recent activity', hours: 1 },
  { value: '4h', label: 'Last 4 hours', hint: 'Recent activity', hours: 4 },
  { value: '24h', label: 'Last 24 hours', hint: 'Full day overview', hours: 24 },
];

/**
 * Run the logs viewing menu
 *
 * @returns Result indicating navigation preference
 */
export async function runLogsMenu(): Promise<LogsMenuResult> {
  let shouldContinue = true;

  while (shouldContinue) {
    try {
      // Get client for this iteration (in case environment changed)
      const client = getQStashClient();
      if (!client) {
        note(
          'No QStash token configured.\n\n' +
            'Please configure an environment in Configuration > Add Environment.',
          'Token Required'
        );
        return { returnToMain: false };
      }

      const action = await showLogsMenu();

      switch (action) {
        case 'view-recent':
          await viewLogs(client, 'all');
          break;

        case 'view-failed':
          await viewLogs(client, 'failed');
          break;

        case 'filter':
          await viewLogsWithFilters(client);
          break;

        case 'export':
          // TODO: Implement export functionality (subtask-6-2)
          note('Export functionality coming soon!', 'Not Implemented');
          break;

        case 'back':
          shouldContinue = false;
          break;

        case 'main-menu':
          return { returnToMain: true };
      }
    } catch (error) {
      if (error instanceof UserCancelledError) {
        // Go back one level on cancel
        shouldContinue = false;
      } else {
        throw error;
      }
    }
  }

  return { returnToMain: false };
}

/**
 * Display the logs menu
 */
async function showLogsMenu(): Promise<LogsMenuAction> {
  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Logs & Monitoring'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  const menuOptions: MenuOption<LogsMenuAction>[] = [
    {
      value: 'view-recent',
      label: '📋 View Recent Logs',
      hint: 'Show all recent message activity',
    },
    {
      value: 'view-failed',
      label: '🔴 View Failed Messages',
      hint: 'Show only failed deliveries',
    },
    {
      value: 'filter',
      label: '🔍 Filter Logs',
      hint: 'View logs with time range and status filters',
    },
    {
      value: 'export',
      label: '📤 Export Logs',
      hint: 'Export logs to JSON or CSV',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<LogsMenuAction>('What would you like to do?', menuOptions);
}

/**
 * View logs with a default time range
 */
async function viewLogs(
  client: QStashClientWrapper,
  statusFilter: StatusFilter,
  timeRange: LogTimeRange = '1h'
): Promise<void> {
  const timeRangeOption = TIME_RANGE_OPTIONS.find((t) => t.value === timeRange) ?? TIME_RANGE_OPTIONS[0];
  const endTime = Date.now();
  const startTime = endTime - timeRangeOption.hours * 60 * 60 * 1000;

  const filter: LogFilter = {
    startTime,
    endTime,
  };

  // Apply status filter
  if (statusFilter === 'delivered') {
    filter.state = 'DELIVERED';
  } else if (statusFilter === 'failed') {
    filter.state = 'FAILED';
  }

  const s = p.spinner();
  s.start(`Loading logs (${timeRangeOption.label.toLowerCase()})...`);

  const result = await client.getLogs(filter);

  s.stop('Logs loaded');

  if (!result.success) {
    note(result.error || 'Failed to load logs', 'Error');
    return;
  }

  const logs = result.data?.logs ?? [];

  if (logs.length === 0) {
    const statusLabel = statusFilter === 'all' ? '' : ` ${statusFilter}`;
    note(`No${statusLabel} logs found in the ${timeRangeOption.label.toLowerCase()}.`, 'No Logs');
    return;
  }

  displayLogsTable(logs, statusFilter, timeRangeOption);

  // Option to view details
  await viewLogDetails(client, logs);
}

/**
 * View logs with user-selected filters
 */
async function viewLogsWithFilters(client: QStashClientWrapper): Promise<void> {
  // Select time range
  const timeRange = await selectTimeRange();

  // Select status filter
  const statusFilter = await selectStatusFilter();

  await viewLogs(client, statusFilter, timeRange);
}

/**
 * Prompt user to select a time range
 */
async function selectTimeRange(): Promise<LogTimeRange> {
  console.log('');

  const options: MenuOption<LogTimeRange>[] = TIME_RANGE_OPTIONS.map((t) => ({
    value: t.value,
    label: t.label,
    hint: t.hint,
  }));

  return select<LogTimeRange>('Select time range:', options);
}

/**
 * Prompt user to select a status filter
 */
async function selectStatusFilter(): Promise<StatusFilter> {
  console.log('');

  const options: MenuOption<StatusFilter>[] = [
    { value: 'all', label: 'All Messages', hint: 'Show all message states' },
    { value: 'delivered', label: 'Delivered', hint: 'Only successfully delivered' },
    { value: 'failed', label: 'Failed', hint: 'Only failed deliveries' },
  ];

  return select<StatusFilter>('Filter by status:', options);
}

/**
 * Display logs in a formatted table
 */
function displayLogsTable(
  logs: LogEntry[],
  statusFilter: StatusFilter,
  timeRange: TimeRangeOption
): void {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));

  const filterLabel = statusFilter === 'all' ? '' : ` (${statusFilter})`;
  console.log(colors.bold(`Message Logs - ${timeRange.label}${filterLabel}`));
  console.log(colors.dim(`Showing ${logs.length} entries`));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  const table = createTable(['#', 'Time', 'Status', 'URL', 'Message ID']);

  logs.forEach((log, index) => {
    table.push([
      colors.muted(String(index + 1)),
      formatRelativeTime(log.time),
      formatMessageState(log.state),
      formatUrl(log.url, 35),
      truncate(log.messageId, 20),
    ]);
  });

  console.log(table.toString());
}

/**
 * Allow user to view detailed information about a log entry
 */
async function viewLogDetails(
  client: QStashClientWrapper,
  logs: LogEntry[]
): Promise<void> {
  if (logs.length === 0) return;

  // Build selection options
  const detailOptions: MenuOption<string>[] = logs.map((log, index) => ({
    value: log.messageId,
    label: `${index + 1}. ${formatMessageState(log.state)} - ${truncate(log.url, 40)}`,
    hint: formatRelativeTime(log.time),
  }));

  detailOptions.push({
    value: 'back',
    label: '← Back',
    hint: 'Return to logs menu',
  });

  console.log('');
  const selection = await select<string>('View message details:', detailOptions);

  if (selection === 'back') {
    return;
  }

  // Find the selected log
  const selectedLog = logs.find((l) => l.messageId === selection);
  if (!selectedLog) return;

  // Display log details
  displayLogDetails(selectedLog);
}

/**
 * Display detailed information about a log entry
 */
function displayLogDetails(log: LogEntry): void {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Message Details'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  const details: Array<[string, string]> = [
    ['Message ID', log.messageId],
    ['Status', formatMessageState(log.state)],
    ['URL', log.url],
    ['Time', formatDateTime(log.time)],
  ];

  // Add optional fields
  if (log.responseStatus) {
    const statusColor = log.responseStatus >= 200 && log.responseStatus < 300
      ? colors.success
      : colors.error;
    details.push(['Response Status', statusColor(String(log.responseStatus))]);
  }

  if (log.queueName) {
    details.push(['Queue', log.queueName]);
  }

  if (log.urlGroup) {
    details.push(['URL Group', log.urlGroup]);
  }

  if (log.scheduleId) {
    details.push(['Schedule ID', truncate(log.scheduleId, 30)]);
  }

  if (log.responseBody) {
    details.push(['Response Body', truncate(log.responseBody, 50)]);
  }

  // Display as formatted list
  details.forEach(([label, value]) => {
    console.log(`  ${colors.bold(label.padEnd(16))} ${value}`);
  });

  console.log('');
}

/**
 * Get a QStash client using the current configuration
 */
function getQStashClient(): QStashClientWrapper | null {
  const configManager = getConfigManager();
  const tokenResult = configManager.resolveToken();

  if (!tokenResult) {
    return null;
  }

  return createQStashClient(tokenResult.token, {
    source: tokenResult.source,
    environmentName: tokenResult.environmentName,
  });
}
