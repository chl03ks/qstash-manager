/**
 * Prompt utilities using @clack/prompts
 *
 * Wraps @clack/prompts functions with consistent error handling.
 * All functions check for user cancellation (Ctrl+C/ESC) and throw
 * a UserCancelledError instead of calling process.exit().
 *
 * IMPORTANT: Callers must handle UserCancelledError to implement
 * "go back one level" behavior instead of crashing.
 */

import * as p from '@clack/prompts';

import { colors } from './colors.js';

/**
 * Error thrown when user cancels an operation (Ctrl+C or ESC)
 * This allows callers to handle cancellation gracefully
 */
export class UserCancelledError extends Error {
  constructor(message = 'User cancelled') {
    super(message);
    this.name = 'UserCancelledError';
  }
}

/**
 * Check if a result is cancelled and throw if so
 */
function handleCancel<T>(result: T | symbol): T {
  if (p.isCancel(result)) {
    throw new UserCancelledError();
  }
  return result as T;
}

/**
 * Ask for confirmation
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const result = await p.confirm({
    message,
    initialValue: defaultValue,
  });

  return handleCancel(result);
}

/**
 * Ask for text input
 */
export async function text(
  message: string,
  options?: {
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | undefined;
  }
): Promise<string> {
  const result = await p.text({
    message,
    placeholder: options?.placeholder,
    defaultValue: options?.defaultValue,
    validate: options?.validate,
  });

  return handleCancel(result);
}

/**
 * Ask for password input (masked)
 */
export async function password(
  message: string,
  options?: {
    mask?: string;
    validate?: (value: string) => string | undefined;
  }
): Promise<string> {
  const result = await p.password({
    message,
    mask: options?.mask ?? '*',
    validate: options?.validate,
  });

  return handleCancel(result);
}

/**
 * Ask for a selection from a list
 */
export async function select<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>
): Promise<T> {
  const result = await p.select({
    message,
    options: options as Array<{ value: T; label: string; hint?: string }>,
  });

  return handleCancel(result) as T;
}

/**
 * Ask for multiple selections from a list
 */
export async function multiselect<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>,
  required = false
): Promise<T[]> {
  const result = await p.multiselect({
    message,
    options: options as Array<{ value: T; label: string; hint?: string }>,
    required,
  });

  return handleCancel(result) as T[];
}

/**
 * Display a spinner while an async operation runs
 */
export async function spinner<T>(message: string, operation: () => Promise<T>): Promise<T> {
  const s = p.spinner();
  s.start(message);

  try {
    const result = await operation();
    s.stop(colors.success('Done'));
    return result;
  } catch (error) {
    s.stop(colors.error('Failed'));
    throw error;
  }
}

/**
 * Display an intro message
 */
export function intro(message: string): void {
  p.intro(colors.bold(colors.primary(message)));
}

/**
 * Display an outro message
 */
export function outro(message: string): void {
  p.outro(colors.success(message));
}

/**
 * Display a note
 */
export function note(message: string, title?: string): void {
  p.note(message, title);
}

/**
 * Display a log message (for use during prompts)
 */
export function log(message: string): void {
  p.log.message(message);
}

/**
 * Group multiple prompts together
 */
export async function group<T extends Record<string, unknown>>(
  prompts: p.PromptGroup<T>,
  options?: {
    onCancel?: (opts: { results: Partial<T> }) => void;
  }
): Promise<T> {
  const result = await p.group(prompts, options);

  // Check if any values in the result are cancel symbols
  for (const value of Object.values(result)) {
    if (p.isCancel(value)) {
      throw new UserCancelledError();
    }
  }

  return result as T;
}

/**
 * Check if a value is a cancel symbol
 * Use this to check results manually if needed
 */
export function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}
