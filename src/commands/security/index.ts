/**
 * Security Menu - Signing Keys Management
 *
 * Provides interactive management of QStash signing keys.
 * Supports:
 * - Viewing current and next signing keys
 * - Rotating signing keys with confirmation
 */

import type { MenuOption, SecurityMenuAction } from '../../types/commands.js';
import type { SigningKeys } from '../../types/qstash.js';
import { getConfigManager } from '../../lib/config/manager.js';
import { createQStashClient, type QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  log,
  note,
  select,
  spinner,
  UserCancelledError,
} from '../../lib/ui/index.js';

/**
 * Result of running the security menu
 */
export interface SecurityMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the security menu
 *
 * @returns Result indicating navigation preference
 */
export async function runSecurityMenu(): Promise<SecurityMenuResult> {
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

      // Load signing keys
      const keysResult = await spinner('Loading signing keys...', async () => {
        return client.getSigningKeys();
      });

      if (!keysResult.success || !keysResult.data) {
        log(colors.error('Failed to load signing keys: ' + (keysResult.error || 'Unknown error')));
        await showMenuWithError();
        continue;
      }

      const keys = keysResult.data;
      const action = await showSecurityMenu(keys);

      switch (action) {
        case 'view-keys':
          await viewSigningKeys(keys);
          break;

        case 'rotate-keys':
          await rotateSigningKeys(client);
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
 * Display the security menu
 */
async function showSecurityMenu(keys: SigningKeys): Promise<SecurityMenuAction> {
  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Security - Signing Keys'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Show brief key info in header
  const currentKeyPreview = maskKey(keys.current);
  const nextKeyPreview = maskKey(keys.next);

  note(
    `${colors.muted('Current:')} ${currentKeyPreview}\n` +
    `${colors.muted('Next:')}    ${nextKeyPreview}`,
    'Keys Preview'
  );

  console.log('');

  const menuOptions: MenuOption<SecurityMenuAction>[] = [
    {
      value: 'view-keys',
      label: '🔑 View Signing Keys',
      hint: 'View full current and next signing keys',
    },
    {
      value: 'rotate-keys',
      label: '🔄 Rotate Keys',
      hint: 'Rotate signing keys (next becomes current)',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<SecurityMenuAction>('What would you like to do?', menuOptions);
}

/**
 * Show menu in error state
 */
async function showMenuWithError(): Promise<void> {
  const action = await select<'retry' | 'back'>('What would you like to do?', [
    {
      value: 'retry',
      label: '🔄 Retry',
      hint: 'Try loading signing keys again',
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
 * View full signing keys
 */
async function viewSigningKeys(keys: SigningKeys): Promise<void> {
  console.log('');
  console.log(colors.bold('🔑 QStash Signing Keys'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Current key
  console.log(colors.bold('Current Signing Key'));
  console.log(colors.muted('Use this key to verify webhook signatures:'));
  console.log('');
  console.log(`  ${colors.success(keys.current)}`);
  console.log('');

  // Next key
  console.log(colors.bold('Next Signing Key'));
  console.log(colors.muted('This key will become current after rotation:'));
  console.log('');
  console.log(`  ${colors.warning(keys.next)}`);
  console.log('');

  // Usage guidance
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');
  note(
    'When rotating keys, the "next" key becomes "current".\n' +
    'A new "next" key is generated.\n\n' +
    'For seamless rotation, verify signatures with BOTH keys\n' +
    'during the transition period.',
    'Rotation Guide'
  );

  console.log('');
  console.log(colors.muted('Press Enter to continue...'));
  await waitForEnter();
}

/**
 * Rotate signing keys with confirmation
 */
async function rotateSigningKeys(client: QStashClientWrapper): Promise<void> {
  console.log('');
  console.log(colors.bold('🔄 Rotate Signing Keys'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Warning about rotation
  note(
    `${colors.warning('Warning:')} Key rotation is immediate and affects all webhooks.\n\n` +
    'After rotation:\n' +
    '• The current "next" key becomes the new "current" key\n' +
    '• A new "next" key is generated\n' +
    '• The old "current" key is invalidated\n\n' +
    'Make sure your webhook handlers can verify with both keys\n' +
    'before and during the rotation.',
    'Key Rotation'
  );

  console.log('');

  // Confirm rotation
  const shouldRotate = await confirm(
    `${colors.error('Rotate')} signing keys? This cannot be undone.`
  );

  if (!shouldRotate) {
    log(colors.muted('Key rotation cancelled.'));
    await pause(1000);
    return;
  }

  // Perform rotation
  // Note: The QStash SDK Client doesn't have a built-in rotate method,
  // so we need to use the underlying HTTP API via the client
  const rotateResult = await spinner('Rotating signing keys...', async () => {
    try {
      // Access the underlying client and make direct API call
      const underlyingClient = client.getClient();
      // The QStash API for key rotation is POST /v2/keys/rotate
      // Since the SDK doesn't expose this, we need to make a direct call
      // Using the client's internal request mechanism

      const response = await underlyingClient.http.request({
        method: 'POST',
        path: ['v2', 'keys', 'rotate'],
      });

      return {
        success: true,
        data: response as SigningKeys,
      };
    } catch (error) {
      // If direct rotation fails, return error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  if (!rotateResult.success) {
    log(colors.error('Failed to rotate keys: ' + (rotateResult.error || 'Unknown error')));
    console.log('');
    note(
      'Key rotation may not be available in your current QStash plan,\n' +
      'or the API endpoint may have changed.',
      'Rotation Failed'
    );
    await pause(2000);
    return;
  }

  // Show success with new keys
  const newKeys = rotateResult.data;

  console.log('');
  log(colors.success('✓ Signing keys rotated successfully!'));
  console.log('');

  if (newKeys) {
    console.log(colors.bold('New Keys:'));
    console.log(`  ${colors.muted('Current:')} ${maskKey(newKeys.current)}`);
    console.log(`  ${colors.muted('Next:')}    ${maskKey(newKeys.next)}`);
    console.log('');
  }

  note(
    'Update your webhook handlers to use the new current key.\n' +
    'The old key is no longer valid for signature verification.',
    'Next Steps'
  );

  await pause(2000);
}

/**
 * Mask a signing key for display (show first and last 8 chars)
 */
function maskKey(key: string): string {
  if (key.length <= 20) {
    return key;
  }
  const start = key.substring(0, 8);
  const end = key.substring(key.length - 8);
  return `${start}...${end}`;
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

/**
 * Wait for user to press enter
 */
function waitForEnter(): Promise<void> {
  return new Promise<void>((resolve) => {
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
