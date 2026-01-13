/**
 * First-Run Setup Wizard
 *
 * Guides new users through the initial configuration of QStash Manager.
 * This wizard is shown when no configuration file exists and no token
 * is available from environment variables.
 *
 * Flow:
 * 1. Welcome message
 * 2. Select environment name (Production, Staging, Development, Custom)
 * 3. Enter QStash token (masked input)
 * 4. Validate token with QStash API
 * 5. Optionally add more environments
 * 6. Save configuration
 * 7. Success message
 */

import { getConfigManager } from '../../lib/config/manager.js';
import { validateQStashToken } from '../../lib/qstash/client.js';
import {
  colors,
  confirm,
  intro,
  log,
  note,
  outro,
  password,
  select,
  spinner,
  text,
  UserCancelledError,
} from '../../lib/ui/index.js';
import { validateEnvironmentName, validateToken } from '../../lib/utils/validation.js';

/**
 * Environment preset options
 */
type EnvironmentPreset = 'production' | 'staging' | 'development' | 'custom';

/**
 * Result of the setup wizard
 */
export interface SetupResult {
  success: boolean;
  environmentsAdded: number;
  defaultEnvironment?: string;
  error?: string;
}

/**
 * Run the first-run setup wizard
 *
 * This wizard guides new users through setting up their first environment
 * and validating their QStash token.
 *
 * @returns Setup result indicating success/failure and environments added
 * @throws UserCancelledError if user cancels the wizard
 */
export async function runSetupWizard(): Promise<SetupResult> {
  const configManager = getConfigManager();
  let environmentsAdded = 0;
  let defaultEnvironment: string | undefined;

  // Welcome message
  intro(colors.primary('Welcome to QStash Manager! ') + colors.muted('Let\'s get you set up in 2 minutes.'));

  note(
    'No configuration found. Let\'s create one!\n\n' +
      colors.muted('You\'ll need your QStash token from:\n') +
      colors.primary('https://console.upstash.com/qstash'),
    'First Run'
  );

  // Add first environment
  try {
    const result = await addEnvironmentFlow(true);
    if (result.success && result.environmentId) {
      environmentsAdded++;
      defaultEnvironment = result.environmentId;

      // Ask to add more environments
      while (true) {
        const addMore = await confirm(
          'Would you like to add another environment (e.g., staging, dev)?',
          false
        );

        if (!addMore) {
          break;
        }

        const additionalResult = await addEnvironmentFlow(false);
        if (additionalResult.success) {
          environmentsAdded++;
        } else if (additionalResult.error) {
          log(colors.warning(additionalResult.error));
          break;
        }
      }
    } else {
      return {
        success: false,
        environmentsAdded: 0,
        error: result.error || 'Failed to add environment',
      };
    }
  } catch (error) {
    if (error instanceof UserCancelledError) {
      throw error;
    }
    return {
      success: false,
      environmentsAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error during setup',
    };
  }

  // Show success message
  const configPath = configManager.getConfigPath();
  note(
    colors.success(`Configuration saved to ${configPath}\n\n`) +
      `${colors.muted('Environments added:')} ${environmentsAdded}\n` +
      `${colors.muted('Default environment:')} ${defaultEnvironment}`,
    'Setup Complete'
  );

  outro(colors.success('You\'re all set! Let\'s explore QStash...'));

  return {
    success: true,
    environmentsAdded,
    defaultEnvironment,
  };
}

/**
 * Result of adding an environment
 */
interface AddEnvironmentFlowResult {
  success: boolean;
  environmentId?: string;
  error?: string;
}

/**
 * Flow for adding a single environment
 *
 * @param isFirst - Whether this is the first environment being added
 * @returns Result of adding the environment
 */
