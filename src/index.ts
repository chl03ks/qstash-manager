/**
 * QStash Manager CLI
 *
 * Interactive CLI for managing QStash resources including
 * URL groups, schedules, queues, messages, and monitoring.
 *
 * @module qstash-manager
 */

import { Command } from 'commander';

import { runMainMenu } from './commands/index.js';

/**
 * Main CLI entry point
 */
const program = new Command();

program
  .name('qstash-manager')
  .description(
    'Interactive CLI for managing QStash - URL groups, schedules, queues, messages, and monitoring'
  )
  .version('0.1.0');

// Default action: launch interactive mode
program.action(async () => {
  try {
    await runMainMenu();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
});

// Parse command line arguments
program.parse();
