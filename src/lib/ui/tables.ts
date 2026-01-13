/**
 * Table utilities for displaying data using cli-table3
 *
 * Provides consistent table formatting across the CLI interface
 * with multiple style presets (default, compact, minimal).
 */

import Table from 'cli-table3';

import { colors } from './colors.js';

/**
 * Table column configuration
 */
export interface TableColumn {
  header: string;
  width?: number;
}

/**
 * Create a basic table with headers
 */
export function createTable(
  headers: string[],
  options?: {
    colWidths?: number[];
    wordWrap?: boolean;
    style?: 'default' | 'compact' | 'minimal';
  }
): Table.Table {
  const { colWidths, wordWrap = true, style = 'default' } = options || {};

  const baseConfig: Table.TableConstructorOptions = {
    head: headers.map((h) => colors.primary(h)),
    wordWrap,
  };

  if (colWidths) {
    baseConfig.colWidths = colWidths;
  }

  // Style presets
  if (style === 'compact') {
    baseConfig.chars = {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    };
  } else if (style === 'minimal') {
    baseConfig.chars = {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: ' ',
    };
  }

  return new Table(baseConfig);
}

/**
 * Create a table with custom column configuration
 */
export function createCustomTable(columns: TableColumn[]): Table.Table {
  return createTable(
    columns.map((c) => c.header),
    {
      colWidths: columns.map((c) => c.width).filter((w): w is number => w !== undefined),
    }
  );
}

/**
 * Create a summary table (2 columns: label and value)
 */
export function createSummaryTable(): Table.Table {
  return new Table({
    style: {
      head: [],
      border: [],
    },
    colWidths: [25, 40],
  });
}

/**
 * Create a key-value table
 */
export function createKeyValueTable(data: Record<string, string | number | boolean>): Table.Table {
  const table = createSummaryTable();

  Object.entries(data).forEach(([key, value]) => {
    table.push([colors.bold(key), String(value)]);
  });

  return table;
}

/**
 * Print a simple divider
 */
export function printDivider(length = 80): void {
  // eslint-disable-next-line no-console
  console.log(colors.muted('─'.repeat(length)));
}

/**
 * Print a section header with divider
 */
export function printSection(title: string): void {
  // eslint-disable-next-line no-console
  console.log('\n' + colors.bold(colors.primary(title)));
  printDivider();
}
