/**
 * URL Groups Management Commands
 *
 * Provides interactive management of QStash URL groups (topics).
 * Supports:
 * - Exploring existing URL groups and their endpoints
 * - Quick endpoint URL updates (useful for ngrok tunnels)
 * - Viewing all endpoints across groups
 * - Creating new URL groups
 * - Deleting URL groups
 */

import type { MenuOption, UrlGroupsMenuAction } from '../../types/commands.js';
import type { UrlGroup } from '../../types/qstash.js';
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
import { createUrlGroup } from './create.js';
import { exploreGroups, viewAllEndpoints } from './list.js';
import { deleteUrlGroup } from './manage.js';

/**
 * Result of running the URL groups menu
 */
export interface UrlGroupsMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the URL groups management menu
 *
 * @returns Result indicating navigation preference
 */
export async function runUrlGroupsMenu(): Promise<UrlGroupsMenuResult> {
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

      // Load URL groups
      const groupsResult = await spinner('Loading URL groups...', async () => {
        return client.listUrlGroups();
      });

      if (!groupsResult.success) {
        log(colors.error('Failed to load URL groups: ' + (groupsResult.error || 'Unknown error')));
        // Still show menu but with error state
        await showMenuWithError();
        continue;
      }

      const groups = groupsResult.data ?? [];
      const action = await showUrlGroupsMenu(groups);

      switch (action) {
        case 'explore':
          if (groups.length === 0) {
            log(colors.warning('No groups to explore. Create one first!'));
            await pause(1500);
          } else {
            const exploreResult = await exploreGroups(groups, client);
            if (exploreResult.returnToMain) {
              return { returnToMain: true };
            }
            // If goBack, continue the menu loop
          }
          break;

        case 'quick-update':
          // TODO: Implement quick update (subtask-4-3)
          note('Quick endpoint update coming soon!', 'Not Implemented');
          break;

        case 'view-all-endpoints':
          if (groups.length === 0) {
            log(colors.warning('No endpoints to view. Create a group first!'));
            await pause(1500);
          } else {
            await viewAllEndpoints(groups);
          }
          break;

        case 'create-new':
          await createUrlGroup(client);
          break;

        case 'delete-group':
          if (groups.length === 0) {
            log(colors.warning('No groups to delete.'));
            await pause(1500);
          } else {
            await deleteUrlGroup(groups, client);
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
 * Display the URL groups menu
 */
async function showUrlGroupsMenu(groups: UrlGroup[]): Promise<UrlGroupsMenuAction> {
  const groupCount = groups.length;
  const totalEndpoints = groups.reduce((sum, g) => sum + (g.endpoints?.length ?? 0), 0);

  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(
    colors.bold('URL Groups') +
      colors.muted(` (${groupCount} group${groupCount !== 1 ? 's' : ''}, ${totalEndpoints} endpoint${totalEndpoints !== 1 ? 's' : ''})`)
  );
  console.log(colors.dim('─────────────────────────────────────────────'));

  if (groupCount === 0) {
    console.log('');
    note('No URL groups found. Create your first one!', 'Tip');
  }

  console.log('');

  const menuOptions: MenuOption<UrlGroupsMenuAction>[] = [
    {
      value: 'explore',
      label: '🔍 Explore URL Groups',
      hint: groupCount > 0 ? 'View and manage existing groups' : 'No groups to explore yet',
    },
    {
      value: 'quick-update',
      label: '⚡ Quick Update Endpoint',
      hint: 'Fast way to update an endpoint URL (great for ngrok!)',
    },
    {
      value: 'view-all-endpoints',
      label: '📋 View All Endpoints',
      hint: groupCount > 0 ? 'See all endpoints across all groups' : 'No endpoints to view',
    },
    {
      value: 'create-new',
      label: '➕ Create New URL Group',
      hint: 'Start a new URL group with endpoints',
    },
    {
      value: 'delete-group',
      label: '🗑️  Delete URL Group',
      hint: groupCount > 0 ? 'Remove an entire group' : 'No groups to delete',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<UrlGroupsMenuAction>('What would you like to do?', menuOptions);
}

/**
 * Show menu in error state
 */
async function showMenuWithError(): Promise<void> {
  const action = await select<'retry' | 'back'>('What would you like to do?', [
    {
      value: 'retry',
      label: '🔄 Retry',
      hint: 'Try loading URL groups again',
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
