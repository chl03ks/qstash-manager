/**
 * Dead Letter Queue Management Commands
 *
 * Provides interactive management of QStash DLQ (failed messages).
 * Supports:
 * - Listing failed messages with error details
 * - Viewing detailed message information
 * - Retrying single or multiple failed messages
 * - Deleting single or multiple DLQ messages
 */

import type { DlqMenuAction, MenuOption } from '../../types/commands.js';
import type { DlqMessage } from '../../types/qstash.js';
import { getConfigManager } from '../../lib/config/manager.js';
import { createQStashClient, type QStashClientWrapper } from '../../lib/qstash/index.js';
import {
  colors,
  confirm,
  formatDateTime,
  formatRelativeTime,
  formatUrl,
  log,
  multiselect,
  note,
  select,
  spinner,
  truncate,
  UserCancelledError,
} from '../../lib/ui/index.js';

/**
 * Result of running the DLQ menu
 */
export interface DlqMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the DLQ management menu
 *
 * @returns Result indicating navigation preference
 */
export async function runDlqMenu(): Promise<DlqMenuResult> {
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

      // Load DLQ messages
      const dlqResult = await spinner('Loading DLQ messages...', async () => {
        return client.listDlqMessages({ count: 100 });
      });

      if (!dlqResult.success) {
        log(colors.error('Failed to load DLQ messages: ' + (dlqResult.error || 'Unknown error')));
        // Still show menu but with error state
        await showMenuWithError();
        continue;
      }

      const messages = dlqResult.data?.messages ?? [];
      const action = await showDlqMenu(messages);

      switch (action) {
        case 'list':
          if (messages.length === 0) {
            log(colors.success('No failed messages in the Dead Letter Queue.'));
            await pause(1500);
          } else {
            await listDlqMessages(messages);
          }
          break;

        case 'view-details':
          if (messages.length === 0) {
            log(colors.warning('No messages to view.'));
            await pause(1500);
          } else {
            await viewMessageDetails(client, messages);
          }
          break;

        case 'retry-single':
          if (messages.length === 0) {
            log(colors.warning('No messages to retry.'));
            await pause(1500);
          } else {
            await retrySingleMessage(client, messages);
          }
          break;

        case 'retry-bulk':
          if (messages.length === 0) {
            log(colors.warning('No messages to retry.'));
            await pause(1500);
          } else {
            await retryBulkMessages(client, messages);
          }
          break;

        case 'delete-single':
          if (messages.length === 0) {
            log(colors.warning('No messages to delete.'));
            await pause(1500);
          } else {
            await deleteSingleMessage(client, messages);
          }
          break;

        case 'delete-bulk':
          if (messages.length === 0) {
            log(colors.warning('No messages to delete.'));
            await pause(1500);
          } else {
            await deleteBulkMessages(client, messages);
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
 * Display the DLQ menu
 */
async function showDlqMenu(messages: DlqMessage[]): Promise<DlqMenuAction> {
  const messageCount = messages.length;

  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(
    colors.bold('Dead Letter Queue') +
      colors.muted(
        messageCount > 0
          ? ` (${colors.error(messageCount.toString())} failed message${messageCount !== 1 ? 's' : ''})`
          : ' (empty)'
      )
  );
  console.log(colors.dim('─────────────────────────────────────────────'));

  if (messageCount === 0) {
    console.log('');
    note('No failed messages! All messages are being delivered successfully.', 'Great!');
  }

  console.log('');

  const menuOptions: MenuOption<DlqMenuAction>[] = [
    {
      value: 'list',
      label: '📋 List Failed Messages',
      hint: messageCount > 0 ? `View all ${messageCount} failed messages` : 'No failed messages',
    },
    {
      value: 'view-details',
      label: '🔍 View Message Details',
      hint: messageCount > 0 ? 'View detailed error information' : 'No messages to view',
    },
    {
      value: 'retry-single',
      label: '🔄 Retry Single Message',
      hint: messageCount > 0 ? 'Retry one failed message' : 'No messages to retry',
    },
    {
      value: 'retry-bulk',
      label: '🔄 Bulk Retry Messages',
      hint: messageCount > 0 ? 'Select and retry multiple messages' : 'No messages to retry',
    },
    {
      value: 'delete-single',
      label: '🗑️  Delete Single Message',
      hint: messageCount > 0 ? 'Remove one message from DLQ' : 'No messages to delete',
    },
    {
      value: 'delete-bulk',
      label: '🗑️  Bulk Delete Messages',
      hint: messageCount > 0 ? 'Select and delete multiple messages' : 'No messages to delete',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<DlqMenuAction>('What would you like to do?', menuOptions);
}

/**
 * Show menu in error state
 */
async function showMenuWithError(): Promise<void> {
  const action = await select<'retry' | 'back'>('What would you like to do?', [
    {
      value: 'retry',
      label: '🔄 Retry',
      hint: 'Try loading DLQ messages again',
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
 * List all DLQ messages in a formatted display
 */
async function listDlqMessages(messages: DlqMessage[]): Promise<void> {
  console.log('');
  console.log(colors.bold('📋 Failed Messages in DLQ'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  for (const message of messages) {
    const statusCode = message.responseStatus
      ? colors.error(`HTTP ${message.responseStatus}`)
      : colors.error('Unknown error');

    // Truncate DLQ ID for display
    const shortId = message.dlqId.length > 12
      ? message.dlqId.substring(0, 12) + '...'
      : message.dlqId;

    // Format destination URL
    const shortUrl = formatUrl(message.url, 45);

    // Format time
    const timeAgo = formatRelativeTime(message.createdAt);

    // Source information
    let source = '';
    if (message.queueName) {
      source = colors.muted(` via queue: ${message.queueName}`);
    } else if (message.urlGroup) {
      source = colors.muted(` via group: ${message.urlGroup}`);
    } else if (message.scheduleId) {
      source = colors.muted(` via schedule: ${truncate(message.scheduleId, 12)}`);
    }

    console.log(
      `  ${colors.error('✗')} ${colors.bold(shortId)} [${statusCode}]`
    );
    console.log(
      `     ${colors.muted('URL:')} ${shortUrl}`
    );
    console.log(
      `     ${colors.muted('Failed:')} ${timeAgo}${source}`
    );
    console.log('');
  }

  console.log(colors.muted('Press Enter to continue...'));

  // Wait for user to press enter
  await waitForEnter();
}

/**
 * View detailed information about a DLQ message
 */
async function viewMessageDetails(
  client: QStashClientWrapper,
  messages: DlqMessage[]
): Promise<void> {
  // Select a message to view
  const messageOptions = messages.map((m) => ({
    value: m.dlqId,
    label: `${truncate(m.dlqId, 12)} - ${formatUrl(m.url, 40)}`,
    hint: m.responseStatus ? `HTTP ${m.responseStatus}` : 'Unknown error',
  }));

  messageOptions.push({
    value: 'back',
    label: '← Back',
    hint: 'Return to DLQ menu',
  });

  const selected = await select<string>('Select a message to view:', messageOptions);

  if (selected === 'back') {
    return;
  }

  // Get the full message details
  const result = await spinner('Loading message details...', async () => {
    return client.getDlqMessage(selected);
  });

  if (!result.success || !result.data) {
    log(colors.error('Failed to load message details: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return;
  }

  const message = result.data;

  // Display detailed information
  console.log('');
  console.log(colors.bold('🔍 Message Details'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  console.log(`  ${colors.muted('DLQ ID:')}       ${message.dlqId}`);
  console.log(`  ${colors.muted('Message ID:')}   ${message.messageId}`);
  console.log(`  ${colors.muted('URL:')}          ${message.url}`);
  console.log(`  ${colors.muted('Method:')}       ${message.method || 'POST'}`);
  console.log(`  ${colors.muted('Failed at:')}    ${formatDateTime(message.createdAt)}`);
  console.log(`  ${colors.muted('Retry count:')} ${message.retryCount}`);

  if (message.queueName) {
    console.log(`  ${colors.muted('Queue:')}        ${message.queueName}`);
  }
  if (message.urlGroup) {
    console.log(`  ${colors.muted('URL Group:')}   ${message.urlGroup}`);
  }
  if (message.scheduleId) {
    console.log(`  ${colors.muted('Schedule ID:')} ${message.scheduleId}`);
  }

  // Response information
  console.log('');
  console.log(colors.bold('📨 Response'));
  console.log(colors.dim('─────────────────────────────────────────────'));

  if (message.responseStatus) {
    const statusColor = message.responseStatus >= 500 ? colors.error : colors.warning;
    console.log(`  ${colors.muted('Status:')}       ${statusColor(message.responseStatus.toString())}`);
  } else {
    console.log(`  ${colors.muted('Status:')}       ${colors.error('No response')}`);
  }

  if (message.responseBody) {
    console.log('');
    console.log(`  ${colors.muted('Response Body:')}`);
    // Pretty print JSON if possible
    try {
      const parsed = JSON.parse(message.responseBody);
      const formatted = JSON.stringify(parsed, null, 2);
      const lines = formatted.split('\n');
      lines.forEach((line) => console.log(`    ${colors.dim(line)}`));
    } catch {
      // Not JSON, show as is (truncated if too long)
      const truncatedBody = message.responseBody.length > 500
        ? message.responseBody.substring(0, 500) + '...'
        : message.responseBody;
      console.log(`    ${colors.dim(truncatedBody)}`);
    }
  }

  // Request body if present
  if (message.body) {
    console.log('');
    console.log(colors.bold('📤 Request Body'));
    console.log(colors.dim('─────────────────────────────────────────────'));
    try {
      const parsed = JSON.parse(message.body);
      const formatted = JSON.stringify(parsed, null, 2);
      const lines = formatted.split('\n');
      lines.forEach((line) => console.log(`  ${colors.dim(line)}`));
    } catch {
      const truncatedBody = message.body.length > 500
        ? message.body.substring(0, 500) + '...'
        : message.body;
      console.log(`  ${colors.dim(truncatedBody)}`);
    }
  }

  // Headers if present
  if (message.headers && Object.keys(message.headers).length > 0) {
    console.log('');
    console.log(colors.bold('📋 Request Headers'));
    console.log(colors.dim('─────────────────────────────────────────────'));
    Object.entries(message.headers).forEach(([key, value]) => {
      console.log(`  ${colors.muted(key + ':')} ${value}`);
    });
  }

  console.log('');
  console.log(colors.muted('Press Enter to continue...'));
  await waitForEnter();
}

/**
 * Retry a single DLQ message
 */
async function retrySingleMessage(
  client: QStashClientWrapper,
  messages: DlqMessage[]
): Promise<void> {
  // Select a message to retry
  const messageOptions = messages.map((m) => ({
    value: m.dlqId,
    label: `${truncate(m.dlqId, 12)} - ${formatUrl(m.url, 40)}`,
    hint: m.responseStatus ? `HTTP ${m.responseStatus}` : 'Unknown error',
  }));

  messageOptions.push({
    value: 'back',
    label: '← Back',
    hint: 'Return to DLQ menu',
  });

  const selected = await select<string>('Select a message to retry:', messageOptions);

  if (selected === 'back') {
    return;
  }

  // Get the full message to retry
  const message = messages.find((m) => m.dlqId === selected);
  if (!message) {
    log(colors.error('Message not found'));
    await pause(1500);
    return;
  }

  // Confirm retry
  const shouldRetry = await confirm(
    `Retry message to ${formatUrl(message.url, 50)}?`
  );

  if (!shouldRetry) {
    log(colors.muted('Retry cancelled.'));
    await pause(1000);
    return;
  }

  // Republish the message
  const publishResult = await spinner('Retrying message...', async () => {
    return client.publishMessage({
      destination: message.url,
      method: message.method,
      body: message.body,
      headers: message.headers,
    });
  });

  if (!publishResult.success) {
    log(colors.error('Failed to retry message: ' + (publishResult.error || 'Unknown error')));
    await pause(2000);
    return;
  }

  // Delete from DLQ
  const deleteResult = await spinner('Removing from DLQ...', async () => {
    return client.deleteDlqMessage(selected);
  });

  if (!deleteResult.success) {
    log(colors.warning('Message retried but failed to remove from DLQ: ' + (deleteResult.error || 'Unknown error')));
    await pause(2000);
    return;
  }

  log(colors.success(`✓ Message retried successfully! New message ID: ${publishResult.data?.messageId}`));
  await pause(2000);
}

/**
 * Retry multiple DLQ messages
 */
async function retryBulkMessages(
  client: QStashClientWrapper,
  messages: DlqMessage[]
): Promise<void> {
  // Select messages to retry
  const messageOptions = messages.map((m) => ({
    value: m.dlqId,
    label: `${truncate(m.dlqId, 12)} - ${formatUrl(m.url, 40)}`,
    hint: m.responseStatus ? `HTTP ${m.responseStatus}` : 'Unknown error',
  }));

  const selected = await multiselect<string>(
    'Select messages to retry (space to select, enter to confirm):',
    messageOptions
  );

  if (!selected || selected.length === 0) {
    log(colors.muted('No messages selected.'));
    await pause(1000);
    return;
  }

  // Confirm retry
  const shouldRetry = await confirm(
    `Retry ${selected.length} message${selected.length > 1 ? 's' : ''}?`
  );

  if (!shouldRetry) {
    log(colors.muted('Retry cancelled.'));
    await pause(1000);
    return;
  }

  // Retry each message
  let successCount = 0;
  let failCount = 0;

  await spinner(`Retrying ${selected.length} messages...`, async () => {
    for (const dlqId of selected) {
      const message = messages.find((m) => m.dlqId === dlqId);
      if (!message) {
        failCount++;
        continue;
      }

      // Republish
      const publishResult = await client.publishMessage({
        destination: message.url,
        method: message.method,
        body: message.body,
        headers: message.headers,
      });

      if (publishResult.success) {
        // Delete from DLQ
        const deleteResult = await client.deleteDlqMessage(dlqId);
        if (deleteResult.success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }
  });

  console.log('');
  if (successCount > 0) {
    log(colors.success(`✓ ${successCount} message${successCount > 1 ? 's' : ''} retried successfully`));
  }
  if (failCount > 0) {
    log(colors.error(`✗ ${failCount} message${failCount > 1 ? 's' : ''} failed to retry`));
  }
  await pause(2000);
}

/**
 * Delete a single DLQ message
 */
async function deleteSingleMessage(
  client: QStashClientWrapper,
  messages: DlqMessage[]
): Promise<void> {
  // Select a message to delete
  const messageOptions = messages.map((m) => ({
    value: m.dlqId,
    label: `${truncate(m.dlqId, 12)} - ${formatUrl(m.url, 40)}`,
    hint: m.responseStatus ? `HTTP ${m.responseStatus}` : 'Unknown error',
  }));

  messageOptions.push({
    value: 'back',
    label: '← Back',
    hint: 'Return to DLQ menu',
  });

  const selected = await select<string>('Select a message to delete:', messageOptions);

  if (selected === 'back') {
    return;
  }

  // Get the message for confirmation display
  const message = messages.find((m) => m.dlqId === selected);

  // Confirm deletion
  const shouldDelete = await confirm(
    `${colors.error('Delete')} message to ${formatUrl(message?.url || 'unknown', 50)}? This cannot be undone.`
  );

  if (!shouldDelete) {
    log(colors.muted('Delete cancelled.'));
    await pause(1000);
    return;
  }

  // Delete the message
  const result = await spinner('Deleting message...', async () => {
    return client.deleteDlqMessage(selected);
  });

  if (!result.success) {
    log(colors.error('Failed to delete message: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return;
  }

  log(colors.success('✓ Message deleted from DLQ'));
  await pause(1500);
}

/**
 * Delete multiple DLQ messages
 */
async function deleteBulkMessages(
  client: QStashClientWrapper,
  messages: DlqMessage[]
): Promise<void> {
  // Select messages to delete
  const messageOptions = messages.map((m) => ({
    value: m.dlqId,
    label: `${truncate(m.dlqId, 12)} - ${formatUrl(m.url, 40)}`,
    hint: m.responseStatus ? `HTTP ${m.responseStatus}` : 'Unknown error',
  }));

  const selected = await multiselect<string>(
    'Select messages to delete (space to select, enter to confirm):',
    messageOptions
  );

  if (!selected || selected.length === 0) {
    log(colors.muted('No messages selected.'));
    await pause(1000);
    return;
  }

  // Confirm deletion
  const shouldDelete = await confirm(
    `${colors.error('Delete')} ${selected.length} message${selected.length > 1 ? 's' : ''}? This cannot be undone.`
  );

  if (!shouldDelete) {
    log(colors.muted('Delete cancelled.'));
    await pause(1000);
    return;
  }

  // Delete the messages
  const result = await spinner(`Deleting ${selected.length} messages...`, async () => {
    return client.deleteDlqMessages(selected);
  });

  if (!result.success) {
    log(colors.error('Failed to delete messages: ' + (result.error || 'Unknown error')));
    await pause(2000);
    return;
  }

  log(colors.success(`✓ ${result.data} message${result.data !== 1 ? 's' : ''} deleted from DLQ`));
  await pause(1500);
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
