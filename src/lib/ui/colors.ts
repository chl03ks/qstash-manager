/**
 * Color utilities for CLI output using picocolors
 *
 * Provides consistent theming across the CLI interface with
 * automatic detection of color support (NO_COLOR, TTY).
 */

import pc from 'picocolors';

/**
 * Check if colors should be enabled
 * Respects NO_COLOR environment variable and TTY detection
 * See: https://no-color.org/
 */
const isColorEnabled = (): boolean => {
  // Explicit NO_COLOR environment variable (takes precedence)
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  // Check if stdout is a TTY
  if (!process.stdout.isTTY) {
    return false;
  }

  // Check for explicit FORCE_COLOR
  if (process.env.FORCE_COLOR !== undefined) {
    return true;
  }

  return true;
};

// Create color functions that respect the color settings
const createColorFn = (colorFn: (text: string) => string) => {
  return (text: string) => (isColorEnabled() ? colorFn(text) : text);
};

/**
 * Color schemes for consistent CLI theming
 * Automatically respects NO_COLOR environment variable and TTY detection
 */
export const colors = {
  // Status colors
  success: createColorFn(pc.green),
  error: createColorFn(pc.red),
  warning: createColorFn(pc.yellow),
  info: createColorFn(pc.cyan),
  muted: createColorFn(pc.gray),

  // Semantic colors
  primary: createColorFn(pc.blue),
  secondary: createColorFn(pc.magenta),
  accent: createColorFn(pc.cyan),

  // Text formatting
  bold: createColorFn(pc.bold),
  dim: createColorFn(pc.dim),
  underline: createColorFn(pc.underline),

  // Special
  highlight: (text: string) => (isColorEnabled() ? pc.bgCyan(pc.black(text)) : text),
} as const;

/**
 * Status indicators with color and symbol
 */
export const status = {
  success: (text: string) => `${colors.success('✓')} ${text}`,
  error: (text: string) => `${colors.error('✗')} ${text}`,
  warning: (text: string) => `${colors.warning('⚠')} ${text}`,
  info: (text: string) => `${colors.info('ℹ')} ${text}`,
  pending: (text: string) => `${colors.muted('○')} ${text}`,
  running: (text: string) => `${colors.info('●')} ${text}`,
} as const;

/**
 * Themed messages for common scenarios
 */
export const messages = {
  header: (text: string) => `\n${colors.bold(colors.primary(text))}\n`,
  subheader: (text: string) => colors.bold(text),
  section: (text: string) => `\n${colors.underline(text)}`,
  emphasis: (text: string) => colors.bold(colors.accent(text)),
  code: (text: string) => colors.dim(`\`${text}\``),
} as const;
