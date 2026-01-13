/**
 * Main Menu and Navigation
 *
 * The main entry point for the interactive CLI. Provides the top-level
 * menu and manages navigation between different feature areas.
 */

import type { MainMenuAction, MenuOption } from '../types/commands.js';
import { getConfigManager } from '../lib/config/manager.js';
import {
  colors,
  intro,
  note,
  outro,
  select,
  UserCancelledError,
} from '../lib/ui/index.js';
import { runSetupWizard, shouldRunSetupWizard } from './config/setup.js';

/**
 * Main menu manager for the QStash CLI
 */
export class MainMenu {
  private shouldContinue = true;
  private configManager = getConfigManager();

  /**
   * Run the main menu loop
   */
  async run(): Promise<void> {
    intro('🚀 QStash Manager');

    // Check if we need first-run setup
    if (shouldRunSetupWizard()) {
      try {
        const setupResult = await runSetupWizard();
        if (!setupResult.success) {
          outro(colors.warning(setupResult.error || 'Setup was not completed.'));
          return;
        }
        // Clear cached config to pick up new environments
        this.configManager.clearCache();
      } catch (error) {
        if (error instanceof UserCancelledError) {
          outro(colors.muted('Setup cancelled. Run again when you\'re ready!'));
          return;
        }
        throw error;
      }
    }

    // Main navigation loop
    while (this.shouldContinue) {
      try {
        await this.showMainMenu();
      } catch (error) {
        if (error instanceof UserCancelledError) {
          // User pressed Ctrl+C or ESC - exit gracefully
          this.shouldContinue = false;
        } else {
          throw error;
        }
      }
    }

    outro('👋 Goodbye!');
  }

  /**
   * Display the main menu and handle selection
   */
  private async showMainMenu(): Promise<void> {
    // Get current environment info for display
    const envInfo = this.getEnvironmentInfo();

    console.log(''); // Blank line for spacing
    console.log(colors.dim(`─────────────────────────────────────────────`));
    console.log(colors.bold('QStash Manager') + envInfo);
    console.log(colors.dim(`─────────────────────────────────────────────`));
    console.log('');

    const menuOptions: MenuOption<MainMenuAction>[] = [
      {
        value: 'url-groups',
        label: '📦 URL Groups',
        hint: 'Manage URL groups and endpoints',
      },
      {
        value: 'messages',
        label: '✉️  Messages',
        hint: 'Send, track, and cancel messages',
      },
      {
        value: 'schedules',
        label: '📅 Schedules',
        hint: 'Manage scheduled message delivery',
      },
      {
        value: 'queues',
        label: '📋 Queues',
        hint: 'Manage message queues',
      },
      {
        value: 'dlq',
        label: '🔴 Dead Letter Queue',
        hint: 'View and retry failed messages',
      },
      {
        value: 'logs',
        label: '📊 Logs',
        hint: 'View message delivery logs',
      },
      {
        value: 'security',
        label: '🔐 Signing Keys',
        hint: 'View and rotate signing keys',
      },
      {
        value: 'config',
        label: '⚙️  Configuration',
        hint: 'Manage environments and settings',
      },
      {
        value: 'exit',
        label: '👋 Exit',
        hint: 'Close QStash Manager',
      },
    ];

    const action = await select<MainMenuAction>('What would you like to do?', menuOptions);

    await this.handleAction(action);
  }

  /**
   * Handle main menu action selection
   */
  private async handleAction(action: MainMenuAction): Promise<void> {
    switch (action) {
      case 'url-groups':
        // TODO: Implement URL groups menu (subtask-4-1)
        note('URL Groups management coming soon!', 'Not Implemented');
        break;

      case 'messages':
        // TODO: Implement messages menu (subtask-5-1)
        note('Messages management coming soon!', 'Not Implemented');
        break;

      case 'schedules':
        // TODO: Implement schedules menu (subtask-8-1)
        note('Schedules management coming soon!', 'Not Implemented');
        break;

      case 'queues':
        // TODO: Implement queues menu (subtask-7-1)
        note('Queues management coming soon!', 'Not Implemented');
        break;

      case 'dlq':
        // TODO: Implement DLQ menu (subtask-9-1)
        note('Dead Letter Queue management coming soon!', 'Not Implemented');
        break;

      case 'logs':
        // TODO: Implement logs menu (subtask-6-1)
        note('Logs viewing coming soon!', 'Not Implemented');
        break;

      case 'security':
        // TODO: Implement security menu (subtask-10-1)
        note('Signing keys management coming soon!', 'Not Implemented');
        break;

      case 'config':
        // TODO: Implement config menu (subtask-3-3)
        note('Configuration management coming soon!', 'Not Implemented');
        break;

      case 'exit':
        this.shouldContinue = false;
        break;
    }
  }

  /**
   * Get a formatted string showing the current environment
   */
  private getEnvironmentInfo(): string {
    const tokenResult = this.configManager.resolveToken();

    if (!tokenResult) {
      return colors.warning(' (No token configured)');
    }

    switch (tokenResult.source) {
      case 'cli':
        return colors.muted(' [CLI token]');
      case 'env':
        return colors.muted(' [QSTASH_TOKEN]');
      case 'config':
        return colors.muted(` [${tokenResult.environmentName || 'config'}]`);
      default:
        return '';
    }
  }
}

/**
 * Run the main menu
 */
export async function runMainMenu(): Promise<void> {
  const mainMenu = new MainMenu();
  await mainMenu.run();
}
