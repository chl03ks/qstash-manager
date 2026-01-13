/**
 * URL Group Creation Commands
 *
 * Provides functionality to:
 * - Create new URL groups with initial endpoints
 * - Validate group names (alphanumeric, hyphens, underscores)
 * - Validate endpoint URLs (HTTPS required)
 */

import type { UrlGroupEndpoint } from '../../types/qstash.js';
import type { QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  log,
  note,
  spinner,
  text,
} from '../../lib/ui/index.js';

/**
 * Result of creating a URL group
 */
export interface CreateGroupResult {
  /** Whether the creation was successful */
  success: boolean;
  /** The name of the created group (if successful) */
  groupName?: string;
}

/**
 * Validate a URL group name
 *
 * @param name - The group name to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateGroupName(name: string): string | undefined {
  if (!name || name.trim().length === 0) {
    return 'Group name is required';
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return 'Only letters, numbers, hyphens, and underscores allowed';
  }

  return undefined;
}

/**
 * Validate an endpoint URL
 *
 * QStash requires HTTPS URLs for all endpoints.
 *
 * @param url - The URL to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateEndpointUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'QStash requires HTTPS URLs (use ngrok for local development)',
      };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Create a new URL group interactively
 *
 * @param client - QStash client wrapper
 * @returns Result indicating success/failure
 */
export async function createUrlGroup(client: QStashClientWrapper): Promise<CreateGroupResult> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Create New URL Group'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Get group name with validation
  const groupName = await text('Enter new URL group name:', {
    placeholder: 'my-feature-group',
    validate: validateGroupName,
  });

  console.log('');

  // Get endpoint URL with validation
  let endpointUrl = '';
  let isValidUrl = false;

  while (!isValidUrl) {
    endpointUrl = await text('Enter first endpoint URL:', {
      placeholder: 'https://app.example.com/api/webhooks/endpoint',
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
    placeholder: 'production',
  });

  console.log('');

  // Preview the new group
  note(
    [
      `New group: ${colors.primary(groupName)}`,
      `First endpoint: ${colors.primary(endpointUrl)}`,
      endpointName ? `Name: ${colors.primary(endpointName)}` : colors.dim('(no name)'),
    ].join('\n'),
    'Creating'
  );

  console.log('');

  // Confirm creation
  const shouldProceed = await confirm('Create this URL group?', true);

  if (!shouldProceed) {
    log(colors.warning('Cancelled'));
    return { success: false };
  }

  // Create the URL group
  const endpoint: UrlGroupEndpoint = { url: endpointUrl };
  if (endpointName) {
    endpoint.name = endpointName;
  }

  const result = await spinner('Creating URL group...', async () => {
    return client.upsertUrlGroupEndpoints(groupName, [endpoint]);
  });

  console.log('');

  if (!result.success) {
    log(colors.error('Failed to create URL group: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return { success: false };
  }

  log(colors.success(`✓ URL group "${groupName}" created successfully!`));
  await pause(1500);

  return { success: true, groupName };
}

/**
 * Pause for a specified duration
 */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
