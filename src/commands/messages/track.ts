/**
 * Track Message Command
 *
 * Provides functionality to track the status of a QStash message by ID.
 * Displays message state, destination, method, and other details.
 */

import type { QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  log,
  note,
  spinner,
  text,
  formatDateTime,
  formatMessageState,
  formatUrl,
  truncate,
} from '../../lib/ui/index.js';

/**
 * Track a message by ID
 */
export async function trackMessage(client: QStashClientWrapper): Promise<void> {
  // Step 1: Get message ID from user
  const messageId = await getMessageId();
  if (!messageId) {
    return; // User cancelled
  }

  // Step 2: Fetch message status
  await fetchAndDisplayMessage(client, messageId);
}

/**
 * Get message ID from user input
 */
async function getMessageId(): Promise<string | null> {
  const messageId = await text('Enter the message ID to track:', {
    placeholder: 'msg_xxxxxxxxxxxxxxxxxxxx',
    validate: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Message ID is required';
      }
      // Basic format validation - message IDs typically start with msg_
      if (trimmed.length < 10) {
        return 'Message ID appears to be too short';
      }
      return undefined;
    },
  });

  return messageId.trim();
}

/**
 * Fetch and display message details
 */
async function fetchAndDisplayMessage(
  client: QStashClientWrapper,
  messageId: string
): Promise<void> {
  const result = await spinner('Fetching message status...', async () => {
    return client.getMessage(messageId);
  });

  if (!result.success || !result.data) {
    console.log('');
    log(colors.error('Failed to retrieve message: ' + (result.error || 'Message not found')));

    // Offer to try again
    const tryAgain = await confirm('Would you like to try a different message ID?', false);
    if (tryAgain) {
      await trackMessage(client);
    }
    return;
  }

  // Display message details
  displayMessageDetails(result.data);

  // Offer to track another message
  const trackAnother = await confirm('Track another message?', false);
  if (trackAnother) {
    await trackMessage(client);
  }
}

/**
 * Display formatted message details
 */
function displayMessageDetails(message: {
  messageId: string;
  url: string;
  state: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  createdAt: number;
  queueName?: string;
  scheduleId?: string;
}): void {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Message Details'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Core message info
  console.log(`${colors.muted('Message ID:')}  ${colors.primary(message.messageId)}`);
  console.log(`${colors.muted('State:')}       ${formatMessageState(message.state)}`);
  console.log(`${colors.muted('Destination:')} ${formatUrl(message.url, 60)}`);
  console.log(`${colors.muted('Method:')}      ${message.method || 'POST'}`);
  console.log(`${colors.muted('Created:')}     ${formatDateTime(message.createdAt)}`);

  // Optional queue/schedule info
  if (message.queueName) {
    console.log(`${colors.muted('Queue:')}       ${message.queueName}`);
  }
  if (message.scheduleId) {
    console.log(`${colors.muted('Schedule:')}    ${message.scheduleId}`);
  }

  // Body preview if available
  if (message.body) {
    console.log(`${colors.muted('Body:')}        ${truncate(message.body, 60)}`);
  }

  // Headers if available
  if (message.headers && Object.keys(message.headers).length > 0) {
    const headerCount = Object.keys(message.headers).length;
    console.log(`${colors.muted('Headers:')}     ${headerCount} header${headerCount !== 1 ? 's' : ''}`);
  }

  console.log('');

  // State-specific hints
  displayStateHint(message.state);
}

/**
 * Display helpful hints based on message state
 */
function displayStateHint(state: string): void {
  const lowerState = state.toLowerCase();

  switch (lowerState) {
    case 'created':
    case 'active':
      note(
        'This message is pending delivery. It will be delivered shortly.',
        'Status'
      );
      break;

    case 'delivered':
      note(
        'This message was successfully delivered to the destination.',
        'Delivered'
      );
      break;

    case 'retry':
      note(
        'This message is being retried after a failed delivery attempt.\n' +
        'Check the destination endpoint for issues.',
        'Retrying'
      );
      break;

    case 'error':
    case 'failed':
      note(
        'This message failed to deliver after all retry attempts.\n' +
        'Check the Dead Letter Queue (DLQ) for more details.',
        'Failed'
      );
      break;

    case 'cancelled':
      note(
        'This message was cancelled before delivery.',
        'Cancelled'
      );
      break;
  }
}
