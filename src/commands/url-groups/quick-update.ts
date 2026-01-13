/**
 * Quick Update Endpoint Feature
 *
 * Provides a streamlined workflow to quickly update an endpoint URL in a URL group.
 * This is particularly useful for ngrok workflows where tunnel URLs change frequently.
 *
 * The flow is:
 * 1. Select a URL group
 * 2. View current endpoints
 * 3. Enter new endpoint URL
 * 4. Optionally provide a name
 * 5. Confirm and update
 */

import type { MenuOption } from '../../types/commands.js';
import type { UrlGroup, UrlGroupEndpoint } from '../../types/qstash.js';
import type { QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  createTable,
  log,
  note,
  select,
  spinner,
  text,
} from '../../lib/ui/index.js';
import { validateEndpointUrl } from './create.js';

/**
 * Result of the quick update operation
 */
export interface QuickUpdateResult {
  /** Whether the update was successful */
  success: boolean;
}

/**
 * Quick update an endpoint in a URL group
 *
 * Streamlined workflow for quickly updating endpoint URLs, optimized
 * for ngrok and other tunneling workflows where URLs change frequently.
 *
 * @param client - QStash client wrapper
 * @returns Result indicating success/failure
 */
export async function quickUpdateEndpoint(
  client: QStashClientWrapper
): Promise<QuickUpdateResult> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Quick Update Endpoint'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Fetch URL groups
  const groupsResult = await spinner('Loading URL groups...', async () => {
    return client.listUrlGroups();
  });

  if (!groupsResult.success) {
    log(colors.error('Failed to load URL groups: ' + (groupsResult.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  const groups = groupsResult.data ?? [];

  if (groups.length === 0) {
    log(colors.warning('No URL groups found. Create one first!'));
    await pause(1500);
    return { success: false };
  }

  // Select URL group
  const groupOptions: MenuOption<string>[] = groups.map((group: UrlGroup) => ({
    value: group.name,
    label: `  ${group.name}`,
    hint: `${group.endpoints?.length || 0} endpoint${group.endpoints?.length !== 1 ? 's' : ''}`,
  }));

  groupOptions.push({
    value: '__cancel__',
    label: '  Cancel',
    hint: 'Go back without updating',
  });

  const groupName = await select<string>('Which URL group?', groupOptions);

  if (groupName === '__cancel__') {
    return { success: false };
  }

  console.log('');

  // Fetch and display current endpoints
  const groupResult = await spinner(`Loading ${groupName}...`, async () => {
    return client.getUrlGroup(groupName);
  });

  if (!groupResult.success || !groupResult.data) {
    log(colors.error('Failed to load URL group: ' + (groupResult.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  const group = groupResult.data;

  if (group.endpoints && group.endpoints.length > 0) {
    log(colors.bold('Current endpoints in this group:'));
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
    console.log('');
  } else {
    log(colors.dim('No endpoints currently in this group'));
    console.log('');
  }

  // Get new endpoint URL with validation
  let endpointUrl = '';
  let isValidUrl = false;

  while (!isValidUrl) {
    endpointUrl = await text('Enter new endpoint URL:', {
      placeholder: 'https://abc123.ngrok.io/api/webhooks/endpoint',
    });

    const validation = validateEndpointUrl(endpointUrl);
    if (!validation.isValid) {
      log(colors.error(validation.error!));
      console.log('');
      continue;
    }

    isValidUrl = true;
  }

  console.log('');

  // Get optional endpoint name
  const endpointName = await text('Endpoint name (optional, press Enter to skip):', {
    placeholder: 'dev-local',
  });

  console.log('');

  // Preview
  note(
    [
      `Group: ${colors.primary(groupName)}`,
      `URL: ${colors.primary(endpointUrl)}`,
      endpointName ? `Name: ${colors.primary(endpointName)}` : colors.dim('(no name)'),
    ].join('\n'),
    'Quick Update'
  );

  console.log('');

  // Confirm
  const shouldProceed = await confirm('Update now?', true);

  if (!shouldProceed) {
    log(colors.warning('Cancelled'));
    return { success: false };
  }

  // Perform the upsert
  const endpoint: UrlGroupEndpoint = { url: endpointUrl };
  if (endpointName) {
    endpoint.name = endpointName;
  }

  const result = await spinner('Updating endpoint...', async () => {
    return client.upsertUrlGroupEndpoints(groupName, [endpoint]);
  });

  console.log('');

  if (!result.success) {
    log(colors.error('Failed to update endpoint: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  log(colors.success('Endpoint updated successfully!'));
  note(`Messages to "${groupName}" will now route to:\n${endpointUrl}`, 'Done');
  await pause(2000);

  return { success: true };
}

/**
 * Pause for a specified duration
 */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
