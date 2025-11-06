/**
 * Unit tests for structured JSON logger
 * Following TDD - these tests should FAIL initially, then PASS after implementation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import logger functions that we'll create
import { logStructured, logError, LogLevel } from '../../../src/utils/logger';

describe('logStructured', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should output valid JSON string', () => {
    logStructured('info', 'Test message', { component: 'test' });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output = consoleLogSpy.mock.calls[0][0] as string;

    // Should be valid JSON
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('should include timestamp in ISO 8601 format', () => {
    logStructured('info', 'Test message');

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.timestamp).toBeDefined();
    expect(typeof output.timestamp).toBe('string');
    // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should include level, component, and message fields', () => {
    logStructured('error', 'Error occurred', { component: 'gameStateService' });

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.level).toBe('error');
    expect(output.component).toBe('gameStateService');
    expect(output.message).toBe('Error occurred');
  });

  it('should include context object when provided', () => {
    const context = {
      component: 'test',
      action: 'START_QUESTION',
      questionId: 'q123',
    };

    logStructured('info', 'Processing action', context);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.component).toBe('test');
    expect(output.context.action).toBe('START_QUESTION');
    expect(output.context.questionId).toBe('q123');
  });

  it('should handle all log levels', () => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    levels.forEach(level => {
      consoleLogSpy.mockClear();
      logStructured(level, `Test ${level} message`);

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(output.level).toBe(level);
    });
  });

  it('should default component to "unknown" when not provided in context', () => {
    logStructured('info', 'Test message');

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.component).toBe('unknown');
  });

  it('should handle nested context objects', () => {
    const context = {
      component: 'test',
      nested: {
        field1: 'value1',
        field2: 123,
      },
    };

    logStructured('info', 'Test message', context);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.context.nested.field1).toBe('value1');
    expect(output.context.nested.field2).toBe(123);
  });
});

describe('logError', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log error with structured format', () => {
    const error = new Error('Test error');
    logError('gameStateService', 'Operation failed', error);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.level).toBe('error');
    expect(output.component).toBe('gameStateService');
    expect(output.message).toBe('Operation failed');
  });

  it('should include error message in error object', () => {
    const error = new Error('Validation failed');
    logError('test', 'Error occurred', error);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.context.error.message).toBe('Validation failed');
  });

  it('should include stack trace for Error objects', () => {
    const error = new Error('Test error');
    logError('test', 'Error occurred', error);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.context.error.stack).toBeDefined();
    expect(typeof output.context.error.stack).toBe('string');
    expect(output.context.error.stack).toContain('Error: Test error');
  });

  it('should include error name for Error objects', () => {
    const error = new TypeError('Type mismatch');
    logError('test', 'Error occurred', error);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.context.error.name).toBe('TypeError');
  });

  it('should handle non-Error objects', () => {
    const notAnError = 'Simple string error';
    logError('test', 'Error occurred', notAnError);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.context.error.message).toBe('Simple string error');
    expect(output.context.error.stack).toBeUndefined();
  });

  it('should include additional context when provided', () => {
    const error = new Error('Test error');
    const context = {
      action: 'SHOW_RESULTS',
      questionId: 'q456',
    };

    logError('gameStateService', 'Failed to show results', error, context);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    expect(output.context.action).toBe('SHOW_RESULTS');
    expect(output.context.questionId).toBe('q456');
    expect(output.context.error.message).toBe('Test error');
  });

  it('should preserve context alongside error details', () => {
    const error = new Error('Firestore error');
    const context = {
      attemptNumber: 3,
      retryable: true,
    };

    logError('gameStateService', 'Firestore operation failed', error, context);

    const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

    // Context fields should be at context level
    expect(output.context.attemptNumber).toBe(3);
    expect(output.context.retryable).toBe(true);

    // Error details should be nested under error key
    expect(output.context.error.message).toBe('Firestore error');
  });
});

describe('JSON format validation', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should produce parseable JSON for external log aggregation tools', () => {
    logStructured('info', 'Test message', {
      component: 'test',
      field1: 'value1',
      field2: 123,
      field3: true,
    });

    const output = consoleLogSpy.mock.calls[0][0] as string;

    // Should be valid JSON
    expect(() => JSON.parse(output)).not.toThrow();

    // Parsed output should be an object
    const parsed = JSON.parse(output);
    expect(typeof parsed).toBe('object');
    expect(parsed).not.toBeNull();
  });

  it('should handle special characters in message', () => {
    const specialMessage = 'Error: "Validation failed" for field \'currentPhase\' - got \\invalid\\';
    logStructured('error', specialMessage);

    const output = consoleLogSpy.mock.calls[0][0] as string;

    // Should still be valid JSON
    expect(() => JSON.parse(output)).not.toThrow();

    const parsed = JSON.parse(output);
    expect(parsed.message).toBe(specialMessage);
  });

  it('should handle undefined and null values in context', () => {
    const context = {
      component: 'test',
      nullValue: null,
      undefinedValue: undefined,
    };

    logStructured('info', 'Test message', context);

    const output = consoleLogSpy.mock.calls[0][0] as string;

    // Should still be valid JSON (undefined values typically get omitted)
    expect(() => JSON.parse(output)).not.toThrow();
  });
});
