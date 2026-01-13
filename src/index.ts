import { Command } from 'commander';

/**
 * QStash Manager CLI
 * Interactive CLI for managing QStash resources
 */

const program = new Command();

program
  .name('qstash-manager')
  .description('Interactive CLI for managing QStash - URL groups, schedules, queues, messages, and monitoring')
  .version('0.1.0');

// Parse command line arguments
program.parse();
