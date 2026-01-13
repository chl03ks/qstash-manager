/**
 * Queues Management Commands
 *
 * Provides interactive management of QStash queues.
 * Supports:
 * - Listing existing queues with their status and parallelism
 * - Creating new queues with parallelism configuration
 * - Managing queues (pause, resume, edit parallelism)
 * - Deleting queues
 */

import type { MenuOption, QueuesMenuAction } from '../../types/commands.js';
import type { Queue } from '../../types/qstash.js';
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

/**
 * Result of running the queues menu
 */
export interface QueuesMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the queues management menu
 *
 * @returns Result indicating navigation preference
 */
export async function runQueuesMenu(): Promise<QueuesMenuResult> {
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

      // Load queues
      const queuesResult = await spinner('Loading queues...', async () => {
        return client.listQueues();
      });

      if (!queuesResult.success) {
        log(colors.error('Failed to load queues: ' + (queuesResult.error || 'Unknown error')));
        // Still show menu but with error state
        await showMenuWithError();
        continue;
      }

      const queues = queuesResult.data ?? [];
      const action = await showQueuesMenu(queues);

      switch (action) {
        case 'list':
          if (queues.length === 0) {
            log(colors.warning('No queues to list. Create one first!'));
            await pause(1500);
          } else {
            await listQueues(queues);
          }
          break;

        case 'create':
          // TODO: Implement create queue (subtask-7-2)
          note('Queue creation coming soon!', 'Not Implemented');
          break;

        case 'manage':
          if (queues.length === 0) {
            log(colors.warning('No queues to manage. Create one first!'));
            await pause(1500);
          } else {
            // TODO: Implement manage queue (subtask-7-3)
            note('Queue management coming soon!', 'Not Implemented');
          }
          break;

        case 'delete':
          if (queues.length === 0) {
            log(colors.warning('No queues to delete.'));
            await pause(1500);
          } else {
            // TODO: Implement delete queue (subtask-7-4)
            note('Queue deletion coming soon!', 'Not Implemented');
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
 * Display the queues menu
 */
async function showQueuesMenu(queues: Queue[]): Promise<QueuesMenuAction> {
  const queueCount = queues.length;
  const pausedCount = queues.filter((q) => q.isPaused).length;
  const totalLag = queues.reduce((sum, q) => sum + (q.lag ?? 0), 0);

  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(
    colors.bold('Queues') +
      colors.muted(
        ` (${queueCount} queue${queueCount !== 1 ? 's' : ''}` +
          (pausedCount > 0 ? `, ${pausedCount} paused` : '') +
          (totalLag > 0 ? `, ${totalLag} pending` : '') +
          ')'
      )
  );
  console.log(colors.dim('─────────────────────────────────────────────'));

  if (queueCount === 0) {
    console.log('');
    note('No queues found. Create your first one!', 'Tip');
  }

  console.log('');

  const menuOptions: MenuOption<QueuesMenuAction>[] = [
    {
      value: 'list',
      label: '📋 List Queues',
      hint: queueCount > 0 ? 'View all queues with status and parallelism' : 'No queues to list yet',
    },
    {
      value: 'create',
      label: '➕ Create New Queue',
      hint: 'Create a queue with parallelism configuration',
    },
    {
      value: 'manage',
      label: '⚙️  Manage Queue',
      hint: queueCount > 0 ? 'Pause, resume, or edit parallelism' : 'No queues to manage yet',
    },
    {
      value: 'delete',
      label: '🗑️  Delete Queue',
      hint: queueCount > 0 ? 'Remove a queue' : 'No queues to delete',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<QueuesMenuAction>('What would you like to do?', menuOptions);
}

/**
 * Show menu in error state
 */
async function showMenuWithError(): Promise<void> {
  const action = await select<'retry' | 'back'>('What would you like to do?', [
    {
      value: 'retry',
      label: '🔄 Retry',
      hint: 'Try loading queues again',
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
 * List all queues in a table format
 */
async function listQueues(queues: Queue[]): Promise<void> {
  console.log('');
  console.log(colors.bold('📋 All Queues'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  for (const queue of queues) {
    const statusIcon = queue.isPaused ? '⏸️ ' : '▶️ ';
    const status = queue.isPaused ? colors.warning('paused') : colors.success('active');
    const lag = queue.lag !== undefined && queue.lag > 0
      ? colors.highlight(` (${queue.lag} pending)`)
      : '';

    console.log(
      `  ${statusIcon} ${colors.bold(queue.name)}` +
        colors.muted(` - parallelism: ${queue.parallelism}`) +
        ` [${status}]${lag}`
    );
  }

  console.log('');
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
