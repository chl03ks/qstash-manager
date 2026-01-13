/**
 * Configuration Management Commands
 *
 * Provides interactive management of environments, tokens, and preferences.
 * Supports:
 * - Listing all configured environments
 * - Adding new environments with token validation
 * - Switching between environments
 * - Removing environments
 * - Setting the default environment
 * - Managing preferences
 */

import type { ConfigMenuAction, MenuOption } from '../../types/commands.js';
import { getConfigManager } from '../../lib/config/manager.js';
import type { EnvironmentListEntry } from '../../lib/config/types.js';
import { validateQStashToken } from '../../lib/qstash/client.js';
import {
  colors,
  confirm,
  createTable,
  formatRelativeTime,
  log,
  note,
  password,
  select,
  spinner,
  text,
  UserCancelledError,
} from '../../lib/ui/index.js';
import { validateEnvironmentName, validateToken } from '../../lib/utils/validation.js';

/**
 * Result of running the config menu
 */
export interface ConfigMenuResult {
  /** Whether to return to main menu */
  returnToMain: boolean;
}

/**
 * Run the configuration management menu
 *
 * @returns Result indicating navigation preference
 */
export async function runConfigMenu(): Promise<ConfigMenuResult> {
  const configManager = getConfigManager();
  let shouldContinue = true;

  while (shouldContinue) {
    try {
      const action = await showConfigMenu();

      switch (action) {
        case 'list-envs':
          await listEnvironments();
          break;

        case 'add-env':
          await addEnvironment();
          break;

        case 'switch-env':
          await switchEnvironment();
          break;

        case 'remove-env':
          await removeEnvironment();
          break;

        case 'set-default':
          await setDefaultEnvironment();
          break;

        case 'preferences':
          await managePreferences();
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
 * Display the configuration menu
 */
async function showConfigMenu(): Promise<ConfigMenuAction> {
  const configManager = getConfigManager();
  const envCount = configManager.getEnvironmentCount();
  const defaultEnv = configManager.getDefaultEnvironment();

  console.log(''); // Blank line for spacing
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log(colors.bold('Configuration') + colors.muted(` (${envCount} environment${envCount !== 1 ? 's' : ''})`));
  if (defaultEnv) {
    console.log(colors.muted(`Default: ${defaultEnv}`));
  }
  console.log(colors.dim('─────────────────────────────────────────────'));
  console.log('');

  const menuOptions: MenuOption<ConfigMenuAction>[] = [
    {
      value: 'list-envs',
      label: '📋 View Environments',
      hint: 'List all configured environments',
    },
    {
      value: 'add-env',
      label: '➕ Add Environment',
      hint: 'Add a new QStash environment',
    },
    {
      value: 'switch-env',
      label: '🔄 Switch Environment',
      hint: 'Change the active environment',
    },
    {
      value: 'set-default',
      label: '⭐ Set Default',
      hint: 'Set the default environment',
    },
    {
      value: 'remove-env',
      label: '🗑️  Remove Environment',
      hint: 'Delete an environment',
    },
    {
      value: 'preferences',
      label: '⚙️  Preferences',
      hint: 'Manage CLI settings',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to main menu',
    },
  ];

  return select<ConfigMenuAction>('What would you like to do?', menuOptions);
}

/**
 * List all configured environments
 */
async function listEnvironments(): Promise<void> {
  const configManager = getConfigManager();
  const environments = configManager.listEnvironments({ includeToken: true });

  if (environments.length === 0) {
    note(
      'No environments configured.\n\n' +
        'Use "Add Environment" to add your first QStash environment.',
      'No Environments'
    );
    return;
  }

  // Create table with environment data
  const table = createTable(['', 'ID', 'Name', 'Token', 'Created'], {
    style: 'compact',
  });

  for (const env of environments) {
    table.push([
      env.isDefault ? colors.success('●') : colors.muted('○'),
      env.id,
      env.name,
      colors.muted(env.maskedToken || '***'),
      formatRelativeTime(env.createdAt),
    ]);
  }

  console.log('');
  console.log(table.toString());
  console.log('');
  console.log(colors.muted(`${colors.success('●')} = default environment`));
  console.log('');
}

/**
 * Add a new environment
 */
async function addEnvironment(): Promise<void> {
  const configManager = getConfigManager();

  // Step 1: Get environment ID
  const envId = await text('Enter an ID for this environment:', {
    placeholder: 'production, staging, dev, etc.',
    validate: (value) => {
      const result = validateEnvironmentName(value);
      if (!result.isValid) {
        return result.error;
      }

      // Check if already exists
      const normalized = value.toLowerCase().replace(/\s+/g, '-');
      if (configManager.getEnvironment(normalized)) {
        return `Environment '${normalized}' already exists`;
      }

      return undefined;
    },
  });

  const normalizedId = envId.toLowerCase().replace(/\s+/g, '-');

  // Step 2: Get display name (optional)
  const displayName = await text('Enter a display name (optional):', {
    placeholder: envId.charAt(0).toUpperCase() + envId.slice(1),
    defaultValue: envId.charAt(0).toUpperCase() + envId.slice(1),
  });

  // Step 3: Get QStash token
  log(colors.muted('Get your token from: ') + colors.primary('https://console.upstash.com/qstash'));

  const token = await password('Paste your QStash token:', {
    mask: '*',
    validate: (value) => {
      const result = validateToken(value);
      return result.isValid ? undefined : result.error;
    },
  });

  // Step 4: Validate token with API
  const validationResult = await spinner('Validating token with QStash...', async () => {
    return validateQStashToken(token.trim());
  });

  if (!validationResult.success) {
    log(colors.error('Token validation failed: ' + (validationResult.error || 'Invalid token')));
    log(colors.muted('Please check your token and try again.'));
    return;
  }

  log(colors.success('Token validated successfully!'));

  // Step 5: Save environment
  const result = configManager.addEnvironment(normalizedId, token.trim(), displayName.trim() || undefined);

  if (!result.success) {
    log(colors.error('Failed to add environment: ' + (result.error || 'Unknown error')));
    return;
  }

  note(
    `Environment '${displayName || normalizedId}' has been added.\n\n` +
      (configManager.getEnvironmentCount() === 1
        ? 'This is now your default environment.'
        : `Use "Set Default" to make it the default.`),
    'Environment Added'
  );
}

/**
 * Switch to a different environment
 */
async function switchEnvironment(): Promise<void> {
  const configManager = getConfigManager();
  const environments = configManager.listEnvironments();

  if (environments.length === 0) {
    note('No environments configured. Add an environment first.', 'No Environments');
    return;
  }

  if (environments.length === 1) {
    note(
      `Only one environment configured: ${environments[0].name}\n\n` +
        'Add more environments to switch between them.',
      'Single Environment'
    );
    return;
  }

  const options = environments.map((env) => ({
    value: env.id,
    label: getEnvironmentLabel(env),
    hint: env.isDefault ? 'current default' : undefined,
  }));

  const selectedId = await select<string>('Switch to which environment?', options);

  // Update the default environment
  const result = configManager.setDefaultEnvironment(selectedId);

  if (!result.success) {
    log(colors.error('Failed to switch environment: ' + (result.error || 'Unknown error')));
    return;
  }

  const selectedEnv = configManager.getEnvironment(selectedId);
  log(colors.success(`Switched to ${selectedEnv?.name || selectedId}`));
}

/**
 * Remove an environment
 */
async function removeEnvironment(): Promise<void> {
  const configManager = getConfigManager();
  const environments = configManager.listEnvironments();

  if (environments.length === 0) {
    note('No environments configured.', 'No Environments');
    return;
  }

  const options = environments.map((env) => ({
    value: env.id,
    label: getEnvironmentLabel(env),
    hint: env.isDefault ? 'default' : undefined,
  }));

  const selectedId = await select<string>('Which environment do you want to remove?', options);

  const selectedEnv = configManager.getEnvironment(selectedId);
  const isDefault = configManager.getDefaultEnvironment() === selectedId;

  // Confirm deletion
  let confirmMessage = `Are you sure you want to remove '${selectedEnv?.name || selectedId}'?`;
  if (isDefault) {
    confirmMessage += '\n' + colors.warning('This is the default environment.');
  }

  const confirmed = await confirm(confirmMessage, false);

  if (!confirmed) {
    log(colors.muted('Removal cancelled.'));
    return;
  }

  const result = configManager.removeEnvironment(selectedId);

  if (!result.success) {
    log(colors.error('Failed to remove environment: ' + (result.error || 'Unknown error')));
    return;
  }

  log(colors.success(`Environment '${selectedEnv?.name || selectedId}' removed.`));

  if (result.defaultAffected) {
    const newDefault = configManager.getDefaultEnvironment();
    if (newDefault) {
      log(colors.muted(`New default environment: ${newDefault}`));
    } else {
      log(colors.warning('No default environment set. Add a new environment or set one as default.'));
    }
  }
}

/**
 * Set the default environment
 */
async function setDefaultEnvironment(): Promise<void> {
  const configManager = getConfigManager();
  const environments = configManager.listEnvironments();

  if (environments.length === 0) {
    note('No environments configured. Add an environment first.', 'No Environments');
    return;
  }

  if (environments.length === 1) {
    const env = environments[0];
    if (env.isDefault) {
      note(`'${env.name}' is already the default (and only) environment.`, 'Already Default');
    } else {
      const result = configManager.setDefaultEnvironment(env.id);
      if (result.success) {
        log(colors.success(`'${env.name}' is now the default environment.`));
      }
    }
    return;
  }

  const options = environments.map((env) => ({
    value: env.id,
    label: getEnvironmentLabel(env),
    hint: env.isDefault ? 'current default' : undefined,
  }));

  const selectedId = await select<string>('Which environment should be the default?', options);

  const selectedEnv = configManager.getEnvironment(selectedId);

  if (configManager.getDefaultEnvironment() === selectedId) {
    log(colors.muted(`'${selectedEnv?.name || selectedId}' is already the default.`));
    return;
  }

  const result = configManager.setDefaultEnvironment(selectedId);

  if (!result.success) {
    log(colors.error('Failed to set default: ' + (result.error || 'Unknown error')));
    return;
  }

  log(colors.success(`'${selectedEnv?.name || selectedId}' is now the default environment.`));
}

/**
 * Manage CLI preferences
 */
async function managePreferences(): Promise<void> {
  const configManager = getConfigManager();
  const preferences = configManager.getPreferences();

  const action = await select<'color' | 'confirm' | 'back'>('Which preference do you want to change?', [
    {
      value: 'color',
      label: `Color Output: ${preferences.colorOutput ? colors.success('On') : colors.error('Off')}`,
      hint: 'Toggle colored terminal output',
    },
    {
      value: 'confirm',
      label: `Confirm Destructive: ${preferences.confirmDestructiveActions ? colors.success('On') : colors.error('Off')}`,
      hint: 'Require confirmation for delete operations',
    },
    {
      value: 'back',
      label: '← Back',
      hint: 'Return to config menu',
    },
  ]);

  if (action === 'back') {
    return;
  }

  if (action === 'color') {
    const newValue = !preferences.colorOutput;
    configManager.updatePreferences({ colorOutput: newValue });
    log(colors.success(`Color output ${newValue ? 'enabled' : 'disabled'}.`));
  } else if (action === 'confirm') {
    const newValue = !preferences.confirmDestructiveActions;
    configManager.updatePreferences({ confirmDestructiveActions: newValue });
    log(colors.success(`Destructive action confirmation ${newValue ? 'enabled' : 'disabled'}.`));
  }
}

/**
 * Get a formatted label for an environment in selection menus
 */
function getEnvironmentLabel(env: EnvironmentListEntry): string {
  const indicator = env.isDefault ? colors.success('●') : colors.muted('○');
  return `${indicator} ${env.name}`;
}

/**
 * Export for use in main menu
 */
export { runConfigMenu as configMenu };
