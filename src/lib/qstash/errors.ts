/**
 * QStash Error Handling
 *
 * Custom error classes for QStash API operations with
 * user-friendly messages and actionable guidance.
 */

/**
 * Error code constants for QStash API errors
 */
export const QStashErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type QStashErrorCode = (typeof QStashErrorCode)[keyof typeof QStashErrorCode];

/**
 * Base error class for QStash API errors
 */
export class QStashError extends Error {
  readonly code: QStashErrorCode;
  readonly statusCode?: number;
  readonly context: string;
  readonly isRetryable: boolean;

  constructor(
    message: string,
    options: {
      code: QStashErrorCode;
      statusCode?: number;
      context: string;
      isRetryable?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'QStashError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.context = options.context;
    this.isRetryable = options.isRetryable ?? false;
    this.cause = options.cause;

    // Maintains proper stack trace for where our error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QStashError);
    }
  }

  /**
   * Get a user-friendly description of the error
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Authentication error (401 Unauthorized)
 */
export class QStashAuthError extends QStashError {
  constructor(context: string, cause?: unknown) {
    super(
      'Authentication failed. Please check your QStash token. You can update it in the config settings or set the QSTASH_TOKEN environment variable.',
      {
        code: QStashErrorCode.UNAUTHORIZED,
        statusCode: 401,
        context,
        isRetryable: false,
        cause,
      }
    );
    this.name = 'QStashAuthError';
  }
}

/**
 * Resource not found error (404 Not Found)
 */
export class QStashNotFoundError extends QStashError {
  readonly resourceType?: string;
  readonly resourceId?: string;

  constructor(
    context: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      cause?: unknown;
    }
  ) {
    const resourceInfo = options?.resourceType
      ? `The ${options.resourceType}${options.resourceId ? ` '${options.resourceId}'` : ''} may not exist or has been deleted.`
      : 'The resource may not exist or has been deleted.';

    super(`${context}: Resource not found. ${resourceInfo}`, {
      code: QStashErrorCode.NOT_FOUND,
      statusCode: 404,
      context,
      isRetryable: false,
      cause: options?.cause,
    });
    this.name = 'QStashNotFoundError';
    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }
}

/**
 * Rate limit error (429 Too Many Requests)
 */
export class QStashRateLimitError extends QStashError {
  readonly retryAfter?: number;

  constructor(context: string, options?: { retryAfter?: number; cause?: unknown }) {
    const retryInfo = options?.retryAfter
      ? ` Please wait ${options.retryAfter} seconds before retrying.`
      : ' Please wait a moment and try again.';

    super(`Rate limit exceeded.${retryInfo}`, {
      code: QStashErrorCode.RATE_LIMITED,
      statusCode: 429,
      context,
      isRetryable: true,
      cause: options?.cause,
    });
    this.name = 'QStashRateLimitError';
    this.retryAfter = options?.retryAfter;
  }
}

/**
 * Bad request error (400 Bad Request)
 */
export class QStashBadRequestError extends QStashError {
  constructor(context: string, message: string, cause?: unknown) {
    super(`${context}: ${message}`, {
      code: QStashErrorCode.BAD_REQUEST,
      statusCode: 400,
      context,
      isRetryable: false,
      cause,
    });
    this.name = 'QStashBadRequestError';
  }
}

/**
 * Server error (5xx errors)
 */
export class QStashServerError extends QStashError {
  constructor(context: string, statusCode: number, cause?: unknown) {
    super(
      `${context}: QStash server error (${statusCode}). Please try again in a few moments. If the issue persists, check the Upstash status page.`,
      {
        code: QStashErrorCode.SERVER_ERROR,
        statusCode,
        context,
        isRetryable: true,
        cause,
      }
    );
    this.name = 'QStashServerError';
  }
}

/**
 * Network error (connection failures, timeouts, etc.)
 */
export class QStashNetworkError extends QStashError {
  constructor(context: string, cause?: unknown) {
    super(
      `${context}: Network error. Please check your internet connection and try again.`,
      {
        code: QStashErrorCode.NETWORK_ERROR,
        context,
        isRetryable: true,
        cause,
      }
    );
    this.name = 'QStashNetworkError';
  }
}

/**
 * Parse an API error and return the appropriate QStashError
 */
export function parseApiError(error: unknown, context: string): QStashError {
  // Already a QStashError
  if (error instanceof QStashError) {
    return error;
  }

  // Error with message to parse
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for specific error patterns
    if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication')) {
      return new QStashAuthError(context, error);
    }

    if (message.includes('404') || message.includes('not found')) {
      return new QStashNotFoundError(context, { cause: error });
    }

    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      // Try to extract retry-after value
      const retryMatch = message.match(/retry.+?(\d+)/i);
      const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : undefined;
      return new QStashRateLimitError(context, { retryAfter, cause: error });
    }

    if (message.includes('400') || message.includes('bad request') || message.includes('invalid')) {
      return new QStashBadRequestError(context, error.message, error);
    }

    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      const statusMatch = message.match(/5\d{2}/);
      const statusCode = statusMatch ? parseInt(statusMatch[0], 10) : 500;
      return new QStashServerError(context, statusCode, error);
    }

    // Check for network errors
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('fetch failed')
    ) {
      return new QStashNetworkError(context, error);
    }

    // Unknown error with message
    return new QStashError(`${context}: ${error.message}`, {
      code: QStashErrorCode.UNKNOWN,
      context,
      isRetryable: false,
      cause: error,
    });
  }

  // Unknown error type
  return new QStashError(`${context}: ${String(error)}`, {
    code: QStashErrorCode.UNKNOWN,
    context,
    isRetryable: false,
    cause: error,
  });
}

/**
 * Format an error for user display
 */
export function formatErrorForDisplay(error: unknown, context: string): string {
  const qstashError = parseApiError(error, context);
  return qstashError.getUserMessage();
}
