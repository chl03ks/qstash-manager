/**
 * Schedules Management Commands
 *
 * Provides interactive management of QStash schedules.
 * Supports:
 * - Listing existing schedules with their cron expressions and status
 * - Creating new schedules with cron presets or custom expressions
 * - Managing schedules (pause, resume, edit)
 * - Deleting schedules
 */

import type { MenuOption, SchedulesMenuAction } from '../../types/commands.js';
import type { Schedule } from '../../types/qstash.js';
import { getConfigManager } from '../../lib/config/manager.js';
import { createQStashClient, type QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  log,
  note,
  select,
  spinner,
  UserCancelledError,
} from '../../lib/ui/index.js';
import { describeCron } from '../../lib/utils/time.js';

/**
 * Result of running the schedules menu
 */
export interface SchedulesMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the schedules management menu
 *
 * @returns Result indicating navigation preference
 */
export async function runSchedulesMenu(): Promise<SchedulesMenuResult> {
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

      // Load schedules
      const schedulesResult = await spinner('Loading schedules...', async () => {
        return client.listSchedules();
      });

      if (!schedulesResult.success) {
        log(colors.error('Failed to load schedules: ' + (schedulesResult.error || 'Unknown error')));
        // Still show menu but with error state
        await showMenuWithError();
        continue;
      }

      const schedules = schedulesResult.data ?? [];
      const action = await showSchedulesMenu(schedules);

      switch (action) {
        case 'list':
          if (schedules.length === 0) {
            log(colors.warning('No schedules to list. Create one first!'));
            await pause(1500);
          } else {
            await listSchedules(schedules);
          }
          break;

        case 'create':
          // TODO: Implement create schedule (subtask-8-2)
          note('Schedule creation coming soon!', 'Not Implemented');
          break;

        case 'manage':
          if (schedules.length === 0) {
            log(colors.warning('No schedules to manage. Create one first!'));
            await pause(1500);
          } else {
            // TODO: Implement manage schedule (subtask-8-3)
            note('Schedule management coming soon!', 'Not Implemented');
          }
          break;

        case 'delete':
          if (schedules.length === 0) {
            log(colors.warning('No schedules to delete.'));
            await pause(1500);
          } else {
            // TODO: Implement delete schedule (subtask-8-4)
            note('Schedule deletion coming soon!', 'Not Implemented');
          }
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
 * Display the schedules menu
 */
async function showSchedulesMenu(schedules: Schedule[]): Promise<SchedulesMenuAction> {
  const scheduleCount = schedules.length;
  const pausedCount = schedules.filter((s) => s.isPaused).length;
  const activeCount = scheduleCount - pausedCount;

  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(
    colors.bold('Schedules') +
      colors.muted(
        ` (${scheduleCount} schedule${scheduleCount !== 1 ? 's' : ''}` +
          (activeCount > 0 ? `, ${activeCount} active` : '') +
          (pausedCount > 0 ? `, ${pausedCount} paused` : '') +
          ')'
      )
  );
  console.log(colors.dim('─────────────────────────────────────────────'));

  if (scheduleCount === 0) {
    console.log('');
    note('No schedules found. Create your first one!', 'Tip');
  }

  console.log('');

  const menuOptions: MenuOption<SchedulesMenuAction>[] = [
    {
      value: 'list',
      label: '📋 List Schedules',
      hint: scheduleCount > 0 ? 'View all schedules with cron expressions and status' : 'No schedules to list yet',
    },
    {
      value: 'create',
      label: '➕ Create New Schedule',
      hint: 'Create a schedule with cron presets or custom expression',
    },
    {
      value: 'manage',
      label: '⚙️  Manage Schedule',
      hint: scheduleCount > 0 ? 'Pause, resume, or edit a schedule' : 'No schedules to manage yet',
    },
    {
      value: 'delete',
      label: '🗑️  Delete Schedule',
      hint: scheduleCount > 0 ? 'Remove a schedule' : 'No schedules to delete',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<SchedulesMenuAction>('What would you like to do?', menuOptions);
}

/**
 * Show menu in error state
 */
async function showMenuWithError(): Promise<void> {
  const action = await select<'retry' | 'back'>('What would you like to do?', [
    {
      value: 'retry',
      label: '🔄 Retry',
      hint: 'Try loading schedules again',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ]);

  if (action === 'back') {
    throw new UserCancelledError();
  }
  // If retry, just return and the loop will continue
}

/**
 * List all schedules in a formatted display
 */
async function listSchedules(schedules: Schedule[]): Promise<void> {
  console.log('');
  console.log(colors.bold('📋 All Schedules'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  for (const schedule of schedules) {
    const statusIcon = schedule.isPaused ? '⏸️ ' : '▶️ ';
    const status = schedule.isPaused ? colors.warning('paused') : colors.success('active');
    const cronDescription = describeCron(schedule.cron);

    // Truncate schedule ID for display (first 8 chars)
    const shortId = schedule.scheduleId.length > 12
      ? schedule.scheduleId.substring(0, 12) + '...'
      : schedule.scheduleId;

    // Truncate destination URL for display
    const shortDestination = schedule.destination.length > 40
      ? schedule.destination.substring(0, 40) + '...'
      : schedule.destination;

    console.log(
      `  ${statusIcon} ${colors.bold(shortId)}` +
        ` [${status}]`
    );
    console.log(
      `     ${colors.muted('Cron:')} ${colors.highlight(schedule.cron)}` +
        colors.muted(` (${cronDescription})`)
    );
    console.log(
      `     ${colors.muted('To:')} ${shortDestination}`
    );
    console.log('');
  }

  console.log(colors.muted('Press Enter to continue...'));

  // Wait for user to press enter
  await new Promise<void>((resolve) => {
    const stdin = process.stdin;
    const oldRawMode = stdin.isRaw;

    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.once('data', () => {
      stdin.setRawMode?.(oldRawMode ?? false);
      resolve();
    });
  });
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

/**
 * Pause for a specified duration
 */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
