/**
 * URL Groups List and Explore Commands
 *
 * Provides functionality to:
 * - Explore URL groups (view and select from list)
 * - View all endpoints across all groups
 * - Manage individual groups (view details, navigate to actions)
 */

import type { MenuOption, UrlGroupDetailAction } from '../../types/commands.js';
import type { UrlGroup, UrlGroupEndpoint } from '../../types/qstash.js';
import type { QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  createTable,
  log,
  select,
  spinner,
  UserCancelledError,
} from '../../lib/ui/index.js';

/**
 * Result of exploring/managing URL groups
 */
export interface ExploreResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
  /** Whether to go back to URL groups menu */
  goBack: boolean;
}

/**
 * View all endpoints across all URL groups
 *
 * @param groups - List of URL groups to display
 */
export async function viewAllEndpoints(groups: UrlGroup[]): Promise<void> {
  console.log('');
  console.log(colors.bold(colors.primary('All Endpoints Across Groups')));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  let totalEndpoints = 0;

  for (const group of groups) {
    log(colors.bold(`  ${group.name}`));

    if (group.endpoints && group.endpoints.length > 0) {
      totalEndpoints += group.endpoints.length;
      const table = createTable(['#', 'Name', 'URL'], { style: 'compact' });
      group.endpoints.forEach((endpoint: UrlGroupEndpoint, idx: number) => {
        table.push([
          colors.dim((idx + 1).toString()),
          endpoint.name || colors.dim('(unnamed)'),
          endpoint.url,
        ]);
      });
      console.log(table.toString());
    } else {
      log(colors.dim('    No endpoints'));
    }

    console.log('');
  }

  log(
    colors.muted(
      `Total: ${totalEndpoints} endpoint${totalEndpoints !== 1 ? 's' : ''} across ${groups.length} group${groups.length !== 1 ? 's' : ''}`
    )
  );
  console.log('');

  await confirm('Press Enter to return to menu', true);
}

/**
 * Explore existing URL groups - select one to manage
 *
 * @param groups - List of URL groups to explore
 * @param client - QStash client wrapper
 * @returns Result indicating navigation preference
 */
export async function exploreGroups(
  groups: UrlGroup[],
  client: QStashClientWrapper
): Promise<ExploreResult> {
  console.log('');

  // Create selection options with endpoint counts
  const groupOptions: MenuOption<string>[] = groups.map((group) => ({
    value: group.name,
    label: `  ${group.name}`,
    hint: `${group.endpoints?.length || 0} endpoint${group.endpoints?.length !== 1 ? 's' : ''}`,
  }));

  groupOptions.push({
    value: '__back__',
    label: '  Back',
    hint: 'Return to URL groups menu',
  });

  const selectedGroup = await select<string>('Select a URL group to manage:', groupOptions);

  if (selectedGroup === '__back__') {
    return { returnToMain: false, goBack: true };
  }

  return manageGroup(selectedGroup, client);
}

/**
 * Manage a specific URL group - view details and actions
 *
 * @param groupName - Name of the group to manage
 * @param client - QStash client wrapper
 * @returns Result indicating navigation preference
 */
export async function manageGroup(
  groupName: string,
  client: QStashClientWrapper
): Promise<ExploreResult> {
  let keepManaging = true;

  while (keepManaging) {
    console.log('');

    // Fetch fresh data
    const groupResult = await spinner(`Loading ${groupName}...`, async () => {
      return client.getUrlGroup(groupName);
    });

    if (!groupResult.success || !groupResult.data) {
      log(colors.error('Failed to load URL group: ' + (groupResult.error || 'Unknown error')));
      await pause(1500);
      return { returnToMain: false, goBack: true };
    }

    const group = groupResult.data;

    // Display group info
    console.log(colors.dim('─────────────────────────────────────────────'));
    console.log(colors.bold(`URL Group: ${colors.primary(groupName)}`));
    console.log(colors.dim('─────────────────────────────────────────────'));
    console.log('');

    if (group.endpoints && group.endpoints.length > 0) {
      log(colors.muted(`Total endpoints: ${group.endpoints.length}`));
      console.log('');

      const table = createTable(['#', 'Name', 'URL'], { style: 'compact' });
      group.endpoints.forEach((endpoint: UrlGroupEndpoint, idx: number) => {
        table.push([
          colors.dim((idx + 1).toString()),
          endpoint.name || colors.dim('(unnamed)'),
          endpoint.url,
        ]);
      });
      console.log(table.toString());
    } else {
      log(colors.warning('No endpoints in this group'));
    }

    console.log('');

    // Show actions
    const hasEndpoints = group.endpoints && group.endpoints.length > 0;

    const actionOptions: MenuOption<UrlGroupDetailAction>[] = [
      {
        value: 'add-endpoint',
        label: '  Add/Update Endpoint',
        hint: 'Add new endpoint or update existing',
      },
      {
        value: 'remove-endpoint',
        label: '  Remove Endpoint',
        hint: hasEndpoints ? 'Remove an endpoint from this group' : 'No endpoints to remove',
      },
      {
        value: 'back',
        label: '  Back to group list',
        hint: '',
      },
      {
        value: 'main-menu',
        label: '  Main Menu',
        hint: '',
      },
    ];

    try {
      const action = await select<UrlGroupDetailAction>(
        'What would you like to do?',
        actionOptions
      );

      switch (action) {
        case 'add-endpoint':
          // TODO: Implement in subtask-4-3 (quick-update will provide this functionality)
          log(colors.warning('Add/Update endpoint will be available in a future update'));
          await pause(1500);
          break;
        case 'remove-endpoint':
          if (!hasEndpoints) {
            log(colors.warning('No endpoints to remove'));
            await pause(1000);
          } else {
            // TODO: Implement in subtask-4-3 or later
            log(colors.warning('Remove endpoint will be available in a future update'));
            await pause(1500);
          }
          break;
        case 'back':
          keepManaging = false;
          return { returnToMain: false, goBack: true };
        case 'main-menu':
          keepManaging = false;
          return { returnToMain: true, goBack: false };
      }
    } catch (error) {
      if (error instanceof UserCancelledError) {
        keepManaging = false;
        return { returnToMain: false, goBack: true };
      }
      throw error;
    }
  }

  return { returnToMain: false, goBack: true };
}

/**
 * Pause for a specified duration
 */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
