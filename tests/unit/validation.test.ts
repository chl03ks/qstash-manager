/**
 * Validation Utilities Unit Tests
 *
 * Tests for validation utilities including:
 * - URL validation (HTTPS requirement, format)
 * - Group/Queue/Schedule name validation
 * - Token validation
 * - Environment name validation
 * - Numeric value validation (parallelism, delay)
 * - Message body validation
 * - Helper functions (isNgrokUrl, isLocalhostUrl)
 */

import { describe, expect, it } from 'vitest';

import {
  isLocalhostUrl,
  isNgrokUrl,
  validateDelay,
  validateEndpointName,
  validateEnvironmentName,
  validateGroupName,
  validateMessageBody,
  validateParallelism,
  validateQueueName,
  validateScheduleName,
  validateToken,
  validateUrl,
} from '../../src/lib/utils/validation.js';

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('should accept valid HTTPS URLs', () => {
      const result = validateUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept HTTPS URLs with paths', () => {
      const result = validateUrl('https://example.com/api/webhook');
      expect(result.isValid).toBe(true);
    });

    it('should accept HTTPS URLs with query parameters', () => {
      const result = validateUrl('https://example.com/api?key=value');
      expect(result.isValid).toBe(true);
    });

    it('should accept HTTPS URLs with ports', () => {
      const result = validateUrl('https://example.com:8080/api');
      expect(result.isValid).toBe(true);
    });

    it('should accept ngrok HTTPS URLs', () => {
      const result = validateUrl('https://abc123.ngrok.io/webhook');
      expect(result.isValid).toBe(true);
    });

    it('should accept ngrok-free.app URLs', () => {
      const result = validateUrl('https://abc123.ngrok-free.app/webhook');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    it('should reject empty URL', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only URL', () => {
      const result = validateUrl('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject HTTP URLs (non-HTTPS)', () => {
      const result = validateUrl('http://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should reject malformed URLs', () => {
      const result = validateUrl('not-a-valid-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should reject URLs without hostname', () => {
      const result = validateUrl('https:///path');
      expect(result.isValid).toBe(false);
    });
  });
});

describe('validateGroupName', () => {
  describe('valid names', () => {
    it('should accept simple alphanumeric names', () => {
      const result = validateGroupName('mygroup');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with numbers', () => {
      const result = validateGroupName('group123');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with hyphens', () => {
      const result = validateGroupName('my-group');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with underscores', () => {
      const result = validateGroupName('my_group');
      expect(result.isValid).toBe(true);
    });

    it('should accept mixed case names', () => {
      const result = validateGroupName('MyGroup');
      expect(result.isValid).toBe(true);
    });

    it('should accept names starting with numbers', () => {
      const result = validateGroupName('123group');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject empty name', () => {
      const result = validateGroupName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only name', () => {
      const result = validateGroupName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject names starting with hyphen', () => {
      const result = validateGroupName('-mygroup');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('start with');
    });

    it('should reject names starting with underscore', () => {
      const result = validateGroupName('_mygroup');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('start with');
    });

    it('should reject names with spaces', () => {
      const result = validateGroupName('my group');
      expect(result.isValid).toBe(false);
    });

    it('should reject names with special characters', () => {
      const result = validateGroupName('my@group');
      expect(result.isValid).toBe(false);
    });

    it('should reject names exceeding 64 characters', () => {
      const result = validateGroupName('a'.repeat(65));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('64 characters');
    });
  });
});

describe('validateQueueName', () => {
  it('should use same validation as group name', () => {
    expect(validateQueueName('valid-queue').isValid).toBe(true);
    expect(validateQueueName('').isValid).toBe(false);
  });

  it('should have Queue in error messages instead of Group', () => {
    const result = validateQueueName('');
    expect(result.error).toContain('Queue');
    expect(result.error).not.toContain('Group');
  });
});

describe('validateScheduleName', () => {
  it('should use same validation as group name', () => {
    expect(validateScheduleName('valid-schedule').isValid).toBe(true);
    expect(validateScheduleName('').isValid).toBe(false);
  });

  it('should have Schedule in error messages instead of Group', () => {
    const result = validateScheduleName('');
    expect(result.error).toContain('Schedule');
    expect(result.error).not.toContain('Group');
  });
});

describe('validateEndpointName', () => {
  describe('valid names', () => {
    it('should accept empty name (optional field)', () => {
      const result = validateEndpointName('');
      expect(result.isValid).toBe(true);
    });

    it('should accept undefined (optional field)', () => {
      const result = validateEndpointName(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should accept alphanumeric names', () => {
      const result = validateEndpointName('endpoint1');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with spaces', () => {
      const result = validateEndpointName('My Endpoint');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with periods', () => {
      const result = validateEndpointName('api.webhook');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with hyphens and underscores', () => {
      const result = validateEndpointName('my-endpoint_name');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject names with special characters', () => {
      const result = validateEndpointName('endpoint@123');
      expect(result.isValid).toBe(false);
    });

    it('should reject names exceeding 128 characters', () => {
      const result = validateEndpointName('a'.repeat(129));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('128 characters');
    });
  });
});

describe('validateToken', () => {
  describe('valid tokens', () => {
    it('should accept valid-looking tokens', () => {
      const result = validateToken('qstash_abc123xyz789def');
      expect(result.isValid).toBe(true);
    });

    it('should accept long tokens', () => {
      const result = validateToken('a'.repeat(100));
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid tokens', () => {
    it('should reject empty token', () => {
      const result = validateToken('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only token', () => {
      const result = validateToken('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject token that is too short', () => {
      const result = validateToken('short');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject token with whitespace', () => {
      const result = validateToken('token with spaces');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('whitespace');
    });
  });
});

describe('validateEnvironmentName', () => {
  describe('valid names', () => {
    it('should accept simple names', () => {
      expect(validateEnvironmentName('production').isValid).toBe(true);
      expect(validateEnvironmentName('staging').isValid).toBe(true);
      expect(validateEnvironmentName('dev').isValid).toBe(true);
    });

    it('should accept names with numbers', () => {
      const result = validateEnvironmentName('prod1');
      expect(result.isValid).toBe(true);
    });

    it('should accept names with hyphens', () => {
      const result = validateEnvironmentName('my-env');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject empty name', () => {
      const result = validateEnvironmentName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject names starting with number', () => {
      const result = validateEnvironmentName('123env');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('start with a letter');
    });

    it('should reject names starting with hyphen', () => {
      const result = validateEnvironmentName('-env');
      expect(result.isValid).toBe(false);
    });

    it('should reject names with underscores', () => {
      const result = validateEnvironmentName('my_env');
      expect(result.isValid).toBe(false);
    });

    it('should reject names exceeding 32 characters', () => {
      const result = validateEnvironmentName('a'.repeat(33));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('32 characters');
    });
  });
});

describe('validateParallelism', () => {
  describe('valid values', () => {
    it('should accept 1 (minimum)', () => {
      const result = validateParallelism(1);
      expect(result.isValid).toBe(true);
    });

    it('should accept 100 (maximum)', () => {
      const result = validateParallelism(100);
      expect(result.isValid).toBe(true);
    });

    it('should accept values between 1 and 100', () => {
      expect(validateParallelism(50).isValid).toBe(true);
      expect(validateParallelism(10).isValid).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('should reject 0', () => {
      const result = validateParallelism(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 1');
    });

    it('should reject negative values', () => {
      const result = validateParallelism(-1);
      expect(result.isValid).toBe(false);
    });

    it('should reject values greater than 100', () => {
      const result = validateParallelism(101);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100');
    });

    it('should reject non-integer values', () => {
      const result = validateParallelism(1.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('whole number');
    });

    it('should reject NaN', () => {
      const result = validateParallelism(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });
  });
});

describe('validateDelay', () => {
  describe('valid values', () => {
    it('should accept 0 (no delay)', () => {
      const result = validateDelay(0);
      expect(result.isValid).toBe(true);
    });

    it('should accept positive delay', () => {
      const result = validateDelay(60);
      expect(result.isValid).toBe(true);
    });

    it('should accept maximum delay (7 days)', () => {
      const result = validateDelay(7 * 24 * 60 * 60);
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('should reject negative delay', () => {
      const result = validateDelay(-1);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should reject delay exceeding 7 days', () => {
      const result = validateDelay(7 * 24 * 60 * 60 + 1);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('7 days');
    });

    it('should reject NaN', () => {
      const result = validateDelay(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });
  });
});

describe('validateMessageBody', () => {
  describe('valid bodies', () => {
    it('should accept empty body', () => {
      const result = validateMessageBody('');
      expect(result.isValid).toBe(true);
    });

    it('should accept undefined body', () => {
      const result = validateMessageBody(undefined);
      expect(result.isValid).toBe(true);
    });

    it('should accept JSON body', () => {
      const result = validateMessageBody(JSON.stringify({ key: 'value' }));
      expect(result.isValid).toBe(true);
    });

    it('should accept plain text body', () => {
      const result = validateMessageBody('Hello, World!');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid bodies', () => {
    it('should reject body exceeding 1MB', () => {
      const largeBody = 'a'.repeat(1024 * 1024 + 1);
      const result = validateMessageBody(largeBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1MB');
    });
  });
});

describe('isNgrokUrl', () => {
  it('should return true for ngrok.io URLs', () => {
    expect(isNgrokUrl('https://abc123.ngrok.io')).toBe(true);
    expect(isNgrokUrl('https://abc123.ngrok.io/webhook')).toBe(true);
  });

  it('should return true for ngrok-free.app URLs', () => {
    expect(isNgrokUrl('https://abc123.ngrok-free.app')).toBe(true);
    expect(isNgrokUrl('https://xyz.ngrok-free.app/api')).toBe(true);
  });

  it('should return false for non-ngrok URLs', () => {
    expect(isNgrokUrl('https://example.com')).toBe(false);
    expect(isNgrokUrl('https://api.example.com')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isNgrokUrl('not-a-url')).toBe(false);
    expect(isNgrokUrl('')).toBe(false);
  });
});

describe('isLocalhostUrl', () => {
  it('should return true for localhost', () => {
    expect(isLocalhostUrl('http://localhost')).toBe(true);
    expect(isLocalhostUrl('http://localhost:3000')).toBe(true);
    expect(isLocalhostUrl('https://localhost/api')).toBe(true);
  });

  it('should return true for 127.0.0.1', () => {
    expect(isLocalhostUrl('http://127.0.0.1')).toBe(true);
    expect(isLocalhostUrl('http://127.0.0.1:8080')).toBe(true);
  });

  it('should return true for 0.0.0.0', () => {
    expect(isLocalhostUrl('http://0.0.0.0')).toBe(true);
    expect(isLocalhostUrl('http://0.0.0.0:3000')).toBe(true);
  });

  it('should return true for private network IPs', () => {
    expect(isLocalhostUrl('http://192.168.1.1')).toBe(true);
    expect(isLocalhostUrl('http://192.168.0.100')).toBe(true);
    expect(isLocalhostUrl('http://10.0.0.1')).toBe(true);
  });

  it('should return true for .local domains', () => {
    expect(isLocalhostUrl('http://myserver.local')).toBe(true);
    expect(isLocalhostUrl('http://dev.local:3000')).toBe(true);
  });

  it('should return false for public URLs', () => {
    expect(isLocalhostUrl('https://example.com')).toBe(false);
    expect(isLocalhostUrl('https://api.example.com')).toBe(false);
  });

  it('should return false for ngrok URLs', () => {
    expect(isLocalhostUrl('https://abc.ngrok.io')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isLocalhostUrl('not-a-url')).toBe(false);
    expect(isLocalhostUrl('')).toBe(false);
  });
});
