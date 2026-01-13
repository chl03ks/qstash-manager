/**
 * Send Message Command
 *
 * Provides functionality to send a message to:
 * - A specific URL
 * - A URL group (topic)
 * - A queue
 *
 * Includes options for HTTP method, body, headers, delay, retries,
 * and callbacks.
 */

import type { MessageDestinationType, MenuOption } from '../../types/commands.js';
import type { UrlGroup, Queue, PublishMessageOptions, EnqueueMessageOptions } from '../../types/qstash.js';
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
import { validateUrl, validateMessageBody } from '../../lib/utils/validation.js';

/**
 * HTTP methods supported for message sending
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Send a message to a destination
 */
export async function sendMessage(client: QStashClientWrapper): Promise<void> {
  // Step 1: Select destination type
  const destinationType = await selectDestinationType();

  // Step 2: Get destination based on type
  const destination = await getDestination(destinationType, client);
  if (!destination) {
    return; // User cancelled or no valid destination
  }

  // Step 3: Configure message options
  const messageConfig = await configureMessage();
  if (!messageConfig) {
    return; // User cancelled
  }

  // Step 4: Preview and confirm
  const shouldSend = await previewAndConfirm(destinationType, destination, messageConfig);
  if (!shouldSend) {
    log(colors.muted('Message sending cancelled.'));
    return;
  }

  // Step 5: Send the message
  await executeMessageSend(client, destinationType, destination, messageConfig);
}

/**
 * Select the destination type for the message
 */
async function selectDestinationType(): Promise<MessageDestinationType> {
  const options: MenuOption<MessageDestinationType>[] = [
    {
      value: 'url',
      label: '🔗 URL',
      hint: 'Send to a specific HTTPS URL',
    },
    {
      value: 'url-group',
      label: '📦 URL Group',
      hint: 'Send to all endpoints in a URL group',
    },
    {
      value: 'queue',
      label: '📋 Queue',
      hint: 'Enqueue message for ordered processing',
    },
  ];

  return select<MessageDestinationType>('Where would you like to send the message?', options);
}

/**
 * Get the destination based on destination type
 */
async function getDestination(
  type: MessageDestinationType,
  client: QStashClientWrapper
): Promise<DestinationInfo | null> {
  switch (type) {
    case 'url':
      return getUrlDestination();

    case 'url-group':
      return getUrlGroupDestination(client);

    case 'queue':
      return getQueueDestination(client);
  }
}

/**
 * Destination information
 */
interface DestinationInfo {
  /** The destination value (URL, group name, or queue name) */
  value: string;
  /** Display name for the destination */
  displayName: string;
  /** For queues, the target URL */
  targetUrl?: string;
}

/**
 * Get URL destination from user input
 */
async function getUrlDestination(): Promise<DestinationInfo | null> {
  const url = await text('Enter the destination URL:', {
    placeholder: 'https://example.com/api/webhook',
    validate: (value) => {
      const result = validateUrl(value);
      return result.isValid ? undefined : result.error;
    },
  });

  return {
    value: url,
    displayName: url,
  };
}

/**
 * Get URL group destination by listing available groups
 */
async function getUrlGroupDestination(client: QStashClientWrapper): Promise<DestinationInfo | null> {
  // Load URL groups
  const groupsResult = await spinner('Loading URL groups...', async () => {
    return client.listUrlGroups();
  });

  if (!groupsResult.success) {
    log(colors.error('Failed to load URL groups: ' + (groupsResult.error || 'Unknown error')));
    return null;
  }

  const groups = groupsResult.data ?? [];

  if (groups.length === 0) {
    note(
      'No URL groups found.\n\n' +
        'Create a URL group first in URL Groups > Create New URL Group.',
      'No URL Groups'
    );
    return null;
  }

  // Let user select a group
  const groupOptions: MenuOption<string>[] = groups.map((group: UrlGroup) => ({
    value: group.name,
    label: group.name,
    hint: `${group.endpoints?.length ?? 0} endpoint${(group.endpoints?.length ?? 0) !== 1 ? 's' : ''}`,
  }));

  const selectedGroup = await select<string>('Select a URL group:', groupOptions);

  return {
    value: `urlgroup://${selectedGroup}`,
    displayName: selectedGroup,
  };
}

/**
 * Get queue destination by listing available queues
 */
async function getQueueDestination(client: QStashClientWrapper): Promise<DestinationInfo | null> {
  // Load queues
  const queuesResult = await spinner('Loading queues...', async () => {
    return client.listQueues();
  });

  if (!queuesResult.success) {
    log(colors.error('Failed to load queues: ' + (queuesResult.error || 'Unknown error')));
    return null;
  }

  const queues = queuesResult.data ?? [];

  if (queues.length === 0) {
    note(
      'No queues found.\n\n' +
        'Create a queue first in Queues > Create Queue.',
      'No Queues'
    );
    return null;
  }

  // Let user select a queue
  const queueOptions: MenuOption<string>[] = queues.map((queue: Queue) => ({
    value: queue.name,
    label: queue.name,
    hint: queue.isPaused ? 'Paused' : `Parallelism: ${queue.parallelism}`,
  }));

  const selectedQueue = await select<string>('Select a queue:', queueOptions);

  // For queues, we also need a target URL
  const targetUrl = await text('Enter the target URL for the queue message:', {
    placeholder: 'https://example.com/api/process',
    validate: (value) => {
      const result = validateUrl(value);
      return result.isValid ? undefined : result.error;
    },
  });

  return {
    value: selectedQueue,
    displayName: selectedQueue,
    targetUrl: targetUrl,
  };
}

