/**
 * Validation utilities for QStash Manager CLI
 *
 * Provides URL validation, group name validation, and other input validation
 * utilities for the CLI interface.
 */

import type { ValidationResult } from '../../types/commands.js';

/**
 * Validate a URL for use with QStash
 *
 * QStash requires HTTPS URLs for all endpoints. This validator ensures
 * URLs are properly formatted and use the HTTPS protocol.
 *
 * @param url - The URL to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateUrl(url: string): ValidationResult {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    // QStash requires HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'QStash requires HTTPS URLs (use ngrok for local development)',
      };
    }

    // Basic hostname validation - must have a non-empty hostname
    if (!parsedUrl.hostname || parsedUrl.hostname.trim().length === 0) {
      return { isValid: false, error: 'Invalid hostname in URL' };
    }

    // Hostname should be a valid format (has dots or is localhost or is IP)
    // Reject single-word hostnames like 'path' from malformed URLs like 'https:///path'
    const hostname = parsedUrl.hostname;
    const isLocalhostOrIP = hostname === 'localhost' || /^[\d.]+$/.test(hostname) || /^[\da-f:]+$/i.test(hostname);
    if (!isLocalhostOrIP && !hostname.includes('.')) {
      return { isValid: false, error: 'Invalid hostname in URL' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate a URL group name
 *
 * Group names must consist only of alphanumeric characters, hyphens, and underscores.
 *
 * @param name - The group name to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateGroupName(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: 'Group name is required' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { isValid: false, error: 'Group name cannot be empty' };
  }

  // Must start with a letter or number (not hyphen or underscore)
  if (!/^[a-zA-Z0-9]/.test(trimmedName)) {
    return { isValid: false, error: 'Group name must start with a letter or number' };
  }

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Only letters, numbers, hyphens, and underscores are allowed',
    };
  }

  // Reasonable length limit
  if (trimmedName.length > 64) {
    return { isValid: false, error: 'Group name must be 64 characters or less' };
  }

  return { isValid: true };
}

/**
 * Validate a queue name
 *
 * Queue names follow the same rules as group names.
 *
 * @param name - The queue name to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateQueueName(name: string): ValidationResult {
  const result = validateGroupName(name);
  if (!result.isValid && result.error) {
    // Replace "Group" with "Queue" in error messages
    return {
      ...result,
      error: result.error.replace(/Group/g, 'Queue').replace(/group/g, 'queue'),
    };
  }
  return result;
}

/**
 * Validate a schedule name
 *
 * Schedule names follow the same rules as group names.
 *
 * @param name - The schedule name to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateScheduleName(name: string): ValidationResult {
  const result = validateGroupName(name);
  if (!result.isValid && result.error) {
    // Replace "Group" with "Schedule" in error messages
    return {
      ...result,
      error: result.error.replace(/Group/g, 'Schedule').replace(/group/g, 'schedule'),
    };
  }
  return result;
}

/**
 * Validate an endpoint name (optional field)
 *
 * Endpoint names are optional but if provided, should be reasonable identifiers.
 *
 * @param name - The endpoint name to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateEndpointName(name: string | undefined): ValidationResult {
  // Empty names are valid (endpoint names are optional)
  if (!name || name.trim() === '') {
    return { isValid: true };
  }

  const trimmedName = name.trim();

  // Only allow reasonable characters
  if (!/^[a-zA-Z0-9-_.\s]+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Endpoint name can only contain letters, numbers, hyphens, underscores, periods, and spaces',
    };
  }

  // Reasonable length limit
  if (trimmedName.length > 128) {
    return { isValid: false, error: 'Endpoint name must be 128 characters or less' };
  }

  return { isValid: true };
}

/**
 * Validate a QStash token format
 *
 * Basic validation to check if a token looks like a valid QStash token.
 * Does not verify the token is actually valid with the API.
 *
 * @param token - The token to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateToken(token: string): ValidationResult {
  if (!token) {
    return { isValid: false, error: 'Token is required' };
  }

  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { isValid: false, error: 'Token cannot be empty' };
  }

  // Check for obviously invalid characters (before length check to give better error message)
  if (/[\s]/.test(trimmedToken)) {
    return { isValid: false, error: 'Token cannot contain whitespace' };
  }

  // QStash tokens are typically base64-encoded and fairly long
  if (trimmedToken.length < 20) {
    return { isValid: false, error: 'Token appears too short to be valid' };
  }

  return { isValid: true };
}

/**
 * Validate an environment name
 *
 * Environment names should be simple identifiers like "production", "staging", "dev".
 *
 * @param name - The environment name to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateEnvironmentName(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: 'Environment name is required' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { isValid: false, error: 'Environment name cannot be empty' };
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(trimmedName)) {
    return { isValid: false, error: 'Environment name must start with a letter' };
  }

  // Only allow alphanumeric and hyphens
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Environment name can only contain letters, numbers, and hyphens',
    };
  }

  // Reasonable length limit
  if (trimmedName.length > 32) {
    return { isValid: false, error: 'Environment name must be 32 characters or less' };
  }

  return { isValid: true };
}

/**
 * Validate parallelism value for queues
 *
 * QStash queues support parallelism from 1 to 100.
 *
 * @param value - The parallelism value to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateParallelism(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'Parallelism must be a number' };
  }

  if (!Number.isInteger(value)) {
    return { isValid: false, error: 'Parallelism must be a whole number' };
  }

  if (value < 1) {
    return { isValid: false, error: 'Parallelism must be at least 1' };
  }

  if (value > 100) {
    return { isValid: false, error: 'Parallelism cannot exceed 100' };
  }

  return { isValid: true };
}

/**
 * Validate a delay value in seconds
 *
 * QStash supports delays for message delivery.
 *
 * @param seconds - The delay in seconds
 * @returns Validation result with isValid flag and optional error message
 */
export function validateDelay(seconds: number): ValidationResult {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return { isValid: false, error: 'Delay must be a number' };
  }

  if (seconds < 0) {
    return { isValid: false, error: 'Delay cannot be negative' };
  }

  // QStash has a maximum delay (approximately 7 days)
  const maxDelay = 7 * 24 * 60 * 60; // 7 days in seconds
  if (seconds > maxDelay) {
    return { isValid: false, error: 'Delay cannot exceed 7 days' };
  }

  return { isValid: true };
}

/**
 * Validate a message body
 *
 * Basic validation for message content.
 *
 * @param body - The message body
 * @returns Validation result with isValid flag and optional error message
 */
export function validateMessageBody(body: string | undefined): ValidationResult {
  // Empty body is valid
  if (!body) {
    return { isValid: true };
  }

  // QStash has a 1MB limit for message body
  const maxSize = 1024 * 1024; // 1MB
  const bodySize = new TextEncoder().encode(body).length;

  if (bodySize > maxSize) {
    return { isValid: false, error: 'Message body cannot exceed 1MB' };
  }

  return { isValid: true };
}

/**
 * Check if a URL looks like an ngrok URL
 *
 * @param url - The URL to check
 * @returns True if the URL appears to be an ngrok URL
 */
export function isNgrokUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.endsWith('.ngrok.io') || parsedUrl.hostname.endsWith('.ngrok-free.app');
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a localhost URL (would not work with QStash)
 *
 * @param url - The URL to check
 * @returns True if the URL is localhost
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}