async function addEnvironmentFlow(isFirst: boolean): Promise<AddEnvironmentFlowResult> {
  const configManager = getConfigManager();

  // Step 1: Select environment name
  const preset = await selectEnvironmentPreset(isFirst);
  let environmentId: string;
  let displayName: string;

  if (preset === 'custom') {
    // Ask for custom name
    const customName = await text('Enter a name for this environment:', {
      placeholder: 'my-environment',
      validate: (value) => {
        const result = validateEnvironmentName(value);
        return result.isValid ? undefined : result.error;
      },
    });
    environmentId = customName.toLowerCase().replace(/\s+/g, '-');
    displayName = customName;
  } else {
    // Use preset name
    environmentId = preset;
    displayName = getPresetDisplayName(preset);
  }

  // Check if environment already exists
  if (configManager.getEnvironment(environmentId)) {
    return {
      success: false,
      error: `Environment '${environmentId}' already exists. Choose a different name.`,
    };
  }

  // Step 2: Get QStash token
  const token = await getToken();

  // Step 3: Validate token
  const validationResult = await validateTokenWithApi(token);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error,
    };
  }

  // Step 4: Save environment
  const addResult = configManager.addEnvironment(environmentId, token, displayName);
  if (!addResult.success) {
    return {
      success: false,
      error: addResult.error || 'Failed to save environment',
    };
  }

  log(colors.success(`Environment '${displayName}' added successfully!`));

  return {
    success: true,
    environmentId,
  };
}

/**
 * Select an environment preset
 *
 * @param isFirst - Whether this is the first environment
 * @returns Selected preset
 */
async function selectEnvironmentPreset(isFirst: boolean): Promise<EnvironmentPreset> {
  const message = isFirst
    ? 'What would you like to call your first environment?'
    : 'What type of environment would you like to add?';

  const options: Array<{ value: EnvironmentPreset; label: string; hint?: string }> = [
    {
      value: 'production',
      label: 'Production',
      hint: isFirst ? 'Recommended for getting started' : 'Live production environment',
    },
    {
      value: 'staging',
      label: 'Staging',
      hint: 'Pre-production testing',
    },
    {
      value: 'development',
      label: 'Development',
      hint: 'Local development and testing',
    },
    {
      value: 'custom',
      label: 'Custom name...',
      hint: 'Enter your own environment name',
    },
  ];

  return select(message, options);
}

/**
 * Get display name for a preset
 *
 * @param preset - The preset type
 * @returns Human-readable display name
 */
function getPresetDisplayName(preset: EnvironmentPreset): string {
  switch (preset) {
    case 'production':
      return 'Production';
    case 'staging':
      return 'Staging';
    case 'development':
      return 'Development';
    case 'custom':
      return 'Custom';
    default:
      return preset;
  }
}

/**
 * Get QStash token from user with masked input
 *
 * @returns The entered token
 */
async function getToken(): Promise<string> {
  log(colors.muted('Get your token from: ') + colors.primary('https://console.upstash.com/qstash'));

  const token = await password('Paste your QStash token:', {
    mask: '*',
    validate: (value) => {
      const result = validateToken(value);
      return result.isValid ? undefined : result.error;
    },
  });

  return token.trim();
}

/**
 * Validate token with QStash API
 *
 * @param token - The token to validate
 * @returns Validation result
 */
async function validateTokenWithApi(token: string): Promise<{ success: boolean; error?: string }> {
  const result = await spinner('Validating token with QStash...', async () => {
    return validateQStashToken(token);
  });

  if (result.success && result.data) {
    log(colors.success('Token validated successfully!'));
    return { success: true };
  }

  return {
    success: false,
    error: result.error || 'Token validation failed. Please check your token and try again.',
  };
}

/**
 * Check if setup wizard should be run
 *
 * The setup wizard should run when:
 * 1. No config file exists
 * 2. No environments are configured
 * 3. No token is available from CLI or environment variable
 *
 * @returns True if setup wizard should run
 */
export function shouldRunSetupWizard(): boolean {
  const configManager = getConfigManager();

  // If there's a token available from env var, don't force setup
  const tokenResult = configManager.resolveToken();
  if (tokenResult) {
    return false;
  }

  // If there are environments configured, don't run setup
  if (configManager.hasEnvironments()) {
    return false;
  }

  return true;
}
