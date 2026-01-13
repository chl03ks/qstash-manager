/**
 * Cancel Message Command
 *
 * Provides functionality to cancel a pending QStash message by ID.
 * Only messages that have not yet been delivered can be cancelled.
 */

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
 * Cancel a message by ID
 */
export async function cancelMessage(client: QStashClientWrapper): Promise<void> {
  // Step 1: Get message ID from user
  const messageId = await getMessageId();
  if (!messageId) {
    return; // User cancelled
  }

  // Step 2: Confirm cancellation
  const shouldCancel = await confirmCancellation(messageId);
  if (!shouldCancel) {
    log(colors.muted('Cancellation aborted.'));
    return;
  }

  // Step 3: Cancel the message
  await executeCancellation(client, messageId);
}

/**
 * Get message ID from user input
 */
async function getMessageId(): Promise<string | null> {
  const messageId = await text('Enter the message ID to cancel:', {
    placeholder: 'msg_xxxxxxxxxxxxxxxxxxxx',
    validate: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Message ID is required';
      }
      // Basic format validation
      if (trimmed.length < 10) {
        return 'Message ID appears to be too short';
      }
      return undefined;
    },
  });

  return messageId.trim();
}

/**
 * Confirm the cancellation action
 */
async function confirmCancellation(messageId: string): Promise<boolean> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Cancel Message'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  console.log(`${colors.muted('Message ID:')} ${colors.primary(messageId)}`);
  console.log('');

  note(
    'Cancelling a message will prevent it from being delivered.\n' +
    'This action cannot be undone.\n\n' +
    'Note: Only pending messages can be cancelled. Messages that\n' +
    'have already been delivered cannot be cancelled.',
    'Warning'
  );

  return confirm('Are you sure you want to cancel this message?', false);
}

/**
 * Execute the cancellation
 */
async function executeCancellation(
  client: QStashClientWrapper,
  messageId: string
): Promise<void> {
  const result = await spinner('Cancelling message...', async () => {
    return client.cancelMessage(messageId);
  });

  console.log('');

  if (result.success) {
    note(
      `Message ${colors.primary(messageId)} has been cancelled.\n\n` +
      'The message will not be delivered.',
      'Message Cancelled'
    );
  } else {
    // Handle specific error cases
    const errorMessage = result.error || 'Unknown error';

    if (errorMessage.toLowerCase().includes('not found')) {
      log(colors.error('Message not found.'));
      note(
        'The message ID may be incorrect, or the message may have\n' +
        'already been delivered or expired.',
        'Not Found'
      );
    } else if (errorMessage.toLowerCase().includes('already delivered') ||
               errorMessage.toLowerCase().includes('cannot cancel')) {
      log(colors.error('Cannot cancel this message.'));
      note(
        'The message may have already been delivered.\n' +
        'Only pending messages can be cancelled.',
        'Cannot Cancel'
      );
    } else {
      log(colors.error('Failed to cancel message: ' + errorMessage));
    }
  }

  // Offer to cancel another message
  const cancelAnother = await confirm('Cancel another message?', false);
  if (cancelAnother) {
    await cancelMessage(client);
  }
}
