/**
 * Messages Management Commands
 *
 * Provides interactive management of QStash messages.
 * Supports:
 * - Sending messages to URLs, URL groups, or queues
 * - Batch sending multiple messages
 * - Tracking message status
 * - Cancelling pending messages
 */

import type { MenuOption, MessagesMenuAction } from '../../types/commands.js';
import { getConfigManager } from '../../lib/config/manager.js';
import { createQStashClient, type QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  note,
  select,
  UserCancelledError,
} from '../../lib/ui/index.js';
import { cancelMessage } from './cancel.js';
import { sendMessage } from './send.js';
import { trackMessage } from './track.js';

/**
 * Result of running the messages menu
 */
export interface MessagesMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the messages management menu
 *
 * @returns Result indicating navigation preference
 */
export async function runMessagesMenu(): Promise<MessagesMenuResult> {
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

      const action = await showMessagesMenu();

      switch (action) {
        case 'send':
          await sendMessage(client);
          break;

        case 'batch-send':
          // TODO: Implement batch send (subtask-5-2)
          note('Batch send coming soon!', 'Not Implemented');
          break;

        case 'track':
          await trackMessage(client);
          break;

        case 'cancel':
          await cancelMessage(client);
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
 * Display the messages menu
 */
async function showMessagesMenu(): Promise<MessagesMenuAction> {
  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Messages'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  const menuOptions: MenuOption<MessagesMenuAction>[] = [
    {
      value: 'send',
      label: '📤 Send Message',
      hint: 'Send a message to URL, URL group, or queue',
    },
    {
      value: 'batch-send',
      label: '📦 Batch Send',
      hint: 'Send multiple messages at once',
    },
    {
      value: 'track',
      label: '🔍 Track Message',
      hint: 'Check status of a message by ID',
    },
    {
      value: 'cancel',
      label: '❌ Cancel Message',
      hint: 'Cancel a pending message',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<MessagesMenuAction>('What would you like to do?', menuOptions);
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
