/**
 * URL Group Management Commands
 *
 * Provides functionality to:
 * - Add/update endpoints in a URL group
 * - Remove endpoints from a URL group
 * - Delete an entire URL group (with confirmation)
 */

import type { MenuOption } from '../../types/commands.js';
import type { UrlGroup, UrlGroupEndpoint } from '../../types/qstash.js';
import type { QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  log,
  note,
  select,
  spinner,
  text,
} from '../../lib/ui/index.js';
import { validateEndpointUrl } from './create.js';

/**
 * Result of a management operation
 */
export interface ManagementResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Whether to return to main menu */
  returnToMain?: boolean;
}

/**
 * Add or update an endpoint in a URL group
 *
 * @param groupName - Name of the URL group
 * @param group - The URL group object
 * @param client - QStash client wrapper
 * @returns Result indicating success/failure
 */
export async function addEndpointToGroup(
  groupName: string,
  group: UrlGroup,
  client: QStashClientWrapper
): Promise<ManagementResult> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Add/Update Endpoint'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Get endpoint URL with validation loop
  let endpointUrl = '';
  let isValidUrl = false;

  while (!isValidUrl) {
    endpointUrl = await text('Enter endpoint URL:', {
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
  const endpointName = await text('Enter endpoint name (optional, press Enter to skip):', {
    placeholder: 'dev-local',
  });

  console.log('');

  // Check if URL already exists
  const existingEndpoint = group.endpoints?.find((ep) => ep.url === endpointUrl);
  if (existingEndpoint) {
    log(
      colors.warning(
        `This URL already exists as "${existingEndpoint.name || '(unnamed)'}" - it will be updated`
      )
    );
    console.log('');
  }

  // Preview
  note(
    [
      `Group: ${colors.primary(groupName)}`,
      `URL: ${colors.primary(endpointUrl)}`,
      endpointName ? `Name: ${colors.primary(endpointName)}` : colors.dim('(no name)'),
    ].join('\n'),
    'Preview'
  );

  console.log('');

  // Confirm
  const shouldProceed = await confirm('Add this endpoint?', true);

  if (!shouldProceed) {
    log(colors.warning('Cancelled'));
    return { success: false };
  }

  // Perform the upsert
  const endpoint: UrlGroupEndpoint = { url: endpointUrl };
  if (endpointName) {
    endpoint.name = endpointName;
  }

  const result = await spinner('Adding endpoint...', async () => {
    return client.upsertUrlGroupEndpoints(groupName, [endpoint]);
  });

  console.log('');

  if (!result.success) {
    log(colors.error('Failed to add endpoint: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  log(colors.success(`Endpoint ${existingEndpoint ? 'updated' : 'added'} successfully!`));
  await pause(1000);

  return { success: true };
}

/**
 * Remove an endpoint from a URL group
 *
 * @param groupName - Name of the URL group
 * @param group - The URL group object
 * @param client - QStash client wrapper
 * @returns Result indicating success/failure
 */
export async function removeEndpointFromGroup(
  groupName: string,
  group: UrlGroup,
  client: QStashClientWrapper
): Promise<ManagementResult> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Remove Endpoint'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  if (!group.endpoints || group.endpoints.length === 0) {
    log(colors.warning('No endpoints to remove'));
    await pause(1000);
    return { success: false };
  }

  // Create selection from existing endpoints
  const endpointOptions: MenuOption<string>[] = group.endpoints.map((endpoint, idx) => ({
    value: endpoint.url,
    label: `  ${idx + 1}. ${endpoint.name || '(unnamed)'}`,
    hint: endpoint.url,
  }));

  endpointOptions.push({
    value: '__cancel__',
    label: '  Cancel',
    hint: 'Go back without removing',
  });

  const selectedUrl = await select<string>(
    'Which endpoint do you want to remove?',
    endpointOptions
  );

  if (selectedUrl === '__cancel__') {
    return { success: false };
  }

  const endpoint = group.endpoints.find((ep) => ep.url === selectedUrl)!;

  console.log('');

  // Show confirmation with warning if last endpoint
  const warningLines = [
    `Group: ${colors.primary(groupName)}`,
    `Name: ${endpoint.name || colors.dim('(unnamed)')}`,
    `URL: ${colors.primary(endpoint.url)}`,
  ];

  if (group.endpoints.length === 1) {
    warningLines.push('');
    warningLines.push(colors.warning('This is the last endpoint - the group may be deleted!'));
  }

  note(warningLines.join('\n'), 'About to remove');

  console.log('');

  // Confirm with default false for safety
  const shouldProceed = await confirm('Are you sure?', false);

  if (!shouldProceed) {
    log(colors.warning('Cancelled'));
    return { success: false };
  }

  // Perform the removal
  const result = await spinner('Removing endpoint...', async () => {
    return client.removeUrlGroupEndpoints(groupName, [{ url: selectedUrl }]);
  });

  console.log('');

  if (!result.success) {
    log(colors.error('Failed to remove endpoint: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  log(colors.success('Endpoint removed successfully!'));
  await pause(1000);

  return { success: true };
}

/**
 * Delete a URL group interactively
 *
 * Allows user to select a group from a list and confirms before deletion.
 *
 * @param groups - List of URL groups to choose from
 * @param client - QStash client wrapper
 * @returns Result indicating success/failure
 */
export async function deleteUrlGroup(
  groups: UrlGroup[],
  client: QStashClientWrapper
): Promise<ManagementResult> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold(colors.error('Delete URL Group')));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Create selection options
  const groupOptions: MenuOption<string>[] = groups.map((group) => ({
    value: group.name,
    label: `  ${group.name}`,
    hint: `${group.endpoints?.length || 0} endpoint${group.endpoints?.length !== 1 ? 's' : ''}`,
  }));

  groupOptions.push({
    value: '__cancel__',
    label: '  Cancel',
    hint: 'Go back without deleting',
  });

  const groupName = await select<string>('Which URL group do you want to DELETE?', groupOptions);

  if (groupName === '__cancel__') {
    return { success: false };
  }

  // Get full group details
  const groupResult = await spinner(`Loading ${groupName}...`, async () => {
    return client.getUrlGroup(groupName);
  });

  if (!groupResult.success || !groupResult.data) {
    console.log('');
    log(colors.error('Failed to load URL group: ' + (groupResult.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  const group = groupResult.data;

  console.log('');

  // Show what will be deleted
  const endpointList =
    group.endpoints && group.endpoints.length > 0
      ? group.endpoints
          .map(
            (ep: UrlGroupEndpoint, idx: number) =>
              `  ${idx + 1}. ${ep.name || '(unnamed)'} - ${ep.url}`
          )
          .join('\n')
      : '  (no endpoints)';

  note(
    [
      colors.warning('You are about to DELETE this URL group:'),
      '',
      `Group: ${colors.bold(groupName)}`,
      `Endpoints: ${group.endpoints?.length || 0}`,
      '',
      endpointList,
      '',
      colors.error('This action CANNOT be undone!'),
    ].join('\n'),
    'Danger Zone'
  );

  console.log('');

  // Confirm with default false for safety
  const shouldProceed = await confirm('Are you ABSOLUTELY sure?', false);

  if (!shouldProceed) {
    log(colors.warning('Cancelled - nothing was deleted'));
    return { success: false };
  }

  // Perform the deletion
  const result = await spinner('Deleting URL group...', async () => {
    return client.deleteUrlGroup(groupName);
  });

  console.log('');

  if (!result.success) {
    log(colors.error('Failed to delete URL group: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  log(colors.success(`URL group "${groupName}" deleted`));
  await pause(1500);

  return { success: true };
}

/**
 * Pause for a specified duration
 */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