/**
 * Message configuration options
 */
interface MessageConfig {
  method: HttpMethod;
  body?: string;
  headers?: Record<string, string>;
  delay?: number;
  retries?: number;
}

/**
 * Configure message options
 */
async function configureMessage(): Promise<MessageConfig | null> {
  // Select HTTP method
  const methodOptions: MenuOption<HttpMethod>[] = [
    { value: 'POST', label: 'POST', hint: 'Most common for webhooks' },
    { value: 'GET', label: 'GET', hint: 'Retrieve data' },
    { value: 'PUT', label: 'PUT', hint: 'Replace data' },
    { value: 'PATCH', label: 'PATCH', hint: 'Partial update' },
    { value: 'DELETE', label: 'DELETE', hint: 'Remove data' },
  ];

  const method = await select<HttpMethod>('Select HTTP method:', methodOptions);

  // Ask about request body (only for methods that typically have body)
  let body: string | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    const wantsBody = await confirm('Do you want to include a request body?', false);
    if (wantsBody) {
      body = await text('Enter the request body (JSON):', {
        placeholder: '{"key": "value"}',
        validate: (value) => {
          // Validate it's valid JSON if provided
          if (value.trim()) {
            try {
              JSON.parse(value);
            } catch {
              return 'Invalid JSON format';
            }
          }
          // Also validate body size
          const bodyResult = validateMessageBody(value);
          return bodyResult.isValid ? undefined : bodyResult.error;
        },
      });
    }
  }

  // Ask about advanced options
  const wantsAdvanced = await confirm('Configure advanced options (delay, retries)?', false);

  let delay: number | undefined;
  let retries: number | undefined;

  if (wantsAdvanced) {
    // Delay
    const delayStr = await text('Delay before delivery (seconds, 0 for immediate):', {
      placeholder: '0',
      defaultValue: '0',
      validate: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid number (0 or greater)';
        }
        if (num > 604800) {
          return 'Delay cannot exceed 7 days (604800 seconds)';
        }
        return undefined;
      },
    });
    delay = parseInt(delayStr, 10) || undefined;

    // Retries
    const retriesStr = await text('Number of retries (0-5):', {
      placeholder: '3',
      defaultValue: '3',
      validate: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0 || num > 5) {
          return 'Please enter a number between 0 and 5';
        }
        return undefined;
      },
    });
    retries = parseInt(retriesStr, 10);
  }

  return {
    method,
    body: body?.trim() || undefined,
    delay,
    retries,
  };
}

/**
 * Preview the message and confirm sending
 */
async function previewAndConfirm(
  type: MessageDestinationType,
  destination: DestinationInfo,
  config: MessageConfig
): Promise<boolean> {
  console.log('');
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Message Preview'));
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  // Destination info
  const typeLabel = type === 'url-group' ? 'URL Group' : type === 'queue' ? 'Queue' : 'URL';
  console.log(`${colors.muted('Type:')}        ${typeLabel}`);
  console.log(`${colors.muted('Destination:')} ${colors.primary(destination.displayName)}`);
  if (destination.targetUrl) {
    console.log(`${colors.muted('Target URL:')}  ${destination.targetUrl}`);
  }
  console.log(`${colors.muted('Method:')}      ${config.method}`);

  if (config.body) {
    console.log(`${colors.muted('Body:')}        ${truncateBody(config.body)}`);
  }

  if (config.delay && config.delay > 0) {
    console.log(`${colors.muted('Delay:')}       ${config.delay} seconds`);
  }

  if (config.retries !== undefined) {
    console.log(`${colors.muted('Retries:')}     ${config.retries}`);
  }

  console.log('');

  return confirm('Send this message?', true);
}

/**
 * Execute the message send
 */
async function executeMessageSend(
  client: QStashClientWrapper,
  type: MessageDestinationType,
  destination: DestinationInfo,
  config: MessageConfig
): Promise<void> {
  const result = await spinner('Sending message...', async () => {
    if (type === 'queue' && destination.targetUrl) {
      // Enqueue to queue
      const options: EnqueueMessageOptions = {
        queueName: destination.value,
        destination: destination.targetUrl,
        method: config.method,
        body: config.body,
        delay: config.delay,
        retries: config.retries,
      };
      return client.enqueueMessage(options);
    } else {
      // Publish to URL or URL group
      const options: PublishMessageOptions = {
        destination: destination.value,
        method: config.method,
        body: config.body,
        delay: config.delay,
        retries: config.retries,
      };
      return client.publishMessage(options);
    }
  });

  if (result.success && result.data) {
    console.log('');
    note(
      `Message ID: ${colors.primary(result.data.messageId)}` +
        (result.data.deduplicated ? '\n(Message was deduplicated)' : ''),
      'Message Sent Successfully'
    );
  } else {
    console.log('');
    log(colors.error('Failed to send message: ' + (result.error || 'Unknown error')));
  }
}

/**
 * Truncate body for preview display
 */
function truncateBody(body: string, maxLength = 50): string {
  if (body.length <= maxLength) {
    return body;
  }
  return body.substring(0, maxLength) + '...';
}
